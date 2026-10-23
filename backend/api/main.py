"""FastAPI app for the bot tournament.

Run from backend/:  uvicorn api.main:app --reload

Heavy endpoints are plain `def` so FastAPI runs them in its threadpool; each one
starts its own sandbox worker pool.
"""

import inspect

from fastapi import APIRouter, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

from engine.event import DEFAULT_EVENT, run_event
from engine.games import CHICKEN, PRISONERS_DILEMMA, STAG_HUNT
from engine.sandbox import play_safe_match, run_safe_round_robin, test_submission
from engine.strategies import BUILT_IN_BOTS
from scripts.event_demo import PICKS
from scripts.stress import generate_bots

from . import store
from .models import (
    BotErrorDetail, BotSubmission, BotTestRequest, BotTestResult, DemoCleared,
    DemoLoaded, ErrorDetail, EventRequest, EventResult, GameInfo, GameKey,
    MatchResult, RoundRobinResult, StrategyInfo, Team, TournamentRequest,
)

GAMES = {
    "prisoners_dilemma": PRISONERS_DILEMMA,
    "chicken": CHICKEN,
    "stag_hunt": STAG_HUNT,
}
GAME_KEYS = {game: key for key, game in GAMES.items()}

TAGS = [
    {"name": "Reference", "description": "Games and built-in strategies."},
    {"name": "Bots", "description": "Test, submit and manage team bots."},
    {"name": "Demo", "description": "Load or clear a ready-made field of 20 demo teams."},
    {"name": "Play", "description": "Run tournaments, the full event, and single-match replays."},
]

app = FastAPI(
    title="Iron Curtain",
    summary="Repeated-game bot tournaments with sandboxed user code.",
    description=(
        "Teams submit Python bots that define `strategy(my_history, opp_history)` and "
        "return `'C'` (cooperate) or `'D'` (defect). Bots run in sandboxed worker "
        "processes with a time limit; a bot that crashes, times out or returns a bad "
        "move forfeits and is disqualified from that round.\n\n"
        "Storage is in memory and resets when the server restarts."
    ),
    version="0.1.0",
    openapi_tags=TAGS,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")

NOT_FOUND = {404: {"model": ErrorDetail, "description": "Unknown bot."}}


def _resolve(names):
    """Map each name to its source (team code or built-in name), or 404."""
    teams = store.snapshot()
    sources = {}
    for name in names:
        if name in teams:
            sources[name] = teams[name]
        elif name in BUILT_IN_BOTS:
            sources[name] = name
        else:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown bot {name!r}.")
    return sources


def _round_robin_fields(outcome):
    return {key: outcome[key] for key in ("leaderboard", "matrix", "forfeits", "disqualified")}


# --- Reference ------------------------------------------------------------

@api.get("/games", response_model=list[GameInfo], tags=["Reference"],
         summary="List games", description="The three games with their payoff tables.")
def list_games():
    games = []
    for key, game in GAMES.items():
        payoffs = {}
        for (move1, move2), scores in game.payoffs.items():
            payoffs.setdefault(move1, {})[move2] = scores
        games.append(GameInfo(key=key, name=game.name, payoffs=payoffs))
    return games


@api.get("/strategies", response_model=list[StrategyInfo], tags=["Reference"],
         summary="List built-in strategies",
         description="Every built-in bot with its description and source code.")
def list_strategies():
    return [StrategyInfo(name=name, description=inspect.getdoc(bot) or "",
                         source=inspect.getsource(bot))
            for name, bot in BUILT_IN_BOTS.items()]


# --- Bots -----------------------------------------------------------------

@api.post("/bots/test", response_model=BotTestResult, tags=["Bots"],
          summary="Test bot code",
          description="Validate the code, then play it against tit_for_tat, always_defect and "
                      "random_bot in the sandbox. Nothing is stored.")
def test_bot(request: BotTestRequest):
    return test_submission(request.code)


@api.post("/bots", response_model=Team, status_code=status.HTTP_201_CREATED, tags=["Bots"],
          summary="Submit a team bot",
          description="Test the code like `POST /bots/test` and store it if it passes. "
                      "Names must be unique and can't match a built-in bot.",
          responses={409: {"model": ErrorDetail, "description": "Name already taken."},
                     422: {"model": BotErrorDetail, "description": "The bot failed testing."}})
def submit_bot(submission: BotSubmission):
    name = submission.team_name
    if name in BUILT_IN_BOTS:
        raise HTTPException(status.HTTP_409_CONFLICT, f"{name!r} is the name of a built-in bot.")
    if store.exists(name):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Team {name!r} already exists.")

    result = test_submission(submission.code)
    if not result["ok"]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT,
                            {"message": "Bot failed testing.", "errors": result["errors"]})
    # Checked again here in case the same name was submitted while testing
    if not store.add(name, submission.code):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Team {name!r} already exists.")
    return Team(team_name=name)


@api.get("/bots", response_model=list[Team], tags=["Bots"],
         summary="List teams", description="Stored teams in submission order, without code.")
def list_bots():
    return [Team(team_name=name) for name in store.snapshot()]


@api.delete("/bots/{team_name}", status_code=status.HTTP_204_NO_CONTENT, tags=["Bots"],
            summary="Delete a team", responses={404: {"model": ErrorDetail}})
def delete_bot(team_name: str):
    if not store.remove(team_name):
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Team {team_name!r} not found.")


# --- Demo -----------------------------------------------------------------

@api.post("/demo/load", response_model=DemoLoaded, tags=["Demo"],
          summary="Load demo teams",
          description="Add the 20 generated bots from `scripts/event_demo.py` as teams, "
                      "replacing any teams with the same names. One of them (crash_zero_div) "
                      "crashes mid-match to show disqualification.")
def load_demo():
    bots = generate_bots()
    for name in PICKS:
        store.add(name, bots[name], replace=True)
    return DemoLoaded(loaded=PICKS)


@api.post("/demo/clear", response_model=DemoCleared, tags=["Demo"],
          summary="Remove all teams", description="Delete every stored team, demo or not.")
def clear_demo():
    return DemoCleared(removed=store.clear())


# --- Play -----------------------------------------------------------------

@api.post("/tournament", response_model=RoundRobinResult, tags=["Play"],
          summary="Run a round robin",
          description="Every pair plays one match per repetition, and each bot plays a copy "
                      "of itself. Bots that forfeit are disqualified and their matches dropped.",
          responses={**NOT_FOUND, 422: {"model": ErrorDetail, "description": "No bots selected."}})
def run_tournament(request: TournamentRequest):
    if not request.bots and not request.include_builtins:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT,
                            "Select at least one bot or include the built-ins.")
    sources = _resolve(request.bots)
    outcome = run_safe_round_robin(sources, request.include_builtins, GAMES[request.game],
                                   request.turns, request.repetitions, request.noise, request.seed)
    return _round_robin_fields(outcome)


@api.post("/event", response_model=EventResult, tags=["Play"],
          summary="Run the full event",
          description="Run the four-round elimination event on every stored team: each round "
                      "is a round robin, and only the top teams advance to the next.",
          responses={422: {"model": ErrorDetail, "description": "No teams stored."}})
def run_full_event(request: EventRequest):
    teams = store.snapshot()
    if not teams:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT,
                            "No teams yet. Submit bots or load the demo first.")
    event = run_event(teams, DEFAULT_EVENT, request.seed, request.include_builtins)

    rounds = []
    for rnd in event["rounds"]:
        config = rnd["config"]
        rounds.append({
            **_round_robin_fields(rnd),
            "name": config.name,
            "game": GAME_KEYS[config.game],
            "turns": rnd["turns"],
            "noise": config.noise,
            "repetitions": config.repetitions,
            "hide_turn_count": config.hide_turn_count,
            "advanced": rnd["advanced"],
            "eliminated": rnd["eliminated"],
        })
    return {"rounds": rounds, "champion": event["champion"]}


@api.get("/match", response_model=MatchResult, tags=["Play"],
         summary="Replay one match",
         description="Play a single sandboxed match between two teams or built-ins and return "
                     "every turn. With the same seed it replays repetition 0 of the matching "
                     "tournament pairing.",
         responses=NOT_FOUND)
def replay_match(
    p1: str = Query(description="Player 1: team or built-in name.", examples=["tit_for_tat"]),
    p2: str = Query(description="Player 2: team or built-in name.", examples=["always_defect"]),
    game: GameKey = "prisoners_dilemma",
    turns: int = Query(200, ge=1, le=2000),
    noise: float = Query(0.0, ge=0.0, le=1.0, description="Chance each move is flipped."),
    seed: int | None = Query(None, description="Makes the match repeatable."),
):
    sources = _resolve([p1, p2])
    result = play_safe_match(p1, p2, sources, GAMES[game], turns, noise, seed)

    timeline = []
    total1 = total2 = 0
    for turn, (move1, move2) in enumerate(zip(result["history1"], result["history2"]), start=1):
        score1, score2 = GAMES[game].score(move1, move2)
        total1 += score1
        total2 += score2
        timeline.append({"turn": turn, "moves": (move1, move2), "scores": (score1, score2),
                         "totals": (total1, total2)})

    forfeit = result["forfeit"]
    if forfeit:
        forfeit = {"bot": (p1, p2)[forfeit["side"]], "player": forfeit["side"] + 1,
                   "reason": forfeit["reason"]}
    return {
        "p1": p1, "p2": p2, "game": game, "turns": turns, "noise": noise, "seed": seed,
        "timeline": timeline,
        "final_scores": (result["score1"], result["score2"]),
        "forfeit": forfeit,
    }


app.include_router(api)

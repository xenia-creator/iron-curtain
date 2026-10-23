"""Pydantic request and response models for the API."""

from typing import Literal

from pydantic import BaseModel, Field

GameKey = Literal["prisoners_dilemma", "chicken", "stag_hunt"]
Move = Literal["C", "D"]

BOT_CODE = Field(
    max_length=20_000,
    description="Python source defining strategy(my_history, opp_history) that returns 'C' or 'D'.",
    examples=["def strategy(my_history, opp_history):\n    return opp_history[-1] if opp_history else 'C'\n"],
)
TEAM_NAME = Field(
    min_length=1, max_length=40, pattern=r"^[A-Za-z0-9_\-]+$",
    description="Letters, digits, underscores and hyphens.", examples=["red_team"],
)
SEED = Field(None, description="Makes the run repeatable, including bots that use random.", examples=[2026])


class ErrorDetail(BaseModel):
    detail: str


class BotErrorDetail(BaseModel):
    class Detail(BaseModel):
        message: str
        errors: list[str]

    detail: Detail


# --- Games and strategies -------------------------------------------------

class GameInfo(BaseModel):
    key: GameKey = Field(description="Identifier used by the other endpoints.")
    name: str
    payoffs: dict[Move, dict[Move, tuple[int, int]]] = Field(
        description="payoffs[my_move][opp_move] = [my_score, opp_score].",
        examples=[{"C": {"C": [3, 3], "D": [0, 5]}, "D": {"C": [5, 0], "D": [1, 1]}}],
    )


class StrategyInfo(BaseModel):
    name: str
    description: str
    source: str


# --- Bots -----------------------------------------------------------------

class BotTestRequest(BaseModel):
    code: str = BOT_CODE


class BotTestResult(BaseModel):
    ok: bool
    errors: list[str]


class BotSubmission(BaseModel):
    team_name: str = TEAM_NAME
    code: str = BOT_CODE


class Team(BaseModel):
    team_name: str


class DemoLoaded(BaseModel):
    loaded: list[str]


class DemoCleared(BaseModel):
    removed: int


# --- Tournaments and events -----------------------------------------------

class LeaderboardRow(BaseModel):
    rank: int
    name: str
    total: int
    avg_per_turn: float
    wins: int
    losses: int
    draws: int


class Forfeit(BaseModel):
    bot: str
    opponent: str
    repetition: int
    reason: str


class RoundRobinResult(BaseModel):
    leaderboard: list[LeaderboardRow]
    matrix: dict[str, dict[str, float]] = Field(
        description="matrix[a][b] = a's average score per match against b (a == b is self-play).")
    forfeits: list[Forfeit]
    disqualified: list[str] = Field(description="Bots that forfeited a match; their results are dropped.")


class TournamentRequest(BaseModel):
    bots: list[str] = Field(default=[], description="Team or built-in bot names.",
                            examples=[["coop_50", "majority_3"]])
    include_builtins: bool = Field(False, description="Add every built-in bot to the field.")
    game: GameKey = "prisoners_dilemma"
    turns: int = Field(200, ge=1, le=2000)
    noise: float = Field(0.0, ge=0.0, le=1.0, description="Chance each move is flipped.")
    repetitions: int = Field(1, ge=1, le=20)
    seed: int | None = SEED


class EventRequest(BaseModel):
    seed: int | None = SEED
    include_builtins: bool = Field(
        False, description="Built-ins play every round as background bots but never advance.")


class EventRound(RoundRobinResult):
    name: str
    game: GameKey
    turns: int = Field(description="Turns actually played (randomized when the count is hidden).")
    noise: float
    repetitions: int
    hide_turn_count: bool
    advanced: list[str]
    eliminated: list[str]


class EventResult(BaseModel):
    rounds: list[EventRound]
    champion: str | None


# --- Match replay ---------------------------------------------------------

class MatchTurn(BaseModel):
    turn: int = Field(description="1-based turn number.")
    moves: tuple[Move, Move] = Field(description="Moves actually played (after noise), [p1, p2].")
    scores: tuple[int, int] = Field(description="Points earned this turn, [p1, p2].")
    totals: tuple[int, int] = Field(description="Running totals after this turn, [p1, p2].")


class MatchForfeit(BaseModel):
    bot: str
    player: Literal[1, 2]
    reason: str


class MatchResult(BaseModel):
    p1: str
    p2: str
    game: GameKey
    turns: int
    noise: float
    seed: int | None
    timeline: list[MatchTurn] = Field(description="One entry per completed turn.")
    final_scores: tuple[int, int] = Field(
        description="[p1, p2]. On a forfeit: 0 for the forfeiting bot, 3 per turn for the other.")
    forfeit: MatchForfeit | None

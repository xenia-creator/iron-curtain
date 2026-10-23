"""Run DEFAULT_EVENT on 20 generated bots with built-ins as background.

Run from backend/:  python -m scripts.event_demo
"""

import time

from engine.event import DEFAULT_EVENT, run_event
from scripts.stress import generate_bots

# 19 well-behaved bots plus one that crashes mid-match, to show disqualification
PICKS = [
    "coop_25", "coop_50", "coop_75", "coop_90",
    "generous_tft_5", "generous_tft_10", "generous_tft_30", "generous_tft_50",
    "defect_every_2", "defect_every_3", "defect_every_5", "defect_every_13",
    "majority_3", "majority_10", "majority_50",
    "patience_1", "patience_2", "patience_4", "patience_16",
    "crash_zero_div",
]

if __name__ == "__main__":
    all_bots = generate_bots()
    bots = {name: all_bots[name] for name in PICKS}

    start = time.monotonic()
    event = run_event(bots, DEFAULT_EVENT, seed=2026, include_builtins=True)
    elapsed = time.monotonic() - start

    for number, rnd in enumerate(event["rounds"], start=1):
        config = rnd["config"]
        entrants = len(rnd["advanced"]) + len(rnd["eliminated"])
        hidden = " (hidden)" if config.hide_turn_count else ""
        print(f"Round {number}: {config.name} | {config.game.name}, {rnd['turns']} turns{hidden}, "
              f"noise {config.noise} | {entrants} entrants")
        for row in rnd["leaderboard"][:5]:
            tag = "  [background]" if row["name"] not in bots else ""
            print(f"  {row['rank']:>2}. {row['name']:<22} {row['total']:>7}  {row['avg_per_turn']:.3f}/turn{tag}")
        if rnd["disqualified"]:
            reasons = {f["bot"]: f["reason"] for f in rnd["forfeits"]}
            for name in rnd["disqualified"]:
                print(f"  Disqualified: {name} ({reasons[name]})")
        print(f"  Advanced:   {', '.join(rnd['advanced'])}")
        print(f"  Eliminated: {', '.join(rnd['eliminated'])}\n")

    print(f"Champion: {event['champion']}   ({elapsed:.1f}s)")

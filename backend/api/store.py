"""In-memory team storage. Swap for a database later; keep this interface."""

import threading

_teams = {}  # team_name -> code, in insertion order
_lock = threading.Lock()


def add(name, code, replace=False):
    """Store a team. Returns False if the name is taken and replace is not set."""
    with _lock:
        if name in _teams and not replace:
            return False
        _teams[name] = code
        return True


def remove(name):
    with _lock:
        return _teams.pop(name, None) is not None


def clear():
    with _lock:
        count = len(_teams)
        _teams.clear()
        return count


def exists(name):
    return name in _teams


def snapshot():
    """A copy of all teams (name -> code), safe to use while others write."""
    with _lock:
        return dict(_teams)

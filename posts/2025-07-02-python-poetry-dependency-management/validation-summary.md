# Validation Summary: How to Use Poetry for Dependency Management in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Poetry (Python dependency manager / build tool), with attention to Poetry 2.x behavior
- Python packaging (pyproject.toml, PEP 517/518/621, PEP 561)
- pip / pipx / virtualenv (comparison and migration)
- PyPI / TestPyPI publishing
- Development tooling: pytest, black, ruff, mypy, pre-commit
- GitHub Actions and Docker (CI/CD integration)

## Sources Consulted
- Poetry CLI documentation — https://python-poetry.org/docs/cli/
- Poetry "Managing dependencies" docs — https://python-poetry.org/docs/managing-dependencies/
- Announcing Poetry 2.0.0 (breaking changes) — https://python-poetry.org/blog/announcing-poetry-2.0.0/
- Poetry 2.0 removals and breaking changes issue — https://github.com/python-poetry/poetry/issues/9136
- poetry-plugin-shell (replacement for `poetry shell`) — https://github.com/python-poetry/poetry-plugin-shell
- JetBrains tracker on `poetry lock --no-update` deprecation (Poetry 2.1.1) — https://youtrack.jetbrains.com/issue/PY-79570

## Issues Found
The post was largely accurate, but several commands/settings were broken or deprecated by the Poetry 2.0 release (Jan 2025). Since the post already references "Poetry 2.x" in places and the review date is mid-2026, these were corrected:

1. **`poetry shell` was removed in Poetry 2.0** (two locations). The command no longer exists in core. Replaced with `eval $(poetry env activate)` in the virtual-environment section (with a note that `poetry self add poetry-plugin-shell` restores the old command), and updated the Command Reference entry to `poetry env activate`.

2. **`poetry lock --no-update` is deprecated and is now the default** (three locations). In Poetry 2.0, `poetry lock` no longer updates already-locked versions by default, and `--regenerate` was added for the old "update everything" behavior. The `--no-update` flag was deprecated in 2.1.1. Replaced the bare-refresh cases with `poetry lock` and the "regenerate from scratch" cases with `poetry lock --regenerate`. Also fixed a misleading comment ("Update lock file without installing") to describe the actual behavior.

3. **`poetry install --sync` is deprecated in favor of the standalone `poetry sync` command** (one location, in the dependency-conflict troubleshooting block). Updated the command and the comment.

4. **`virtualenvs.prefer-active-python` is deprecated in Poetry 2.0** (two locations), replaced by the inverse setting `virtualenvs.use-poetry-python` (Poetry now prefers the active Python by default). Updated both `poetry config` examples and added explanatory notes.

5. **`poetry add --group test --optional pytest-benchmark` was incorrect.** `--optional` ties a dependency to an *extra*, not to a group, and in Poetry 2.0 `--optional` requires the extra name as its argument. Replaced with the correct pattern for adding to an optional group (`poetry add --group test pytest-benchmark`, with the group marked `optional = true` in pyproject.toml) plus a correct `--optional <extra>` example.

6. **Inaccurate comment on `poetry env list`** — it was labeled "List available Python versions," but the command lists the project's virtual environments. Corrected the comment.

## Review Notes
- The post correctly already flagged two Poetry 2.x changes: `poetry export` now requires the `poetry-plugin-export` plugin, and the deprecation guidance around `-D` (use `--group dev`). These were left intact.
- Version-constraint explanations are accurate, including the caret behavior for 0.x versions (`^0.104.0` → `>=0.104.0 <0.105.0`) and `poetry version` pre-release outputs (`prepatch`/`preminor`/`premajor` produce an `aN` suffix).
- Git/path/`@latest`/`@version` dependency syntaxes for `poetry add` are correct (e.g. `#branch` for git revisions).
- Minor, not changed: the first large `pyproject.toml` example lists packages under `[tool.poetry.extras]` (e.g. `psycopg2-binary`, `mysqlclient`) that are not declared as optional dependencies in that snippet. It is illustrative, and the dedicated "Extras and Optional Dependencies" section later shows the complete, correct pattern (declaring `optional = true` deps and referencing them in extras).
- Minor, not changed: the GitHub Actions example pins `actions/cache@v3` and `codecov/codecov-action@v3`, which still function but are not the latest major versions (v4/v5 exist). `actions/checkout@v4` and `actions/setup-python@v5` are current.
- The post uses the legacy `[tool.poetry]` metadata table. This remains fully supported in Poetry 2.x alongside the newer PEP 621 `[project]` table; no change needed.

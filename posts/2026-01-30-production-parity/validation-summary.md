# Validation Summary: How to Build Production Parity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python (config loading, secrets management, data anonymization, seed generation, parity monitoring)
- YAML configuration files
- HashiCorp Vault (via the `hvac` Python client)
- PostgreSQL 15 (`pg_dump`, `psql`, server_version, extensions)
- Redis 7
- Elasticsearch 8.11.0
- Docker Compose (services, healthchecks, command overrides)
- Nginx
- pip-tools (`pip-compile` with `--generate-hashes` and `--extra`)
- pyproject.toml dependency declaration
- Node.js / npm (engines field, version compare script)
- asdf version manager (`.tool-versions`)
- GitHub Actions (`actions/checkout@v4`, `actions/setup-python@v5`, `docker/setup-buildx-action@v3`)
- pytest (fixtures, subprocess-driven assertions)
- pandas / Faker (anonymization pipeline)
- Mermaid diagrams

## Sources Consulted
- PostgreSQL docs — `pg_dump` options (`--schema-only`, `--no-owner`, `--no-privileges`) and `SHOW server_version` / `pg_extension`: https://www.postgresql.org/docs/15/app-pgdump.html
- Redis `redis-server` CLI flags (`--maxmemory`, `--maxmemory-policy`, `--appendonly`): https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Docker official images for `postgres:15-alpine`, `redis:7-alpine`, `nginx:alpine` (Docker Hub)
- Elasticsearch official Docker image `docker.elastic.co/elasticsearch/elasticsearch:8.11.0`: https://www.docker.elastic.co/r/elasticsearch
- Docker Compose Compose Specification (healthchecks, depends_on conditions, command long-form): https://docs.docker.com/compose/compose-file/
- Python `typing` module — `Callable`, `Optional`, `Generator`: https://docs.python.org/3.11/library/typing.html
- Faker Python library (`from faker import Faker`): https://faker.readthedocs.io/
- HashiCorp Vault Python client `hvac` — `secrets.kv.v2.read_secret_version`: https://hvac.readthedocs.io/
- pip-tools `pip-compile` flags (`--generate-hashes`, `--extra`, `-o`): https://pip-tools.readthedocs.io/
- pyproject.toml `[project]` table per PEP 621
- asdf version manager (`.tool-versions` format, plugin names for nodejs/python/golang/postgres/redis): https://asdf-vm.com/
- GitHub Actions action versions verified against the respective action repos (checkout v4, setup-python v5, setup-buildx-action v3)
- PyPI for version existence: fastapi 0.109.0, uvicorn 0.27.0, sqlalchemy 2.0.25, psycopg2-binary 2.9.9, redis-py 5.0.1, pydantic 2.5.3, pydantic-settings 2.1.0, pytest 7.4.4, pytest-asyncio 0.23.3, black 24.1.0, ruff 0.1.14, mypy 1.8.0

## Issues Found

1. **`seed_generator.py` was missing `from faker import Faker`.** The class body uses `self.fake = Faker()`, so without the import the snippet raises `NameError` at runtime. Added the import alongside the other `typing`/`dataclasses`/`datetime` imports.

2. **`parity_monitor.py` typed a callback as `Optional[callable]`.** `callable` is the built-in predicate function, not a type — `Optional[callable]` is not a valid type expression and is flagged by type checkers (mypy, pyright). Changed the annotation to `Optional[Callable]` and added `Callable` to the `typing` import line.

## Review Notes
- `datetime.utcnow()` (used in `parity_monitor.py`) is deprecated as of Python 3.12 in favor of `datetime.now(timezone.utc)`. The post pins Python 3.11 (`requires-python = ">=3.11"`), where `utcnow()` is still valid, so this was left as-is. Worth revisiting if the post is refreshed for newer Python.
- `docker-compose.yml` declares `version: "3.8"`. The Compose Specification (Docker Compose v2) considers the top-level `version` field obsolete; it is ignored but produces a warning. The file remains functional and the rest of the syntax is current spec-compliant (healthchecks, `depends_on` conditions).
- The asdf install snippet uses `git clone ... --branch v0.13.1`, which is the final Bash-based release. asdf v0.14+ ships as a Go binary with a different install procedure. v0.13.1 still installs and operates as the snippet expects, so the script is correct as written.
- The `validate_infrastructure.sh` and pytest examples assume Docker Compose v2 container naming (`<project>-<service>-<index>`, e.g. `myapp-postgres-1`), which matches modern Compose default behavior. Users on legacy Compose v1 (underscore separator) would need to adjust.
- `psql ... | grep -oP '\d+\.\d+'` relies on GNU grep's PCRE support (`-P`), which is fine for the Ubuntu CI runner shown but would need adjustment on macOS/BSD grep.
- `random.choices` weights in the seed generator are documented in the comments as "realistic distribution" — these are illustrative, not authoritative, which the prose makes clear.

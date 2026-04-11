# Validation Summary: How to Use Docker for Redis Testing Environments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker (container runtime, `docker run`, `docker stop`, `docker rm`)
- Docker Compose V2 (`docker compose` CLI)
- Redis 7 (Alpine image)
- Python with pytest and redis-py
- Node.js with Jest and node-redis v4
- Bash scripting for test lifecycle management

## Sources Consulted
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- redis-py (Python) documentation: https://redis-py.readthedocs.io/
- node-redis (Node.js) documentation: https://github.com/redis/node-redis
- pytest fixtures documentation: https://docs.pytest.org/en/stable/how-to/fixtures.html
- Bash `set -e` behavior: https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html

## Issues Found
1. **Bug in bash test script: `set -e` prevents cleanup on test failure.** The script uses `set -e` (exit on error) but then runs `pytest tests/ -v` directly. If pytest returns a non-zero exit code (i.e., tests fail), `set -e` causes the script to terminate immediately at that line. The subsequent `EXIT_CODE=$?` is never reached, and critically, `docker compose -f docker-compose.test.yml down -v` never executes, leaving the Redis container running. **Fix:** Wrapped the pytest call with `set +e` / `set -e` so the exit code is captured without triggering early termination, ensuring the cleanup always runs.

## Review Notes
- The `version: "3.9"` field in the Docker Compose file is obsolete in Docker Compose V2 (it is silently ignored with a warning). It is not technically wrong, but future readers should know it can be omitted.
- The `docker compose exec` command in the wait loop may need a `-T` flag in non-TTY environments (e.g., CI runners) to avoid TTY allocation errors. This works fine in terminal environments as shown.
- The Python fixtures use `redis.Redis(db=1)` without specifying a port, which defaults to 6379. If the test Redis runs on a different port (e.g., 6381), the fixtures in the "Multiple Redis Databases" section would need the port parameter added. This is fine as a conceptual example but readers should note this.
- All redis-py API calls correctly expect bytes return values (`b"value1"`), matching the default `decode_responses=False` behavior.
- The node-redis v4 code correctly uses the promise-based API with `await client.connect()` and camelCase methods like `flushAll()`.

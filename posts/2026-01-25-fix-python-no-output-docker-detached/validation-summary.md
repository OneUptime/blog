# Validation Summary: How to Fix Python App No Output in Docker Detached Mode

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Python stdout/stderr buffering
- Python `PYTHONUNBUFFERED` and `-u`
- Python `print()` flushing
- Python `logging` and `StreamHandler`
- Dockerfile configuration
- Docker CLI commands
- Docker Compose environment variables
- GNU coreutils `stdbuf`

## Sources Consulted
- Python `sys` documentation: https://docs.python.org/3/library/sys.html
- Python command line and environment documentation: https://docs.python.org/3/using/cmdline.html
- Python built-in `print()` documentation: https://docs.python.org/3/library/functions.html#print
- Python logging handlers documentation: https://docs.python.org/3/library/logging.handlers.html#streamhandler
- Dockerfile `ENV` reference: https://docs.docker.com/reference/dockerfile/#env
- Docker Compose services `environment` reference: https://docs.docker.com/reference/compose-file/services/#environment
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker `container logs` CLI reference: https://docs.docker.com/reference/cli/docker/container/logs/
- GNU coreutils `stdbuf` manual: https://www.gnu.org/software/coreutils/manual/html_node/stdbuf-invocation.html
- Local CLI/runtime checks: `docker run --help`, `docker logs --help`, `docker inspect --help`, `stdbuf --help`, Python AST parsing of code blocks, and a local buffering behavior test comparing plain Python, `stdbuf -oL python`, and `python -u`.

## Issues Found
- The Docker Compose snippets used `version: '3.8'`. Current Docker Compose documentation marks the top-level `version` property as obsolete and warns that it is only retained for backward compatibility. Removed the `version` lines from both Compose examples.
- The original `stdbuf` section presented `stdbuf -oL python app.py` as a fix for Python buffering. GNU coreutils documents `stdbuf` as controlling standard stream buffering for commands, but Python configures its own standard streams; a local behavior test confirmed that `stdbuf -oL python3` did not flush a printed line early while `python3 -u` did. Updated the section to advise using `python -u` for unmodifiable Python applications and to avoid relying on `stdbuf` for Python `print()` buffering.

## Review Notes
The main Python buffering explanation, `PYTHONUNBUFFERED`, `python -u`, explicit `print(..., flush=True)`, `sys.stdout.flush()`, Docker `ENV`, Docker CLI log commands, and standard logging `StreamHandler` guidance are technically correct. The post could later mention that JSON-like logging built with a plain format string does not escape embedded quotes in messages, but that is a production robustness caveat rather than an error in the buffering guidance.

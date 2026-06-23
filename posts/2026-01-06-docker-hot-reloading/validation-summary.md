# Validation Summary: How to Set Up Hot Reloading in Docker for Node.js, Python, and Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker / Docker Compose (bind mounts, anonymous & named volumes, mount consistency)
- Node.js with nodemon (and ts-node/TypeScript)
- Next.js / Vite / Create React App (WATCHPACK_POLLING, CHOKIDAR_USEPOLLING)
- Python with watchdog/watchmedo
- Flask debug-mode reloader
- Django `runserver` auto-reload
- Uvicorn `--reload` (FastAPI/Starlette)
- Go with Air (air-verse) and `.air.toml`

## Sources Consulted
- watchdog `watchmedo` source (auto-restart argument parser) — https://github.com/gorakhargosh/watchdog/blob/master/src/watchdog/watchmedo.py and https://raw.githubusercontent.com/gorakhargosh/watchdog/master/src/watchdog/watchmedo.py
- watchdog on PyPI (`watchdog[watchmedo]` extra) — https://pypi.org/project/watchdog/
- Air example config and `runner/config.go` (`poll` / `poll_interval` fields) — https://github.com/air-verse/air/blob/master/air_example.toml and https://github.com/air-verse/air/blob/master/runner/config.go
- Air repository (install path `github.com/air-verse/air`) — https://github.com/air-verse/air
- General knowledge of nodemon config (`watch`/`ext`/`ignore`/`delay`/`exec`), Flask `flask run --reload`, Django `runserver`, Uvicorn `--reload`, and Docker volume `cached`/`delegated` consistency

## Issues Found
- **Incorrect watchmedo polling flag.** In the "Enable Polling (When Needed)" section the post used `--polling`:
  `command: watchmedo auto-restart --directory=./ --pattern=*.py --polling --recursive -- python app.py`
  The `auto-restart` subcommand has no `--polling` argument. Verified against the watchmedo source, the correct flag to force the polling observer is `--debug-force-polling` (`argument("--debug-force-polling", action="store_true", help="[debug] Forces polling.")`). Changed the command to use `--debug-force-polling` and updated the accompanying comment.

## Review Notes
- The Air install path `github.com/air-verse/air@latest` is current/correct — the project moved from the older `cosmtrek/air` path, and the post uses the new one.
- The Air `[build]` polling fields (`poll`, `poll_interval`) are valid; `poll_interval` is in milliseconds.
- `pip install watchdog[watchmedo]` is correct — `watchmedo` is a valid extra that pulls in PyYAML. In a shell, the brackets are best quoted (`'watchdog[watchmedo]'`), but in a Docker `RUN` line with no matching files in the build context they pass through literally, so the unquoted form works.
- In the Flask Dockerfile, `--reload` is redundant when `FLASK_DEBUG=1` (debug mode already enables the reloader), but it is harmless and not incorrect.
- `WATCHPACK_POLLING` (Webpack/Next.js) and `CHOKIDAR_USEPOLLING` (chokidar — used by CRA and Vite) are valid polling toggles. Vite also supports `server.watch.usePolling` directly; the env var still works because Vite uses chokidar.
- Docker's `cached`/`delegated` consistency flags remain valid on macOS but are largely no-ops with the modern VirtioFS file sharing implementation; still acceptable as written.

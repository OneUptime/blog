# Validation Summary: How to Use Multi-Stage Builds for Ubuntu Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker (multi-stage builds, BuildKit, buildx)
- Ubuntu 22.04 base image
- Dockerfile syntax (FROM ... AS, COPY --from, --target, ARG, TARGETARCH/TARGETPLATFORM)
- Go (1.22, static binary compilation with CGO_ENABLED=0)
- Python 3 (pip wheel pre-building, libpq, libffi, gunicorn)
- Node.js 20 via NodeSource, npm ci, TypeScript build
- CMake, build-essential, apt packaging (libssl3 vs libssl-dev, libpq5 vs libpq-dev)

## Sources Consulted
- Dockerfile reference – https://docs.docker.com/reference/dockerfile/ (comment handling, ARG/FROM scoping, multi-stage semantics)
- Docker multi-stage builds guide – https://docs.docker.com/build/building/multi-stage/
- Docker buildx multi-platform – https://docs.docker.com/build/building/multi-platform/
- BuildKit automatic platform ARGs (TARGETARCH/TARGETPLATFORM) – https://docs.docker.com/reference/dockerfile/#automatic-platform-args-in-the-global-scope
- moby/moby issues #3898 and #42135 on `#` comment handling in continued RUN lines
- Ubuntu jammy package index – https://packages.ubuntu.com/jammy/libssl3 and libpq5
- pip wheel docs – https://pip.pypa.io/en/stable/cli/pip_wheel/
- NodeSource setup_20.x – https://github.com/nodesource/distributions
- npm ci docs (--omit=dev replacing --production in npm 7+) – https://docs.npmjs.com/cli/v10/commands/npm-ci
- Go downloads (golang.org/dl redirects to go.dev/dl) – https://go.dev/dl/

## Issues Found

1. **Broken inline comment after a shell line-continuation `\`** in the "Basic Multi-Stage Build" Dockerfile:
   ```
   RUN apt-get update && apt-get install -y \
       libssl3 \       # Runtime library (not -dev)
       ca-certificates \
       && rm -rf /var/lib/apt/lists/*
   ```
   Docker's parser only strips `#` comments when `#` is the first non-whitespace character on a line. The trailing `#` here is passed to the shell. In shell, `#` starts a comment that runs to end-of-line, swallowing the `\` continuation. The effective result installs only `libssl3`, then tries to execute `ca-certificates` as a separate command (which fails). **Fix:** moved the explanatory note above the RUN as a standalone Dockerfile comment line and removed the inline `#`.

2. **Incorrect path in the Python runtime stage's `pip install -r`:**
   ```
   RUN pip3 install --no-index --find-links=/wheels -r /wheels/../requirements.txt
   ```
   `/wheels/../requirements.txt` resolves to `/requirements.txt`, which does not exist. The file was copied (in the builder stage) to `/wheels/requirements.txt` via `WORKDIR /wheels` + `COPY requirements.txt .`, and the runtime stage's `COPY --from=python-builder /wheels /wheels` brings it along under `/wheels/`. **Fix:** changed the path to `/wheels/requirements.txt`.

3. **Missing `WORKDIR /app` in the builder stage of the "Targeting Specific Stages" example.** Without it, `COPY . .` deposits files at `/` and `RUN make build` runs in `/`, making the subsequent `COPY --from=builder /app/tests` / `/app/myapp` references invalid. **Fix:** added `WORKDIR /app` after the apt install in the builder stage.

## Review Notes

- The two full-line `# ...` comments inside continued RUN blocks (e.g., the Python builder's "Build dependencies for Python packages with C extensions") are valid: Docker's BuildKit parser strips full-line comments before handing the instruction to the shell, so the surrounding packages still install correctly. These were left as-is.
- `pip wheel --no-deps -r requirements.txt` assumes `requirements.txt` is a fully-pinned, transitively-resolved file (e.g., output of `pip-compile` or `pip freeze`). If users provide a top-level-only requirements file, transitive deps will be missing from `/wheels`. Not an error in the post, but worth being aware of.
- The Go example uses `https://golang.org/dl/...`; this still works via a 301 redirect to `https://go.dev/dl/...`. Preferring the canonical `go.dev/dl` URL would be slightly more future-proof but is not incorrect today.
- The Python runtime CMD uses `python3 -m gunicorn ...`; gunicorn exposes `__main__`, so this works as long as `gunicorn` is listed in `requirements.txt` (assumed by the example).
- Ubuntu 22.04 is still under LTS support; `libssl3` (OpenSSL 3.0.x) and `libpq5` are the correct runtime package names in jammy.
- `npm ci --omit=dev` is the current recommended syntax in npm 7+ (Node 20 ships npm 10), replacing the deprecated `--production` flag.

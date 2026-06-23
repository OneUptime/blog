# Validation Summary: How to Pass Build Arguments and Environment Variables in Docker

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Docker (Dockerfile `ARG` and `ENV` instructions)
- Docker BuildKit secrets (`--mount=type=secret`, `--secret`)
- Docker Compose (variable interpolation, `env_file`, `build.args`, secrets)
- `.env` file format and `--env-file`
- Node.js / npm (used in examples)

## Sources Consulted
- Dockerfile reference — ARG and ENV scope rules: https://docs.docker.com/reference/dockerfile/
- Docker `run` reference — `--env-file` and `-e` behavior: https://docs.docker.com/reference/cli/docker/container/run/
- Build secrets / BuildKit: https://docs.docker.com/build/building/secrets/
- Compose interpolation and precedence: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- moby/moby #46773 — `docker run --env-file` preserves quotation marks: https://github.com/moby/moby/issues/46773
- docker/cli #3630 — quote handling in `--env-file`: https://github.com/docker/cli/issues/3630
- "Don't Quote Environment Variables in Docker": https://tomvanantwerp.com/technical-writing/dont-quote-env-variables-in-docker/

## Issues Found
1. **Incorrect `.env` quoting advice (`### The .env File Format` section).** The section immediately follows the `docker run --env-file .env` example, but advised that "Quotes are optional but recommended for special characters" and showed `GREETING="Hello, World!"`. This is wrong for `docker run --env-file`: Docker does **not** strip quotes from `--env-file` values — the quote characters become part of the value, so `GREETING` would be set to the literal `"Hello, World!"` (including the quotes). This is a well-documented gotcha (moby/moby #46773, docker/cli #3630) and differs from Docker Compose's `env_file`, which does strip quotes. **Fix:** rewrote the comment/example to warn that values are used as-is with `docker run --env-file`, recommend unquoted values, and note that Compose behaves differently. Also adjusted the section intro sentence to say "the handling of quotes" instead of "quoting for special characters."

## Review Notes
- The rest of the post is technically accurate: ARG-before-FROM scope and redeclaration rules, ARG-without-default defaulting to empty string, `ENV` interpolation, `EXPOSE`/`FROM` using ARG/ENV substitution, `--build-arg`/`-e`/`--env-file` flags, BuildKit `--mount=type=secret` syntax and `/run/secrets/<id>` mount path, `docker build --secret id=...,src=...`, Compose `${VAR:-default}` interpolation, pass-through `- DATABASE_URL`, resolution precedence (shell > `.env` > Compose defaults), Docker secrets mounting at `/run/secrets/`, and `docker history`/`docker inspect`/`docker compose config` debugging commands.
- Minor (not changed, illustrative only): in the BuildKit secrets example the bash command uses `src=.npmrc` while the Dockerfile treats the mounted secret as a bare token via `NPM_TOKEN=$(cat /run/secrets/npm_token)`. A cleaner pairing would mount a file containing only the token (e.g. `src=npm_token.txt`). The Docker syntax shown is correct; this is only a naming/contents mismatch in the demonstration.
- Version note: `npm install --omit=dev` is correct for npm 7+ (the older `--only=production` / `--production` flag is deprecated). `node:22` and `alpine:3.19` tags are reasonable, current pins.

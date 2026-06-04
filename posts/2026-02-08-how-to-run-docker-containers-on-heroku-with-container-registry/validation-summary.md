# Validation Summary: How to Run Docker Containers on Heroku with Container Registry

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Docker
- Heroku Container Registry and Runtime
- Heroku CLI
- heroku.yml
- Node.js and Express
- Heroku Postgres
- Heroku Data for Redis / Heroku Key-Value Store
- GitHub Actions
- Heroku Platform API

## Sources Consulted
- Heroku Dev Center: Container Registry & Runtime (Docker Deploys) - https://devcenter.heroku.com/articles/container-registry-and-runtime
- Heroku Dev Center: Building Docker Images with heroku.yml - https://devcenter.heroku.com/articles/build-docker-images-heroku-yml
- Heroku Dev Center: Limits - https://devcenter.heroku.com/articles/limits
- Heroku Help: Why is my app crashing with an R10 error? - https://help.heroku.com/W5ETWBQB/why-is-my-app-crashing-with-an-r10-error
- Heroku Dev Center: The Heroku CLI - https://devcenter.heroku.com/articles/heroku-command
- Heroku Dev Center: Heroku CLI Commands - https://devcenter.heroku.com/articles/heroku-cli-commands
- Heroku Dev Center: Logging - https://devcenter.heroku.com/articles/logging
- Heroku Dev Center: Choosing the Right Heroku Postgres Plan - https://devcenter.heroku.com/articles/postgres-essential-tier

## Issues Found
- The prerequisites said to install a separate container plugin and created the app without setting the container stack. Heroku's current documentation uses `heroku container:login` through the Heroku CLI and says container apps should use the `container` stack, so the text now says to install the CLI and creates the app with `heroku create myapp-docker --stack container`.
- The Dockerfile example used `EXPOSE $PORT` as if Heroku used it. Heroku documents that `EXPOSE` is not respected by the container runtime and the app must bind to `$PORT`, so the `EXPOSE` line was removed.
- The Heroku image requirement only said images must be Linux-based. Heroku Container Runtime supports `x86_64` images, so the requirement now specifies `x86_64`/`linux/amd64`.
- The multi-process `container:push` command omitted `--recursive`, which is required when using `Dockerfile.<process-type>` files in the documented multiple-image workflow. The command now includes `--recursive`.
- The `heroku.yml` example set `NODE_ENV` under `build.config`, which is build-time configuration and must match Dockerfile `ARG` lines. The unsupported build-time config was removed from the snippet.
- The basic GitHub Actions workflow used the Heroku CLI without installing it. An install step using Heroku's official install script was added.
- The direct Docker build workflow did not force `linux/amd64`, which can produce unsupported ARM64 images on ARM builders. The Docker build command now includes `--platform linux/amd64`.
- The log-filtering command used a dyno filter for a process-type example. It now uses the documented `--process-type web` filter.
- The release Dockerfile example did not show the required release-image push/release commands. Commands were added to push and release the `release` image with the `web` image.
- The health-check section incorrectly showed `WEB_CONCURRENCY=2` as a way to increase boot timeout. Heroku documents boot timeout as a platform limit handled through the boot timeout tool or support, so that command was replaced with accurate guidance.

## Review Notes
- The Heroku CLI was not installed in the local review environment, so CLI behavior was verified against official Heroku CLI and Dev Center documentation instead of local `--help` output.
- Heroku plan names can change over time; `heroku-postgresql:essential-0` was verified as current in official Heroku Postgres documentation.
- The direct Docker push/API release workflow is technically valid, but teams may prefer the Heroku CLI release command when they tag images by process type because it is simpler and less error-prone.

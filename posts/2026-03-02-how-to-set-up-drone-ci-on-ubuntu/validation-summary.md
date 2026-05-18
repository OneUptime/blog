# Validation Summary: How to Set Up Drone CI on Ubuntu

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Drone CI (drone/drone:2 server, drone/drone-runner-docker:1)
- Docker / Docker Compose
- Ubuntu
- Nginx (reverse proxy)
- Let's Encrypt / Certbot
- Gitea OAuth2 / GitHub OAuth
- Drone CLI (github.com/harness/drone-cli)
- Drone Docker plugin (plugins/docker)
- PostgreSQL (in services example)
- Node.js, Python (in pipeline examples)

## Sources Consulted
- Drone documentation: https://docs.drone.io/
- Drone Gitea provider docs: https://docs.drone.io/server/provider/gitea/
- Drone GitHub provider docs: https://docs.drone.io/server/provider/github/
- drone-runner-docker source: https://github.com/drone-runners/drone-runner-docker (command registration in `command/command.go`)
- drone-runner-docker Dockerfile: confirmed entrypoint `/bin/drone-runner-docker`
- Drone CLI releases: https://github.com/harness/drone-cli/releases (confirmed `drone_linux_amd64.tar.gz` asset exists, URL returns HTTP 200)
- Drone pipeline syntax docs: https://docs.drone.io/pipeline/docker/syntax/

## Issues Found

1. **Invalid troubleshooting command `drone-runner ping`** (Troubleshooting section).
   - What was wrong: The command `docker compose exec drone-runner drone-runner ping` is invalid on two counts. First, the binary inside the `drone/drone-runner-docker` image is named `drone-runner-docker` (not `drone-runner`). Second, that binary only registers four subcommands — `compile`, `exec`, `copy`, and `daemon` — there is no `ping` subcommand. The command would fail with a "command not found" / unknown subcommand error.
   - What I changed: Replaced it with a log-grep approach that looks for the runner's successful-connection log line: `docker compose logs drone-runner | grep -i "successfully pinged the remote server"`. This is the canonical way to confirm the runner has registered with the server when the runner's HTTP port isn't exposed.
   - Why: Gives the reader an instruction that actually works against the current `drone-runner-docker:1` image.

## Review Notes

- The `version: "3.8"` field in the Docker Compose file is technically obsolete in Docker Compose v2 (it will print a deprecation warning) but still works and is widely used. Not changed.
- The `sudo apt install -y docker.io docker-compose-plugin` line mixes the Ubuntu `docker.io` package with Docker Inc.'s `docker-compose-plugin` package. On recent Ubuntu releases `docker-compose-plugin` is available in the universe repository so the command can succeed, but on systems where it isn't, the recommended path is to install the full Docker repo set (`docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin`) from Docker's apt repo. Left as-is since it works on supported recent Ubuntu releases.
- Image tags `drone/drone:2` and `drone/drone-runner-docker:1` track the major versions and were current at review time.
- The `/login` OAuth redirect URI is correct for both Gitea and GitHub providers (verified against Drone's documented `DRONE_*_REDIRECT_URL` defaults).
- The `https://drone.example.com/hook` webhook URL referenced in troubleshooting is the correct Drone webhook path.
- Pipeline YAML examples (kind/type/name, steps, services, trigger, when, depends_on, from_secret, `plugins/docker` settings, `${DRONE_TAG}` substitution) all match current Drone pipeline syntax.

# Validation Summary: How to Deploy a Factorio Server via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose / Compose Specification
- Factorio dedicated server (`factoriotools/factorio`)
- UFW
- RCON

## Sources Consulted
- FactorioTools Docker image documentation: https://hub.docker.com/r/factoriotools/factorio/
- FactorioTools GitHub repository README: https://github.com/factoriotools/factorio-docker
- Portainer documentation, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer documentation, Stacks: https://docs.portainer.io/user/docker/stacks
- Portainer documentation, Inspect or edit a stack: https://docs.portainer.io/2.21/user/docker/stacks/edit
- Portainer documentation, Automatic updates for stacks/applications: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Docker Docs, Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, `docker container logs`: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs, `docker container stats`: https://docs.docker.com/reference/cli/docker/container/stats/
- Docker Docs, restart policies: https://docs.docker.com/engine/containers/start-containers-automatically/
- Ubuntu `ufw(8)` manpage: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Factorio official system requirements: https://www.factorio.com/buy
- Factorio Wiki, Command line parameters: https://wiki.factorio.com/Command_line_parameters
- Factorio Wiki, Console: https://wiki.factorio.com/Console

## Issues Found
- The firewall guidance was incorrect. The post used combined `ufw` syntax that does not match `ufw`'s documented simple form, and it listed `27015` as UDP. I changed this to `34197/udp` and optional `27015/tcp`, which matches the Factorio image documentation.
- The Compose `ports` example was invalid. It combined two mappings into one string. I split them into separate port entries and corrected `27015` to TCP.
- The Compose `environment` example in the main stack was invalid YAML/Compose syntax and also used unsupported generic auto-update variables for this image. I removed the unsupported main-stack env block and replaced the later update section with the image's documented mod-update variables.
- The post mounted persistent data at `/game-data`, but the `factoriotools/factorio` image documents a single data volume at `/factorio`. I corrected the compose file and backup commands to use `/factorio`.
- The top-level Compose `version: "3.8"` field is obsolete in current Compose. I removed it to avoid the current warning and keep the example aligned with modern Compose guidance.
- The backup container command escaped `$` characters, which would prevent the shell from expanding `DATE` and the generated filenames correctly. I fixed the shell snippet so the backup loop would work as written.
- The backup service used `restart: "no"` despite being described as an automated backup service. I changed it to `unless-stopped` so it resumes after host or daemon restarts.
- The original Step 3 mixed in-container console actions with host-level `docker` commands. I changed that section to only show valid in-container inspection commands and moved restart guidance outside the console snippet.
- The original Step 4 said to "configure server RAM to 70-80% of available", which is not a real Factorio container setting. I replaced this with accurate monitoring guidance.
- The original automatic update section used `AUTO_UPDATE`, `AUTO_REBOOT`, and `CRON_AUTO_UPDATE`, which are not documented for `factoriotools/factorio`. I replaced that section with the image's documented mod update behavior using `USERNAME`, `TOKEN`, `UPDATE_MODS_ON_START`, and `UPDATE_IGNORE`.
- The original admin section referenced `/restart-server.sh`, which is not documented by the image. I replaced it with documented/local RCON usage and valid log commands.

## Review Notes
- The guide now reflects that `27015/tcp` is optional and only needed for remote RCON access; local `docker exec ... rcon ...` usage does not require exposing the RCON port.
- Portainer's automatic GitOps/webhook update features apply to stacks deployed from a Git repository. This post deploys from the web editor, so image updates are still a manual redeploy task unless the workflow is changed.
- I could not run `docker compose config` in this workspace because the `docker` CLI is not installed here. I did perform a YAML syntax validation of the embedded Compose block locally after the edits.

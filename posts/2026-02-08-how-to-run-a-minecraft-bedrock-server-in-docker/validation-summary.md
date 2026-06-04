# Validation Summary: How to Run a Minecraft Bedrock Server in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Minecraft Bedrock Dedicated Server
- itzg/minecraft-bedrock-server Docker image
- BedrockConnect
- UDP port forwarding
- Server backup and restore commands

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker CLI help output for `docker run`, `docker exec`, `docker cp`, and `docker attach`
- itzg/docker-minecraft-bedrock-server README: https://github.com/itzg/docker-minecraft-bedrock-server
- Minecraft Bedrock Dedicated Server download and system requirements: https://www.minecraft.net/en-us/download/server/bedrock
- Minecraft Help dedicated server software page: https://help.minecraft.net/hc/en-us/articles/4408873961869-How-to-Download-Dedicated-Minecraft-Server-Software
- Pugmatt/BedrockConnect README and configuration docs: https://github.com/Pugmatt/BedrockConnect and https://github.com/Pugmatt/BedrockConnect/wiki/Configuration

## Issues Found
- The prerequisites listed 1GB of RAM with 2GB recommended. The official Minecraft Bedrock Dedicated Server system requirements list 4GB RAM, so the post now says at least 4GB.
- The quick-start connection instructions told readers to use `localhost`. That only works when the Bedrock client is running on the same machine as Docker, so the post now directs users to use the host machine's IP address and notes the `localhost` exception.
- The Compose snippet used the top-level `version: "3.8"` field. Docker's current Compose documentation marks this field obsolete and only informative, so it was removed.
- The BedrockConnect example used `ghcr.io/pugmatt/bedrockconnect` and a `--custom-servers` flag. The official BedrockConnect README documents the Docker image as `pugmatt/bedrock-connect`, and custom server lists are configured with `custom_servers=...`, so the example was updated to mount a JSON file and pass the documented configuration argument.
- The BedrockConnect example attempted to bind UDP port 19132 while the Bedrock server in the same guide also binds UDP 19132. The post now warns readers to run BedrockConnect on a different host or move the Bedrock server to a different port.

## Review Notes
- The Docker Compose YAML snippet was parsed successfully with `docker compose -f - config`.
- The `itzg/minecraft-bedrock-server` image documents UDP 19132 for IPv4, UDP 19133 for IPv6, `/data` persistence, `EULA=TRUE`, `VERSION=LATEST`, and the bundled `send-command` helper, matching the guide.
- The allowlist, server command, volume, backup, and update flows are technically plausible for the documented image and Bedrock Dedicated Server behavior.

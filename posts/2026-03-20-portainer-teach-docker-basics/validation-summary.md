# Validation Summary: How to Teach Docker Basics Using Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Docker Compose / Portainer Stacks
- Nginx
- PostgreSQL
- Adminer
- Python Docker images

## Sources Consulted
- Docker Docs: Running containers - https://docs.docker.com/engine/containers/run/
- Docker Docs: Publishing and exposing ports - https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: `docker volume create` reference - https://docs.docker.com/reference/cli/docker/volume/create/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: `docker inspect` reference - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: `docker image history` reference - https://docs.docker.com/reference/cli/docker/image/history/
- Docker Docs: View container logs - https://docs.docker.com/engine/logging/
- Portainer Docs: Add a new container - https://docs.portainer.io/2.27/user/docker/containers/add
- Portainer Docs: Advanced container settings - https://docs.portainer.io/user/docker/containers/advanced
- Portainer Docs: Access a container's console - https://docs.portainer.io/sts/user/docker/containers/console
- Portainer Docs: Console troubleshooting - https://docs.portainer.io/faqs/troubleshooting/ui-and-features/why-cant-i-use-the-console-with-my-container
- Portainer Docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer Docs: Add a new volume - https://docs.portainer.io/user/docker/volumes/add
- Docker Hub Official Image: Adminer - https://hub.docker.com/_/adminer/
- Docker Docs: PostgreSQL immediate setup and data persistence - https://docs.docker.com/guides/postgresql/immediate-setup-and-data-persistence/

## Issues Found
- The Lesson 3 teaching script said the container was reachable at `http://my-webserver:80` "inside Docker". That is misleading for a default bridge network, where containers are not reachable by name unless they share a user-defined network. I changed the script to describe the container-local port and the published host URL instead.
- The Lesson 5 persistence walkthrough reused Portainer's Console with `nginx:alpine` but did not mention two Portainer requirements: console access may require Interactive + TTY to be enabled for the container, and Alpine-based containers should use `/bin/ash`. I updated the steps so the console example matches Portainer's documented behavior.
- The Lesson 5 volume example said `Volumes > Add Volume` and then labeled the mapping as "bind or named". That conflicts with the preceding step, which creates a Docker-managed named volume. I changed the wording to "named volume".
- The Lesson 6 stack example would not work as written: it used an obsolete top-level Compose `version` field and an `app` service based on `node:18-alpine` that runs `npm install && node server.js` without providing any application files. I replaced it with a working two-container example using `adminer:5-standalone` and `postgres:15-alpine`, kept the persisted Postgres volume, and removed the obsolete `version` key.

## Review Notes
- `postgres:15-alpine`, `python:3.11-slim`, `ubuntu:22.04`, and `nginx:alpine` are all plausible image tags as of the review date, but they should be rechecked periodically because image support windows and default tags change over time.
- `docker` was not installed in this workspace, so command verification was performed against official Docker and Portainer documentation rather than local CLI help output.

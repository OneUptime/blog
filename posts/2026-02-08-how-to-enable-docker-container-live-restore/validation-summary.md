# Validation Summary: How to Enable Docker Container Live Restore

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker daemon configuration
- Docker live restore
- systemd
- Docker CLI
- Linux package upgrades with apt
- Container networking and logging
- Docker Swarm

## Sources Consulted
- Docker Docs: Live restore - https://docs.docker.com/engine/daemon/live-restore/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker Docs: dockerd reference, daemon configuration reload behavior - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: docker system info reference - https://docs.docker.com/reference/cli/docker/system/info/
- Docker Docs: docker version reference - https://docs.docker.com/reference/cli/docker/version/
- Docker Docs: Start containers automatically / restart policies - https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Docs: Docker networking DNS services - https://docs.docker.com/network/
- Docker Docs: Install Docker Engine on Ubuntu / upgrade guidance - https://docs.docker.com/installation/ubuntulinux/

## Issues Found
- The post implied live restore covers Docker upgrades generally. Docker only supports live restore across patch releases within the same `YY.MM.x` release line. Updated the introduction, limitation text, and upgrade script framing to say patch releases.
- The post said containers restart and are recreated when upgrading to a different Docker version. Docker documents that major or skipped upgrades may prevent daemon reconnection; if reconnection fails, the daemon cannot manage the containers and they must be stopped manually. Replaced the inaccurate restart/recreate claim.
- The post described Swarm as incompatible and said enabling live restore causes conflicts on Swarm nodes. Docker documents that live restore applies to standalone containers, not Swarm services. Reworded the section to match the documented Swarm behavior.
- The post said daemon-level configuration changes only affect new containers. Docker documents that live restore may fail if daemon options such as bridge IP addresses or graph driver change. Replaced this with the documented limitation.
- The post said logs may not be captured during long daemon downtime. Docker documents that containers can fill the FIFO log buffer and then block on further log writes. Updated the log limitation accordingly.
- The upgrade script used an unpinned `apt-get install` command, which could install an unsupported major upgrade. Updated the script to require a `VERSION_STRING` and adjusted the usage example to pass it through `sudo env`.
- The restart sequence said the daemon saves running container state before exit. Reworded this to avoid implying a specific state-save operation that Docker does not document.
- The network section overstated that published ports remain accessible throughout the restart. Added Docker's documented caveat that networking and user input can be interrupted and made the published-port wording conditional on unchanged network options.

## Review Notes
The core setup commands and configuration are correct: `/etc/docker/daemon.json`, `"live-restore": true`, `systemctl reload docker`, `docker info | grep -i "live restore"`, `docker run`, `docker ps --filter name=...`, and `docker rm -f` match Docker's documented behavior and current CLI syntax. The post is Linux-focused; Docker documents that live restore is not supported for Windows containers.

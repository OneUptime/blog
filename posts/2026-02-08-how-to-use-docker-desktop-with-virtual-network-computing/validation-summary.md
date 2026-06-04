# Validation Summary: How to Use Docker Desktop with Virtual Network Computing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker and Docker Desktop
- Docker Compose
- Ubuntu and Debian container images
- TigerVNC
- noVNC and websockify
- XFCE
- Firefox ESR
- Selenium Docker images
- SSH tunneling

## Sources Consulted
- Docker CLI reference for `docker container run`, port publishing, and `--shm-size`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose file reference for services, ports, volumes, and `shm_size`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Ubuntu 22.04 TigerVNC manpage for `vncserver`, `-localhost`, `-fg`, `-geometry`, `-depth`, and password file behavior: https://manpages.ubuntu.com/manpages/jammy/man1/tigervncserver.1.html
- TigerVNC `Xvnc` documentation for virtual X display behavior: https://tigervnc.org/doc/Xvnc.html
- noVNC/websockify documentation for `--web`, `--cert`, and `--key`: https://github.com/novnc/websockify
- Selenium Docker official repository documentation for current standalone images, VNC/noVNC ports, `SE_VNC_PASSWORD`, and `--shm-size`: https://github.com/SeleniumHQ/docker-selenium
- Ubuntu package listing for `firefox` in Jammy showing it is a transitional package to Snap: https://packages.ubuntu.com/jammy/firefox

## Issues Found
- TigerVNC examples started `vncserver` without `-localhost no`, which can bind the VNC server to loopback only and make Docker host port publishing unusable for direct VNC clients. Added `-localhost no` to the VNC server commands that are meant to be reached through published Docker ports.
- The explanation and diagram implied all VNC setups render through Xvfb, but TigerVNC's standalone server provides its own virtual X display. Changed the wording and diagram label to "virtual X display or framebuffer."
- The Firefox Dockerfile used `ubuntu:22.04` with `apt-get install firefox`. On Ubuntu 22.04, `firefox` is a transitional package to the Firefox Snap, which is unsuitable for this simple container example. Changed that example to `debian:12` with `firefox-esr` and updated the startup command.
- The Selenium example used `selenium/standalone-chrome-debug:latest`, which is not the current documented pattern. Updated it to `selenium/standalone-chrome:latest`, added the documented noVNC port `7900`, and noted browser access through noVNC.
- The browser shared-memory note stated Chrome and Firefox crash without `--shm-size=512m` as an absolute. Softened it to say they can crash or behave unreliably without enough shared memory.

## Review Notes
- The examples intentionally keep simple demo passwords and broad host port publishing for local Docker Desktop use. For real remote deployments, bind published ports to localhost or use SSH/TLS as described in the security section.
- The Compose example sets `VNC_RESOLUTION` and `VNC_DEPTH`, but the sample startup script does not read those environment variables. This is not a syntax error, but future revisions could wire those values into `/start.sh` for consistency.

# Validation Summary: How to Enable the Podman REST API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman REST API
- Docker-compatible Engine API
- systemd socket and service units
- curl
- Docker CLI and Docker SDK for Python
- nginx reverse proxy with mutual TLS
- SSH tunneling
- firewalld

## Sources Consulted
- Podman `podman system service` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman REST API reference: https://docs.podman.io/en/latest/_static/api.html
- Podman REST API and Docker compatibility blog from the Podman project: https://podman.io/blogs/2020/07/01/rest-versioning.html
- Docker Engine API version history: https://docs.docker.com/reference/api/engine/version-history/
- Docker CLI `DOCKER_HOST` host syntax documentation: https://docs.docker.com/reference/cli/docker/
- Docker SDK for Python client documentation: https://docker-py.readthedocs.io/en/stable/client.html

## Issues Found
- The post described Docker-compatible Podman endpoints as `/v1.41/`. Podman's official `podman system service` documentation states that its compatibility layer targets Docker API v1.40, so the text and curl example were changed to `/v1.40/`.
- The TCP `podman system service` examples used `tcp:host:port`. Current Podman documentation shows endpoint arguments in URI form such as `tcp://localhost:8080`, so the manual TCP commands and custom systemd unit were updated to `tcp://...`.
- The post implied that plain TLS through a reverse proxy was enough for production TCP exposure. Podman's official security guidance strongly recommends mutual TLS for TCP access and recommends SSH forwarding for remote access, so the warning, nginx snippet, and conclusion were updated to mention mutual TLS/client authentication.
- The version check said users should see `podman version 4.9.3` or later. Package versions vary by distribution, so this was softened to describe it as example output.

## Review Notes
Podman was not installed in the local review environment, so CLI verification through `podman --help` was not possible. Commands and behavior were verified against official Podman and Docker documentation instead.

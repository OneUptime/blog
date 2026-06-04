# Validation Summary: How to Use Docker Compose dns and dns_search Options

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker Engine networking
- DNS resolver configuration
- Docker daemon configuration
- YAML and JSON configuration snippets

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker networking overview and DNS services: https://docs.docker.com/engine/network/
- Docker daemon CLI and configuration reference: https://docs.docker.com/reference/cli/dockerd/
- Docker container run reference: https://docs.docker.com/engine/containers/run/
- Linux resolver configuration man page: https://manpages.debian.org/unstable/manpages/resolv.conf.5.en.html

## Issues Found
- Removed obsolete top-level `version: "3.8"` entries from Compose examples. Docker Compose now treats the top-level `version` property as obsolete and validates files against the current Compose Specification regardless of the value.
- Corrected the Docker DNS resolution-order explanation and Mermaid diagram. The container resolver applies search-domain behavior from `/etc/resolv.conf`, then DNS queries are handled by Docker's embedded DNS server on user-defined networks and forwarded upstream when Docker cannot resolve them internally.
- Fixed the `daemon.json` example by moving the path note outside the JSON code block. JSON does not support `//` comments, so the original snippet was not valid JSON.

## Review Notes
The Compose `dns` and `dns_search` fields, Docker daemon `dns` and `dns-search` keys, Docker CLI `--dns` and `--dns-search` flags, static IPAM example, and `dns_search: [""]` Compose example were validated against Docker documentation and local Docker/Compose behavior.

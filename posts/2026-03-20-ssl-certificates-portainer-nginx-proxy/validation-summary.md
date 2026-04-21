# Validation Summary: How to Configure SSL Certificates for Portainer with Nginx Proxy Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Community Edition
- Nginx Proxy Manager
- Docker Compose
- Docker networking and volumes
- Let's Encrypt / ACME HTTP-01 validation
- SSL/TLS and HTTPS reverse proxying

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer CE Docker Standalone installation documentation: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer requirements and ports documentation: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer reverse proxy documentation: https://docs.portainer.io/advanced/reverse-proxy/nginx
- Nginx Proxy Manager setup documentation: https://nginxproxymanager.com/setup/
- Nginx Proxy Manager guide: https://nginxproxymanager.com/guide/
- Nginx Proxy Manager advanced Docker network guidance: https://nginxproxymanager.com/advanced-config/
- Let's Encrypt integration guide: https://letsencrypt.org/ca/docs/integration-guide/

## Issues Found
- The Docker Compose example used the top-level `version: "3.8"` field. Docker's current Compose Specification keeps this field only for backward compatibility, treats it as obsolete, and emits a warning when it is used. Removed the `version` line so the snippet follows current Docker Compose guidance.
- The prerequisites said ports 80 and 443 were accessible "for Let's Encrypt". Let's Encrypt's HTTP-01 challenge requires inbound port 80, while port 443 is needed for HTTPS traffic after certificate issuance. Updated the wording to make that distinction accurate.

## Review Notes
- The Portainer service name `portainer` is valid as the Nginx Proxy Manager upstream hostname because both services are attached to the same Compose network.
- Forwarding to Portainer on port `9000` is consistent with Portainer's reverse proxy examples for Docker deployments.
- For production deployments, pinning explicit image tags or using Portainer's LTS/STS tags would make upgrades more predictable than floating `latest` tags, but the tags used in the post are valid.
- Local checks: `validation.json` parsed with `jq`, and the Compose YAML snippet parsed with PyYAML. Docker Compose itself is not installed in this workspace, so `docker compose config` could not be run.

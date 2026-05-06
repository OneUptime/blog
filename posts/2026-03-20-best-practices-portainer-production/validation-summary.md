# Validation Summary: Best Practices for Running Portainer in Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Docker
- Docker Compose
- Nginx
- UFW
- Uptime Kuma

## Sources Consulted
- Portainer: Using your own SSL certificate with Portainer - https://docs.portainer.io/advanced/ssl
- Portainer: Deploying Portainer behind nginx reverse proxy - https://docs.portainer.io/advanced/reverse-proxy/nginx
- Portainer: CLI configuration options - https://docs.portainer.io/advanced/cli
- Portainer: API documentation - https://docs.portainer.io/api/docs
- Portainer OpenAPI docs for BE 2.39.1 - https://api-docs.portainer.io/?edition=ee&version=2.39.1
- Portainer: Portainer architecture - https://docs.portainer.io/start/architecture
- Portainer: Lifecycle policy - https://docs.portainer.io/start/lifecycle
- Portainer: Requirements and prerequisites - https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer FAQ: How can I ensure Portainer's configuration is retained? - https://docs.portainer.io/faqs/installing/how-can-i-ensure-portainers-configuration-is-retained
- Portainer FAQ: What does Portainer's backup include? - https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer: Initial setup - https://docs.portainer.io/start/install/server/setup
- Portainer FAQ: What information does Portainer collect? - https://docs.portainer.io/faqs/getting-started/what-information-does-portainer-collect
- Docker: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker: Deprecated and retired Docker products and features - https://docs.docker.com/retired/
- Docker: docker system prune - https://docs.docker.com/reference/cli/docker/system/prune/
- Docker: Running containers - https://docs.docker.com/engine/containers/run/

## Issues Found
- The production examples used `portainer/portainer-ee:latest`. I changed them to `portainer/portainer-ee:lts` because Portainer recommends LTS releases for production workloads.
- The Compose snippet used the obsolete top-level `version` field. I removed it to align with the current Compose Specification.
- The post presented a fixed Portainer CPU/RAM sizing matrix, but Portainer does not publish an official resource-sizing table. I replaced that section with documentation-backed guidance about sizing by actual usage and persistent storage performance.
- The monitoring endpoint was wrong. I changed `https://portainer.example.com/api/status` to `https://portainer.example.com/api/system/status`, which is the current public status endpoint in Portainer's API.
- The security-hardening notes included controls that are not documented Portainer features in current official docs. I replaced them with documented guidance around the initial admin account, centralized authentication options, `--trusted-origins` for reverse proxies, and analytics opt-out during setup.
- The high-availability section suggested a multi-instance/load-balanced Portainer Server setup. Portainer's architecture docs explicitly state that multiple Portainer Server instances managing the same clusters are not supported, so I replaced that guidance with documented persistence, placement, backup, and monitoring recommendations.
- The maintenance section recommended scheduled `docker system prune` across production hosts. I changed this to a cautionary review step because Docker documents that the command removes unused containers, networks, images, and build cache.

## Review Notes
- Portainer's current SSL documentation still uses `--sslcert` and `--sslkey` for serving Portainer with custom certificates, so those flags were retained in the post.
- Portainer's deprecated-features page currently lists `--sslcert` and `--sslkey` as deprecated, but the active SSL setup documentation still prescribes them for Portainer's server certificate configuration. I followed the working installation guidance from the SSL documentation.
- The nginx reverse-proxy example continues to target Portainer's internal HTTP listener on port `9000` while keeping client-facing traffic on HTTPS. This matches Portainer's reverse-proxy documentation.

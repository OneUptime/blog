# Validation Summary: How to Fix Docker 'Context Deadline Exceeded' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Hub and registry API
- BuildKit
- systemd
- Linux networking, DNS, TLS, and firewall tools
- GitHub Actions and GitLab CI

## Sources Consulted
- Docker CLI reference for `dockerd` daemon options: https://docs.docker.com/reference/cli/dockerd/
- Docker daemon proxy configuration: https://docs.docker.com/engine/daemon/proxy/
- Docker registry client certificate configuration: https://docs.docker.com/engine/security/certificates/
- Docker Hub pull usage and rate limits: https://docs.docker.com/docker-hub/usage/pulls/
- Docker CLI local help for `docker pull`, `docker manifest inspect`, `docker build`, and `docker system prune`
- GitHub Marketplace entry for `nick-fields/retry`: https://github.com/marketplace/actions/retry-step

## Issues Found
- The `/etc/docker/daemon.json` examples included `//` comments inside `json` code blocks. JSON does not allow comments, so those comments were removed from the snippets.
- The slow-network section said to "Increase Docker Timeouts" but used `max-concurrent-downloads` and `max-concurrent-uploads`, which control transfer concurrency rather than timeout duration. The heading and text were corrected, and `max-download-attempts` was added because Docker documents it as the daemon setting for pull retry attempts.
- The BuildKit example used `BUILDKIT_STEP_LOG_MAX_SIZE` as a timeout setting. That variable relates to BuildKit log output limits, not network or build timeouts. The example was replaced with a technically accurate pre-pull and retry workflow for base image resolution failures.
- The "Pull Layers Individually" heading implied Docker can manually pull individual image layers with the shown commands. The section was renamed to "Inspect Layers and Retry Pulls", and `docker manifest inspect --verbose` was used because Docker CLI help documents `--verbose` as including layer information.
- The GitHub Actions retry example used `nick-fields/retry@v2` while the Marketplace currently lists `v4.0.0` as the latest version. The action version was updated to `v4`.

## Review Notes
The remaining commands and configuration examples are technically plausible for Linux Docker Engine environments. Some diagnostics depend on host tools such as `jq`, `nslookup`, `nc`, `openssl`, and `systemctl`, and some examples assume Docker Engine rather than Docker Desktop or rootless mode.

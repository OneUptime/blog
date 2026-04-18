# Validation Summary: How to Upgrade Portainer Business Edition with In-App Updates - Upgrade App

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Portainer Business Edition (BE/EE)
- Docker (standalone)
- Docker volumes and bind mounts
- Alpine Linux (for backup tarball)
- Bash / shell commands

## Sources Consulted
- Portainer official documentation: https://docs.portainer.io/
- Portainer upgrade documentation: https://docs.portainer.io/start/upgrade
- Portainer Business Edition upgrade guide: https://docs.portainer.io/start/upgrade/be
- Docker Hub - portainer/portainer-ee image: https://hub.docker.com/r/portainer/portainer-ee
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/
- Docker inspect / Go template format: https://docs.docker.com/reference/cli/docker/inspect/

## Issues Found
No technical issues found.

- The Business Edition Docker image name `portainer/portainer-ee:latest` is correct (Portainer BE was previously branded EE, so the image repo retained the `-ee` suffix).
- Default ports 8000 (edge agent tunnel) and 9443 (HTTPS UI) are correct for Portainer.
- The `-v /var/run/docker.sock:/var/run/docker.sock` bind mount and `-v portainer_data:/data` volume usage match official documentation.
- The Alpine-based backup pattern (`docker run --rm -v volume:/data -v $(pwd):/backup alpine tar czf ...`) is a standard approach for backing up a named Docker volume and is syntactically correct.
- The `docker inspect --format '{{.Config.Image}}'` command uses valid Go template syntax and returns the configured image.
- License persistence via the `portainer_data` volume is accurate — Portainer BE stores license information in its data directory.
- The in-app upgrade feature (Upgrade App) is a real Portainer BE capability that performs a pull/stop/replace from the UI.

## Review Notes
- The exact UI navigation path ("Settings > Upgrade") can vary slightly between Portainer minor versions; Portainer often also surfaces a banner or dedicated "Upgrade" entry on the home screen. The post accounts for this by mentioning the upgrade notification banner as an alternative.
- The in-app upgrade feature requires the host to have network access to Docker Hub and the Portainer container must be able to orchestrate its own replacement; this is noted implicitly in the prerequisites.
- For Swarm or Kubernetes deployments, the in-app upgrade flow behaves differently and may require alternate procedures — the post correctly scopes itself to Docker standalone.
- Using `:latest` is convenient but pinning to a specific version tag (e.g., `portainer/portainer-ee:2.21.4`) is generally recommended for reproducibility in production; this is a stylistic improvement rather than a correctness issue.

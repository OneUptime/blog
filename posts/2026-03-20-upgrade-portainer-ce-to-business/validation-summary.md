# Validation Summary: How to Upgrade from Portainer CE to Business Edition - A Practical Guide

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Portainer Community Edition (CE)
- Portainer Business Edition (BE / EE)
- Docker (container runtime, volumes, `docker run`, `docker stop`, `docker rm`, `docker pull`, `docker inspect`)
- Alpine Linux (for backup tarball creation)

## Sources Consulted
- Portainer official upgrade documentation: https://docs.portainer.io/start/upgrade/tobe
- Portainer Docker upgrade steps: https://docs.portainer.io/start/upgrade/tobe/docker
- Portainer Business Edition free license program: https://www.portainer.io/take-3
- Portainer licenses documentation: https://docs.portainer.io/admin/licenses
- Portainer Business Edition image on Docker Hub: `portainer/portainer-ee`

## Issues Found
1. **Outdated free license node count.** The post stated "free 5-node license." Portainer discontinued the 5-node free program for commercial/business users; the current free tier is 3 nodes (the "Take 3" program). Home/student users with existing 5-node licenses can still renew, but new signups are limited to 3 nodes. Updated the text to "free 3-node license."

## Review Notes
- The Docker commands (`docker stop`, `docker container rm`, `docker pull`, `docker run` with `-v portainer_data:/data`, `-v /var/run/docker.sock:/var/run/docker.sock`, `-p 8000:8000`, `-p 9443:9443`, `--restart=always`) match Portainer's official upgrade instructions and are syntactically correct.
- The image name `portainer/portainer-ee:latest` is valid. Portainer's official docs now recommend the `:lts` tag for production stability, but `:latest` continues to work and is a common choice.
- Port 9000 (legacy HTTP) was omitted from the run command. This is acceptable since Portainer has moved to HTTPS on 9443 as the primary port; 9000 is only needed if users rely on plain HTTP.
- The backup command using `alpine tar czf` is correct and a standard Portainer-documented pattern.
- The rollback section is reasonable as a best-effort option, but users should be aware that downgrading from BE to CE is not officially supported by Portainer when BE has updated the database schema — data compatibility is not guaranteed across major-version boundaries.
- `docker inspect portainer --format '{{.Config.Image}}'` is correct Go-template syntax for verifying the running image.

# Validation Summary: How to Disable HTTP Access in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE / Business Edition
- Docker Engine
- Docker Compose
- Docker Swarm
- Kubernetes
- Helm
- HTTPS/TLS
- Linux firewall tooling (`ufw`, `firewalld`)

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer general settings: https://docs.portainer.io/admin/settings/general
- Portainer API access docs: https://docs.portainer.io/api/access
- Portainer Docker standalone update docs: https://docs.portainer.io/start/upgrade/docker
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer custom SSL docs: https://docs.portainer.io/advanced/ssl
- Portainer Helm chart configuration options: https://docs.portainer.io/sts/advanced/helm-chart-configuration-options
- Portainer official Helm chart README: https://github.com/portainer/k8s/blob/master/charts/portainer/README.md
- Docker `service update` reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker Swarm services reference: https://docs.docker.com/engine/swarm/services/
- Docker Compose `version` field reference: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Docker Compose example used the top-level `version: "3.8"` field. Docker now documents this field as obsolete, so I removed it.
- The Docker Swarm example added `--http-disabled` but did not remove the already-published service port `9000`. I updated the command to include `--publish-rm 9000`, which matches Docker's documented Swarm update behavior.
- The Kubernetes Helm example used `httpEnabled: false`, which is not a current Portainer Helm chart value. I replaced it with `tls.force: true`, which the current chart maps to `--http-disabled` and uses to omit the HTTP port from the Service when enabled.
- The troubleshooting section checked `/data/certs/`, but Portainer's certificate documentation describes custom certificates being supplied via `/certs`, and that command would not verify the certificate Portainer is actually serving. I replaced it with an `openssl s_client` check against `9443`.

## Review Notes
- Fresh Portainer installs already default to HTTPS on `9443` and do not require exposing `9000` on standalone installs, but `--http-disabled` remains the correct flag when you want the HTTP listener fully disabled.
- `docker`, `docker compose`, and `helm` are not installed in this workspace, so command and chart verification was performed against official documentation and the upstream Portainer Helm chart sources rather than local `--help` output.
- The guide still uses `portainer/portainer-ce:latest`. This is technically valid, but pinning an LTS or exact release would make the instructions more reproducible over time.

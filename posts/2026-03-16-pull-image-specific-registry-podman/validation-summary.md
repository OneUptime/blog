# Validation Summary: How to Pull an Image from a Specific Registry with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container image references
- Docker Hub
- Quay.io
- Red Hat Container Registry
- GitHub Container Registry
- Amazon ECR
- Google Artifact Registry
- containers-registries.conf

## Sources Consulted
- Podman `podman pull` documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman `podman info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Docker image reference documentation: https://docs.docker.com/engine/reference/commandline/tag/
- containers-registries.conf man page: https://www.mankier.com/5/containers-registries.conf
- Red Hat Container Registry Authentication: https://access.redhat.com/RegistryAuthentication
- Red Hat Ecosystem Catalog, PostgreSQL 15 image: https://catalog.redhat.com/en/software/containers/rhel9/postgresql-15/63f763f779eb1214c4d6fcf6
- GitHub Container Registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub `actions/actions-runner` package page: https://github.com/actions/runner/pkgs/container/actions-runner
- AWS ECR Podman documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/Podman.html
- Google Artifact Registry Docker authentication documentation: https://cloud.google.com/artifact-registry/docs/docker/authentication

## Issues Found
- The Docker Hub "short form" example still included `docker.io`, so it was not actually a short-name reference. Changed it to `podman pull grafana/grafana:10.3.1`.
- The Quay.io section described `quay.io/coreos/etcd:v3.5.12` as CoreDNS. Changed the comment to identify it as etcd.
- The Quay.io description called it "Red Hat's container registry", which could be confused with Red Hat Container Registry domains such as `registry.redhat.io`. Clarified it as a Red Hat-owned container registry service.
- The GHCR login command did not show token-based authentication, which GitHub documents for GitHub Container Registry. Updated it to use `--password-stdin`.
- The public GHCR example used `ghcr.io/actions/runner:latest`, but the documented package is `ghcr.io/actions/actions-runner:latest`. Updated the image reference.
- The Google section heading said Google Container Registry while the commands and text used Google Artifact Registry. Updated the heading to Google Artifact Registry.
- The `podman info --format` example used `.Registries.Search`, but Podman documents `.Registries` as a map. Changed the template to `{{range index .Registries "search"}}{{.}}{{"\n"}}{{end}}`.

## Review Notes
The remaining examples use placeholder registry names, accounts, projects, organizations, and repositories where appropriate. Podman was not installed in the local environment, so CLI behavior was verified against official documentation rather than local command output.

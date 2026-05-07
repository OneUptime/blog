# Validation Summary: How to Add a Custom Private Registry to Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- CNCF Distribution (Docker Registry)
- Docker Compose
- JSON daemon configuration

## Sources Consulted
- Portainer Docs: Add a custom registry - https://docs.portainer.io/admin/registries/add/custom
- Portainer Docs: Registries - https://docs.portainer.io/admin/registries
- Portainer Docs: Add a new container - https://docs.portainer.io/user/docker/containers/add
- Portainer Docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Docker Official Image: `registry` - https://hub.docker.com/_/registry
- CNCF Distribution Docs: Deploy a registry server - https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution Docs: Configuring a registry - https://distribution.github.io/distribution/about/configuration/
- Docker Docs: `dockerd` reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Portainer navigation path was outdated. I changed `Settings > Registries` to the current `Registries` flow based on the current Portainer admin documentation.
- The registry examples used `registry:2`, while the current official Docker registry image documentation uses `registry:3`. I updated both `docker run` examples accordingly.
- The registry URL guidance was incomplete for HTTP registries. Portainer assumes `https://` when no protocol is provided, so I updated the example to use `https://...` and added the explicit `http://...` requirement for insecure HTTP registries.
- The authentication example wrote the htpasswd output to `/auth/htpasswd` without first creating a usable host directory, and mounted root-level host paths that were not established by the instructions. I corrected the example to create `auth/` locally and mount local `auth/` and `registry-data/` directories.
- The production authentication example was technically incomplete because the official registry documentation requires TLS when using htpasswd/basic authentication. I updated the example to include TLS certificate mounts and the `REGISTRY_HTTP_TLS_CERTIFICATE` / `REGISTRY_HTTP_TLS_KEY` settings.
- The push example omitted `docker login`, which is required before pushing to an authenticated private registry. I added the login step.
- The Compose snippet used the top-level `version: "3.8"` key, which is now obsolete under the current Compose Specification. I removed it.
- The `daemon.json` example was labeled as JSON but included a `//` comment, making it invalid JSON. I removed the comment from the snippet and moved the file path into the surrounding text.
- The insecure-registry section omitted the need to restart Docker after changing `daemon.json`. I added that requirement.

## Review Notes
- For production environments using a private CA, trusting the CA on each Docker host is preferable to relying on `insecure-registries`.
- Portainer Business Edition adds registry browsing and management features, but the corrected post remains valid for the core task of adding a custom registry for deployments.

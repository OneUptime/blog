# Validation Summary: How to Add a Custom Private Registry to Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- CNCF Distribution / Docker Registry
- TLS / CA trust for private registries

## Sources Consulted
- Portainer custom registry docs: https://docs.portainer.io/admin/registries/add/custom
- Portainer stack deployment docs: https://docs.portainer.io/sts/user/docker/stacks/add
- Docker daemon configuration docs: https://docs.docker.com/engine/daemon/
- Docker `dockerd` reference (`insecure-registry`): https://docs.docker.com/reference/cli/dockerd/
- Docker certificate trust for registries: https://docs.docker.com/engine/security/certificates/
- Docker Compose file reference (`version` is obsolete): https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Hub mirror / pull-through cache docs: https://docs.docker.com/docker-hub/image-library/mirror/
- CNCF Distribution deployment docs: https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution insecure registry docs: https://distribution.github.io/distribution/about/insecure/
- CNCF Distribution Registry HTTP API V2 docs: https://distribution.github.io/distribution/spec/api/
- Docker Official `registry` image page: https://hub.docker.com/_/registry

## Issues Found
- The original registry deployment example used `registry:2` over plain HTTP with `htpasswd` authentication. CNCF Distribution documents that basic auth is not supported on insecure HTTP registries, so I changed the example to use HTTPS with mounted certificate files and updated it to the current `registry:3` image.
- The post said HTTP registries only needed Docker daemon configuration. Portainer assumes `https://` when no scheme is provided, so for HTTP testing registries you must enter `http://...` explicitly in Portainer. I added that requirement and clarified that insecure HTTP is for isolated testing only.
- The TLS trust example implied a Linux Docker restart was required after copying `ca.crt` into `/etc/docker/certs.d/...`. Docker's registry certificate guidance says Linux can use that CA without a daemon restart, so I removed the restart from that path and kept the restart only for the system CA store example.
- Both Compose snippets used top-level `version` fields (`"3"` and `"3.8"`). Docker's current Compose reference marks the top-level `version` element as obsolete, so I removed those fields.
- The stack section implied Portainer always matches registry credentials automatically from the image prefix. Current Portainer docs note that when multiple registries share the same provider or hostname, you should explicitly select the correct registry during stack deployment. I corrected that explanation.
- The registry mirror section implied Docker registry mirrors are a general-purpose cache for public images. Docker's official mirror docs state that Docker daemon registry mirrors are for Docker Hub pull-through caching, so I narrowed the wording accordingly.

## Review Notes
- The commands and filesystem paths in the post are Linux-oriented. Docker Desktop and Windows Server use different certificate and daemon configuration paths.
- The `_catalog` API examples are valid for Distribution API v2 registries, but catalog visibility can still vary by product and permissions.

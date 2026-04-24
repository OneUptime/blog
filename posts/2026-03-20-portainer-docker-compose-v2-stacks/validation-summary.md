# Validation Summary: How to Use Docker Compose v2 Syntax in Portainer Stacks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose v2
- Compose Specification
- Docker Compose profiles
- Docker Compose build secrets
- Docker Compose watch / `develop`
- Docker networking

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose profiles reference: https://docs.docker.com/reference/compose-file/profiles/
- Docker Compose include reference: https://docs.docker.com/reference/compose-file/include/
- Docker Compose build specification: https://docs.docker.com/reference/compose-file/build/
- Docker Compose secrets how-to: https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Compose develop specification: https://docs.docker.com/reference/compose-file/develop/
- Docker Compose watch how-to: https://docs.docker.com/compose/how-tos/file-watch/
- Docker Compose predefined environment variables: https://docs.docker.com/compose/how-tos/environment-variables/envvars/
- Portainer stacks documentation: https://docs.portainer.io/user/docker/stacks
- Portainer add a new stack documentation: https://docs.portainer.io/user/docker/stacks/add
- Portainer relative path support documentation: https://docs.portainer.io/advanced/relative-paths
- Portainer known issue for Compose build steps on remote environments: https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail

## Issues Found
- The introduction overstated Portainer support by implying Portainer stacks can use all modern Compose capabilities. I narrowed this to Docker Standalone stacks and added deployment-path caveats because Portainer documents environment-specific limitations.
- The prerequisites were too broad. I removed the unsupported `Portainer CE or BE 2.9+` claim and added feature-specific Docker Compose minimums backed by Docker docs: `include` requires 2.20.0+ and `develop` requires 2.22.0+.
- The Compose v1 vs v2 comparison table included weak or inaccurate comparisons such as profile support, `depends_on` conditions, and `extend` support. I replaced those rows with differences directly supported by Docker documentation.
- The `include` section did not explain the Portainer deployment constraint that the referenced files must exist at deploy time. I added a Portainer-specific note pointing readers toward Git-based stacks for this pattern.
- The build secrets section was incomplete. I added the requirement to consume the secret from the Dockerfile with BuildKit syntax and noted Portainer's documented limitation for `build` directives on remote Docker environments.
- The `develop` section was misleading for Portainer and the sample itself was invalid because it used `action: rebuild` without a `build` section. I corrected the explanation to scope `develop` to local Compose watch workflows and fixed the sample to use `build: .`.
- The deployment and troubleshooting sections overstated Portainer behavior around Compose v2 support and profile activation. I rewrote them to be accurate without claiming more than the Portainer and Docker docs support.

## Review Notes
- `include` is a Docker Compose feature that requires Docker Compose 2.20.0 or later.
- `develop` / Compose Watch requires Docker Compose 2.22.0 or later and is intended for `docker compose up --watch` or `docker compose watch`, not standard Portainer stack deployment.
- Portainer documents `build` directives as unsupported on remote Docker environments, so examples that rely on `build` are environment-dependent in Portainer.

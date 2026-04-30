# Validation Summary: How to Fix Slow Stack Deployments Due to Registry Authentication

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer
- Docker Engine and Docker CLI
- Docker Compose
- Docker Swarm
- Docker Hub and registry authentication
- CNCF Distribution registry mirror

## Sources Consulted
- Docker Docs, `docker stack deploy`: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs, "Deploy a stack to a swarm": https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs, Compose file `services` reference: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, `docker login`: https://docs.docker.com/reference/cli/docker/login/
- Docker Docs, "Mirror the Docker Hub library": https://docs.docker.com/docker-hub/image-library/mirror/
- Docker Docs, `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Portainer Docs, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs, "How do automatic updates for stacks/applications work?": https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Docs, "Registries": https://docs.portainer.io/admin/registries
- Portainer Docs, "Pull an image": https://docs.portainer.io/user/docker/images/pull
- CNCF Distribution, configuration reference: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution, HTTP API V2: https://distribution.github.io/distribution/spec/api/
- CNCF Distribution, Token Authentication Specification: https://distribution.github.io/distribution/spec/auth/token/

## Issues Found
- The post stated that an initial silent pause during `docker pull` definitively meant token authentication latency. That pause can also be registry reachability or TLS setup, so I narrowed the explanation.
- The private-registry latency example treated `https://your-registry.example.com/v2/` as an auth-endpoint check. The Registry V2 base endpoint is a registry/API reachability and auth-challenge check, so I corrected the description and noted that `401` with `WWW-Authenticate` is expected.
- The pre-pull section said a later stack deploy would skip pulls. That is not generally true for Swarm-backed Portainer stacks because `docker stack deploy` resolves images from the registry by default. I updated the wording to say pre-pulling can avoid layer downloads and added the multi-node caveat.
- The pull-policy section mixed inaccurate behavior: the heading said "never" but the snippet used `if_not_present`, and the example used `:latest`, which Compose still pulls under the `missing` / `if_not_present` policy. I replaced it with a versioned tag and `pull_policy: never`, and I qualified the advice to Docker Standalone stacks rather than Swarm stacks.
- The Portainer guidance was missing the product-specific control for this behavior. I updated the text to reference Portainer's **Re-pull image** option and to note that Swarm stacks are deployed via `docker stack deploy`.
- The registry mirror example used `registry:2` and configured daemons to use `http://localhost:5000`. Current official Distribution docs use `registry:3`, and each daemon must point to a mirror host it can actually reach. I updated both values.
- The credential-caching section described `docker login` as caching a token in `~/.docker/config.json`. Docker stores credentials in a configured credential store when available and only falls back to `config.json` otherwise, so I corrected the explanation and removed the unrelated "container restarts" claim.
- The final Portainer registry sentence overclaimed that pulls happen without re-authentication at deployment time. I softened this to the supported statement that registries added in Portainer can be used for image pulls during deployment.

## Review Notes
- `pull_policy` is a Compose feature relevant to Docker Standalone stacks. Swarm stacks follow `docker stack deploy`, which uses the legacy Compose file version 3 format and has its own image-resolution behavior.
- Docker's documented pull-through-cache workflow mirrors Docker Hub. It does not document the same mirror behavior for arbitrary private registries.

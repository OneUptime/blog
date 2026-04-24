# Validation Summary: How to Deploy Drone CI via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Drone CI
- Gitea
- OAuth 2.0
- Node.js

## Sources Consulted
- Drone Gitea server setup: https://docs.drone.io/server/provider/gitea/
- Drone Docker runner installation: https://docs.drone.io/runner/docker/installation/linux/
- Drone environment variable substitution: https://docs.drone.io/pipeline/environment/substitution/
- Drone repository secrets: https://docs.drone.io/secret/repository/
- Drone CLI `secret add`: https://docs.drone.io/cli/secret/drone-secret-add/
- Drone Node pipeline examples: https://docs.drone.io/pipeline/docker/examples/languages/node/
- Drone administrator bootstrap user: https://docs.drone.io/server/user/admin/
- Portainer stack deployment and GitOps updates: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer stack webhooks: https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Gitea user settings and application location: https://docs.gitea.com/next/development/api-usage

## Issues Found
- The Gitea OAuth instructions were incomplete. I changed the navigation path to `User Settings > Applications`, clarified that the callback URL must match Drone's exact scheme and host, and added the required `Confidential Client` setting because Drone's Gitea setup docs call that out explicitly.
- The stack example used `DRONE_GITEA_SERVER=http://gitea:3000`, but the compose file does not define a `gitea` service and Drone's official docs expect the actual Gitea server address including `http(s)`. I changed this to `https://gitea.example.com`.
- The post's `matrix:` example used an older multi-version pattern. Current Drone examples document testing multiple runtime versions with multiple pipeline documents, so I replaced that section with a current multi-pipeline Node example.

## Review Notes
- The post keeps `DRONE_SERVER_PROTO=http` for a simple example. If TLS is enabled, `DRONE_SERVER_PROTO` and the OAuth callback URL must be changed to `https` and must match exactly.
- Portainer supports different webhook flows depending on how the stack is deployed. Readers should use the webhook type that matches their Portainer deployment method.

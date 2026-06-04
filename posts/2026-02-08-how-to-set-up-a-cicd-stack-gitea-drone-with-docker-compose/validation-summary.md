# Validation Summary: How to Set Up a CI/CD Stack (Gitea + Drone) with Docker Compose

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Gitea
- Drone CI server
- Drone Docker runner
- Drone CLI
- Drone Docker pipelines
- PostgreSQL
- OAuth2

## Sources Consulted
- Docker Compose file reference, version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Gitea installation with Docker documentation: https://docs.gitea.com/installation/install-with-docker
- Gitea configuration cheat sheet: https://docs.gitea.com/administration/config-cheat-sheet
- Drone Gitea provider documentation: https://docs.drone.io/server/provider/gitea/
- Drone Docker runner installation documentation: https://docs.drone.io/runner/docker/installation/linux/
- Drone Docker runner capacity reference: https://docs.drone.io/runner/docker/configuration/reference/drone-runner-capacity/
- Drone Docker pipeline services documentation: https://docs.drone.io/pipeline/docker/syntax/services/
- Drone PostgreSQL service example: https://docs.drone.io/pipeline/docker/examples/services/postgres/
- Drone Docker plugin documentation: https://docs.drone.io/plugins/popular/docker/
- Drone secret CLI documentation: https://docs.drone.io/cli/secret/drone-secret-add/
- Drone log CLI documentation: https://docs.drone.io/cli/drone-log/
- Drone repository enable CLI documentation: https://docs.drone.io/cli/repo/drone-repo-enable/

## Issues Found
- The Docker Compose example used the obsolete top-level `version: "3.8"` property. Removed it because the current Compose Specification treats `version` as backward-compatible metadata and Docker Compose warns that it is obsolete.
- The Gitea image was pinned to the older `gitea/gitea:1.21` tag. Updated it to `gitea/gitea:1.25` to avoid presenting an outdated version pin.
- The post said `localhost` works for local development, but the Drone server container also needs to reach the same Gitea URL used for OAuth. Reworded the prerequisite and changed the Compose variables to use `CICD_HOST`, a host/IP that is reachable by the browser and containers.
- The Drone server used `DRONE_GITEA_SERVER=http://gitea:3000`. That Docker-internal hostname is not suitable for browser OAuth redirects. Changed it to `http://${CICD_HOST}:3000` and aligned Gitea `ROOT_URL`, `DOMAIN`, `SSH_DOMAIN`, and Drone `DRONE_SERVER_HOST`.
- The `.env` example did not define the host variable used by the corrected Compose file. Added `CICD_HOST=your-host-or-ip`.
- The Gitea OAuth2 setup omitted Drone's documented requirement to enable Confidential Client. Added that instruction.
- The OAuth redirect URI and browser/CLI examples used `localhost`. Updated them to `your-host-or-ip` so they match the corrected external Drone and Gitea URLs.
- The post implied Drone would automatically build after the `.drone.yml` was pushed, but repositories must be enabled in Drone so webhooks are created. Added repository enablement to the activation and pipeline instructions.
- The log command used `drone build logs`, but the current Drone CLI documentation uses `drone log view <repo/name> <build> <stage> <step>`. Replaced the command with `drone log view your-user/your-repo 1 1 1`.

## Review Notes
Drone's official Gitea provider documentation strongly recommends using a dedicated instance and not running Drone and Gitea on the same machine with Docker Compose because of networking complications. The post remains valid as a self-hosted/local guide after requiring a shared resolvable host/IP, but production deployments should prefer a proper domain and reverse proxy with HTTPS.

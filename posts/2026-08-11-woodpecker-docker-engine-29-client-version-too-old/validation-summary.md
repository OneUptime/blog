# Validation Summary: Woodpecker Breaks After Docker Engine 29: Fixing the “Client Version Is Too Old” API Error

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Woodpecker CI server and agent
- Woodpecker Docker backend
- Docker Engine 29
- Docker Engine API version negotiation
- Docker Compose
- systemd environment configuration
- YAML-based Woodpecker workflows

## Sources Consulted
- Docker Engine 29 release notes: https://docs.docker.com/engine/release-notes/29/
- Docker Engine API and version negotiation documentation: https://docs.docker.com/reference/api/engine/
- Docker deprecation notice for unversioned API calls: https://docs.docker.com/engine/deprecated/#api-calls-without-a-version
- Docker Compose `ps` documentation: https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker `inspect` documentation: https://docs.docker.com/reference/cli/docker/inspect/
- Docker daemon socket security guidance: https://docs.docker.com/engine/security/protect-access/
- Moby pull request 51186, which raised the Engine 29 minimum API and documents the compatibility behavior: https://github.com/moby/moby/pull/51186
- Moby pull request 52067, which lowered the default minimum API to 1.40 for Engine 29.3: https://github.com/moby/moby/pull/52067
- Woodpecker discussion 6154 about the reported API 1.43 failure: https://github.com/woodpecker-ci/woodpecker/discussions/6154
- Woodpecker pull request 6357 for the Moby SDK migration: https://github.com/woodpecker-ci/woodpecker/pull/6357
- Woodpecker 3.14.0 release: https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.14.0
- Woodpecker 3.17.0 release: https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.17.0
- Woodpecker version and maintenance policy: https://woodpecker-ci.org/versions
- Woodpecker container-image policy: https://woodpecker-ci.org/docs/administration/general#container-images
- Woodpecker Docker Compose installation documentation: https://woodpecker-ci.org/docs/administration/installation/docker-compose
- Woodpecker agent configuration reference: https://woodpecker-ci.org/docs/administration/configuration/agent
- Woodpecker migration guide: https://woodpecker-ci.org/migrations
- Woodpecker workflow syntax: https://woodpecker-ci.org/docs/usage/workflow-syntax
- Woodpecker 2.8.3 dependency manifest: https://github.com/woodpecker-ci/woodpecker/blob/v2.8.3/go.mod
- Woodpecker 3.0.0 dependency manifest and Docker backend client initialization: https://github.com/woodpecker-ci/woodpecker/blob/v3.0.0/go.mod and https://github.com/woodpecker-ci/woodpecker/blob/v3.0.0/pipeline/backend/docker/docker.go
- Woodpecker 3.17.0 Docker backend flags and client initialization: https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/backend/docker/flags.go and https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/backend/docker/docker.go
- Woodpecker 3.17.0 agent RPC compatibility check: https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cmd/agent/core/agent.go
- systemd execution-environment documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html

## Issues Found
- The post incorrectly treated Woodpecker 3.14.0 as the minimum Engine 29-compatible release. Woodpecker 2.8.x used Docker 24 and API 1.43, which matches the reported error, but Woodpecker 3.0.0 already used Docker 27.5, supported API 1.47, and enabled negotiation. I corrected the version history, described pull request 6357 as the later migration to the split Moby client modules, and retained 3.17.0 as the current supported recommendation rather than a false compatibility boundary.
- The upgrade guidance implied that replacing only the Docker-facing agent could be sufficient across major Woodpecker versions. Woodpecker agents enforce RPC compatibility with the server, so I changed the guidance to upgrade server and agent together when crossing incompatible releases, especially from 2.x to 3.x.
- The Docker minimum-API claims were stated as unconditional. Engine 29's minimum can be overridden, and API versions above the daemon's maximum are not accepted, so I qualified the documented values as defaults and bounded the 29.3-and-later range by the daemon's reported maximum.
- Plain `docker compose ps` omits stopped containers, which can hide an agent that exited during backend initialization. I changed it to `docker compose ps --all` and resolved the Compose-generated container ID from the service name before inspection.
- The original `docker inspect` template showed only the configured image reference and could print an agent secret because the image and first environment entry shared a grep-matched line. I split image and environment inspection, added the actual immutable image ID, and anchored the environment filter to the three relevant variable names.
- The direct Engine API request used the deprecated unversioned `/version` path. I changed it to `/v1.44/version`, which is supported throughout the Docker Engine 29 versions discussed.
- The post called `latest` an absent tag. It may resolve to Woodpecker's deliberate removal-notice placeholder, but it no longer points to a runnable release, so I corrected the wording and kept the explicit `v3.17.0` pin.
- The Compose example could be mistaken for a complete deployment even though it omitted required existing server settings and placed the shared agent secret only on the agent. I identified it as an update excerpt, told readers to preserve forge, host, database, and persistence settings, and configured the shared secret on both server and agent.
- `systemctl show --property=Environment` printed every inline environment value, potentially exposing unrelated secrets, and did not identify `EnvironmentFile=` inputs. I filtered its output to the two API-version variables and added a separate `EnvironmentFiles` query with instructions to inspect the returned files.
- The post stated that a changed endpoint error proved the API mismatch was resolved. I narrowed that claim to say the current blocker is now the separately reported endpoint problem, avoiding an unsupported conclusion about every subsequent request.

## Review Notes
This review is version-sensitive. As of 2026-08-12, Woodpecker 3.17.0 is the current stable release, and Docker Engine 29.7.2 is the current 29.x patch with a default API range of 1.40 through 1.55. Both Woodpecker API override names in the post are valid; when both are present, `WOODPECKER_BACKEND_DOCKER_API_VERSION` has precedence. The workflow YAML, image names, release tags, Compose commands, and remaining external links were also checked and found valid.

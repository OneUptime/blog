# Validation Summary: How to Scan Docker Images for Vulnerabilities via Portainer - Docker Images

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Trivy
- Grype
- Docker Scout
- Bash
- Container vulnerability scanning
- CI/CD webhooks

## Sources Consulted
- Trivy installation documentation: https://trivy.dev/docs/latest/getting-started/installation/
- Trivy image CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy server CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_server/
- Trivy client/server mode documentation: https://trivy.dev/docs/latest/references/modes/client-server/
- Trivy reporting documentation: https://trivy.dev/docs/latest/configuration/reporting/
- Trivy official Dockerfile: https://github.com/aquasecurity/trivy/blob/main/Dockerfile
- Grype installation documentation: https://oss.anchore.com/docs/installation/grype/
- Grype CLI reference: https://oss.anchore.com/docs/reference/grype/cli/
- Grype filtering and failure threshold documentation: https://oss.anchore.com/docs/guides/vulnerability/filter-results/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Scout CLI reference: https://docs.docker.com/reference/cli/docker/scout/
- Docker Scout quickview reference: https://docs.docker.com/reference/cli/docker/scout/quickview/
- Docker Scout CVEs reference: https://docs.docker.com/reference/cli/docker/scout/cves/
- Docker Scout recommendations reference: https://docs.docker.com/reference/cli/docker/scout/recommendations/
- Docker Scout compare reference: https://docs.docker.com/reference/cli/docker/scout/compare/
- Docker Scout policy reference: https://docs.docker.com/reference/cli/docker/scout/policy/
- Portainer stack webhook documentation: https://docs.portainer.io/user/docker/stacks/webhooks

## Issues Found
- The Compose snippet used the obsolete top-level `version: "3.8"` field. Removed it because current Docker Compose validates against the latest schema and warns that `version` is obsolete.
- The scheduled Trivy scanner tried to run `docker images` inside the `aquasec/trivy` container. The official Trivy image does not include the Docker CLI, so the loop would fail. Changed it to scan a configured `IMAGES` list instead.
- The Grype install command used the older raw GitHub install script URL. Updated it to the current official `https://get.anchore.io/grype` installer command.
- The Grype comment said `--fail-on high` only shows high severity findings. That flag controls the exit code threshold, so the comment now says it fails on high or critical vulnerabilities.
- The Docker Scout quickview comment said it enabled Docker Scout. The command displays a quick vulnerability overview, so the comment was corrected.
- The Docker Scout compare example was reordered to match the official `docker scout compare --to IMAGE [IMAGE]` usage.
- The Docker Scout policy command used `docker scout policy evaluate`, which is not the current CLI form. Changed it to `docker scout policy --exit-code myapp:latest`.
- The Portainer webhook placeholder used the generic service webhook path. Changed it to the documented stack webhook path for stack redeployments.
- The conclusion described Trivy server mode as avoiding local installation. Trivy client/server mode avoids each client downloading its own vulnerability database, so the conclusion was corrected.

## Review Notes
Docker, Trivy, and Grype were not installed in the local workspace, so command validation was performed against official documentation and upstream source files instead of local `--help` output.

# Validation Summary: How to Deploy Trivy as an Image Scanner with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Trivy
- Docker Compose / Portainer stacks
- Bash
- `jq`
- Kubernetes
- Trivy Operator

## Sources Consulted
- Trivy client/server mode docs: https://trivy.dev/docs/latest/guide/references/modes/client-server/
- Trivy server CLI docs: https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_server/
- Trivy image CLI docs: https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_image/
- Trivy installation docs: https://trivy.dev/docs/latest/getting-started/installation/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` field reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Trivy Operator kubectl install docs: https://aquasecurity.github.io/trivy-operator/latest/getting-started/installation/kubectl/
- Trivy Operator official repository README: https://github.com/aquasecurity/trivy-operator
- Portainer custom resources docs: https://docs.portainer.io/user/kubernetes/more-resources/custom-resources
- Trivy server implementation (official source): https://github.com/aquasecurity/trivy/blob/main/pkg/rpc/server/listen.go

## Issues Found
- The post described Trivy server as a REST API and used raw `curl` requests to `/scan`. Current Trivy documentation and source document client/server mode via `trivy image --server ...`, while the documented HTTP endpoints are `healthz` and `version`. I replaced the unsupported `/scan` examples and both shell scripts with the supported client/server CLI flow.
- The introduction said server mode avoids pulling the full Trivy image each time. The current Trivy docs describe the benefit as avoiding vulnerability database downloads on each client. I corrected the explanation and the description line.
- The Compose snippet used the obsolete top-level `version` field. Docker now treats that field as informational and warns that it is obsolete, so I removed it.
- The Compose snippet mounted `/var/run/docker.sock` into the Trivy server container. That mount is not required for the documented Trivy server/client flow, so I removed it from the server stack example.
- The database warm-up section said the vulnerability database is about `30 MB` and used `trivy --version` to verify freshness. The size claim is outdated, and the official server docs expose database metadata through the `/version` endpoint. I updated the warm-up commands accordingly.
- The Trivy Operator install command referenced the moving `main` branch manifest. The official install docs currently pin the static manifest to `v0.30.1`, so I updated the command to match the documented release.
- The final sentence implied the generated custom resources are generally viewable in Portainer. Portainer's official docs say custom resources are viewable only by admin users in Portainer Business Edition, so I narrowed that claim.

## Review Notes
- The post still uses `aquasec/trivy:latest`. That is technically valid, but pinning a specific Trivy image tag would make the deployment more reproducible. I left it unchanged because it is not strictly incorrect.
- The example scripts now rely on the supported `trivy` CLI client being available wherever the scripts run, in addition to `jq`.

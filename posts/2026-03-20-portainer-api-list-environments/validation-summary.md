# Validation Summary: How to List and Manage Environments via the Portainer API - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer REST API
- Docker environments
- Kubernetes environment import
- Bash
- `curl`
- `jq`

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Accessing the Portainer API: https://docs.portainer.io/api/access
- Add an environment via the Portainer API: https://docs.portainer.io/admin/environments/add/api
- Import an existing Kubernetes environment: https://docs.portainer.io/admin/environments/add/kubernetes/import
- Environments overview: https://docs.portainer.io/admin/environments/environments

## Issues Found
- The post said the examples could use either a JWT or an API access token, but all commands used the `Authorization: Bearer` header. I clarified that the examples use an admin JWT, and that API access tokens use the `X-API-Key` header.
- The Docker TLS creation example used JSON with inline certificate strings. Portainer's published `EndpointCreate` operation consumes `multipart/form-data` and documents TLS certificate uploads as `TLSCACertFile`, `TLSCertFile`, and `TLSKeyFile`, so I converted the example to the documented form upload.
- The local Docker environment creation example manually set `Content-Type: multipart/form-data` while also using `curl -F`. I removed the manual header and aligned the request with Portainer's documented multipart create flow.
- The Kubernetes example used undocumented form fields (`KubernetesDeploymentMode` and `kubeconfig`) as if they were a published API workflow. Portainer's official docs describe kubeconfig import as a legacy Business Edition feature, and the published API examples do not provide a matching `curl` request, so I replaced the incorrect example with an edition/version caveat.
- The environment tag update example used `TagIds` in the JSON update payload. Portainer's published update schema uses `TagIDs`, so I corrected the field name.
- The delete and health-check shell snippets had reliability issues: the delete example always printed success even if the API call failed, and the health script parsed JSON through unquoted shell expansion. I fixed both snippets so they better reflect actual command behavior.

## Review Notes
- Portainer still uses `/api/endpoints` in the API even though the UI terminology is "environments".
- Kubernetes environment import behavior is edition-sensitive and version-sensitive; verify the exact workflow against the target Portainer release before automating it.

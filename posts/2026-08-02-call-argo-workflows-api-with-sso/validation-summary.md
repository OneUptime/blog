# Validation Summary: How to Call the Argo Workflows API When SSO Authentication Is Enabled

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered

- Argo Workflows and Argo Server
- Argo Workflows REST API and CLI
- Argo Server SSO, OAuth 2.0, and OIDC
- Kubernetes ServiceAccounts, TokenRequest tokens, and RBAC
- Kubernetes Deployments and Helm configuration
- HTTP Bearer authentication, TLS, ingress base paths, and curl
- Alpine Linux container images

## Sources Consulted

- [Argo Workflows: Argo Server Auth Mode](https://argo-workflows.readthedocs.io/en/latest/argo-server-auth-mode/)
- [Argo Workflows: Argo Server SSO](https://argo-workflows.readthedocs.io/en/latest/argo-server-sso/)
- [Argo Workflows: Access Token](https://argo-workflows.readthedocs.io/en/latest/access-token/)
- [Argo Workflows: REST API](https://argo-workflows.readthedocs.io/en/latest/rest-api/)
- [Argo Workflows: API Examples](https://argo-workflows.readthedocs.io/en/latest/rest-examples/)
- [Argo Workflows: API Reference](https://argo-workflows.readthedocs.io/en/latest/swagger/)
- [Argo Workflows: Workflow RBAC](https://argo-workflows.readthedocs.io/en/latest/workflow-rbac/)
- [Argo Workflows: Security](https://argo-workflows.readthedocs.io/en/latest/security/)
- [Argo Workflows: Argo Server and base HREF](https://argo-workflows.readthedocs.io/en/latest/argo-server/)
- [Argo Workflows CLI: `argo list`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_list/)
- [Argo Helm: current `argo-workflows` values](https://github.com/argoproj/argo-helm/blob/main/charts/argo-workflows/values.yaml)
- [Argo Workflows: current OpenAPI specification](https://github.com/argoproj/argo-workflows/blob/main/api/openapi-spec/swagger.json)
- [Kubernetes: Service Accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
- [Kubernetes: Managing Service Accounts](https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/)
- [Kubernetes: `kubectl create token`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/)
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [Alpine Linux release branches](https://www.alpinelinux.org/releases/)
- [Docker Official Image: Alpine tags](https://hub.docker.com/_/alpine/tags)

## Issues Found

- The authentication-failure example used the older message `token not valid for running mode` and grouped all redirect behavior with Argo itself. It now uses the current `token not valid` wording and clarifies that an SSO redirect can come from the ingress or authentication proxy.
- The verification text said the commands verified the running Pod, although the first command reads the Deployment's Pod template. It now accurately says that the commands check rendered Deployment arguments and startup logs.
- The permission table understated the permissions used by current Argo Server operations. Retry can update a Workflow and delete Pods selected for retry, while live Workflow logs get the Workflow, list/watch Pods, and get the `pods/log` subresource. The table now states those supporting permissions.
- The ingress CLI example set only `ARGO_BASE_HREF`. The Argo CLI applies that path through its HTTP/1 client, so the example now enables `ARGO_HTTP1=true`. The CLI path was also changed from `/argo/` to `/argo` so appending `/api/v1/...` does not create a doubled slash.
- The SSO revocation statement omitted the required restart step. It now states that the encryption key must be replaced and every Argo Server Pod restarted before all old JWE sessions are rejected.
- The diagnostic command claimed that `curl --verbose` would not print the token, but verbose curl output includes outgoing `Authorization` headers. It now prints only received headers and selected connection/TLS result fields, without enabling verbose request-header logging.

## Review Notes

- The repeated `--auth-mode=sso` and `--auth-mode=client` flags, the Helm `server.authModes` setting, the `Authorization: Bearer <token>` format, and the Argo CLI environment variables are current.
- The `POST /api/v1/workflows/{namespace}` route and `WorkflowCreateRequest` wrapper (`namespace`, `serverDryRun`, and `workflow`) match the current Argo OpenAPI specification.
- The Kubernetes RBAC manifests use current APIs, and the TokenRequest command and duration caveat match current Kubernetes documentation.
- `argoproj.io/v1alpha1` remains the current Workflow API version, and `alpine:3.23` is a valid supported image tag as of the validation date. The floating minor tag is valid but can resolve to newer patch images over time; a digest can be pinned when reproducible image contents are required.

# Validation Summary: How the ArgoCD API Server Handles Requests

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD API Server
- Argo CD CLI
- Argo CD REST and gRPC APIs
- Argo CD RBAC and Casbin policies
- Dex, OIDC, and JWT authentication
- Kubernetes ConfigMaps, Secrets, Deployments, Ingress, and custom resources
- Prometheus metrics

## Sources Consulted
- Argo CD API docs: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD user management docs: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD webhook docs: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD ingress docs: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD TLS docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD high availability docs: https://argo-cd.readthedocs.io/en/latest/operator-manual/high_availability/
- Argo CD metrics docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD CLI command docs for `argocd account generate-token`, `argocd account can-i`, and `argocd app sync`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/
- Argo CD sync with kubectl docs: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/sync-kubectl/

## Issues Found
- The local accounts section incorrectly said usernames and passwords are stored in the ConfigMap. Updated it to state that accounts/capabilities are defined in `argocd-cm`, while passwords and token metadata are managed by Argo CD.
- The CLI config path used the older `~/.argocd/config` location. Updated it to the current default `~/.config/argocd/config`.
- The Dex and SSO flow implied Dex validates every SSO token on each request. Updated the prose and sequence diagram to distinguish login-time SSO/OIDC flow from later JWT validation by the API server.
- The REST/gRPC section overclaimed identical capability. Reworded it to say the REST endpoints map to the same underlying grpc-gateway services.
- The webhook provider list omitted Azure DevOps. Added it to match the current official provider list.
- The webhook secret instruction did not mention `stringData`, which is the practical way to edit a Kubernetes Secret without base64 encoding. Updated the comment.
- The sync lifecycle referred to `spec.operation`. Corrected this to the top-level `operation` field on the Application resource.
- The HA Deployment snippet scaled `argocd-server` replicas without setting `ARGOCD_API_SERVER_REPLICAS`. Added the environment variable as recommended by Argo CD HA docs.
- The TLS Deployment snippet was marked as `bash` even though it is YAML. Corrected the code fence language.
- The API server metrics example listed `argocd_app_info`, which is an Application Controller metric. Replaced it with API server metrics from the official metrics docs.
- The `argocd account can-i` example used only an application name. Updated the object to `default/my-app` to match application RBAC object format of `<project>/<application>`.

## Review Notes
The post is now technically accurate as a general Argo CD API server overview. Some operational details, such as exact metrics available and token/session behavior, can vary by Argo CD version, so future updates should re-check against the version targeted by the post.

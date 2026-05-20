# Validation Summary: How to Fix 'Unable to load data' Error in ArgoCD UI

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- ingress-nginx
- Argo CD CLI
- Argo CD RBAC
- Redis
- TLS and reverse proxy configuration

## Sources Consulted
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD argocd-cmd-params-cm example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd account get-user-info` command reference: https://argo-cd.readthedocs.io/en/release-2.1/user-guide/commands/argocd_account_get-user-info/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/kubectl/generated/

## Issues Found
- The post said the Argo CD UI communicates over gRPC-Web and REST. Official ingress documentation describes the UI as using HTTP/HTTPS and the CLI as using gRPC, so the wording was corrected.
- The post listed database connection failures in HA mode as a common API server issue. Argo CD does not use an application database in the standard architecture, so this was changed to Kubernetes API, Redis, and Redis HA connectivity failures.
- The nginx SSL passthrough example mixed passthrough with a backend protocol setting and numeric service port. The example was aligned with the official Argo CD nginx SSL passthrough pattern by using `force-ssl-redirect`, `ssl-passthrough`, `ingressClassName`, and the `https` service port name.
- The split-ingress section incorrectly framed gRPC as an Argo CD UI requirement. It was corrected to explain that split ingress is for CLI gRPC traffic when TLS is terminated at ingress-nginx without SSL passthrough.
- The HTTP ingress example for TLS termination used `backend-protocol: "HTTPS"` and port 443. Official docs use HTTP to the backend when the Argo CD API server is run with TLS disabled, so the snippet now uses `backend-protocol: "HTTP"` and the `http` service port name.
- The browser-console section described `server.rootpath` and `server.basehref` as a CORS fix. Official docs define those settings for non-root reverse proxy paths, so this was corrected to describe subpath/404 issues.
- The Redis test attempted to run `redis-cli` from the `argocd-server` deployment. That tool is not guaranteed to exist in the API server container, so the command now runs `redis-cli ping` from the Redis deployment in a non-HA installation.

## Review Notes
- The post is technically relevant and useful after correction. Some operational details remain environment-specific, especially Redis HA names, ingress controller behavior, and whether metrics-server is installed for `kubectl top`.

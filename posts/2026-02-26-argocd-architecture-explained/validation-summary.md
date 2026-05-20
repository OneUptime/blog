# Validation Summary: How ArgoCD Architecture Works Under the Hood

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Helm
- Kustomize
- Redis
- Dex

## Sources Consulted
- Argo CD Architectural Overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/
- Argo CD High Availability overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Resource Tracking: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD FAQ: https://argo-cd.readthedocs.io/en/release-3.4/faq/
- Argo CD app sync command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/

## Issues Found
- The post said ArgoCD runs as Kubernetes deployments, but the application controller is described later as a StatefulSet and HA installs can use other workload shapes. Changed this to Kubernetes workloads.
- The API server section described the web UI path as REST-only and said only port 443 is exposed by default. Updated the wording to HTTP/HTTPS endpoints and noted that the argocd-server service exposes 443 for gRPC/HTTPS and 80 for HTTP redirects.
- The controller reconciliation loop was described as checking every few seconds. Updated this to the documented default Git polling interval of about three minutes, while preserving the note that self-heal retries can be shorter.
- The Redis section overstated Redis as holding cluster live-state cache and implied losing Redis would force every reconciliation to clone and query from scratch. Updated it to describe Redis as a disposable shared cache for application and repository cache entries.
- The sync flow said the controller receives webhooks directly. Updated it to say webhook notifications reach the API server and cause the controller to react.
- The resource application step said ArgoCD uses `kubectl apply` directly. Updated this to kubectl-style apply semantics, with server-side apply when configured.
- The health assessment example said Services need endpoints. Updated this to match Argo CD's built-in health checks, including LoadBalancer Service ingress checks.
- The resource tracking section said label-based tracking was the default in older versions without clarifying the current default. Updated annotation-based tracking as the current default.
- The Redis performance note said cluster cache growth drives Redis memory. Updated it to refer to cached manifest and revision entries.

## Review Notes
The remaining examples are operationally plausible for standard Argo CD installations. Some deployment names and workload kinds can differ when installed through Helm charts or HA manifests, but the commands are appropriate for the common upstream installation layout.

# Validation Summary: How to Tune ArgoCD API Server for Many Users

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD API server
- Kubernetes Deployments and Horizontal Pod Autoscalers
- Kubernetes Ingress
- ingress-nginx annotations
- Argo CD RBAC
- Prometheus metrics and PromQL

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD `argocd-server` command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD `argocd-cmd-params-cm.yaml` example: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD `argocd-cm.yaml` example: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/argocd-cm-yaml/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/metrics/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/

## Issues Found
- Replaced the unsupported `--server.max-concurrent-streams` example with the documented `ARGOCD_GRPC_MAX_SIZE_MB` setting for large gRPC responses.
- Added `ARGOCD_API_SERVER_REPLICAS` to the scaling example and clarified why it should match the server replica count.
- Clarified that the partial Deployment YAML examples are strategic merge patches for the existing `argocd-server` Deployment.
- Removed the unsupported `nginx.ingress.kubernetes.io/websocket-services` annotation from the ingress example.
- Corrected the RBAC performance explanation. Argo CD evaluates default policy, user, and configured groups; group policies simplify the policy set but are not a single permission lookup.
- Corrected the `server.disable.auth` comment. The key controls client authentication, not whether the built-in UI is served.
- Changed the static asset caching example from `configuration-snippet` to `server-snippet` because a `location` block is not valid inside a location-level configuration snippet.
- Corrected the session duration key from `server.session.maxAge` to `users.session.duration` and clarified that shared `argocd-secret` consistency matters across replicas.
- Replaced undocumented Prometheus metric names with documented Argo CD API server and gRPC metrics, and corrected the histogram PromQL examples to aggregate by `le`.
- Adjusted the UI connection wording to avoid claiming that each browser tab directly causes the API server to watch Kubernetes resources.

## Review Notes
The practical sizing table remains a heuristic. It is plausible operational guidance, but exact CPU and memory needs depend on application count, resource tree size, RBAC complexity, SSO/login patterns, ingress behavior, and Kubernetes API latency.

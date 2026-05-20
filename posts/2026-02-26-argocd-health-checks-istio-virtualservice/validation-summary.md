# Validation Summary: How to Configure Health Checks for Istio VirtualService in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD custom resource health checks
- Lua health check scripts
- Kubernetes ConfigMaps and Jobs
- Istio traffic management and security resources
- Istio configuration status and `istioctl analyze`
- Kubernetes Gateway API

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Istio Configuration Status Field documentation: https://istio.io/latest/docs/reference/config/config-status/
- Istio `istioctl analyze` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Gateway API Troubleshooting and Status documentation: https://gateway-api.sigs.k8s.io/concepts/troubleshooting/
- Kubernetes Gateway API HTTPRoute documentation: https://gateway-api.sigs.k8s.io/api-types/httproute/
- Kubernetes Gateway API specification: https://gateway-api.sigs.k8s.io/reference/1.5/spec/

## Issues Found
- The post claimed Istio 1.17+ improved status reporting and that `status.conditions` used `Reconciled`/`Ready` condition types for Istio resources. Istio's official configuration status documentation says the status field exists in Istio 1.6+, is alpha and disabled by default, and uses a `PassedAnalysis` condition. Updated the version/status explanation and all Istio health checks to use `PassedAnalysis`.
- The Lua checks looked for uppercase validation message levels such as `ERROR` and `WARNING`. Istio's documented examples use `Error` and `Warn`. Updated the checks to recognize the documented values while keeping uppercase variants for compatibility.
- The VirtualService example checked `obj.status.observedGeneration`, but Istio documents `observedGeneration` on individual conditions rather than as a top-level status field. Removed that top-level status check.
- The HTTPRoute health check treated an empty `status.parents` list as healthy because `allAccepted` defaulted to true. Gateway API documentation says an empty parent status list means the route has not attached to any Gateway. Updated the script to return `Progressing` for empty parents, require an `Accepted` condition, and mark unresolved references as `Degraded`.
- The `istioctl` image tag in the hook example used the older `1.22` tag. Updated it to `1.30.0` to match the current Istio documentation generation consulted during review.

## Review Notes
The Argo CD `resource.customizations.health.<group>_<kind>` key format, Lua return shape, health statuses, PostSync hook annotation, hook delete policy, `istioctl analyze -n`, and `--failure-threshold Error` flag were verified against official documentation.

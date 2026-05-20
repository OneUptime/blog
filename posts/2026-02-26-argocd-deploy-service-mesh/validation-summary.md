# Validation Summary: How to Deploy Service Mesh Configuration with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications, sync options, sync waves, and resource hooks
- Argo CD Lua custom health checks
- Kubernetes ConfigMaps and Jobs
- Istio Helm charts, VirtualService, DestinationRule, Gateway, and istioctl analyze
- Linkerd ServiceProfile
- Kustomize repository overlays

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Resource Health and Custom Health Checks: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Istio Helm install documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Linkerd ServiceProfile documentation: https://linkerd.io/2.18/tasks/setting-up-service-profiles/

## Issues Found
- The Istio examples pinned `1.21.0`, which is outdated relative to the current Istio documentation. Updated the Helm chart revisions and `istio/istioctl` image to `1.30.0`.
- The Istio networking examples used `networking.istio.io/v1beta1`. Updated VirtualService, DestinationRule, and Gateway examples to the current `networking.istio.io/v1` API shown in Istio's reference documentation.
- The VirtualService custom health check used `table.concat`, but Argo CD disables Lua standard libraries for custom health checks by default unless `resource.customizations.useOpenLibs` is configured. Replaced it with logic that does not depend on the Lua `table` library.
- The Istio Helm values included legacy MeshConfig tracing fields. Removed the incomplete tracing configuration and kept the access log setting, which is valid in `meshConfig`.
- The sync-wave example labeled a Gateway resource as a CRD and placed DestinationRule after VirtualService. Updated the comments and ordering so Gateway and DestinationRule resources are applied before VirtualService resources that may bind to or reference them.

## Review Notes
- The Argo CD Application manifests, sync options, custom health-check key format, PreSync hook annotations, and `istioctl analyze --all-namespaces` command were verified against official documentation.
- Linkerd ServiceProfiles are still supported, but Linkerd documents that Gateway API types have supplanted them for newer per-route metrics, retries, and timeouts use cases.
- The two OneUptime cross-links at the end of the post returned HTTP 200 during review.

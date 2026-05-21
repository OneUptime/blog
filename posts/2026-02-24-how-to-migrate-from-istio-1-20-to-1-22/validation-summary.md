# Validation Summary: How to Migrate from Istio 1.20 to 1.22

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Istio 1.20, 1.21, and 1.22
- Kubernetes
- Helm
- Istio Gateway and Kubernetes Gateway API
- Istio sidecar injection revisions
- Istio Telemetry, EnvoyFilter, and xDS behavior

## Sources Consulted
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio Upgrade with Helm: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio 1.21 Upgrade Notes: https://istio.io/latest/news/releases/1.21.x/announcing-1.21/upgrade-notes/
- Istio 1.21 Change Notes: https://istio.io/latest/news/releases/1.21.x/announcing-1.21/change-notes/
- Istio 1.22 Announcement: https://istio.io/latest/news/releases/1.22.x/announcing-1.22/
- Istio 1.22 Upgrade Notes: https://istio.io/latest/news/releases/1.22.x/announcing-1.22/upgrade-notes/
- Istio 1.22 Change Notes: https://istio.io/latest/news/releases/1.22.x/announcing-1.22/change-notes/
- Istio v1 API announcement: https://istio.io/latest/blog/2024/v1-apis/
- Kubernetes Gateway API versioning: https://gateway-api.sigs.k8s.io/docs/concepts/versioning/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The post stated that the 1.20 to 1.22 jump was generally supported because Istio supports skipping one minor version. Clarified that this applies to revision-based/canary upgrades; Istio does not recommend jumping more than two minor versions, and in-place upgrades have stricter expectations.
- The 1.20 to 1.21 breaking-change list included inaccurate claims about Helm becoming the primary method, a gateway namespace model change, and APIs shifting from v1alpha3 to v1beta1. Replaced these with official 1.21 changes: Gateway API label changes, compatibilityVersion, and behavior changes around SNI/TLS verification/ExternalName.
- The 1.21 to 1.22 list included inaccurate claims about Telemetry access log filter expressions and ProxyConfig restructuring. Replaced these with official 1.22 upgrade items: default tracing removal and Delta xDS enabled by default.
- The Istio API migration example recommended moving from `networking.istio.io/v1alpha3` to `v1beta1`. Istio 1.22 promoted many stable APIs to `v1`, so the example now uses `networking.istio.io/v1`.
- The Gateway API CRD update command used the v1.0.0 bundle even though Istio 1.22 supports Gateway API v1.1. Updated the command to use the v1.1.0 standard install bundle.
- The Kubernetes version check used `kubectl version --short`, which is not present in current generated kubectl documentation. Updated it to `kubectl version`.
- Namespace relabeling examples could fail if `istio.io/rev` was already set. Added `--overwrite` to the revision label commands.
- The gateway canary install example omitted the revision setting when installing a new gateway release in its own namespace. Added `--set revision=1-22`.

## Review Notes
Istio 1.22 is now end-of-life as of January 22, 2025, so this guide is historically useful but should not be presented as a current target version for new migrations. The migration approach remains technically valid for users pinned to the 1.20 to 1.22 path, but production users should evaluate upgrading to a currently supported Istio release.

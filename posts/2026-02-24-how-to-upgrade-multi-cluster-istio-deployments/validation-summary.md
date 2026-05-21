# Validation Summary: How to Upgrade Multi-Cluster Istio Deployments

## Status
validated

## Post Type
Tutorial / operations guide

## Technologies Covered
- Istio
- Kubernetes
- istioctl
- IstioOperator
- Multi-cluster service mesh
- Canary upgrades and revisions

## Sources Consulted
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio Supported Releases and control plane/data plane skew: https://istio.io/latest/docs/releases/supported-releases/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Primary-Remote multicluster install guide: https://istio.io/latest/docs/setup/install/multicluster/primary-remote/
- Istio Primary-Remote multi-network install guide: https://istio.io/latest/docs/setup/install/multicluster/primary-remote_multi-network/

## Issues Found
- Corrected the Istio version skew explanation. Istio documents that the control plane can be one minor version ahead of the data plane, but the data plane should not be ahead of the control plane.
- Clarified the multi-primary mixed-version example so it does not imply an older Istiod should manage newer proxies.
- Added a primary-remote caveat for `values.global.externalIstiod: true`, which is required when a primary serves remote clusters.
- Corrected the old control plane uninstall command. Istio documents uninstalling a non-revisioned control plane using the original installation options, not `--revision=default`.
- Clarified the primary-remote upgrade order to include exposing the new Istiod revision before updating remote configuration.
- Corrected the rollback example to label the namespace back to the old revision instead of mixing the comment "old revision" with the legacy `istio-injection=enabled` label.

## Review Notes
The command and configuration examples otherwise match the current Istio documentation. The post uses older illustrative versions such as 1.19 through 1.21; those versions are no longer supported, but they are used as examples rather than current upgrade targets.

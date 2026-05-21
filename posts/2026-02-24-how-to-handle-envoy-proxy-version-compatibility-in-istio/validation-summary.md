# Validation Summary: How to Handle Envoy Proxy Version Compatibility in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- istioctl
- EnvoyFilter

## Sources Consulted
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Resource Labels: https://istio.io/latest/docs/reference/config/labels/

## Issues Found
- The `istioctl proxy-status` example referred to a `PROXY-VERSION` column. Current Istio documentation shows this as `VERSION`, so the text and example output were updated.
- The old control plane removal example used `istioctl uninstall --revision=default`, which can be misleading because `default` is commonly a revision tag or a non-revisioned install rather than the old revision name. The example now uses an explicit old revision and notes that non-revisioned installs should be uninstalled with their original install options.
- The `STALE` status was described as always meaning Envoy rejected a config update. Official docs define it as an update sent by istiod that has not been acknowledged by Envoy, so the wording was corrected while preserving the rejection troubleshooting advice.
- The rollback example used `istioctl install --set tag=1.23.2`, which is not a valid way to select an Istio release in current `istioctl`. It now says to reinstall with the old `istioctl`/manifests and original install options.
- The EnvoyFilter compatibility command `istioctl experimental envoyfilter-check` is not present in current official `istioctl` documentation. It was replaced with `istioctl analyze --use-kube=false envoyfilter.yaml`, which is documented for file-based analysis.

## Review Notes
The post's general guidance on Istio control plane/data plane skew, revision-based canary upgrades, EnvoyFilter upgrade risk, and the `sidecar.istio.io/proxyImage` annotation aligns with current Istio documentation. The examples use Istio 1.24/1.23, which are now outside the active support window as of 2026-05-21, but they are presented as illustrative version numbers rather than recommendations to run those releases.

# Validation Summary: How to Upgrade Istio in Ambient Mode

## Status
validated

## Post Type
Tutorial / operations guide

## Technologies Covered
- Istio ambient mode
- Istio control plane revisions
- istioctl
- Helm
- Kubernetes
- Kubernetes Gateway API
- ztunnel
- istio-cni
- Waypoint proxies

## Sources Consulted
- Istio ambient mode upgrade with Helm: https://istio.io/latest/docs/ambient/upgrade/helm/
- Istio canary upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio in-place upgrades: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio ambient install with istioctl: https://istio.io/latest/docs/ambient/install/istioctl/
- Istio ambient install with Helm: https://istio.io/latest/docs/ambient/install/helm/
- Istio installation configuration profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- IstioOperator options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio waypoint proxy guide: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio 1.29 upgrade notes: https://istio.io/latest/news/releases/1.29.x/announcing-1.29/upgrade-notes/

## Issues Found
- The opening stated that application pods keep running "without interruption." This was too broad because Istio documents that ztunnel upgrades can briefly disrupt ambient traffic on the updated node. Updated the wording to distinguish pod restarts from traffic interruption.
- The upgrade order did not match Istio's ambient Helm upgrade sequence for manually deployed gateways and revision-tagged waypoints/gateways. Updated the order and matching checklist items.
- The version compatibility explanation was too broad. Updated it to match Istio's documented compatibility for ztunnel and istio-cni with a control plane at the same minor version or one minor version newer.
- The in-place istioctl example used `istioctl install`. Replaced it with `istioctl upgrade`, which Istio documents for in-place upgrades and defines as an alias for install.
- The revisioned istioctl example used the full ambient profile, which can include ambient data plane components. Updated it to install a revisioned ambient control plane while disabling istio-cni and ztunnel for that canary control plane.
- The namespace migration example did not remove `istio-injection`, which Istio documents as taking precedence over `istio.io/rev`. Added the label removal command.
- The old control plane uninstall example used `--revision=default`, which is not the correct way to remove a non-revisioned control plane. Replaced it with separate revisioned and non-revisioned examples.
- The Helm CNI upgrade command omitted `--set profile=ambient`. Added it to match Istio's ambient Helm upgrade documentation.
- The waypoint upgrade example restarted deployments directly, but Istio's ambient upgrade guidance uses revision tags for waypoints and gateways. Replaced it with revision-tag and explicit waypoint revision examples.
- The ingress gateway Helm namespace used `istio-system`, while Istio's Helm gateway install/upgrade examples use the gateway release namespace. Updated the example to `istio-ingress`.
- The checklist referenced `istioctl verify-install`, which is not present in the current `istioctl` command reference. Replaced it with `istioctl analyze`.

## Review Notes
The post uses Istio 1.24.1 as an example target version. The current Istio documentation checked during validation is for Istio 1.30/latest, so future updates should refresh the example version and Gateway API CRD version if the post is intended to track the latest release.

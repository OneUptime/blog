# Validation Summary: How to Install Multiple Istio Control Planes in a Single Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Kubernetes
- Helm
- istioctl
- Istio control plane revisions
- Istio revision tags
- Istio gateways

## Sources Consulted
- Istio documentation: Install Multiple Istio Control Planes in a Single Cluster - https://istio.io/latest/docs/setup/install/multiple-controlplanes/
- Istio documentation: Canary Upgrades - https://istio.io/latest/docs/setup/upgrade/canary/
- Istio documentation: Install with Helm - https://istio.io/latest/docs/setup/install/helm/
- Istio documentation: Upgrade with Helm - https://istio.io/latest/docs/setup/upgrade/helm/
- Istio documentation: Installing Gateways - https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio documentation: Resource Labels - https://istio.io/latest/docs/reference/config/labels/
- Istio documentation: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Helm chart defaults: istio-discovery values.yaml - https://github.com/istio/istio/blob/master/manifests/charts/istio-control/istio-discovery/values.yaml
- Istio Helm chart defaults: gateway values.yaml - https://github.com/istio/istio/blob/master/manifests/charts/gateway/values.yaml

## Issues Found
- The post described the same-namespace revision examples as fully independent tenant control planes. Updated the wording to distinguish revisioned control planes for canary/team separation from strict tenant isolation, which requires separate system namespaces and `discoverySelectors`.
- The explanation said each revisioned istiod only manages namespaces referencing its revision. Updated this to say revisioned webhooks inject newly created pods to connect to the selected control plane; hard resource scoping requires discovery selectors.
- The Helm base install omitted `defaultRevision`, which current Istio Helm documentation requires for validation in revisioned installs. Added `--set defaultRevision=stable`.
- The gateway section implied separate gateways are always required. Updated it to note separate gateways are appropriate for isolation, while canary upgrades can use in-place gateway upgrades or revision-specific gateway instances.
- The canary workflow uninstall command omitted `-y`, making it interactive. Added `-y` for consistency with non-interactive tutorial commands.
- The resource section stated typical istiod CPU and memory limits that are not current Istio defaults. Updated it to the current chart request defaults, 500m CPU and 2048Mi memory, and noted that istiod has no CPU or memory limits by default.
- The cleanup section used `istioctl tag list` under "List all revisions." Updated the text to "List all revision tags."
- The cleanup tag removal command was interactive. Added `-y` to match the documented skip-confirmation flag.

## Review Notes
The IstioOperator examples use the current `install.istio.io/v1alpha1` API and valid `meshConfig`, `defaultConfig`, and gateway component fields. The `istio.io/rev` label and revision tag examples match current Istio sidecar injection and tag documentation. For production multi-tenancy, the post now calls out the need for discovery selectors, but a future expansion could add a full separate-system-namespace example.

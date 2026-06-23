# Validation Summary: How to Debug MetalLB with Speaker Logs and Events

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- MetalLB
- Kubernetes Services, Events, EndpointSlices, and ephemeral containers
- MetalLB IPAddressPool, L2Advertisement, BGPAdvertisement, BGPPeer, ServiceL2Status, and ServiceBGPStatus CRDs
- ARP/NDP and BGP
- Prometheus and ServiceMonitor

## Sources Consulted
- MetalLB troubleshooting documentation: https://metallb.universe.tf/troubleshooting/
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB layer 2 concepts: https://metallb.universe.tf/concepts/layer2/
- MetalLB installation and logging documentation: https://metallb.universe.tf/installation/
- MetalLB Prometheus metrics documentation: https://metallb.universe.tf/prometheus-metrics/
- MetalLB upstream manifests and source code: https://github.com/metallb/metallb
- Kubernetes EndpointSlice deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- Speaker logs were described as covering IP assignment. MetalLB assigns IPs in the controller and advertises them in speakers, so the wording now directs readers to controller logs for allocation issues.
- The JSON patch example appended a second `--log-level` flag. Updated it to replace the default speaker argument in the standard manifest and noted that Helm or Operator installs should use their supported loglevel settings.
- The L2 ARP and BGP log examples used non-current illustrative event names. Updated them to match MetalLB's documented and source-backed log messages more closely.
- The event-reason diagram included names that are not current MetalLB Kubernetes event reasons. Replaced them with reasons emitted by the current controller and speaker code.
- The Service annotation used the deprecated `metallb.universe.tf/address-pool` prefix. Updated it to `metallb.io/address-pool`.
- The memberlist HTTP debug endpoint command was not valid for current MetalLB. Replaced it with ServiceL2Status lookup, which MetalLB documents for identifying the announcing node.
- Several `kubectl exec` examples assumed tools such as `ip`, `nc`, `bash`, and `ping` exist inside the speaker container. MetalLB documents these containers as distroless, so those commands now use `kubectl debug` with an ephemeral troubleshooting image.
- Shell examples used angle-bracket placeholders that would be parsed as redirection if copied directly. Replaced them with concrete example IP addresses.
- The diagnostic script did not collect ServiceL2Status or ServiceBGPStatus resources. Added both because MetalLB documents them as advertisement-status sources.
- The endpoint check used the deprecated Endpoints API. Updated it to use EndpointSlices.
- The `metallb_speaker_announced` metric was described as a count of announced IPs. Updated it to reflect MetalLB's documented meaning as desired service announcement state from a node.
- The metrics and alerts only mentioned `metallb_bgp_*` metrics. Added the `frrk8s_` prefix caveat for the default FRR-K8s BGP backend and updated the BGP alert expression.
- The ServiceMonitor example used a selector and port that did not match upstream MetalLB monitoring manifests. Updated it to match the upstream monitor service labels and `metricshttps` port pattern, and clarified that the ServiceMonitor selects Services created by the monitoring overlay.

## Review Notes
The post remains version-neutral, but MetalLB BGP behavior depends on the selected backend. Native BGP, deprecated FRR mode, and default FRR-K8s mode expose some logs and metrics differently, so future updates should keep backend-specific diagnostics explicit.

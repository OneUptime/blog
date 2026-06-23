# Validation Summary: How to Troubleshoot Common Istio Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Istio
- istioctl
- Envoy proxy
- Kubernetes
- Kubernetes Gateway and Service resources
- Istio VirtualService, DestinationRule, PeerAuthentication, Sidecar, and Telemetry APIs
- mTLS and workload certificates

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio configuration analysis messages: https://istio.io/latest/docs/reference/config/analysis/
- Istio PortNameIsNotUnderNamingConvention analyzer: https://istio.io/latest/docs/reference/config/analysis/ist0118/
- Istio PodMissingProxy analyzer: https://istio.io/latest/docs/reference/config/analysis/ist0103/
- Istio istioctl describe documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/

## Issues Found
- The architecture diagram showed legacy component names and an inaccurate Galley policy-enforcement relationship. Updated the diagram to describe modern `istiod` responsibilities: xDS traffic configuration, Istio CA certificate management, and sidecar injection.
- The analysis section incorrectly mapped service port naming issues to `IST0103`. Current Istio defines `IST0103` as `PodMissingProxy`; port naming convention messages use `IST0118`. Updated the diagram and command comments accordingly.
- The connectivity and DNS examples used `kubectl exec` into the `istio-proxy` container for tools such as `curl` and `nslookup`. That is unreliable with modern proxy images, so the examples now use `kubectl debug` containers with appropriate utility images.
- The mTLS status section used the outdated `istioctl authn tls-check` command, which is not present in the current Istio command reference. Replaced it with `istioctl experimental describe pod`, which Istio documents for inspecting pod configuration and mTLS conflicts.
- The certificate verification example referred to Citadel and used `openssl s_client` against a cluster service from the local shell. Updated the wording to refer to the Istio CA, usually provided by `istiod`, and inspect the certificate from `istioctl proxy-config secret` output instead.
- The mTLS workflow recommended restarting `istiod` to rotate expired workload certificates. Updated it to restart the affected workload, consistent with the later command example and Istio workload certificate behavior.
- Several Istio resource snippets used older `v1beta1` API versions. Updated the PeerAuthentication, DestinationRule, VirtualService, and Sidecar examples to the current stable `security.istio.io/v1` or `networking.istio.io/v1` APIs.
- The control-plane metrics example executed `curl` inside the `istiod` deployment, which is unreliable for minimal images. Changed it to port-forward the `istiod` metrics port and query it locally.
- The access logging example used a broad EnvoyFilter patch for access logs. Replaced it with the current Istio Telemetry API for enabling access logging with the default provider.

## Review Notes
Local `istioctl` and `kubectl` binaries were not installed in the workspace, so command validation was performed against the official Istio documentation rather than local `--help` output. The post remains focused on sidecar-mode Istio; ambient-mode troubleshooting would require additional commands and workflows in a future update.

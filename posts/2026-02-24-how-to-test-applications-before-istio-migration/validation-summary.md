# Validation Summary: How to Test Applications Before Istio Migration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecars
- ServiceEntry
- IstioOperator
- istioctl
- Fortio
- Kubernetes health probes

## Sources Consulted
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio sidecar injection docs: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio protocol selection docs: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio outbound traffic policy reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio health checking and probe rewrite docs: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio mesh configuration reference for terminationDrainDuration: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio performance and scalability docs: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio Fortio sample manifest: https://raw.githubusercontent.com/istio/istio/release-1.30/samples/httpbin/sample-client/fortio-deploy.yaml
- Istio analyze docs: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/

## Issues Found
- The post used `istioctl verify-install`, which is not present in the current Istio 1.30 command reference. Changed it to `istioctl version` as a current command for verifying CLI connectivity to the control plane, while keeping the existing pod check for installation health.
- The port naming guidance only mentioned prefixes such as `http-`, `grpc-`, and `tcp-`. Current Istio docs specify `name: <protocol>[-<suffix>]` and also support Kubernetes `appProtocol`, with `appProtocol` taking precedence. Updated the wording to include both supported mechanisms.
- The Fortio deployment URL pointed to `fortio/fortio/master/docs/fortio-deployment.yaml`, which is not a valid current manifest location. Replaced it with Istio's official Fortio sample manifest from the Istio 1.30 release branch and updated the deployment name/container in the `kubectl exec` command.
- The latency expectations gave fixed P50 and P99 overhead ranges. Istio's official performance docs describe latency as dependent on traffic pattern, hardware, proxy workers, mTLS, and other benchmark conditions. Reworded the bullets to avoid presenting environment-specific values as universal expectations.
- The probe troubleshooting text implied users should set `sidecar.istio.io/rewriteAppHTTPProbers` to `true`. Istio's built-in profiles enable probe rewriting by default, and the documented annotation is commonly used to disable it with `"false"`. Updated the wording to reflect current default behavior and the global disable setting.

## Review Notes
The remaining examples are representative rather than copy-paste complete because they depend on the user's manifests, service names, test clients, and gateway setup. Future improvements could mention revision-based injection labels such as `istio.io/rev` for canary control plane migrations, but the existing `istio-injection=enabled` guidance remains valid.

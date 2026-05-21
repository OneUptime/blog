# Validation Summary: How to Validate Istio Upgrade Process for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- istioctl
- Kubernetes
- Kubernetes Gateway API
- Envoy xDS

## Sources Consulted
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio Upgrade Overview: https://istio.io/latest/docs/setup/upgrade/
- Istio In-place Upgrades: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio Installing Gateways: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio istioctl Command Reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Kubernetes Gateway API Overview: https://gateway-api.sigs.k8s.io/concepts/api-overview/

## Issues Found
- Added `istioctl x precheck` to the pre-flight commands because Istio documents it as the upgrade compatibility check.
- Corrected the proxy-status guidance. `ECDS` can legitimately show `NOT SENT`; the important pre-upgrade sync checks are the main xDS columns such as `CDS`, `LDS`, `EDS`, and `RDS`.
- Corrected the upgrade-path claim. In-place upgrades require no more than one minor version of skew, while revision-based canary upgrades support jumping across two minor versions; more than two minor versions is not officially tested or recommended.
- Updated outdated Istio 1.22 examples to Istio 1.30-style revision names because Istio 1.22 is no longer supported.
- Replaced stale/incorrect istiod metric names with documented metrics: `pilot_total_xds_internal_errors` and `pilot_xds_push_time`.
- Changed the istiod metric commands to port-forward the monitoring endpoint before using `curl`, avoiding an assumption that the istiod container image includes `curl`.
- Fixed the Kubernetes Gateway API HTTPS example by adding `hostname` and TLS certificate configuration, since HTTPS listeners require a TLS Secret reference.
- Corrected gateway upgrade validation wording to verify the gateway control plane revision with `istioctl proxy-status` instead of implying every gateway is upgraded only after workload migration.
- Updated the final old-revision check to use the new example revision and filter out the `proxy-status` header.

## Review Notes
The commands are examples and assume the operator runs the target Istio release's `istioctl` binary, has sample `sleep` and `httpbin` workloads deployed in the referenced namespaces, and has a `production-tls` Kubernetes TLS Secret for the Gateway API example.

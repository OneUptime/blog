# Validation Summary: How to Use Essential istioctl Commands (Cheat Sheet)

## Status
validated

## Post Type
Reference / cheat sheet

## Technologies Covered
- Istio
- istioctl
- Kubernetes
- Envoy proxy configuration
- Service mesh diagnostics and security

## Sources Consulted
- Istio official istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio installation configuration profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio install with istioctl guide: https://istio.io/latest/docs/setup/install/istioctl/
- Istio diagnostic tools guide for istioctl: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/
- Istio "Understand your Mesh with Istioctl Describe" guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Local `istioctl` 1.29.0 `--help` output for command and flag verification.

## Issues Found
- The demo profile comment incorrectly implied Kiali and Grafana are installed by the profile. Current Istio profiles install core Istio components; addons are separate integrations. Updated the comment to describe the demo profile as evaluation-oriented.
- `istioctl profile list`, `istioctl profile dump`, and `istioctl profile diff` are not available in current `istioctl` 1.29. Replaced them with `istioctl manifest generate --set profile=...` and a standard `diff -u` between generated manifests.
- `istioctl authn tls-check` is no longer available. Replaced the examples with current diagnostic commands: `istioctl x describe pod ...` for mTLS-related workload configuration and `istioctl proxy-config clusters ... -o json` for outbound TLS settings.
- `istioctl dashboard envoy` is deprecated in current Istio. Replaced it with `istioctl dashboard proxy`.
- `istioctl verify-install` is not available in current `istioctl` 1.29. Replaced it with `istioctl install --revision 1-23 --verify`, which uses the current install verification flag.

## Review Notes
The remaining commands and flags were checked against the current official command reference and `istioctl` 1.29.0 help output. I did not execute commands against a live Kubernetes cluster, so runtime behavior depending on cluster state, workload names, installed addons, or namespace labels was not tested.

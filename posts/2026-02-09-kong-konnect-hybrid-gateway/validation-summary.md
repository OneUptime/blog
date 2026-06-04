# Validation Summary: How to Deploy Kong with Konnect Control Plane for Hybrid Gateway Architecture

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kong Konnect
- Kong Gateway hybrid mode
- Kong Helm chart
- Kubernetes
- Konnect Control Plane Config API
- decK
- Prometheus metrics

## Sources Consulted
- Kong Gateway hybrid mode documentation: https://developer.konghq.com/gateway/hybrid-mode/
- Kong Gateway data plane reference for Konnect: https://developer.konghq.com/gateway/data-plane-reference/
- Kong Gateway Helm install for Konnect: https://developer.konghq.com/gateway/install/kubernetes/konnect/
- Kong Gateway Services entity and Konnect API examples: https://developer.konghq.com/gateway/entities/service/
- Kong Gateway Routes entity and Konnect API examples: https://developer.konghq.com/gateway/entities/route/
- decK Konnect configuration documentation: https://developer.konghq.com/deck/gateway/konnect-configuration/
- decK gateway command documentation: https://developer.konghq.com/deck/gateway/
- decK version support policy: https://developer.konghq.com/deck/support/
- Kong Prometheus plugin documentation: https://developer.konghq.com/plugins/prometheus/
- Kong Gateway monitoring documentation: https://developer.konghq.com/gateway/monitoring/
- Kong Helm chart values: https://raw.githubusercontent.com/Kong/charts/main/charts/kong/values.yaml

## Issues Found
- Replaced outdated "runtime groups" terminology with current Konnect control plane terminology.
- Corrected the Konnect data plane certificate setup. Current Konnect Helm guidance uses the data plane certificate and key mounted as `tls.crt` and `tls.key`; it does not require a separate `ca.crt` config map in the example.
- Updated the Helm data plane values to include required Konnect settings: `konnect_mode`, `vitals`, `cluster_cert`, `cluster_cert_key`, and `lua_ssl_trusted_certificate: system`.
- Updated the Kong Gateway image tag from `3.5` to `3.14`, matching the current Kong Gateway documentation generation.
- Disabled Admin API and Manager through Helm chart service values in the main data plane deployment example.
- Added SNI settings to the multi-region data plane snippets so the control plane and telemetry endpoints match the required Konnect TLS configuration.
- Fixed a typo in the Konnect API hostname from `us.api.konkhq.com` to `us.api.konghq.com`.
- Updated decK commands from legacy top-level forms (`deck validate`, `deck diff`, `deck sync`) to current `deck gateway` subcommands.
- Updated the CI decK install version from `v1.28.0` to `v1.60.0`; Konnect requires decK v1.40.0 or newer.
- Removed an invalid example URL for a Konnect analytics summary endpoint and replaced it with guidance to use Konnect Metrics API or Observability Explorer.
- Corrected the Prometheus example to expose the Kong Status API on port 8100. The prior `prometheus: "on"` environment variable was not a valid Kong Gateway setting for exposing `/metrics`.
- Replaced the pod-local `iptables` disaster recovery test with a firewall/security group/Kubernetes egress policy instruction, because the original command depended on pod privileges and a pod name that would not exist for the Helm deployment.
- Corrected the certificate rotation rollout restart target to the deployment name created by `helm install kong-dp kong/kong`, `deployment/kong-dp-kong`.

## Review Notes
- Helm was not installed in the review environment, so Helm rendering was not run locally. The Helm values were checked against the current official Kong chart values and Konnect installation documentation.
- The Konnect API examples remain illustrative and use placeholders for region, control plane ID, and endpoints. Users must replace these with values from their own Konnect organization and control plane.

# Validation Summary: How to Respond to Dapr Control Plane Outages

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (control plane components: operator, sentry, placement, sidecar-injector, dashboard)
- Kubernetes (kubectl, deployments, secrets, node management)
- Helm (Dapr chart configuration)
- Dapr CLI (mtls certificate renewal, HA init)
- Prometheus (alerting rules)
- OpenSSL (certificate inspection)

## Sources Consulted
- Dapr Production Guidelines - Kubernetes: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Operator Service: https://docs.dapr.io/concepts/dapr-services/operator/
- Dapr Sentry Service: https://docs.dapr.io/concepts/dapr-services/sentry/
- Dapr Placement Service: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr mTLS Renew Certificate CLI Reference: https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-renew-certificate/
- Dapr Init CLI Reference: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr mTLS Setup and Configuration: https://docs.dapr.io/operations/security/mtls/
- Dapr Troubleshooting Common Issues: https://docs.dapr.io/operations/troubleshooting/common_issues/

## Issues Found

1. **Missing core control plane component**: The post listed four control plane components but omitted `dapr-sidecar-injector`, which is a core component responsible for injecting the Dapr sidecar into annotated pods. This is critical during an outage because if the injector is down, new pods will not get Dapr sidecars. Added `dapr-sidecar-injector` to the components list and clarified that `dapr-dashboard` is installed separately.

2. **Incorrect `--valid-until` flag value**: The certificate renewal command used `--valid-until 8760h`, but the Dapr CLI `--valid-until` flag expects a value in **days**, not hours. Changed `8760h` to `365` (days). Also added the `--restart` flag which restarts the Dapr control plane pods to pick up the new certificates.

3. **Incorrect HA mode CLI flag**: The post used `dapr init -k --set global.ha.enabled=true`, which mixes Helm `--set` syntax with the Dapr CLI. The correct Dapr CLI flag is `--enable-ha`. Changed to `dapr init -k --enable-ha`.

## Review Notes
- The Prometheus alert rule in Step 6 is a reasonable template but the `job` label value (`dapr-system`) would need to match whatever scrape configuration is set up for the Dapr control plane. This is environment-specific and fine as a starting example.
- The Helm values format for HA mode (`global.ha.enabled` and `global.ha.replicaCount`) is correct for the Dapr Helm chart.
- The `dapr-placement` component is technically optional if the application does not use Dapr actors, but listing it as a core component is reasonable for a general incident response guide.
- The claim that existing sidecars continue running during a control plane outage is generally accurate — sidecars cache their certificates and state, and only new pod startups and certificate renewals are affected.

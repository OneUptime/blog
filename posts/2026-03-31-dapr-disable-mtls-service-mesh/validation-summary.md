# Validation Summary: How to Disable Dapr mTLS When Using Service Mesh mTLS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Configuration resource, Sentry, mTLS, Helm chart)
- Kubernetes (kubectl, NetworkPolicy, annotations)
- Istio (Envoy proxy, pilot-agent stats)
- Linkerd (linkerd viz CLI)
- Consul Connect (mentioned)

## Sources Consulted
- Dapr Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Helm chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr logs troubleshooting: https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/
- Istio pilot-agent reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Envoy listener statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Linkerd mTLS validation: https://linkerd.io/2-edge/tasks/validating-your-traffic/
- Linkerd viz CLI reference: https://linkerd.io/2-edge/reference/cli/viz/

## Issues Found
1. **Invalid Helm parameter `dapr_sentry.enabled=true`**: The `dapr_sentry.enabled` parameter does not exist in the Dapr Helm chart. Sentry cannot be disabled because it manages mandatory control plane TLS. Removed the `--set dapr_sentry.enabled=true` line from the Helm upgrade command.
2. **Incorrect Linkerd column name**: The post referred to a "TLS column" in `linkerd viz edges` output. The actual column is called "SECURED" and displays a checkmark when mTLS is active. Updated the comment to reference the correct column name.

## Review Notes
- The Dapr Configuration resource YAML, apiVersion (`dapr.io/v1alpha1`), and `spec.mtls.enabled` field are all correct per current documentation.
- The `dapr.io/config` annotation is correctly documented.
- The Istio `pilot-agent request GET stats` command and `ssl.handshake` stat name are both accurate.
- The `linkerd viz edges deploy` command is correct.
- The daprd container name (`-c daprd`) for kubectl logs is correct.
- The NetworkPolicy YAML is syntactically valid.
- The `global.mtls.enabled=false` Helm value is the correct way to disable mTLS cluster-wide.

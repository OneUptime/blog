# Validation Summary: Configuring Calico Typha for Kubernetes Operators

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Calico Typha
- Tigera operator
- Kubernetes
- kubectl
- calicoctl
- Prometheus metrics

## Sources Consulted
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico component metrics guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico Typha scheduling/operator notes: https://docs.tigera.io/calico/latest/network-policy/comms/reduce-nodes
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Project Calico source for Typha config parameters: https://github.com/projectcalico/calico

## Issues Found
- The prerequisites said operator-based installs deploy Typha automatically for 50+ nodes. Calico documentation states operator-based installations include Typha, so the wording was corrected.
- The post implied operator-managed Typha runtime environment variables can be configured directly on the Deployment. Calico documents that Typha runtime configuration cannot generally be modified in operator installs, so the text now treats those variables as operator-managed and read-only unless the Installation API exposes a supported field.
- `TYPHA_CONNECTIONREBALANCINGENABLED` is not a current Typha configuration parameter. It was replaced with `TYPHA_CONNECTIONREBALANCINGMODE`, and the surrounding explanation was corrected.
- The Prometheus troubleshooting advice only mentioned the raw Typha environment variable. For operator installs, the documented way to enable Typha metrics is `spec.typhaMetricsPort`, so the note now distinguishes operator and manifest-based installs.
- The CRD version inspection command printed the CRD name and creation timestamp, not served versions. It now uses `custom-columns` to show `.spec.versions[*].name`.
- The RBAC check mixed `kubectl auth can-i --list` mode with a specific verb/resource check. It was replaced with valid `kubectl auth can-i create` and `update` checks for Calico GlobalNetworkPolicy resources.
- The conclusion broadly recommended the Installation resource for all configuration changes. It now limits that recommendation to supported operator fields such as deployment resources and metrics.

## Review Notes
The resource customization snippet using `spec.typhaDeployment.spec.template.spec.containers[].resources` matches the current Installation API pattern. The resource sizing table is operational guidance rather than an official Calico guarantee, so it was left unchanged.

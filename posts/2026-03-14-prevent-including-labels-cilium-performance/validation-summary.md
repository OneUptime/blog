# Validation Summary: Preventing Including Labels in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus Operator
- Flux HelmRelease
- Bash
- Python

## Sources Consulted
- Cilium documentation: Limiting Identity-Relevant Labels, https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium documentation: Terminology and label sources, https://docs.cilium.io/en/stable/gettingstarted/terminology/
- Cilium documentation: Monitoring & Metrics, https://docs.cilium.io/en/stable/observability/metrics/
- Cilium CLI reference: cilium config view, https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Cilium CLI reference: cilium-dbg identity list, https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Flux documentation: HelmRelease API and valuesFrom, https://fluxcd.io/flux/components/helm/api/v2/
- Prometheus Operator API reference, https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Helm `labels` example used `k8s:` source prefixes and listed identity-relevant labels as exact label names. Cilium documents this setting as a space-separated list of regular-expression label patterns, with common labels such as namespace, service account, cluster, and `app.kubernetes.io` added automatically when inclusive patterns are configured. Changed the example to use the exact `app` label pattern `app$`.
- The policy review gate compared policy labels with configured label patterns using exact string comparison. This would incorrectly warn for valid regex or default-inclusive labels. Updated the script to read the `labels` key from the `cilium-config` ConfigMap, account for Cilium's default inclusive patterns, normalize common Cilium label source prefixes, and match policy labels with regular expressions.
- The Prometheus alert used `cilium_identity_count`, which is not the current documented metric name. Changed it to `sum(cilium_identity) > 5000`, matching the documented `identity` metric exported under the `cilium_` namespace.
- The verification section used `cilium identity list`, but the documented identity listing command is `cilium-dbg identity list`. Updated the example to run `cilium-dbg identity list` inside the Cilium DaemonSet and to read the label configuration directly from the ConfigMap.

## Review Notes
The post is technically relevant and the corrected examples align with current Cilium documentation. The identity-count threshold of 5000 remains an environment-specific operational threshold rather than a Cilium default.

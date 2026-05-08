# Validation Summary: How to Troubleshoot Prometheus Access for Cilium Observability

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Cilium
- Hubble
- Prometheus
- Prometheus Operator ServiceMonitor
- Kubernetes
- Helm
- kubectl
- CiliumNetworkPolicy

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Operator design documentation: https://prometheus-operator.dev/docs/getting-started/design/
- Helm upgrade documentation: https://helm.sh/docs/helm/helm_upgrade/

## Issues Found
- The ServiceMonitor comparison commands piped `kubectl` JSONPath output for objects such as selectors and labels into `python3 -m json.tool`. Kubernetes JSONPath output for map objects is not reliable JSON, so those examples could fail. Changed them to display the Prometheus selector from YAML and ServiceMonitor labels with `--show-labels`.
- The CiliumNetworkPolicy namespace selector used `io.kubernetes.pod.namespace` without the Cilium Kubernetes label prefix. Current Cilium policy documentation uses `k8s:io.kubernetes.pod.namespace` for namespace matching in `fromEndpoints` and `toEndpoints`, so the selector was corrected.
- Commands executed inside Cilium agent pods used `cilium status`. Current Cilium troubleshooting documentation uses `cilium-dbg status` inside Cilium pods, so those commands were updated.
- The Hubble status check used `cilium hubble status`, which is not a documented Cilium CLI subcommand. Updated it to use `hubble status -P` after starting the Cilium CLI port-forward, matching the Hubble setup documentation.
- The verification query used `cilium_endpoint_count`, but Cilium documents the agent metric as `endpoint` under the `cilium_` Prometheus namespace. Updated the query to `cilium_endpoint`.

## Review Notes
The guide assumes Prometheus Operator and Cilium Helm ServiceMonitor workflows in several examples. That is valid for kube-prometheus-stack-style deployments, but clusters using annotation-based Prometheus scraping may need to inspect scrape configuration instead of ServiceMonitor selectors.

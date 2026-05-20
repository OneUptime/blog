# Validation Summary: How to Use Kubecost with ArgoCD for Cost Visibility

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubecost
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- Helm
- Prometheus and PrometheusRule
- Grafana
- Python
- Bash, curl, jq

## Sources Consulted
- Kubecost Helm chart repository and chart values: https://kubecost.github.io/cost-analyzer/
- Kubecost Allocation API: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=apis-allocation-api
- Kubecost Container Request Right Sizing Recommendation API: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=apis-container-request-right-sizing-recommendation-api
- Kubecost Alerts documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=ui-alerts
- Kubecost metrics documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=overview-kubecost-metrics
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD ApplicationSet template and cluster generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/ and https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/applicationset/Generators-Cluster/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Kubecost Helm chart version was pinned to an older 2.1.0 release. Updated the examples to the current chart version available from the official Kubecost chart repository, 2.9.6.
- The initial Helm values included unsupported `kubecostModel.allocateIdle`, `kubecostModel.cloudCost`, and `savings.enabled` settings. Removed those invalid settings and kept supported chart values.
- The shared cost example used unsupported nested `sharedCosts.shareNamespaces` and `shareBy` fields. Replaced it with the supported `kubecostProductConfigs.sharedNamespaces` value.
- The sample Argo CD Application for a labeled workload omitted required source and destination context. Added `project`, `repoURL`, `targetRevision`, and `destination` so the manifest is structurally usable.
- Kubecost API examples used `curl --data-urlencode` without `-G`, which sends a POST by default even though the documented APIs are GET endpoints. Added `-G`.
- The right-sizing examples used the old `/model/savings/requestSizing` endpoint and `targetMemoryUtilization`. Updated them to `/model/savings/requestSizingV2` and `targetRAMUtilization`.
- The right-sizing response handling used fields that do not match the V2 response. Updated `jq`, Python, and Bash examples to use `containerName`, `latestKnownRequest`, and the CPU/RAM object under `monthlySavings`.
- The Python report fetched recommendations but never calculated `total_potential_savings`. Added a small loop that sums CPU and memory monthly savings from the V2 response.
- The PrometheusRule example used non-existent Kubecost allocation cost metric names. Replaced them with recording rules based on documented Kubecost allocation metrics joined with `kube_pod_labels`.
- The alert configuration used the wrong Helm values path, an unsupported `anomaly` alert type, and an unsupported 30-day budget window. Moved alerts under `global.notifications.alertConfigs`, replaced anomaly with `spendChange`, and used a supported 7-day budget window.
- The multi-cluster federation example used unsupported `kubecostProductConfigs.federatedETL` fields. Replaced it with supported `global.federatedStorage`, top-level `federatedETL`, and `kubecostProductConfigs.clusterName` settings.
- The ApplicationSet example used legacy template variables and omitted key Application fields. Added `goTemplate`, Go-template variable syntax, `project`, `targetRevision`, and namespace creation sync options.

## Review Notes
The corrected examples are syntactically valid YAML and Python. The Prometheus dashboard rules now expose allocation signals suitable for Grafana correlation; exact currency allocation should still come from the Kubecost Allocation API because Kubecost's documented Prometheus metrics are lower-level model inputs rather than the full allocation API result.

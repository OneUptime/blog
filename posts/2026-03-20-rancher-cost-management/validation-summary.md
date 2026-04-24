# Validation Summary: How to Set Up Cost Management for Rancher Clusters - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Monitoring
- OpenCost
- Kubecost
- Kubernetes
- Helm
- Prometheus / PrometheusRule
- Vertical Pod Autoscaler (VPA)
- AWS Cost and Usage Report (CUR) / Athena
- `kubectl`
- `jq`

## Sources Consulted
- OpenCost Helm installation docs: https://opencost.io/docs/installation/helm/
- OpenCost cloud configuration docs: https://opencost.io/docs/configuration/
- OpenCost AWS cloud costs docs: https://opencost.io/docs/configuration/aws/
- OpenCost API docs: https://opencost.io/docs/integrations/api/
- OpenCost API examples: https://opencost.io/docs/integrations/api-examples
- OpenCost metrics reference: https://opencost.io/docs/integrations/metrics/
- OpenCost Helm chart values: https://raw.githubusercontent.com/opencost/opencost-helm-chart/main/charts/opencost/values.yaml
- OpenCost allocation key generation logic: https://raw.githubusercontent.com/opencost/opencost/develop/core/pkg/opencost/allocationprops.go
- Rancher monitoring docs: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher Prometheus configuration docs: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/prometheus
- Kubecost Helm chart README: https://raw.githubusercontent.com/kubecost/cost-analyzer-helm-chart/develop/README.md
- Kubecost chart values: https://raw.githubusercontent.com/kubecost/cost-analyzer-helm-chart/develop/kubecost/values.yaml
- Kubecost install notes template: https://raw.githubusercontent.com/kubecost/cost-analyzer-helm-chart/develop/kubecost/templates/NOTES.txt
- Kubecost Allocation API docs: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=apis-allocation-api
- Kubecost container request right-sizing API docs: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=apis-container-request-right-sizing-recommendation-api-v2
- Kubecost cluster right-sizing API docs: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=apis-cluster-right-sizing-recommendation-api
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes `kubectl top pod` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes Vertical Pod Autoscaler docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/

## Issues Found
- The OpenCost Helm example used an outdated external Prometheus configuration pattern for an in-cluster Rancher Monitoring Prometheus service. I updated it to the current chart values (`opencost.prometheus.internal.*`) that match the current OpenCost Helm chart.
- The AWS "cloud pricing" example was technically incorrect. OpenCost cloud costs are configured via a `cloud-integration.json` secret plus Helm values, not a `ConfigMap` named `cloud-costs`. I replaced the snippet with the current AWS Athena/CUR secret format and the required `helm upgrade` to enable `opencost.cloudCost.enabled` and `opencost.cloudIntegrationSecret`.
- The Kubecost install example targeted the older `cost-analyzer` chart and old service names. I updated it to the current `kubecost/kubecost` chart, added the required `global.clusterId`, and corrected the UI service to `svc/kubecost-frontend`.
- The workload-labeling Deployment manifest was not a valid `apps/v1` Deployment because it omitted required fields such as `.spec.selector` and a container spec. I added the minimum required Deployment fields so the manifest is syntactically valid.
- The Prometheus budget-alert rules referenced non-existent OpenCost metrics (`opencost_container_cpu_cost_hourly` / `opencost_container_memory_cost_hourly`). I replaced those with valid metric expressions derived from OpenCost’s documented metrics (`container_cpu_allocation`, `container_memory_allocation_bytes`, `pod_pvc_allocation`, `node_cpu_hourly_cost`, `node_ram_hourly_cost`, `pv_hourly_cost`).
- The `kubectl top` command used the wrong resource form (`kubectl top pods`). I corrected it to `kubectl top pod`, which matches the official CLI reference.
- The Kubecost savings API example incorrectly called `/model/savings` and expected a `.requestSizings[]` payload. Current docs show `/model/savings` is the cluster right-sizing API; container request right-sizing is exposed at `/model/savings/requestSizingV2` and returns a top-level array. I updated the endpoint, required `window` parameter, and parsing logic.
- The unused-volume example did not actually find unused bound PVCs and included a broken `jq | grep "Released"` pipeline. I replaced it with a working comparison between bound PVCs and pod-mounted PVCs, while retaining the released-PV cleanup check.
- The VPA manifest comment said "Install VPA" even though the snippet only creates a `VerticalPodAutoscaler` object. I corrected the wording and noted that the VPA controller and CRDs must already be installed.
- The Kubecost allocation-report example still used the old in-cluster service name and tried to numeric-sort JSON objects directly. I updated the service endpoint and converted the output to TSV before sorting.
- The chargeback script used the wrong OpenCost port, the older allocation endpoint, and an invalid `window` value (`YYYY-MM`). I changed it to the current OpenCost API on port `9003`, used an RFC3339 month start/end range, enabled accumulated results, and parsed the multi-aggregation keys according to OpenCost’s current allocation key format.

## Review Notes
- The corrected Kubecost installation now reflects the current Kubecost 3.x chart. Kubecost 3.x requires Kubernetes 1.29+ according to the upstream chart README.
- The OpenCost and Kubecost examples assume in-cluster DNS access when calling service endpoints directly from scripts or debug shells.
- `kubectl top` requires Metrics Server to be installed and functioning.
- VPA recommendations require the Vertical Pod Autoscaler controller and CRDs to already exist in the cluster.

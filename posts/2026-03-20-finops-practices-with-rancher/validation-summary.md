# Validation Summary: How to Configure FinOps Practices with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- OpenCost
- Grafana
- PromQL
- Vertical Pod Autoscaler (VPA)
- Python
- Bash
- Amazon EC2

## Sources Consulted
- OpenCost API: https://opencost.io/docs/integrations/api/
- OpenCost API Examples: https://opencost.io/docs/integrations/api-examples/
- OpenCost Metrics: https://opencost.io/docs/integrations/metrics/
- OpenCost Specification: https://opencost.io/docs/specification/
- OpenCost Swagger schema: https://github.com/opencost/opencost/blob/develop/docs/swagger.json
- Kubernetes Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes ResourceQuota example and behavior: https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/
- Kubernetes Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher EC2 Machine Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/downstream-cluster-configuration/machine-configuration/amazon-ec2
- Rancher Projects workflow: https://ranchermanager.docs.rancher.com/v2.13/api/workflows/projects
- Rancher project resource quotas: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The OpenCost chargeback example used an outdated/non-current endpoint, parsed the wrong response structure, and referenced fields not present in the current Allocation schema. I updated it to use `/allocation`, parse `data[0]`, and read fields documented in the OpenCost API and swagger.
- The chargeback example used a rolling `30d` window while describing the output as a monthly report. I changed it to `lastmonth` and aligned the CSV filename with the previous calendar month.
- The Rancher Project example omitted the cluster-scoping fields Rancher documents for project creation. I added `metadata.namespace` and `spec.clusterName`.
- The Rancher spot instance example used outdated/incorrect cluster YAML fields (`roles`, `nodeConfig`, and inline `spotPrice`). I replaced it with current `workerRole` and `machineConfigRef` usage and clarified that spot settings belong in the referenced EC2 machine configuration.
- The post described ResourceQuota as direct budget enforcement and included inconsistent CPU and memory budget math. I corrected the wording to describe quotas as resource guard rails that approximate budget policy rather than enforce dollar spend directly.
- The dashboard section had panel titles that did not match the PromQL being executed, and the first query depended on labels not documented on OpenCost allocation metrics. I replaced the first panel with a documented OpenCost namespace cost query and retitled the other panels so they match the values they actually show.
- The rightsizing script assumed VPA availability without stating that VPA is a separately installed CRD/controller. I added that prerequisite and simplified the failure handling for `kubectl get vpa`.
- The cost-allocation label example placed labels on workload metadata instead of the Pod template. I updated it to show labels under `spec.template.metadata.labels`, which is where workload cost attribution labels need to exist.

## Review Notes
- The Grafana examples assume OpenCost metrics, kube-state-metrics metrics, and container usage metrics from Prometheus/cAdvisor are all available.
- The spot instance section is AWS-specific because the example uses Rancher EC2 machine configuration; equivalent settings for other providers use different machine config objects.
- The VPA example is accurate for current Kubernetes documentation, but VPA remains an add-on that must be installed separately from core Kubernetes.

# Validation Summary: How to Use Kubecost for Cluster Cost Allocation and Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubecost / IBM Kubecost Self-Hosted
- Helm
- Kubecost Allocation, Cloud Cost, Savings, and Alerts APIs
- AWS Cost and Usage Report with Athena
- GCP BigQuery billing export
- Azure Cost Management exports
- Prometheus metrics and PrometheusRule
- Python requests

## Sources Consulted
- IBM Kubecost Helm chart repository and install instructions: https://github.com/kubecost/kubecost
- IBM Kubecost First-Time User Install: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=installupgrade-first-time-user-install
- IBM Kubecost Helm Checks for 3.x value changes: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=checks-helm
- IBM Kubecost Cloud Billing Integrations: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=installation-cloud-billing-integrations
- IBM Kubecost AWS Cloud Billing Integration: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=integrations-aws-cloud-billing-integration
- IBM Kubecost GCP Cloud Integration: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=integrations-gcp-cloud-integration
- IBM Kubecost Azure Cloud Billing Integration: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=integrations-azure-cloud-billing-integration
- IBM Kubecost Allocation API: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=apis-allocation-api
- IBM Kubecost Cloud Cost API: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=apis-cloud-cost-api
- IBM Kubecost Abandoned Workloads API: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=apis-abandoned-workloads
- IBM Kubecost Container Request Right Sizing Recommendation API V2: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=apis-container-request-right-sizing-recommendation-api-v2
- IBM Kubecost Alerts: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=ui-alerts
- IBM Kubecost Aggregator for 3.x: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=federation-kubecost-aggregator
- IBM Kubecost Metrics: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=overview-kubecost-metrics
- IBM Kubecost Pricing Sources Matrix: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=audit-pricing-sources-matrix
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/

## Issues Found
- Updated Helm installation from the old `cost-analyzer` chart repository to the current `kubecost/kubecost` chart and `https://kubecost.github.io/kubecost/` repository.
- Replaced the `kubecostToken` example with `global.clusterId` and clarified that enterprise product keys are configured through Helm values.
- Corrected AWS, GCP, and Azure cloud integration JSON field names and structures to match Kubecost cloud billing integration docs.
- Updated the cloud integration Helm value from the older `kubecostProductConfigs.cloudIntegrationSecret` path to the current `cloudCost.cloudIntegrationSecret` path for Kubecost 3.x.
- Corrected the abandoned workloads API endpoint from `/model/savings/abandonment` to `/model/savings/abandonedWorkloads`.
- Updated request sizing from the older `/model/savings/requestSizing` endpoint to `/model/savings/requestSizingV2` and corrected utilization parameters.
- Replaced unsupported shared-cost ConfigMap fields with supported Allocation API parameters, including `shareNamespaces`, `shareLabels`, and `shareSplit`.
- Replaced the unsupported manual external costs ConfigMap with a Cloud Cost API query backed by cloud billing integration.
- Replaced the unsupported budget alert ConfigMap example with supported Helm alert configuration under `notifications.alertConfigs`.
- Replaced outdated multi-cluster Helm values with the Kubecost 3.x Federated ETL and Aggregator configuration pattern.
- Fixed the Python API parsing example to handle the Allocation API response shape and changed `memoryCost` to the documented `ramCost` field.
- Replaced nonexistent Prometheus metric examples with documented Kubecost metrics and adjusted the sample PrometheusRule accordingly.
- Softened unsupported quantitative claims about abandoned-resource savings and pricing differences to match documented behavior.

## Review Notes
Helm and kubectl were not installed in the local environment, so CLI behavior was validated against official documentation rather than local `--help` output. Kubecost 3.x has significant architecture and Helm value changes compared with 2.x; future updates should avoid mixing 2.x chart values with 3.x examples.

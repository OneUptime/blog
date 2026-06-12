# Validation Summary: How to Use Kubecost for Kubernetes Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubecost
- Helm
- Kubecost Allocation, Savings, Alerts, Reports, Budgets, and Cloud Billing APIs
- AWS, GCP, and Azure cloud billing integrations
- Kubernetes ResourceQuota and LimitRange

## Sources Consulted
- Kubecost Helm chart README: https://github.com/kubecost/kubecost
- Kubecost v3.2.1 Helm values: https://raw.githubusercontent.com/kubecost/kubecost/v3.2.1/kubecost/values.yaml
- Kubecost First-Time User Install: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=installupgrade-first-time-user-install
- Kubecost Allocation API: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=apis-allocation-api
- Kubecost Filter Parameters v2: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=directory-filter-parameters-v2
- Kubecost Alerts: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=ui-alerts
- Kubecost Budget API: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=apis-budget-api
- Kubecost Container Request Right Sizing API v2: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=apis-container-request-right-sizing-recommendation-api-v2
- Kubecost Multi-Cloud Integrations: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=integrations-multi-cloud
- Amazon EKS Kubecost dashboard access: https://docs.aws.amazon.com/eks/latest/userguide/cost-monitoring-kubecost-dashboard.html
- Kubernetes API reference: https://kubernetes.io/docs/reference/kubernetes-api/

## Issues Found
- The install commands used the older `cost-analyzer` chart repository and chart. Updated the Helm repository, chart name, namespace creation, and required `global.clusterId` setting for the current Kubecost chart.
- The production values example used obsolete or incorrect chart keys such as top-level `persistentVolume`, `kubecostModel`, bundled Prometheus, and Grafana settings. Replaced them with current `global`, `localStore`, `finopsagent`, and `networkCosts` values.
- The port-forward command targeted the old `kubecost-cost-analyzer` deployment. Updated it to the current `kubecost-frontend` service.
- Several Kubecost configuration examples used arbitrary ConfigMaps that Kubecost would not consume for reports, alerts, budgets, and allocation policy. Replaced them with documented Helm values, Allocation API parameters, and Budget API requests.
- The label filter example used the legacy `filterLabels` parameter. Updated it to the current v2 filter syntax.
- The container sizing API example used the old `containerSizing` endpoint. Updated it to `requestSizingV2` and removed unverified savings API examples.
- The optimized Deployment manifest was invalid because its selector did not match pod template labels. Added `template.metadata.labels`.
- Cloud billing examples used provider-specific ConfigMaps and outdated field names. Replaced them with the current `cloudCost.cloudIntegrationJSON` structure for AWS Athena, GCP BigQuery, and Azure Storage integrations.
- The cost calculation explanation referenced Prometheus as the metrics source. Updated it for Kubecost v3's FinOps agent metrics collection.

## Review Notes
- Helm was not installed in the local workspace, so Helm commands could not be executed directly. Chart values and commands were verified against Kubecost's published chart files and official documentation.
- YAML snippets in the post were parsed successfully after edits.

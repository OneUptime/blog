# Validation Summary: How to Configure GKE Cost Allocation Labels to Track Kubernetes Spending by Team

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud Billing detailed usage cost export
- BigQuery SQL
- Kubernetes labels, Deployments, and resource requests
- Kubernetes Vertical Pod Autoscaler
- kubectl
- Gatekeeper admission control
- Looker Studio

## Sources Consulted
- Google Cloud GKE cost allocation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cost-allocations
- Google Cloud SDK `gcloud container clusters update` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud SDK `gcloud container clusters create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud Billing detailed usage export schema: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/detailed-usage
- Google Cloud Billing export setup guide: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-setup
- Google Cloud Billing BigQuery table documentation: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes `kubectl top pod` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Gatekeeper Required Labels library documentation: https://open-policy-agent.github.io/gatekeeper-library/website/validation/requiredlabels/

## Issues Found
- The introduction described the cluster as a single billing line item. Updated it to say cluster costs lack workload metadata needed for team-level reporting, which better matches Cloud Billing behavior.
- The post said cost data appears after 24-48 hours. Updated this to "up to three days" based on GKE cost allocation documentation.
- The "How GKE Cost Allocation Works" section incorrectly claimed CPU and memory usage, persistent volume usage, and pod-level network egress are tracked. Updated it to reflect supported cost allocation inputs and SKU types: CPU requests, memory requests, supported GPU and Cloud TPU SKUs, and supported Persistent Disk costs.
- The post implied cost allocation shows actual usage. Updated the wording to clarify that cost allocation is based on requests and unallocated costs.
- The billing setup section described a GKE-specific BigQuery export. Updated it to require Cloud Billing detailed usage cost export and noted that GKE cost allocation data is not available in the standard export.
- The BigQuery examples used the wrong table prefix, `gcloud_billing_export_v1_XXXXXX`. Updated both examples to use the detailed export table prefix, `gcp_billing_export_resource_v1_XXXXXX`.
- The namespace query summed `usage.amount` across mixed SKUs, which is not a meaningful aggregate. Removed the `total_usage` column.
- The BigQuery joins filtered labels in the `WHERE` clause after a `LEFT JOIN`. Updated them to join labels by key in the `ON` clause and filter out null label values.
- The team-label query unnested credits directly, which can duplicate cost rows when a line item has multiple credits. Replaced it with a correlated subquery that sums credits per billing row before aggregation.
- The `kubectl top pods` example was described as a resource recommendation command. Updated the text and comment to describe it as current CPU and memory usage.
- The resource requests explanation said requested CPU is unavailable to other workloads. Updated it to the more precise Kubernetes behavior: requests drive scheduling and capacity planning.
- The shared-cost guidance referred to proportional allocation by actual usage. Updated it to refer to allocated costs or requested resources.

## Review Notes
The Gatekeeper constraint assumes the `K8sRequiredLabels` ConstraintTemplate has already been installed from the Gatekeeper library. The VPA example is technically current with `autoscaling.k8s.io/v1` and `updateMode: "Off"`, but it also assumes VPA is installed and available in the cluster.

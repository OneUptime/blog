# Validation Summary: How to Set Up Confidential GKE Nodes for Processing Encrypted Data in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine
- Confidential GKE Nodes
- Google Cloud Confidential VM
- Kubernetes Deployments, taints, tolerations, node selectors, NetworkPolicy, and PodDisruptionBudget
- gcloud CLI
- Terraform Google provider
- Cloud Monitoring dashboards
- Workload Identity

## Sources Consulted
- Google Cloud: Encrypt workload data in-use with Confidential GKE Nodes: https://cloud.google.com/kubernetes-engine/docs/how-to/confidential-gke-nodes
- Google Cloud SDK: `gcloud container clusters create`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud SDK: `gcloud container node-pools create`: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Google Cloud SDK: `gcloud container node-pools describe`: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/describe
- Google Cloud: Compute Engine live migration process during maintenance events: https://cloud.google.com/compute/docs/instances/live-migration-process
- Terraform Registry: `google_container_cluster` and `google_container_node_pool` resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Google Cloud Monitoring: Monitoring filter syntax: https://cloud.google.com/monitoring/api/v3/filters
- Google Cloud Monitoring: GKE system metrics: https://cloud.google.com/monitoring/api/metrics_kubernetes
- Google Cloud Artifact Registry: Transition from Container Registry: https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr

## Issues Found
- The post described Confidential GKE Nodes as AMD SEV-only. Updated the explanation to reflect current GKE support for AMD SEV, AMD SEV-SNP, and Intel TDX, while preserving the AMD SEV-specific explanation for the examples that use `--enable-confidential-nodes`.
- The description and introduction referred to "container memory" and shared memory too broadly. Updated wording to clarify that Confidential GKE encrypts node VM memory and protects against host-level access.
- The cluster creation example used `--workload-pool=my-project.svc.id.goog` while the command set `--project=my-secure-project`. Updated the workload pool to match the project ID.
- The deployment image used a `gcr.io` path. Updated it to an Artifact Registry `pkg.dev` image path because Container Registry is deprecated for new usage.
- The Workload Identity comment implied that setting `serviceAccountName` alone enables Workload Identity. Updated the comment to clarify that the Kubernetes ServiceAccount must be mapped for Workload Identity.
- The verification command described a Compute Engine instance in a fixed zone, which can fail for regional clusters if the selected node is in another zone. Replaced it with the official node pool `gcloud container node-pools describe` check.
- The in-pod `dmesg | grep -i sev` verification was unreliable because unprivileged containers commonly cannot read kernel logs. Replaced it with a pod placement check that inspects the GKE Confidential node label.
- The maintenance section stated that Confidential nodes cannot be live migrated. Updated it to reflect that live migration is supported for some AMD SEV configurations on N2D and C3D, while most Confidential VM types still terminate and restart for host maintenance.
- The Cloud Monitoring dashboard filter omitted a metric selector. Added the official `kubernetes.io/node/cpu/allocatable_utilization` metric type to make the filter valid for a time series chart.

## Review Notes
The Terraform snippet references `google_kms_crypto_key.gke_secrets.id` without defining the KMS resource in the excerpt. That is acceptable for a focused GKE node-pool example, but a future expanded version could include the KMS key resource for a fully standalone Terraform sample.

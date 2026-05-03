# Validation Summary: How to Deploy GKE with Autopilot Using OpenTofu

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Google Cloud Platform (GCP)
- Google Kubernetes Engine (GKE) Autopilot
- VPC-native networking (alias IPs, secondary ranges)
- Workload Identity (workload identity federation for GKE)
- Binary Authorization
- `hashicorp/google` Terraform provider (`google_container_cluster`, `google_compute_network`, `google_compute_subnetwork`, `google_service_account`, `google_project_iam_member`, `google_service_account_iam_member`)
- `hashicorp/kubernetes` Terraform provider (`kubernetes_deployment`)
- GKE Autopilot Spot Pods

## Sources Consulted
- GKE Autopilot Spot Pods documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/autopilot-spot-pods
- Terraform `hashicorp/google` provider — `google_container_cluster` resource (Autopilot, `enable_autopilot`, `ip_allocation_policy`, `private_cluster_config`, `master_authorized_networks_config`, `workload_identity_config`, `release_channel`, `binary_authorization`, `maintenance_policy.recurring_window`, `deletion_protection`)
- Terraform `hashicorp/kubernetes` provider — `kubernetes_deployment` resource (`spec.template.spec.node_selector`)
- GKE Workload Identity documentation (member format `serviceAccount:PROJECT_ID.svc.id.goog[NAMESPACE/KSA_NAME]` and the `roles/iam.workloadIdentityUser` binding)
- GKE private cluster requirements (control-plane CIDR must be a /28)

## Issues Found
- **Incorrect Spot Pods request mechanism.** The post used a Pod template annotation `autopilot.gke.io/spot = "true"` to request Spot Pods on Autopilot. That annotation is not part of the GKE Autopilot API. Per the official docs, Spot Pods are requested via the nodeSelector `cloud.google.com/gke-spot: "true"` (or an equivalent node affinity); GKE Autopilot then applies the matching toleration automatically.
  - Fix in `kubernetes_deployment`: removed the annotation block and added a `node_selector = { "cloud.google.com/gke-spot" = "true" }` block on `spec.template.spec`, with a brief comment noting GKE handles the toleration.
  - Fix in the "Best Practices" section: updated the bullet to recommend the `cloud.google.com/gke-spot = "true"` nodeSelector instead of the bogus annotation. Cost-savings claim ("up to 70%") was left unchanged since it falls within the published Spot VM discount range.

## Review Notes
- The "up to 70%" Spot Pods savings claim is conservative — Google publishes Spot VM discounts in the 60–91% range — but it is not incorrect.
- `deletion_protection` on `google_container_cluster` is supported and defaults to `true` in `hashicorp/google` provider 5.x+; readers on older provider versions may need to remove the argument.
- The `maintenance_policy.recurring_window` uses 2024 timestamps. The dates themselves are arbitrary (only the time-of-day and recurrence rule are used by GCP), so this is not a technical defect, but readers may want to refresh them for clarity.
- The `kubernetes_deployment` resource is the legacy name; newer code may prefer `kubernetes_deployment_v1`. Both are functionally equivalent and the legacy name is still supported.
- The `master_authorized_networks_config` block is permitted on Autopilot clusters, but on Autopilot the control-plane endpoint is always considered authorized; the block restricts which external networks can reach the public endpoint, which matches the post's intent.

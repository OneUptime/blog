# Validation Summary: How to Build GKE Autopilot Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE) Autopilot
- Kubernetes workloads, Services, Ingress, NetworkPolicy, HPA, VPA, PodDisruptionBudget
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- Workload Identity Federation for GKE
- OpenTelemetry Collector and Google Cloud Monitoring

## Sources Consulted
- GKE Autopilot overview: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-overview
- GKE Autopilot resource requests: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-resource-requests
- Choose compute classes for Autopilot Pods: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/autopilot-compute-classes
- Deploy GPU workloads in Autopilot: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/autopilot-gpus
- Run fault-tolerant workloads at lower costs in Spot Pods: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/autopilot-spot-pods
- GKE Autopilot security measures: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-security
- About privileged workload admission in Autopilot mode: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/about-autopilot-privileged-workloads
- GKE NetworkPolicy documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- GKE Vertical Pod Autoscaling documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/vertical-pod-autoscaling
- `gcloud container clusters create-auto` reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create-auto
- Terraform `google_container_cluster` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster

## Issues Found
- The post stated that Autopilot always uses per-Pod billing, including GPUs. Updated the wording and comparison table to reflect current GKE behavior: general-purpose Autopilot workloads use Pod-based billing, while workloads that request specific hardware such as GPUs use node-based billing.
- The post stated that resource requests are required in Autopilot. Updated this to say that Autopilot defaults missing requests, while explicit requests are recommended for predictable scheduling, performance, and cost.
- The compute class diagram and resource table contained stale or oversimplified limits. Updated the table to current documented ranges for General-purpose, Balanced, Scale-Out, and Performance compute classes.
- The post implied GPU types and local SSDs require Standard mode. Updated the Standard-mode guidance to refer to unsupported node configurations or direct node customization, because Autopilot supports GPUs and some Local SSD-backed ephemeral storage configurations.
- The privileged-container comparison said privileged containers are not allowed in Autopilot. Updated it to clarify that they are rejected by default, but specific allowlisted privileged workloads are supported.
- The Spot Pods example said users should set tolerations. Updated the comment to note that GKE automatically adds the corresponding Spot toleration.
- The Ingress example described `kubernetes.io/ingress.allow-http: "false"` as enabling HTTPS redirect. Corrected the comment to say it disables plain HTTP.

## Review Notes
The `gcloud` and Terraform CLIs were not installed in the local environment, so those examples were verified against official Google Cloud SDK and Terraform provider documentation rather than local command help. The post remains a broad tutorial; some examples use placeholder images, networks, project IDs, and service accounts that users must replace for a real deployment.

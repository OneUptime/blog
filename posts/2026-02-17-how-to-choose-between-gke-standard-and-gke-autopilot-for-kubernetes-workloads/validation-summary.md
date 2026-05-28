# Validation Summary: How to Choose Between GKE Standard and GKE Autopilot for Kubernetes Workloads

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE Standard
- GKE Autopilot
- Kubernetes workloads, Deployments, Services, and DaemonSets
- Google Cloud CLI (`gcloud`)

## Sources Consulted
- Google Cloud: About GKE modes of operation - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/choose-cluster-mode
- Google Cloud: Compare features in GKE Autopilot and Standard clusters - https://docs.cloud.google.com/kubernetes-engine/docs/resources/autopilot-standard-feature-comparison
- Google Cloud: GKE Autopilot overview - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-overview
- Google Cloud: Resource requests in Autopilot - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-resource-requests
- Google Cloud: GKE Autopilot security measures - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-security
- Google Cloud: GKE pricing - https://cloud.google.com/kubernetes-engine/pricing
- Google Cloud: GKE SLA - https://cloud.google.com/kubernetes-engine/sla
- Google Cloud SDK reference: `gcloud container clusters create` - https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud SDK reference: `gcloud container clusters create-auto` - https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create-auto
- Google Cloud SDK reference: `gcloud container node-pools create` - https://docs.cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Google Cloud: Prepare to migrate to Autopilot from Standard - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/prepare-migrate-cluster-mode
- Kubernetes API concepts for Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes API concepts for Services - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes API concepts for DaemonSets - https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes resource management for Pods and containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found
- Autopilot pricing was described as purely per-pod. Updated the post to reflect current GKE pricing: general-purpose Autopilot workloads use pod-based billing, while workloads that select specific hardware use node-based billing with an Autopilot management premium.
- The feature table implied Autopilot DaemonSets are only "Google-approved." Updated this to state that DaemonSets are supported when they satisfy Autopilot security restrictions.
- Privileged containers were described as simply unsupported. Updated this to clarify that they are blocked by default except for verified partner or allowlisted workloads.
- The minimum cost row used fixed monthly estimates that can become stale and did not clearly account for the GKE cluster management fee/free tier. Replaced with mode-specific billing components.
- The SLA row incorrectly implied Autopilot regional SLA was only 99.9%. Updated it to distinguish the 99.95% Autopilot control plane SLA from the 99.9% SLA for Autopilot Pods in multiple zones.
- The Autopilot resource request examples said requests are required and billed exactly. Updated the wording to say explicit requests are recommended, missing requests can be defaulted by Autopilot, and billing is based on requests for general-purpose Autopilot workloads subject to GKE pricing rules.
- The pricing example used hard-coded regional rates that may go stale. Replaced the explicit formula with a note to check the current GKE pricing page.
- Some `gcloud container node-pools create` examples omitted the cluster location even though the cluster was created regionally. Added `--region=us-central1` to make the commands self-contained.
- The migration checklist overstated Autopilot restrictions for resource requests, DaemonSets, privileged containers, and `hostPath`. Updated the checklist to reflect current Autopilot defaults and security constraints.

## Review Notes
The remaining cost scenarios are illustrative and should be recalculated before publication if exact current pricing is required. The `gcloud` examples were verified against current Google Cloud SDK reference documentation because the local environment does not have `gcloud` installed.

# Validation Summary: How to Install Cloud Service Mesh on a GKE Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Service Mesh
- Google Kubernetes Engine
- GKE Fleet
- Google Cloud CLI
- Kubernetes
- Istio APIs
- Envoy sidecar injection

## Sources Consulted
- Google Cloud Service Mesh: Provision a managed Cloud Service Mesh control plane on GKE: https://cloud.google.com/service-mesh/docs/onboarding/provision-control-plane
- Google Cloud Service Mesh: Supported platforms: https://cloud.google.com/service-mesh/docs/supported-platforms
- Google Cloud Service Mesh: Installing and upgrading gateways with Istio APIs: https://cloud.google.com/service-mesh/docs/operate-and-maintain/gateways
- Google Cloud Service Mesh: Deploying the Bookinfo sample: https://cloud.google.com/service-mesh/v1.26/docs/deploy-bookinfo
- Google Cloud CLI reference: gcloud container clusters update: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud CLI reference: gcloud container fleet mesh update: https://cloud.google.com/sdk/gcloud/reference/container/fleet/mesh/update

## Issues Found
- The prerequisites named GKE 1.25 or later and a 4 vCPU mesh component requirement. Current Google documentation refers to supported GKE versions and documents specific component requests for `mdp-controller` and `istio-cni-node`, so the prerequisite was changed to require a supported GKE version and enough component capacity.
- The API enablement command listed many APIs manually. Current managed Cloud Service Mesh guidance enables `mesh.googleapis.com`, which enables required dependent APIs, so the command and explanation were simplified.
- The cluster creation command added a `mesh_id` label and the text stated that it was required. Current fleet-based managed provisioning does not require that label, so the label and claim were removed.
- The existing-cluster wording said to skip to verification, which would bypass required fleet registration and mesh enablement. It now only says to skip the cluster creation command.
- The fleet registration command used direct fleet membership registration. The current per-cluster managed Cloud Service Mesh guide registers GKE clusters by updating the cluster with `--fleet-project`, so the command was updated.
- The `gcloud container fleet mesh update` command did not include membership location. Current CLI and provisioning docs require or recommend specifying the membership location for non-fully-qualified membership names, so `--location=us-central1` and an explanatory note were added.
- The example mesh status used a zonal membership path. For the corrected registration flow and a zonal cluster in `us-central1-a`, the membership location is `us-central1`, so the example was updated.
- The namespace injection instructions used revision-based injection as the primary path and suggested `asm-managed` as the typical revision. Current docs recommend the default injection label for managed control planes, while revision-based injection is for existing managed Istiod users, so the commands and explanation were updated.
- The Bookinfo deployment used an old Istio `release-1.20` GitHub URL. Current Cloud Service Mesh sample documentation deploys from the Cloud Service Mesh samples directory, so the command was updated to use `samples/bookinfo/platform/kube/bookinfo.yaml`.
- The gateway example deployed into `istio-system`. Current gateway best practices recommend a namespace separate from the control plane namespace, so the example now creates and labels `istio-gateway` and deploys the gateway there.
- The upgrade section implied sidecar upgrades are always manual pod restarts. Current managed data plane behavior actively updates sidecars and injected gateways when enabled, while manual restarts apply when managed data plane is disabled, so the text was corrected.
- The troubleshooting section still referred to a missing `mesh_id` label and revision matching as primary causes. Those notes were updated to match the corrected fleet registration, membership location, Workload Identity, and injection-label guidance.

## Review Notes
The post is technically relevant and salvageable. It remains a high-level walkthrough and does not cover IAM roles, cross-project or Shared VPC setup, CA Service configuration, or managed control plane implementation differences in depth; those are valid future improvements but not required to make the current tutorial technically correct.

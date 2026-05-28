# Validation Summary: How to Choose Between GKE Autopilot and Standard Mode

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE Autopilot mode
- GKE Standard mode
- Kubernetes Pods, Deployments, DaemonSets, and resource requests
- Google Cloud CLI

## Sources Consulted
- Google Cloud: About GKE modes of operation - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/choose-cluster-mode
- Google Cloud: GKE Autopilot overview - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-overview
- Google Cloud: Create an Autopilot cluster - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/creating-an-autopilot-cluster
- Google Cloud: Resource requests in Autopilot - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-resource-requests
- Google Cloud: GKE Autopilot security measures - https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-security
- Google Cloud: Google Kubernetes Engine pricing - https://cloud.google.com/kubernetes-engine/pricing
- Google Cloud: About Balanced and Scale-Out ComputeClasses in Autopilot clusters - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/balanced-scale-out-autopilot

## Issues Found
- The post described Autopilot billing as always per-pod resource-request billing. Updated this to specify that pod-based billing applies to general-purpose Autopilot workloads, while some hardware-specific workloads can use node-based billing.
- The post stated that Autopilot provisions exactly the right amount of compute. Updated this to say that GKE provisions compute based on Kubernetes manifests, which matches current documentation and avoids overstating scheduling precision.
- The post stated that privileged containers, hostPath volumes, host networking, and DaemonSets are simply unavailable in Autopilot. Updated this to reflect current constrained support, including partner or allowlisted privileged workloads, limited hostPath behavior, and DaemonSets that comply with Autopilot constraints.
- The post stated that pods must have resource requests and limits. Updated this to clarify that explicit requests are recommended, but Autopilot applies defaults and enforces minimums and maximums when requests are missing.
- The post said that scaling to zero means no cost. Updated this to avoid ignoring applicable cluster management fees and to clarify that the savings are for idle workload capacity.
- The Google Cloud CLI examples used `--region`. Updated the Autopilot cluster creation and credentials commands to use the current documented `--location` flag.
- The cost comparison used fixed approximate monthly prices that are likely to become stale and did not mention cluster management fees. Replaced the fixed dollar amounts with a formula-style explanation tied to current regional rates.

## Review Notes
The Kubernetes YAML examples are syntactically valid for the API versions shown. The privileged Pod example remains intentionally invalid for normal Autopilot admission and valid as an example of a Standard-only host-level pattern. The migration commands are simplified and technically plausible, but a real production migration would also need to handle namespaces, secrets, persistent volumes, CRDs, ingress resources, RBAC, and generated fields in exported manifests.

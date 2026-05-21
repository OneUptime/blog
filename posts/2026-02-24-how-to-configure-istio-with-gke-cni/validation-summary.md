# Validation Summary: How to Configure Istio with GKE CNI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio CNI node agent
- Google Kubernetes Engine
- GKE VPC-native networking
- GKE Dataplane V2
- Cloud Service Mesh
- Kubernetes Gateway, Service, NetworkPolicy, and ServiceAccount resources
- Google Cloud CLI
- Workload Identity Federation for GKE

## Sources Consulted
- Istio CNI node agent documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio GKE platform setup documentation: https://istio.io/latest/docs/setup/platform-setup/gke/
- Istio platform-specific prerequisites for GKE: https://istio.io/latest/docs/ambient/install/platform-prerequisites/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Google Cloud VPC-native GKE cluster documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/alias-ips
- Google Cloud GKE IP addressing documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/about-ip-addressing
- Google Cloud GKE Dataplane V2 documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- Google Cloud Service Mesh private cluster firewall documentation: https://cloud.google.com/service-mesh/docs/operate-and-maintain/private-cluster-open-port
- Google Cloud Service Mesh overview: https://cloud.google.com/service-mesh/docs/overview
- Google Cloud GKE Autopilot security documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-security
- Google Cloud GKE LoadBalancer Service documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- Google Cloud GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud SDK `gcloud container clusters create` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create

## Issues Found
- Updated the prerequisite from a hardcoded GKE `1.27+` requirement to "a Kubernetes version supported by your Istio release" because current Istio releases have moved beyond Kubernetes 1.27 support.
- Replaced "Anthos Service Mesh" wording with Cloud Service Mesh, because Google documents Anthos Service Mesh as part of Cloud Service Mesh.
- Corrected the Autopilot guidance. The post said Istio CNI is needed to avoid Autopilot privileged-container restrictions, but Istio documents that the CNI node agent is not available on GKE Autopilot because it requires elevated privileges.
- Added `values.pilot.cni.enabled: true` to the IstioOperator example so sidecar injection does not try to use the privileged `istio-init` init container when CNI is enabled.
- Narrowed the firewall section to private clusters and changed the firewall rule to open only `tcp:15017` for the webhook. Ports `15014` and `8080` are optional debug/proxy ports, not required for sidecar injection.
- Reworked the firewall source-range and target-tag example to follow Google's documented workflow of reading the existing GKE master firewall rule, instead of relying on `privateClusterConfig.masterIpv4CidrBlock` and the first node tag.
- Clarified the GKE Dataplane V2 explanation: GKE Dataplane V2 uses eBPF and Cilium instead of kube-proxy for Kubernetes Services; users should rely on Kubernetes NetworkPolicy for L3/L4 policy.
- Corrected the ingress gateway load balancer description and annotations. An Istio ingress gateway Service of type `LoadBalancer` creates a Layer 4 passthrough Network Load Balancer; the previous `cloud.google.com/neg: '{"ingress": true}'` and `cloud.google.com/backend-config` example applied to GKE Ingress/Application Load Balancer workflows, not this Service path.
- Updated the Bookinfo sample URL from Istio `release-1.20` to `release-1.29` to avoid pointing new readers at an old release branch.

## Review Notes
- The cluster creation command is syntactically valid, but users should substitute their own project ID in `--workload-pool`.
- The Workload Identity example is valid for linking a Kubernetes ServiceAccount to an IAM service account, but many Istio installations don't need `istiod` to call Google Cloud APIs.

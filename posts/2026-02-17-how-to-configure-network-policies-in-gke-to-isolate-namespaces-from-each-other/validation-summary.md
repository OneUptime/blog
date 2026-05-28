# Validation Summary: How to Configure Network Policies in GKE to Isolate Namespaces from Each Other

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes NetworkPolicy
- GKE Dataplane V2 / Cilium
- Calico network policy enforcement
- kubectl
- gcloud CLI

## Sources Consulted
- GKE: Control communication between Pods and Services using network policies: https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- GKE: Use network policy logging: https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy-logging
- Kubernetes: Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- gcloud CLI reference: `gcloud container clusters create`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- gcloud CLI reference: `gcloud container clusters update`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update

## Issues Found
- The Calico enablement example for an existing GKE cluster only used `--enable-network-policy`. GKE requires the NetworkPolicy add-on to be enabled first with `--update-addons=NetworkPolicy=ENABLED`, so I added that command before the node enforcement command.
- The DNS egress policy selected the whole `kube-system` namespace on port 53. That can work for DNS but is broader than the stated intent to allow kube-dns, so I added a `podSelector` for `k8s-app: kube-dns`.
- The Dataplane V2 monitoring example tailed pods with `k8s-app=cilium` and searched for `policy-verdict`. GKE exposes network policy logging through the `NetworkLogging` object and Cloud Logging `policy-action` logs, so I replaced the command with the documented GKE logging workflow.

## Review Notes
- The NetworkPolicy manifests use the stable `networking.k8s.io/v1` API and valid selector combinations.
- The same-namespace allow policy is shown for the `backend` namespace only; readers should apply an equivalent policy to other namespaces if those namespaces also need unrestricted intra-namespace traffic.
- If the cluster uses Workload Identity Federation for GKE, additional egress rules to the GKE metadata server may be required when applying a blanket egress deny policy.

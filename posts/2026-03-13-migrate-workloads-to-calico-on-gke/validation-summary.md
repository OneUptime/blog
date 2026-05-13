# Validation Summary: Migrate Workloads to Calico on GKE

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE Standard network policy enforcement
- Calico network policy plugin for GKE
- Kubernetes NetworkPolicy
- gcloud CLI
- kubectl

## Sources Consulted
- Google Cloud GKE network policy documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- Google Cloud SDK `gcloud container clusters update` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud GKE FQDN network policy documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/fqdn-network-policies
- Google Cloud GKE Cilium cluster-wide network policy documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/configure-cilium-network-policy
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy

## Issues Found
- The post implied GKE's managed Calico integration supports Calico CRDs such as `GlobalNetworkPolicy` through `calicoctl`. GKE's managed network policy documentation describes Kubernetes `NetworkPolicy` enforcement for the Calico plugin, not Calico CRD APIs. I replaced the Calico CRD example with a Kubernetes `NetworkPolicy` egress example and removed the `calicoctl` prerequisite and command.
- The GKE enablement command used `gcloud container node-pools update --enable-network-policy`. Official GKE guidance enables the add-on and then enables enforcement with `gcloud container clusters update CLUSTER_NAME --enable-network-policy`, which recreates node pools. I corrected the command sequence.
- The verification step relied on checking optional or implementation-specific Calico resources. Official GKE troubleshooting recommends checking nodes with `projectcalico.org/ds-ready=true` for non-Dataplane V2 clusters. I updated the verification command accordingly.
- The validation test pod did not have the `app=frontend` label required by the `allow-frontend-to-api` policy, so the "allowed" test would be blocked. I added `--labels=app=frontend` to the test pod command.
- The post treated GKE Dataplane V2 as a simple best-practice add-on for the same Calico workflow. GKE documents Dataplane V2 as a Cilium-based plugin that is mutually exclusive with the Calico network policy plugin. I clarified that it should be evaluated separately for new clusters.
- The prerequisite pinned GKE to v1.27+, which was unnecessary for the documented managed Calico workflow and potentially misleading. I changed it to a supported GKE Standard cluster.

## Review Notes
The corrected post validates as a GKE Standard guide for Kubernetes `NetworkPolicy` enforcement using the managed Calico plugin. Teams that need Calico-specific CRDs such as `GlobalNetworkPolicy` should plan a separate self-managed Calico or Calico Enterprise deployment path, which is outside the scope of this corrected post.

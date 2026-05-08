# Validation Summary: Update Cilium Requirements on GKE

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Google Kubernetes Engine (GKE)
- GKE Dataplane V2
- Container-Optimized OS
- Ubuntu node images
- Google Cloud CLI
- eBPF

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium Kubernetes Requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- GKE node images: https://cloud.google.com/kubernetes-engine/docs/concepts/node-images
- GKE specify a node image: https://cloud.google.com/kubernetes-engine/docs/how-to/node-images
- GKE containerd node images: https://cloud.google.com/kubernetes-engine/docs/concepts/using-containerd
- GKE Docker node image deprecation: https://cloud.google.com/kubernetes-engine/docs/deprecations/docker-containerd
- GKE Dataplane V2: https://cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- GKE network policy enforcement: https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- gcloud container node-pools create reference: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- gcloud container node-pools update reference: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/update
- Cloud DNS for GKE: https://cloud.google.com/kubernetes-engine/docs/how-to/cloud-dns
- kube-dns for GKE: https://cloud.google.com/kubernetes-engine/docs/concepts/kube-dns

## Issues Found
- The post said `gcloud container node-pools update ... --image-type COS_CONTAINERD` could update an existing node pool image. The current documented command for changing a node image is `gcloud container clusters upgrade <cluster-name> --image-type <image-type> --node-pool <pool-name>`, so the command was corrected.
- The node pool creation example used `--workload-metadata from-node`, which is not a current valid value. The valid values are `GCE_METADATA` and `GKE_METADATA`, so the example was changed to `--workload-metadata GKE_METADATA`.
- The NetworkPolicy enablement step only enabled the add-on. GKE documentation states that Calico-based network policy enforcement also requires `--enable-network-policy`, so the missing command was added.
- The node image support list implied Docker-based `COS` was unsupported specifically for Cilium. The wording was corrected to state that Docker-based node images are unsupported in GKE 1.24 and later.
- The kernel requirement wording implied fixed kernel versions by image type. It was adjusted to keep the Cilium minimum kernel requirement explicit while instructing readers to verify the actual node kernel.
- The DNS check described `kube-dns` as required for Cilium DNS-based policies. Because GKE can use Cloud DNS as the DNS provider, the wording was narrowed to kube-dns based clusters.

## Review Notes
GKE Dataplane V2 is Cilium-based and recommended by Google for GKE network policy enforcement, but it is a managed integration with GKE-specific limitations. The post now avoids implying that all standalone Cilium capabilities map directly to GKE Dataplane V2.

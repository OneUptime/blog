# Validation Summary: Troubleshoot Cilium Requirements on Google Kubernetes Engine

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Google Kubernetes Engine
- Google Cloud CLI
- GKE Dataplane V2
- GKE Network Policy
- eBPF and BPF filesystem mounts

## Sources Consulted
- Google Cloud documentation: GKE Dataplane V2 overview, https://cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- Google Cloud documentation: Using GKE Dataplane V2, https://cloud.google.com/kubernetes-engine/docs/how-to/dataplane-v2
- Google Cloud documentation: GKE node images, https://cloud.google.com/kubernetes-engine/docs/concepts/node-images
- Google Cloud documentation: Containerd node images, https://cloud.google.com/kubernetes-engine/docs/concepts/using-containerd
- Google Cloud documentation: GKE network policy, https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- Google Cloud SDK reference: gcloud container node-pools list, https://cloud.google.com/sdk/gcloud/reference/container/node-pools/list
- Google Cloud SDK reference: gcloud container clusters create, https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Cilium documentation: System requirements, https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium documentation: Cilium on Google Kubernetes Engine / GKE IPAM, https://docs.cilium.io/en/latest/network/concepts/ipam/gke.html
- Cilium documentation: Google Cloud routing configuration, https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium command reference: cilium status, https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference: cilium connectivity test, https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/

## Issues Found
- The post overstated Ubuntu node images as having "full eBPF support" and better Cilium compatibility. Updated the wording to reflect that Cilium depends on supported kernels and detected capabilities, and that COS may use compatibility behavior for some missing modules such as `xt_socket`.
- The node pool describe command comment claimed it showed kernel details. Updated it to say it shows OS image and GKE version details.
- The node image guidance implied GKE 1.24+ support was the main Cilium boundary. Updated it to emphasize GKE Standard Linux node pools, containerd-based images, and Cilium system requirements.
- The Dataplane V2 check treated `LEGACY_DATAPATH` as the only standard-networking result. Updated the guidance to note that some legacy clusters may omit the field, while `ADVANCED_DATAPATH` indicates Dataplane V2.
- The section title mentioned the Network Policy controller but did not include a command to inspect it. Added a `gcloud container clusters describe` command for `networkPolicy.enabled` and `addonsConfig.networkPolicyConfig.disabled`.
- The BPF filesystem explanation incorrectly said the mount must survive node restarts. Updated it to match Cilium documentation: bpffs is normally mounted at `/sys/fs/bpf` and lets pinned BPF resources survive Cilium agent restarts; Cilium mounts it automatically if missing.
- The COS verification command referred to a Cilium init container. Updated it to check `cilium-node-init` pods for GKE Helm installs that enable node initialization.

## Review Notes
Local `gcloud` and `cilium` binaries were not installed in the workspace, so command validation was performed against official Google Cloud SDK and Cilium command reference documentation rather than local `--help` output.

# Validation Summary: Configure Calico on GKE for a New Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE Dataplane V2
- Calico Open Source
- Tigera operator
- Kubernetes NetworkPolicy / Calico GlobalNetworkPolicy
- gcloud CLI
- kubectl
- calicoctl

## Sources Consulted
- GKE Dataplane V2 concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- GKE Dataplane V2 usage guide: https://cloud.google.com/kubernetes-engine/docs/how-to/dataplane-v2
- GKE network policy guide: https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- GKE intranode visibility guide: https://cloud.google.com/kubernetes-engine/docs/how-to/intranode-visibility
- gcloud container clusters create reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Calico Enterprise on GKE installation guide: https://docs.tigera.io/calico-enterprise/latest/getting-started/install-on-clusters/gke
- Calico installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico component versions: https://docs.tigera.io/calico/latest/reference/component-versions
- Calico quickstart guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico automatic labels reference: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview

## Issues Found
- The post implied Calico on GKE provides the full Calico feature set, including BGP and Calico Enterprise features. In the documented GKE CNI mode, GKE handles pod networking and routing while Calico provides policy enforcement; Enterprise features require an Enterprise installation and license. Updated the wording to describe the supported policy-focused model.
- The GKE cluster creation command did not include intranode visibility, which Tigera's GKE guidance lists as required for this model. Added `--enable-intra-node-visibility` and clarified that Dataplane V2 must remain disabled.
- The post used Calico v3.27.0 links. Updated the operator and `calicoctl` download URLs to v3.32.0, matching the current Calico documentation consulted during review.
- The Calico `Installation` example configured Calico IP pools for a GKE CNI policy-only installation. Since GKE provides the CNI and pod networking in this mode, removed the IP pool block and added `kubernetesProvider: GKE`.
- The sample `GlobalNetworkPolicy` selected `all()` without excluding system namespaces, which could restrict egress from GKE and Calico system pods. Added a namespace selector that excludes `kube-system`, `calico-system`, and `tigera-operator`, and made the policy type explicitly `Egress`.
- The prerequisites said `calicoctl` was already installed even though a later step installs it. Changed the prerequisite to `curl`.

## Review Notes
The post is now technically consistent with the current official docs for a GKE Standard, GKE-CNI, Calico-policy deployment. Calico Open Source documentation does not currently provide a dedicated GKE managed-cluster install page like the Calico Enterprise documentation does, so the review cross-checked the shared operator API and GKE-specific Enterprise prerequisites where they apply to this deployment model.

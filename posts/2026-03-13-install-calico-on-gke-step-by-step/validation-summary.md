# Validation Summary: How to Install Calico on GKE Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud SDK (`gcloud`)
- Kubernetes and `kubectl`
- Calico Open Source
- Tigera Operator
- Calico `GlobalNetworkPolicy` and `NetworkPolicy`
- `calicoctl`

## Sources Consulted
- Calico Open Source installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Open Source Helm/operator installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico Open Source GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source calicoctl Kubernetes datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Google Cloud SDK `gcloud container clusters create` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- GKE network policy enforcement documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- Tigera Calico Enterprise GKE installation documentation, used for GKE-specific networking prerequisites: https://docs.tigera.io/calico-enterprise/latest/getting-started/install-on-clusters/gke

## Issues Found
- The GKE cluster creation command did not include GKE-specific prerequisites for Calico policy-only operation. Added `--enable-intra-node-visibility` and `--no-enable-dataplane-v2`.
- The Calico `Installation` manifest did not set the provider explicitly. Added `kubernetesProvider: GKE`, matching the operator API reference for provider-specific defaults.
- The Calico manifest comment incorrectly referred to VXLAN cross-node Calico traffic even though `cni.type: GKE` and `ipPools: []` preserve GKE networking rather than using a Calico overlay. Replaced the comment with a metrics-specific note.
- The post used `kubectl apply` with `projectcalico.org/v3` resources but did not install the Calico API server. Added an `APIServer` custom resource and verification for `tigerastatus/apiserver`.
- The baseline `GlobalNetworkPolicy` examples had no explicit `order`, which could make policy precedence unclear. Added lower order for DNS allow and higher order for default deny.
- The baseline policy YAML was shown but never applied. Added `kubectl apply -f global-deny-all.yaml`.
- The test commands referenced the `production` namespace without creating it. Added `kubectl create namespace production`.
- The connectivity test used `http://nginx` but no Kubernetes Service was created for the `nginx` Pod. Added `kubectl expose pod nginx --port=80 -n production`.
- The allow policy only allowed ingress to `nginx`; the earlier baseline also default-denied egress, so `curl-test` still could not initiate traffic. Added an egress allow policy from `curl-test` to `nginx`.
- The best-practice note recommended testing Calico policies in GKE Autopilot before Standard clusters, but GKE's Calico network policy plugin is Standard-only and Autopilot uses GKE Dataplane V2. Changed this to recommend testing in a non-production Standard GKE cluster.
- The Workload Identity best-practice note implied a direct tie to Calico tiered policy. Reworded it to recommend Kubernetes service accounts with Calico tiered policies.

## Review Notes
The post pins Calico v3.27.0 while current Calico documentation is newer. The pinned manifest URL is still plausible, but future maintenance should update the example to a currently supported Calico version and verify compatibility with the target GKE Kubernetes version.

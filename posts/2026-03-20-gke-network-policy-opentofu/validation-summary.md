# Validation Summary: How to Configure GKE Network Policy with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes NetworkPolicy
- OpenTofu / HCL
- HashiCorp Google provider
- HashiCorp Kubernetes provider
- Calico
- GKE Dataplane V2

## Sources Consulted
- Google Cloud: Control communication between Pods and Services using network policies — https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- Google Cloud: Using GKE Dataplane V2 — https://cloud.google.com/kubernetes-engine/docs/how-to/dataplane-v2
- Google Cloud: Using kube-dns — https://cloud.google.com/kubernetes-engine/docs/how-to/kube-dns
- Kubernetes: Network Policies — https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes: Namespaces — https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes: Debugging DNS Resolution — https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- HashiCorp Google provider docs for `google_container_cluster` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/container_cluster.html.markdown
- HashiCorp Kubernetes provider docs for `kubernetes_network_policy_v1` — https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/network_policy_v1.md
- HashiCorp Kubernetes provider changelog — https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/CHANGELOG.md

## Issues Found
- The GKE cluster example was missing `addons_config.network_policy_config { disabled = false }`, which the Google provider requires alongside the `network_policy` block to enable Calico-based network policy on Standard clusters. I added the missing block.
- The Dataplane V2 comment could be read as an extra flag to combine with the Calico configuration. GKE Dataplane V2 has network policy enforcement built in, and explicitly enabling `network_policy` with `datapath_provider = "ADVANCED_DATAPATH"` is not allowed. I clarified the comment to remove the `network_policy` block when using Dataplane V2.
- All `kubernetes_network_policy` resources were using a deprecated resource name in the current Kubernetes provider. I updated them to `kubernetes_network_policy_v1`.
- The default deny example comment incorrectly described the deny-all behavior as coming from empty `policy_types`. I corrected the comment to reflect that deny-all comes from specifying both policy types with no ingress or egress rules.
- The DNS egress example only allowed UDP port 53. Since Kubernetes cluster DNS services expose both `53/UDP` and `53/TCP`, I added a TCP port 53 rule as well.

## Review Notes
- Enabling network policy enforcement on an existing GKE Standard cluster recreates nodes and can disrupt workloads.
- GKE Dataplane V2 and Autopilot clusters already include network policy enforcement; the Step 1 example is specifically a Standard-cluster Calico configuration.
- The `kubernetes.io/metadata.name` namespace label used in the selectors is valid and automatically set by Kubernetes.
- The metrics-scrape example uses `prometheus.io/scrape` as a pod label selector. That is valid if your workloads use it as a label, but many Prometheus setups use that key as an annotation instead.

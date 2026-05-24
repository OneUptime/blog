# Validation Summary: How to Create Kubernetes NetworkPolicies with Terraform

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Terraform (>= 1.0)
- hashicorp/kubernetes Terraform provider (~> 2.25)
- Kubernetes NetworkPolicy API
- Kubernetes CNI plugins (Calico, Cilium, Weave Net)
- kubectl
- Prometheus (referenced in monitoring example)
- CoreDNS / kube-dns (referenced in DNS egress example)

## Sources Consulted
- Terraform Registry: hashicorp/kubernetes provider — `kubernetes_network_policy` resource documentation (https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/network_policy)
- Kubernetes official documentation on NetworkPolicies (https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- Terraform Registry API for verifying current provider version (latest: 3.1.0 as of April 2026)

## Issues Found
No technical issues found. The post is technically accurate:

- The `kubernetes_network_policy` resource name, `spec` block structure (`pod_selector`, `policy_types`, `ingress`, `egress`), and nested blocks (`from`, `to`, `ports`, `namespace_selector`, `pod_selector`, `ip_block`) all match the official Terraform provider schema.
- The `port` field correctly typed as a string (e.g., `"8080"`, `"53"`); both numeric-as-string and named ports are supported.
- Protocol values "TCP" and "UDP" are valid (SCTP also supported but not used here).
- The `ip_block` structure with `cidr` and `except` matches the schema.
- Multiple `ports` blocks within a single ingress/egress rule are valid (used correctly for DNS UDP+TCP on port 53).
- When `namespace_selector` and `pod_selector` are both inside a single `from` block (as in the Prometheus example), they are correctly ANDed — pods matching the pod selector within namespaces matching the namespace selector. This matches the Kubernetes API semantics.
- The claim that "NetworkPolicies are additive — if any policy allows a connection, it is allowed" accurately describes Kubernetes NetworkPolicy semantics.
- Empty `pod_selector {}` correctly selects all pods in a namespace.
- Omitting `ingress`/`egress` rules with the respective `policy_types` correctly results in default deny behavior.
- The DNS egress example correctly uses the `k8s-app: kube-dns` label which is the standard label for kube-dns/CoreDNS pods.
- The provider version constraint `~> 2.25` is valid (will pin to 2.x ≥ 2.25); while v3.x is now available, 2.25+ is still supported.

## Review Notes
- The post uses namespace label `name = "ingress-nginx"` / `name = "monitoring"` for the `namespace_selector`. This requires the user to manually label their namespaces. Kubernetes 1.22+ automatically applies the `kubernetes.io/metadata.name` label to every namespace, which would be a more robust selector. Not incorrect, but worth noting for readers on modern clusters.
- The EKS prerequisite note says "you need Calico or Cilium installed." Since August 2023, AWS VPC CNI also has built-in NetworkPolicy support (opt-in). The statement isn't wrong (Calico/Cilium remain valid options), but it could be expanded to mention VPC CNI's native support.
- The Prometheus scrape example allows ingress on port 9090. Port 9090 is typically the Prometheus server's own port, while target pods usually expose `/metrics` on their own application port. This works if the workload actually exposes metrics on 9090, but readers should adjust the port to match their application's actual metrics port.
- The provider constraint `~> 2.25` will not allow upgrades to the new 3.x provider line (released April 2026). Readers wanting the latest features may need to switch to `~> 3.0`. Not incorrect for the 2.25 series.

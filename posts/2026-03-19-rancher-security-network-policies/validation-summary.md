# Validation Summary: How to Set Up Network Policies for Security in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Kubernetes NetworkPolicy API
- CNI plugins: Canal, Calico, Cilium, Weave Net
- CoreDNS
- kubectl
- Calico policy logging
- Cilium monitor tooling

## Sources Consulted
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes DNS Horizontal Autoscaling: https://kubernetes.io/docs/tasks/administer-cluster/dns-horizontal-autoscaling/
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher Kubernetes Resources Setup: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/kubernetes-resources-setup
- Calico log rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico component logs: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- Cilium troubleshooting: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium-dbg monitor` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html

## Issues Found
- The CNI detection command only searched `kube-system`, which can miss supported CNIs deployed in other namespaces. I changed it to `kubectl get pods -A | grep -E "calico|canal|cilium|weave"`.
- The Rancher cluster-creation guidance omitted Cilium and used an older field name. I updated it to Rancher's current `Container Network Provider` wording and listed `Canal`, `Calico`, and `Cilium` for Rancher-created RKE2 clusters.
- The default deny section said to apply the manifest to all application namespaces, but the example manifest targets a single namespace (`production`). I corrected the wording so it matches the actual YAML.
- The DNS policy used `namespaceSelector: {}`, which allows egress to port 53 in any namespace instead of only the cluster DNS pods. I changed it to target `kube-system` plus `k8s-app: kube-dns`, which matches current Kubernetes/CoreDNS conventions.
- Several namespace selector examples matched on `name: ...`, which is not the standardized immutable namespace label documented by Kubernetes for `NetworkPolicy` matching. I changed those selectors to `kubernetes.io/metadata.name`.
- The Rancher UI section claimed a specific `Policy > Network Policies` navigation path that is not a stable current path in Rancher docs. I changed it to the supported Cluster Explorer resource-management flow.
- The external egress section implied the RFC1918 CIDRs universally block internet access without caveats. I clarified that the CIDRs are examples, should be adjusted to the reader's environment, and that `ipBlock` rules are intended for cluster-external IP ranges.
- The cross-namespace test used a `staging` namespace that may not exist and relied on a short cross-namespace DNS name. I changed it to use the always-present `default` namespace and a fully qualified service DNS name.
- The Cilium monitoring command used outdated syntax (`cilium monitor`) and an unsupported `kubectl exec -l` pattern for this use case. I replaced it with the documented `kubectl -n kube-system exec ds/cilium -- cilium-dbg monitor --type drop` form. I also changed the Calico example to match Calico's documented logging workflow.

## Review Notes
- The post is now technically accurate, but some examples still assume environment-specific namespace names and labels such as `ingress-nginx`, `cattle-system`, `cattle-monitoring-system`, and application labels like `app: frontend`. Readers still need to adapt those values to their own clusters.
- The RFC1918 egress example is intentionally generic. In production, the allowed CIDRs should be reviewed against the cluster's actual pod, service, and internal network ranges.

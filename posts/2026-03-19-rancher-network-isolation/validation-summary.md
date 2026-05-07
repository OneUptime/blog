# Validation Summary: How to Configure Network Isolation Between Projects in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Kubernetes NetworkPolicy
- kubectl
- CNI plugins (Calico, Canal, Cilium, and older RKE1/Weave caveats)

## Sources Consulted
- Rancher K3s Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/k3s-cluster-configuration
- Rancher Projects and Kubernetes Namespaces with Rancher: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/manage-clusters/projects-and-namespaces
- Rancher Container Network Interface (CNI) Providers: https://ranchermanager.docs.rancher.com/v2.13/faq/container-network-interface-providers
- Rancher GKE Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/cluster-configuration/rancher-server-configuration/gke-cluster-configuration
- Rancher RKE Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.9/reference-guides/cluster-configuration/rancher-server-configuration/rke1-cluster-configuration
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Debugging DNS Resolution: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- kubectl run: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl expose: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose
- kubectl label: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- kubectl wait: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The Rancher UI instructions were incorrect. The post treated Project Network Isolation as a per-project setting under `Projects/Namespaces`, but Rancher documents it as a cluster configuration option under `⋮ > Edit Config`. I corrected the UI path and clarified that the setting applies cluster-wide.
- The post omitted an imported-cluster prerequisite. I added that Kubernetes NetworkPolicy must already be enabled on the cluster before Rancher Project Network Isolation can be used on imported clusters.
- The CNI detection commands could return false positives because `kubectl get` succeeds even when no matching pods exist. I rewrote them to test for a non-empty `jsonpath` result.
- The ingress section was missing the Rancher-documented Cilium caveat. I added the note that Cilium may require an additional `CiliumNetworkPolicy` for ingress routing across nodes when Project Network Isolation is enabled.
- The external-egress examples used a broad `ipBlock` pattern (`0.0.0.0/0` with RFC1918 exceptions) that Kubernetes documentation does not define as a reliable generic way to distinguish cluster-external traffic. I replaced it with an explicit public CIDR example, parameterized the script, and updated the troubleshooting text accordingly.
- The external-egress policy name was inconsistent between the automation example and the troubleshooting commands. I aligned both to `allow-external-egress`.
- The prerequisite wording was too broad for current Rancher-managed cluster types. I narrowed the main recommendation to Calico, Canal, or Cilium and left Weave as an older RKE1-specific caveat.

## Review Notes
- Rancher documents the `system` project as exempt from project network isolation so that cluster services can collect logs, monitor workloads, and perform health checks across projects.
- Kubernetes documents `ipBlock` as intended for cluster-external IPs, and behavior can vary depending on CNI and packet rewriting. Explicit external CIDRs are safer than a broad internet-allow example.
- Rancher documents RKE1 as end-of-life and Weave as deprecated on newer RKE1/Kubernetes combinations, so readers on newer Rancher deployments should prefer Calico, Canal, or Cilium.

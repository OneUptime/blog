# Validation Summary: How to Migrate Workloads to Calico on DO Kubernetes

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- Flannel
- Canal
- Kubernetes CNI
- Kubernetes NetworkPolicy
- DigitalOcean Droplets
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Migrate a Kubernetes cluster from flannel/Canal to Calico - https://docs.tigera.io/calico/latest/getting-started/kubernetes/flannel/migration-from-flannel
- Calico documentation: System requirements - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: Self-managed Kubernetes in DigitalOcean - https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-public-cloud/do
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: Troubleshooting commands - https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico documentation: What is network policy? - https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Kubernetes documentation: kubectl drain - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes documentation: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- DigitalOcean documentation: Create Kubernetes clusters - https://docs.digitalocean.com/products/kubernetes/how-to/create-clusters/

## Issues Found
- The original post described a generic migration from any non-Calico CNI, including Weave, to Calico. Calico's current documentation says clusters that already use another CNI generally cannot migrate to Calico, with Flannel/Canal as a documented exception. I narrowed the guide to Flannel VXLAN and Canal and noted that other CNIs should use a new Calico-backed cluster and workload migration.
- The original workflow manually deleted the existing Flannel manifest and CNI config before installing Calico. That would disrupt networking and does not match Calico's supported live migration process. I replaced it with a check of the existing Flannel/Canal DaemonSet and the official Calico Flannel migration manifests.
- The Calico install example used the Tigera operator and a static Installation CR with Calico v3.27.0. That is a valid install style for some fresh installs, but it is not the supported live migration flow documented for Flannel/Canal migration. I replaced it with the current documented v3.32.0 migration manifest and migration job.
- The original node-by-node restart instructions used manual cordon, drain, and uncordon steps. Calico's migration controller performs the node-by-node migration, so I changed the section to monitoring the migration job, controller pod, and logs.
- The original NetworkPolicy section said to reapply backed-up Kubernetes NetworkPolicy objects "in Calico format" and then used `calicoctl get networkpolicy -A`. Kubernetes NetworkPolicy and Calico NetworkPolicy are different APIs. I changed the text to reapply Kubernetes NetworkPolicy with `kubectl`, then verify Kubernetes policies with `kubectl get networkpolicy --all-namespaces` and Calico policies with `calicoctl get networkpolicy --all-namespaces -o wide`.
- The original pod CIDR discovery command used `kubectl cluster-info dump | grep -m1 cluster-cidr`, which is not a reliable way to inspect node pod CIDRs across clusters. I replaced it with a `kubectl get nodes` JSONPath command that reads `.spec.podCIDR` from the Kubernetes Node objects.

## Review Notes
The revised guide is now accurate for the documented Flannel/Canal live migration path. For production use, operators should still review Calico's migration prerequisites carefully, especially Flannel backend mode, DirectRouting, daemon set management, node labels, firewall rules for VXLAN, and any custom migration environment variables.

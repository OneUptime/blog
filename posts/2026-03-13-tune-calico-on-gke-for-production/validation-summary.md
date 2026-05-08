# Validation Summary: How to Tune Calico on GKE for Production

## Status
validated

## Post Type
Tutorial / production tuning guide

## Technologies Covered
- Calico Open Source
- FelixConfiguration
- Google Kubernetes Engine
- GKE Dataplane V2
- Kubernetes NetworkPolicy
- kubectl
- calicoctl
- Google Cloud Managed Service for Prometheus

## Sources Consulted
- Calico documentation: Install Calico network policy on a Google Kubernetes Engine cluster, https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/gke
- Calico documentation: Felix configuration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Enabling the eBPF data plane, https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: System requirements for Kubernetes, https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: calicoctl patch, https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Google Cloud documentation: GKE Dataplane V2, https://cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- Google Cloud documentation: Control communication between Pods and Services using network policies, https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- Google Cloud documentation: Managed Service for Prometheus managed collection, https://cloud.google.com/stackdriver/docs/managed-prometheus/setup-managed

## Issues Found
- The post incorrectly described enabling Calico eBPF on GKE by checking for kernel 5.3+ and patching `FelixConfiguration.spec.bpfEnabled`. Current GKE documentation describes legacy GKE network policy as Calico/iptables and GKE Dataplane V2 as Cilium/eBPF; Dataplane V2 is selected at cluster creation time and existing clusters cannot be upgraded in place. I rewrote the eBPF section to check for Calico versus Dataplane V2 and to recommend planning for GKE Dataplane V2 instead of patching managed Calico.
- The introduction incorrectly implied that enabling eBPF via the Tigera Operator was the production path for managed GKE Calico. I corrected this to distinguish managed GKE Calico from GKE Dataplane V2.
- The post claimed Container-Optimized OS on GKE typically supports Calico eBPF with kernel 5.x+ and later used 5.3+ as the switching threshold. Current Calico requirements document Linux kernel 5.10 or later for Calico Kubernetes nodes, and GKE support depends on the selected dataplane rather than kernel version alone. I removed the unsupported kernel threshold guidance.
- The Felix tuning snippet included `routeRefreshInterval`, `reportingInterval`, and `bpfLogLevel`. These are not valid fields in the current Calico Open Source FelixConfiguration resource as documented. I removed them from the YAML snippet.
- The auto-scaling patch used `routeRefreshInterval`, which is not valid in the current documented FelixConfiguration resource. I changed the patch to update only `iptablesRefreshInterval`.
- The conclusion said the guide applied eBPF dataplane configuration for high-performance workloads. I corrected it to say the guide tunes Calico/Felix on GKE and that eBPF-based policy enforcement should be evaluated through GKE Dataplane V2.

## Review Notes
The remaining commands and manifests are syntactically plausible for a GKE Standard cluster using Calico network policy. Resource limit changes to managed `calico-node` DaemonSets can be overwritten by GKE add-on reconciliation or autoscaling behavior, so future revisions should call out that operational caveat explicitly.

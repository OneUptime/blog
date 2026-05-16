# Validation Summary: How to Troubleshoot CoreDNS Issues on Talos Linux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Talos Linux
- Kubernetes DNS
- CoreDNS
- kubectl
- talosctl
- Prometheus metrics

## Sources Consulted
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux ResolverConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/resolverconfig
- Kubernetes DNS debugging guide: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes CoreDNS guide: https://kubernetes.io/docs/tasks/administer-cluster/coredns/
- Kubernetes disruptions / PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- CoreDNS prometheus plugin documentation: https://coredns.io/plugins/metrics/
- CoreDNS loop plugin documentation: https://coredns.io/plugins/loop/
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/

## Issues Found
- The post used `kubectl get endpoints` for CoreDNS and application service backing addresses. Kubernetes' current DNS debugging documentation recommends checking EndpointSlices for `kube-dns`, and CoreDNS' Kubernetes plugin watches EndpointSlices. Updated those examples to use `kubectl get endpointslice -l kubernetes.io/service-name=...`.
- The post stated that every pod points to the `kube-dns` service IP. This is only the default behavior for pods using the `ClusterFirst` DNS policy. Updated the wording to make that condition explicit.
- The loop-detection explanation focused on node `/etc/resolv.conf` pointing to localhost. CoreDNS loop documentation describes the problem more generally as CoreDNS forwarding to itself, often through loopback resolvers or an upstream that forwards back to CoreDNS. Updated the explanation to match that behavior.
- The Pending-pod list said a PodDisruptionBudget can prevent scheduling. Kubernetes PDBs constrain voluntary evictions, not normal scheduler placement. Replaced that item with selector, affinity, and topology constraint mismatches.
- The Talos host DNS snippet used the older `machine.network.nameservers` form. Current Talos documentation defines DNS resolver configuration with a `ResolverConfig` document. Updated the snippet to `apiVersion: v1alpha1`, `kind: ResolverConfig`, and `nameservers[].address`.
- The monitoring section listed `coredns_forward_requests_total`, which the CoreDNS forward plugin documentation marks as deprecated. Replaced it with `coredns_proxy_request_duration_seconds_count{proxy_name="forward"}`.

## Review Notes
The remaining commands and configuration examples are consistent with current Kubernetes, Talos, and CoreDNS documentation. Some operational recommendations, such as replica counts and direct CoreDNS ConfigMap edits, are environment-dependent but technically valid for troubleshooting.

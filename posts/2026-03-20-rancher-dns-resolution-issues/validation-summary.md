# Validation Summary: How to Troubleshoot DNS Resolution Issues in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher-managed Kubernetes clusters
- Kubernetes DNS and service discovery
- CoreDNS
- `kubectl`
- RKE2
- K3s
- Linux resolver configuration (`resolv.conf`)

## Sources Consulted
- Kubernetes: Debugging DNS Resolution - https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes: `kubectl run` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes: `kubectl port-forward` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes: Autoscale the DNS Service in a Cluster - https://kubernetes.io/docs/tasks/administer-cluster/dns-horizontal-autoscaling/
- CoreDNS: `forward` plugin - https://coredns.io/plugins/forward/
- CoreDNS: `loop` plugin - https://coredns.io/plugins/loop/
- CoreDNS: `prometheus` plugin - https://coredns.io/plugins/metrics/
- CoreDNS container image Dockerfile - https://github.com/coredns/coredns/blob/master/Dockerfile
- RKE2: Networking Services - https://docs.rke2.io/networking/networking_services
- RKE2: Server Configuration Reference - https://docs.rke2.io/reference/server_config
- K3s: Advanced Options / Configuration - https://docs.k3s.io/advanced
- Linux `resolv.conf(5)` manual - https://man7.org/linux/man-pages/man5/resolv.conf.5.html

## Issues Found
- The post used the deprecated `Endpoints` API in Step 1. I changed the check to `EndpointSlices`, which is the current Kubernetes endpoint resource.
- The debug pod examples used `kubectl run ... -- bash` without `--command`. I added `--command` so the examples reliably execute `bash` instead of passing it as container arguments.
- The `/etc/resolv.conf` example assumed the default namespace and default cluster domain. I changed the wording so it matches any namespace and any configured cluster domain.
- The CoreDNS ConfigMap and deployment names were hard-coded as `coredns`, which is not reliable across Rancher distributions such as RKE2. I changed those steps to discover the actual CoreDNS resource names first.
- The `ndots` section incorrectly said the setting should be checked in the CoreDNS ConfigMap. I corrected this to inspect a pod's `/etc/resolv.conf`, because `ndots` is a pod resolver setting.
- The `ndots` explanation was inaccurate. I corrected it to match resolver behavior: names with fewer than `ndots` dots are tried with the search list first.
- The `dig` section claimed to show a trace while using `+norecurse`. I corrected the description to match the actual command.
- The post suggested `kubectl exec` commands inside the CoreDNS container to run `cat` and `nslookup`. That is unreliable because the official CoreDNS image is distroless and does not include those utilities. I replaced this with testing the upstream resolver directly from the debug pod.
- The loop-detection section blamed `/etc/resolv.conf` pointing at `127.0.0.1` and suggested replacing the node symlink. I corrected this to the documented resolver-loop issue with local stub resolvers such as `127.0.0.53`, and updated the fix to point kubelet/RKE2/K3s at the real resolver file via `resolv-conf`.
- The metrics section implied Prometheus had to be installed and port-forwarded the `kube-dns` Service to port `9153`. I corrected this to port-forward the CoreDNS deployment directly to its metrics endpoint.
- The NodeLocal DNSCache step used the upstream raw manifest directly. That is not valid as written because the upstream manifest requires cluster-specific substitutions, and RKE2 documents a different enablement method via `HelmChartConfig`. I corrected the step accordingly.

## Review Notes
- The CoreDNS Corefile example is acceptable as a typical example, but Rancher distributions can ship different resource names and chart-managed packaging around CoreDNS.
- `cluster.local` remains the default cluster domain in Kubernetes, RKE2, and K3s, but it is configurable, so the post now treats it as a common default rather than a hard requirement.
- RKE2 deploys CoreDNS with an autoscaler by default. Manual scaling can still be useful for troubleshooting, but long-term replica counts may be governed by the autoscaler.

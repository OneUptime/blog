# Validation Summary: How to Configure Node Local DNS Cache with Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- NodeLocal DNSCache
- CoreDNS
- Calico
- Calico NetworkPolicy
- Calico eBPF dataplane
- kubectl

## Sources Consulted
- Kubernetes documentation: Using NodeLocal DNSCache in Kubernetes Clusters: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes NodeLocal DNSCache sample manifest: https://raw.githubusercontent.com/kubernetes/kubernetes/master/cluster/addons/dns/nodelocaldns/nodelocaldns.yaml
- Calico documentation: Use NodeLocal DNSCache in your cluster: https://docs.tigera.io/calico/latest/networking/configuring/node-local-dns-cache
- Calico documentation: Felix configuration: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Configuring Felix: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: calicoctl patch: https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The post claimed Calico's key requirement was an egress policy allowing pods to reach 169.254.20.10:53. Tigera's current documentation instead shows a Calico NetworkPolicy allowing NodeLocal DNSCache traffic into CoreDNS on TCP port 53, so the policy was replaced with the documented `kube-system` NetworkPolicy.
- The post instructed readers to patch Felix `chainInsertMode` for NodeLocal DNSCache. Current Calico documentation does not require this for NodeLocal DNSCache, and `insert` is already the documented default. The section was replaced with the documented Calico eBPF requirement to annotate the `kube-dns` service with `projectcalico.org/natExcludeService=true`.
- The deployment commands did not note that the shown placeholder substitutions are for kube-proxy iptables mode. A caveat was added directing IPVS users to the Kubernetes NodeLocal DNSCache IPVS substitutions.
- The post described 169.254.20.10 as intercepting DNS queries and claimed cached lookups drop from milliseconds to microseconds. This was softened to the documented behavior: NodeLocal DNSCache runs a per-node cache on a node-local IP and can reduce latency for cached entries.
- The verification section attempted to read `/run/node-cache/health`, which is not part of the current Kubernetes sample manifest. It was changed to port-forward the NodeLocal DNSCache metrics port and inspect CoreDNS cache metrics.
- The prerequisites listed `calicoctl`, but the corrected workflow no longer uses it. The prerequisite was changed to `kubectl` access.

## Review Notes
The manifest commands use the upstream Kubernetes sample from the `master` branch, matching the official Kubernetes documentation link. For production posts, consider pinning the manifest to a Kubernetes release branch or version-compatible artifact so future upstream changes do not alter the installation unexpectedly.

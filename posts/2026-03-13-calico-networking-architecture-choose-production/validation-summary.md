# Validation Summary: How to Choose Calico Networking Architecture for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Tigera Operator `Installation` API
- Typha
- Felix and `calico-node`
- BGP, node-to-node mesh, and route reflectors
- Calico eBPF and standard Linux dataplanes
- Calico for Windows / HNS

## Sources Consulted
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico resource requests and limits documentation: https://docs.tigera.io/calico/latest/reference/configure-resources
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico `calicoctl patch` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico eBPF installation documentation: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico API server documentation: https://docs.tigera.io/calico/latest/operations/install-apiserver

## Issues Found
- The introduction overstated that all architecture decisions must be fixed before cluster creation. Calico documentation notes that many operator options can be changed on a running cluster, while BGP topology and dataplane changes can be disruptive. Reworded the sentence to make the disruption scope accurate.
- The Typha sizing table said Typha is not needed below 50 nodes and required above 200 nodes. Current Calico documentation recommends Typha with the Kubernetes API datastore, says operator installs always include Typha, and describes Typha as essential for high-scale 100+ node clusters. Updated the table accordingly.
- The Typha configuration example used deprecated `spec.typhaAffinity` and an unsupported `spec.typhaPodAnnotations` field. Replaced it with current `spec.controlPlaneReplicas` and `spec.typhaDeployment.spec.template.spec` affinity/toleration fields.
- The Felix resource example used deprecated `spec.componentResources`. Replaced it with the current `spec.calicoNodeDaemonSet.spec.template.spec.containers[].resources` structure for the `calico-node` container.
- The BGP patch example set `asNumber` as an unquoted JSON number. Calico's current examples use a string value in patch payloads, so the example now uses `"65000"`.
- The dataplane table used an outdated eBPF kernel threshold of 5.3. Current Calico documentation requires Linux kernel 5.10+ for the base eBPF dataplane, with a supported RHEL 8.4 backport exception, and recommends 6.6+ for all eBPF features. Updated the threshold.
- The high-availability section said to deploy `calico-kube-controllers` on a node with a taint preventing eviction. Taints affect scheduling rather than directly preventing eviction. Replaced this with operator `controlPlaneReplicas` guidance and reliable infrastructure-node scheduling.
- The API server bullet described it as Enterprise-only and recommended 2+ replicas. Current Calico Open Source operator installs include API server or webhook components by default, and the aggregated API server is deprecated in favor of native v3 CRDs for new installations. Updated the wording.

## Review Notes
The Felix CPU and memory sizing table remains a pragmatic sizing heuristic rather than an official Calico sizing matrix. The route-reflector thresholds are also architectural guidance, not a hard Calico limit; the post now avoids presenting adjacent Calico defaults and API fields inaccurately.

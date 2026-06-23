# Validation Summary: How to Benchmark MetalLB Layer 2 vs BGP Mode Performance

## Status
validated

## Post Type
Tutorial / benchmarking guide

## Technologies Covered
- MetalLB
- Kubernetes Services and Deployments
- MetalLB Layer 2 mode
- MetalLB BGP mode
- BFD
- Prometheus and Grafana
- iperf3
- wrk
- Vegeta
- Fortio
- Bash
- Python

## Sources Consulted
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- MetalLB Layer 2 concepts: https://metallb.universe.tf/concepts/layer2/
- MetalLB BGP concepts: https://metallb.universe.tf/concepts/bgp/
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB usage documentation: https://metallb.universe.tf/usage/
- MetalLB release notes: https://metallb.universe.tf/release-notes/
- MetalLB Prometheus metrics documentation: https://metallb.universe.tf/prometheus-metrics/
- Vegeta official repository/documentation: https://github.com/tsenart/vegeta
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The L2 Service manifest was shown but never applied. Added `kubectl apply -f service-l2.yaml`.
- The Services exposed only HTTP port 80, but the iperf3 benchmarks targeted port 5201. Added an iperf3 server sidecar to the test deployment and exposed port 5201 on both LoadBalancer Services.
- The Service examples used the deprecated `metallb.universe.tf/address-pool` annotation prefix. Updated them to `metallb.io/address-pool`.
- The BGP failover section discussed BFD without configuring it. Added a `BFDProfile`, referenced it from `BGPPeer`, and documented that BFD requires MetalLB FRR-based BGP modes and router support.
- Fortio examples wrote JSON files inside the pod while the later Python analysis expected local files. Changed Fortio commands to emit JSON to stdout and redirect locally.
- Vegeta commands created target files locally but referenced `/tmp/...` paths inside the pod, and piped results to a local `vegeta report`. Changed the commands to run the full Vegeta pipeline inside the container and redirect JSON locally.
- The L2 failover script tried to infer the MetalLB announcer from Kubernetes Endpoints, which identifies backend pod nodes, not the L2 announcing node. Changed it to read `ServiceL2Status`.
- The BGP failover script selected the first MetalLB speaker pod rather than a node advertising the benchmark service. Changed it to read `ServiceBGPStatus`.
- The failover scripts could continue with an empty node name. Added guards that exit when no advertising node is found.
- Several failover and throughput claims were too absolute. Updated L2 failover language to match MetalLB's client-neighbor-cache caveat and changed BGP scaling language to note ECMP/router and multi-connection behavior.
- The Grafana dashboard queries referenced application metrics that plain `nginx:alpine` does not expose. Added a caveat that those queries require application or ingress instrumentation.
- The namespace creation command would fail on reruns. Changed it to a `--dry-run=client -o yaml | kubectl apply -f -` pattern.

## Review Notes
The guide is now technically valid as a benchmarking workflow, but the example performance tables remain illustrative. Real results will vary significantly with CNI, kube-proxy mode, router ECMP behavior, NIC speed, CPU limits, and traffic mix.

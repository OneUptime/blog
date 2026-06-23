# Validation Summary: How to Diagnose MetalLB Traffic Not Reaching Pods

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- MetalLB
- Kubernetes Services and EndpointSlices
- kube-proxy, iptables, and IPVS
- BGP and FRR/FRR-K8s
- ARP and Layer 2 networking
- Prometheus and ServiceMonitor resources
- Linux networking tools such as tcpdump, ip route, arp, nc, and curl

## Sources Consulted
- MetalLB official usage documentation: https://metallb.universe.tf/usage/
- MetalLB official Layer 2 concepts: https://metallb.universe.tf/concepts/layer2/
- MetalLB official BGP concepts: https://metallb.universe.tf/concepts/bgp/
- MetalLB official troubleshooting guide: https://metallb.universe.tf/troubleshooting/
- MetalLB official Prometheus metrics reference: https://metallb.universe.tf/prometheus-metrics/
- Kubernetes official Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes official EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes official EndpointSlice deprecation guidance for Endpoints: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes official kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The traffic-flow diagrams implied that the MetalLB speaker forwards data-plane traffic to pods. MetalLB attracts or announces traffic for the LoadBalancer IP; after traffic lands on a node, Kubernetes networking handles forwarding. Updated the diagrams and wording to use an announcing node and kube-proxy/CNI forwarding.
- The post used legacy Endpoints as the primary backend check. Kubernetes v1.33 deprecates the Endpoints API for this workflow, so the guide now uses EndpointSlices first and keeps Endpoints only as a legacy fallback.
- The ping guidance implied ICMP is a normal LoadBalancer service validation. MetalLB's official troubleshooting guide says pinging the service IP is not proof that the Service works, so the text now treats ping only as a weak optional signal and emphasizes service-port checks.
- The Layer 2 assignment command used a `nodeAssigned` event lookup. Current MetalLB troubleshooting guidance recommends checking Service events from `kubectl describe svc`, so the command and explanation were corrected.
- The BGP section used obsolete `birdcl` commands. Current MetalLB uses native BGP logs/metrics or FRR/FRR-K8s with `vtysh`, so the examples were replaced with current backend-appropriate checks.
- The `externalTrafficPolicy: Local` explanation said traffic is dropped if no pods run on the speaker node. Current MetalLB behavior is more precise: services are advertised only from nodes with ready local endpoints, and kube-proxy will not forward traffic from a non-local node to remote pods under Local policy. Updated the wording and remediation.
- Several command examples needed copy-paste corrections: tcpdump options were placed after the capture expression, and the interactive debug pod command omitted `--restart=Never`. Updated the commands to current reliable forms.
- The diagnostic script used deprecated Endpoints, generated an invalid label selector from `.spec.selector`, and attempted to execute `kubectl` inside the netshoot debug pod. The script now checks EndpointSlices, builds a valid selector with a Go template, handles selectorless Services, computes ClusterIP and port before launching the debug pod, and quotes variables.
- The metrics list referenced non-current or unsupported metric names for the current MetalLB metrics page. Replaced them with documented MetalLB and FRR-K8s metric names.

## Review Notes
The Prometheus examples remain deployment-dependent because ServiceMonitor labels and Prometheus `job` labels vary between raw manifests, Helm, and operator installs. The post now uses documented metric names, but production alert selectors should still be adapted to the labels emitted by the reader's monitoring stack.

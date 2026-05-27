# Validation Summary: How to Configure External Traffic Policy with MetalLB Layer 2 Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes externalTrafficPolicy
- Kubernetes EndpointSlices
- MetalLB Layer 2 mode
- kube-proxy
- ARP/NDP
- kubectl

## Sources Consulted
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes virtual IPs and service proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- Ealenn Echo-Server repository: https://github.com/Ealenn/Echo-Server

## Issues Found
- The post said `externalTrafficPolicy: Local` risks downtime if the MetalLB L2 leader node has no local pods. MetalLB's current L2 election considers external traffic policy and active endpoints, and speakers without local endpoints do not advertise a Local service. Updated the wording to explain that only pods on the current announcing node receive traffic and that other nodes serve traffic only after leadership moves to them.
- The topology spread example claimed it ensures the MetalLB leader always has a pod. Topology spread constraints cannot guarantee that exact outcome; they spread replicas and increase failover eligibility. Updated the comments and surrounding text accordingly.
- The web Service examples used `targetPort: 8080`, while the nginx Deployment example used the stock `nginx:1.27` image, which listens on port 80 by default. Changed the Service target ports and nginx `containerPort` to 80 so the examples line up.
- The troubleshooting command used `kubectl get endpoints`. EndpointSlices are the stable, scalable source of endpoint data for Services, so the command now uses `kubectl get endpointslices -l kubernetes.io/service-name=web-local -o wide`.
- The source IP verification command checked the `X-Forwarded-For` header. MetalLB L2 service traffic does not add that HTTP header; the echo-server exposes the peer IP under `host.ip`. Updated the command to `jq '.host.ip'`.

## Review Notes
- The remaining guidance about `Cluster` versus `Local`, source IP preservation, single-node ingress behavior in MetalLB L2 mode, and failover tradeoffs matches the Kubernetes and MetalLB documentation.
- I could not verify `kubectl` command help locally because `kubectl` is not installed in this workspace; command syntax was checked against official Kubernetes documentation instead.

# Validation Summary: How to Preserve Client Source IP with MetalLB Using Local Traffic Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes LoadBalancer and NodePort traffic policies
- kube-proxy
- MetalLB Layer 2 and BGP modes
- Nginx
- HTTP forwarding headers

## Sources Consulted
- Kubernetes tutorial: Using Source IP - https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes API reference: Service v1 - https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes networking reference: Virtual IPs and Service Proxies - https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes task: Create an External Load Balancer - https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- MetalLB usage documentation: Traffic policies - https://metallb.io/usage/
- MetalLB Layer 2 concepts - https://metallb.io/concepts/layer2/
- MetalLB troubleshooting documentation - https://metallb.io/troubleshooting/
- Echo Server documentation - https://ealenn.github.io/Echo-Server/

## Issues Found
- The SNAT example used `10.244.0.1` while describing it as the node's IP. That address commonly represents a pod/CNI network address, so the example was changed to `192.168.1.10` to match the stated node-IP behavior described by Kubernetes.
- The topology spread comment said it ensures the MetalLB leader always has a pod. Topology spread constraints improve distribution but do not guarantee that every possible leader has a local endpoint in all clusters, so the comment was corrected.
- The echo-server verification suggested looking for `x-forwarded-for` or `x-real-ip` headers. Those headers are only present when a proxy adds them; preserving the transport source IP does not create them. The command and note now point users to the request IP fields instead.
- The health check section showed a JSON response with `localEndpoints`. Kubernetes documents the health check response as plain text with HTTP 200 or 503 status codes. The response examples and diagram labels were corrected.
- The MetalLB BGP health-check explanation implied MetalLB uses the Kubernetes health check endpoint directly. The wording now distinguishes external load balancer health checks from MetalLB's own behavior of respecting `externalTrafficPolicy: Local` and advertising only from nodes with local endpoints in BGP mode.

## Review Notes
The Kubernetes API versions and Service fields used in the YAML examples are current. `externalTrafficPolicy: Local` is correctly described as preserving source IP by routing only to node-local endpoints, with traffic dropped if no local endpoint exists. MetalLB Layer 2 mode still has the documented single-node traffic bottleneck, while BGP mode balances by node rather than by individual pod when using Local policy.

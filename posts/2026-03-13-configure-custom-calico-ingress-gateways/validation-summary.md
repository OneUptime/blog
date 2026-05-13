# Validation Summary: How to Configure Custom Calico Ingress Gateways

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Kubernetes Deployments, Services, Namespaces, and ConfigMaps
- Envoy proxy
- kubectl JSONPath output

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico network policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Envoy Docker image documentation: https://www.envoyproxy.io/docs/envoy/latest/start/docker
- Envoy quick start / run Envoy documentation: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/run-envoy
- Envoy version history: https://www.envoyproxy.io/docs/envoy/latest/version_history/version_history

## Issues Found
- The gateway namespace and backend namespace label required by the Calico selectors were not created in the example. Added Namespace resources for `gateway-system` and `production`, and labeled `production` with `gateway-accessible: "true"`.
- The Envoy Deployment exposed container ports 80 and 443 without providing an Envoy configuration that listened on those ports or routed to the backend. Added a minimal Envoy ConfigMap, mounted it into the Deployment, and exposed Envoy's configured listener on port 10000 through the Kubernetes Service.
- The Envoy image was pinned to `envoyproxy/envoy:v1.28.0`, which is no longer a supported stable Envoy line according to the current Envoy version history. Updated it to `envoyproxy/envoy:v1.38.0`.
- The GlobalNetworkPolicy selector used only `app == 'custom-gateway'`, which could match similarly labeled pods in any namespace. Narrowed it to `projectcalico.org/namespace == 'gateway-system' && app == 'custom-gateway'`.
- The Calico namespace selector used the Kubernetes namespace label. Calico supports namespace selectors over labels, but its own documentation recommends `projectcalico.org/name` for selecting a namespace by name. Updated the policy to use `projectcalico.org/name == 'gateway-system'`.
- The Envoy configuration resolves the backend Service DNS name, but the egress policy only allowed backend application ports. Added UDP and TCP DNS egress to CoreDNS in `kube-system`.
- The verification command only read `.status.loadBalancer.ingress[0].ip`, which fails on cloud load balancers that publish a hostname instead of an IP. Updated the JSONPath to read either IP or hostname.

## Review Notes
The example assumes a backend Service named `backend` exists in the `production` namespace and listens on port 8080. Clusters that do not use the common CoreDNS label `k8s-app: kube-dns` may need the DNS policy selector adjusted.

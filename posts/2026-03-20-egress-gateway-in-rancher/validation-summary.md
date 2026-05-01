# Validation Summary: How to Configure Egress Gateway in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher-managed Kubernetes clusters
- Kubernetes networking
- Calico Enterprise / Calico Cloud egress gateways
- Istio egress gateway
- Squid forward proxy
- Proxy environment variables

## Sources Consulted
- Calico use case docs: https://docs.tigera.io/use-cases/egress-gateways
- Calico Enterprise egress gateway docs: https://docs.tigera.io/calico-enterprise/latest/networking/egress/egress-gateway-on-prem
- Calico IPPool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Istio egress gateway task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio configuration scoping docs: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Squid `http_port` directive reference: https://www.squid-cache.org/Doc/config/http_port/
- Squid ACL and access control guidance: https://wiki.squid-cache.org/SquidFaq/SquidAcl
- curl proxy environment variable docs: https://everything.curl.dev/usingcurl/proxies/env.html
- Docker Hub `ubuntu/squid` image listing: https://hub.docker.com/r/ubuntu/squid

## Issues Found
- The Calico section incorrectly implied that Calico Open Source supports egress gateways and referenced `EgressIPSet`, which is not a documented Calico Open Source feature. I corrected this to state that native egress gateways require Calico Enterprise or Calico Cloud, then replaced the example with the documented `egressIPSupport` enablement, a dedicated `IPPool`, an `EgressGateway` resource, and a namespace annotation to select the gateway.
- The original Calico YAML only created an `IPPool`, which was not enough to configure an egress gateway. I expanded it to include the actual gateway resource and namespace-level selection needed for traffic to use the gateway.
- The Istio example used deprecated `networking.istio.io/v1alpha3` APIs. I updated the resources to `networking.istio.io/v1`, which matches current Istio documentation.
- The Istio example was incomplete because it omitted the `ServiceEntry` and `DestinationRule` required by the documented egress-gateway flow, and its `VirtualService` only described the mesh-to-gateway leg. I added the missing resources and the second `VirtualService` TLS match that routes traffic from the egress gateway to the external host.
- The NGINX section described a forward proxy pattern that would not work for general HTTPS proxying as shown, and the example Deployment was incomplete for `apps/v1` because it lacked a required `.spec.selector`. I replaced that section with a Squid-based forward proxy example that supports standard HTTP proxying and HTTPS CONNECT tunneling, and included the missing `ConfigMap`, `Deployment.selector`, pod labels, and `Service`.
- The proxy environment variable example used `HTTP_PROXY`/`HTTPS_PROXY` only and included a `NO_PROXY` CIDR entry that is not uniformly supported across tooling. I changed the example to include lower-case and upper-case proxy variables, and switched to a hostname/domain-based `no_proxy` list that aligns better with common client behavior and curl documentation.
- The introduction overstated default Kubernetes egress behavior by saying pods always use different node IPs. I narrowed the wording to say outbound traffic usually leaves via varying node IPs when explicit egress controls are not in place.
- The use-case bullet said “Kubernetes services” were being whitelisted at external firewalls. I corrected that to “Kubernetes workloads,” which is the technically accurate unit generating outbound traffic.

## Review Notes
- Istio egress gateways and proxy-based approaches only provide a predictable external source IP when the gateway/proxy pods run on nodes or network paths with fixed outbound IPs; Istio’s own docs explicitly note that defining an egress gateway does not, by itself, give the gateway nodes special treatment.
- Calico Enterprise on-prem egress gateways also have operational prerequisites such as enabling `egressIPSupport`, opening UDP port 4790 on hosts, and ensuring external routing can return traffic to the egress IP pool. The post now reflects the required config objects, but a production rollout still needs those platform prerequisites.
- Proxy environment variable support is application-dependent. The post now reflects the common convention, but individual runtimes and libraries may still require tool-specific proxy configuration.

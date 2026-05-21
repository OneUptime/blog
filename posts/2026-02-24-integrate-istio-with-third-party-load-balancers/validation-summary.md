# Validation Summary: How to Integrate Istio with Third-Party Load Balancers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes Services and NodePort
- Istio ingress gateways
- F5 BIG-IP Container Ingress Services
- HAProxy
- Envoy PROXY protocol support
- TLS termination patterns

## Sources Consulted
- Istio documentation: Configuring Gateway Network Topology - https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Istio documentation: Ingress Access Control - https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio documentation: EnvoyFilter reference - https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio documentation: Ingress Gateways - https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Kubernetes documentation: Service concepts - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: Using Source IP - https://kubernetes.io/docs/tutorials/services/source-ip/
- F5 documentation: CIS Installation - https://clouddocs.f5.com/containers/latest/userguide/cis-installation.html
- F5 documentation: CIS Configuration Parameters - https://clouddocs.f5.com/containers/latest/userguide/config-parameters.html
- F5 documentation: BIG-IP Controller for Kubernetes - https://clouddocs.f5.com/products/connectors/k8s-bigip-ctlr/v1.6/
- HAProxy documentation: Configuration Manual - https://docs.haproxy.org/2.9/configuration.html

## Issues Found
- The X-Forwarded-For section implied that the Istio `Gateway` resource itself makes Istio trust forwarded headers. I clarified that the gateway listener is normal gateway configuration and that `meshConfig.defaultConfig.gatewayTopology.numTrustedProxies` is the setting that controls trusted proxy hops.
- The F5 Helm install command omitted the required credential prerequisite. I added wording that the BIG-IP login secret must be created before installing the chart.
- The HAProxy example health checks were sent to the HTTP NodePort, but Istio gateway readiness is served on the status port. I updated the HAProxy server lines to use `check port 30021` while forwarding traffic to `30080`.
- The HAProxy example did not specify HTTP mode. I added `mode http` to the frontend and backend so the HTTP health-check and TLS-termination example is explicit.
- The PROXY protocol section showed an EnvoyFilter pattern that is more fragile than Istio's current documented `gatewayTopology.proxyProtocol` setting and did not limit the guidance to Layer 4/TCP traffic. I updated the text and snippet to use `proxyProtocol: {}` for the gateway topology and changed the HAProxy example to TCP mode against the HTTPS NodePort.

## Review Notes
The post is now technically sound as a general integration guide. In production, readers should still align NodePort values, F5 CIS controller version, HAProxy mode, and TLS termination details with their specific cluster and load balancer topology.

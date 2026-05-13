# Validation Summary: How to Migrate to Custom Calico Ingress Gateways Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico NetworkPolicy and GlobalNetworkPolicy
- Kubernetes Deployments
- Kubernetes Services of type LoadBalancer
- kubectl JSONPath output
- Custom ingress gateway deployments

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation, including multi-port Services and LoadBalancer behavior: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes namespace label documentation for `kubernetes.io/metadata.name`: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico namespace policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Envoy Docker image documentation: https://www.envoyproxy.io/docs/envoy/latest/start/docker

## Issues Found
- The Kubernetes Service exposed both ports 80 and 443 without `name` fields. Kubernetes requires all ports to be named when a Service has multiple ports, so I added `http` and `https` names to the Service ports.
- The Deployment used the stock `envoyproxy/envoy:v1.28.0` image while exposing ports 80 and 443. The official Envoy image requires gateway-specific listener and route configuration, so I changed the image to a clearly custom preconfigured gateway placeholder.
- The GlobalNetworkPolicy selected every workload in the cluster with `app == 'custom-gateway'`. Because GlobalNetworkPolicy is cluster-scoped, I added a top-level namespace selector for `gateway-system` so the egress policy applies only to the intended gateway pods.
- The verification command only read `.status.loadBalancer.ingress[0].ip`, but Kubernetes LoadBalancer status may publish an IP address or hostname depending on the implementation. I updated the command to read either address form.

## Review Notes
- Local YAML parsing and Bash syntax checks passed after the changes.
- `kubectl` and `calicoctl` are not installed in this workspace, so live client-side or cluster-side validation was not performed.
- The examples assume the `gateway-system` and `production` namespaces already exist and that backend namespaces intended for gateway egress are labeled `gateway-accessible=true`.

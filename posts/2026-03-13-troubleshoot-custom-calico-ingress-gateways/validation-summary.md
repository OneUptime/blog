# Validation Summary: How to Troubleshoot Custom Calico Ingress Gateways

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source network policy
- Kubernetes Deployments
- Kubernetes Services
- Kubernetes Namespaces
- kubectl JSONPath output
- Envoy-based custom gateway deployment

## Sources Consulted
- Kubernetes Service documentation, including multi-port Service requirements: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Namespace documentation, including automatic namespace labels: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes well-known labels documentation for `kubernetes.io/metadata.name`: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico automatic labels documentation for namespace selectors: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico namespace policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy

## Issues Found
- The Kubernetes Service exposed two ports without names. Kubernetes requires all ports in a multi-port Service to have unique names, so I added `name: http` and `name: https`.
- The manifests referenced `gateway-system` and `production` namespaces, and the Calico egress policy selected backend namespaces with `gateway-accessible == 'true'`, but the example did not create or label those namespaces. I added Namespace resources for `gateway-system` and `production`, with the required `gateway-accessible: "true"` label on `production`.
- The verification command only read `.status.loadBalancer.ingress[0].ip`. Kubernetes LoadBalancer Services can expose either an IP or a hostname, depending on the provider. I changed the command to capture either `.ip` or `.hostname` and renamed the variable to `GW_ADDR`.

## Review Notes
- The Calico `NetworkPolicy` example omits `types`, which is valid because Calico defaults `types` from the presence of ingress and egress rule sections.
- The source namespace selector `kubernetes.io/metadata.name == 'gateway-system'` is valid on current Kubernetes because that immutable namespace label is stable. Calico also documents `projectcalico.org/name` as its own automatic namespace-name label, which is another valid option.
- The Envoy container shown is still a minimal gateway placeholder. A production Envoy gateway needs an Envoy configuration that binds the expected listeners and routes traffic to backends.

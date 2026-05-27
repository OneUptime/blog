# Validation Summary: Understanding Kubernetes Service Types: ClusterIP, NodePort, and LoadBalancer

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services
- ClusterIP
- NodePort
- LoadBalancer
- kube-proxy
- CoreDNS
- MetalLB
- kubectl

## Sources Consulted
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- MetalLB usage documentation: https://metallb.io/usage/index.html
- MetalLB configuration documentation: https://metallb.io/configuration/

## Issues Found
- The opening explanation said a pod IP changes every time a pod restarts and that a Service address never changes. Updated this to the more precise Kubernetes guarantee: pod IPs are not stable across replacement or rescheduling, and the Service address is stable for the lifetime of the Service.
- The ClusterIP flow described backend selection as round-robin/random. Updated it to say traffic is sent to one of the ready backend pod IPs, avoiding an implementation-specific claim across kube-proxy modes.
- The NodePort flow said responses return via SNAT. Updated this to a more general node-path response because SNAT behavior depends on traffic policy and routing.
- The NodePort listing command used `--field-selector spec.type=NodePort`, but Services do not support `spec.type` as a field selector. Replaced it with a `custom-columns` command filtered with `awk`.
- The kube-apiserver command inspection used a JSONPath expression that would not reliably print one argument per line. Updated it to iterate over the command array and grep for `--service-node-port-range`.
- The MetalLB annotation used the older `metallb.universe.tf/address-pool` prefix. Updated it to the current `metallb.io/address-pool` annotation.
- The LoadBalancer explanation stated that LoadBalancer always builds on NodePort. Updated it to say this is typical, because Kubernetes supports disabling LoadBalancer NodePort allocation when the implementation supports it.

## Review Notes
The Endpoints command is still valid, but Kubernetes has newer EndpointSlice APIs for scalable endpoint discovery. A future article update could mention EndpointSlices without changing the current guide's core focus.

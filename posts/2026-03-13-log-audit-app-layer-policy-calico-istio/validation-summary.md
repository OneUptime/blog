# Validation Summary: How to Log and Audit Application-Layer Policy with Calico and Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy
- Calico application-layer policy for Istio
- Kubernetes
- Istio sidecar injection
- Dikastes sidecar
- Envoy
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Enforce Calico network policy for Istio service mesh - https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico documentation: Use HTTP methods and paths in policy rules - https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: GlobalNetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Istio documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Kubernetes documentation: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction referred to a `projectcalico.org/v3` `ApplicationPolicy`, but current Calico documentation describes application-layer HTTP match criteria on Calico `NetworkPolicy` and `GlobalNetworkPolicy` resources. Changed the text to refer to `NetworkPolicy` application-layer match criteria.
- The post claimed Calico/Istio policy can match HTTP headers. The Calico OSS Istio documentation used for this post documents HTTP method and path matching for Istio-enabled apps, so the claim was narrowed to methods and paths.
- The prerequisites listed Calico v3.26+ and only general Istio sidecar injection. Current Calico documentation for Istio application-layer policy requires Kubernetes 1.29+, Istio 1.22+ for Kubernetes native sidecars, the Felix Policy Sync API, and Dikastes injection templates. Updated the prerequisites accordingly.
- The YAML example used an `action: Deny` rule with an `http` match. Calico's resource reference states application-layer match criteria are supported only on ingress rules and rules containing application-layer match clauses must use `Allow`. Removed the invalid deny rule and added a note that unmatched requests are rejected by Dikastes' default-deny behavior.
- The setup commands checked for Dikastes pods but did not verify the workload annotation needed to inject the Dikastes template. Added a command to check for `inject.istio.io/templates` on the backend deployment.
- The architecture diagram showed a method/path-specific deny branch. Updated it to show unmatched requests returning `403 Forbidden`.
- The conclusion repeated "with Calico and Istio" and referenced header filtering. Removed the duplicate phrase and narrowed the filtering description to methods and paths.

## Review Notes
- The test commands use placeholder pod and service names, so they are syntactically valid examples but still require matching resources in the `production` namespace.
- The post title mentions logging and auditing, but the body primarily demonstrates enforcement and validation of application-layer policy. A future update could add a focused section on where to inspect Dikastes or Envoy logs.

# Validation Summary: How to Configure Consistent Hash Load Balancing in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio DestinationRule
- Istio VirtualService
- Istio consistent hash load balancing
- Kubernetes Service and Deployment manifests
- kubectl and curl
- Envoy cookie-based hash affinity

## Sources Consulted
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio API proto for DestinationRule consistent hash fields: https://github.com/istio/api/blob/master/networking/v1alpha3/destination_rule.proto
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The introduction described consistent hashing as guaranteeing that matching requests always land on the same backend pod. Istio documents consistent hashing as soft session affinity that can be disrupted by endpoint changes and depends on proxies having a consistent endpoint view. Updated the wording to describe the guarantee accurately.
- The ring-size example used the deprecated top-level `consistentHash.minimumRingSize` field. Updated it to the current `consistentHash.ringHash.minimumRingSize` form.
- The full example used `nginx:latest` with `containerPort: 8080` and Service `targetPort: 8080`, but the standard nginx image listens on port 80 by default. Updated the Deployment container port and Service target port to 80 while preserving Service port 8080.
- The testing section used an arbitrary cookie value and claimed the curl responses would prove all requests hit the same backend. Updated it to reuse the value from `Set-Cookie` and clarified that proving the backend identity requires an application response that includes pod identity or sidecar access log inspection.
- The scaling section implied hard affinity during backend changes. Updated it to note Istio's soft-affinity caveat for host additions or removals.

## Review Notes
The remaining DestinationRule fields, hash key options, `httpCookie.ttl` behavior, `useSourceIp`, `httpQueryParameterName`, VirtualService shape, Kubernetes cleanup commands, and `kubectl run` usage are consistent with current official documentation. The post uses short service hostnames; Istio recommends fully qualified service names to avoid namespace ambiguity, but short names are valid when the resources are in the intended namespace.

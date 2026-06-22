# Validation Summary: How to Understand targetPort vs port vs nodePort in Kubernetes Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes Pods
- NodePort and LoadBalancer Service types
- EndpointSlices and Service discovery
- kubectl commands
- YAML configuration

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/

## Issues Found
- The `nginx:1.25` pod example said the app listens on port 8080. Default nginx images listen on port 80, so the example was changed to use `containerPort: 80` and `targetPort: 80`.
- The troubleshooting section said a Service has no endpoints when the Service port and container port do not align. Kubernetes creates EndpointSlices based on matching selectors and ready backends, not because numeric Service ports and container ports match. The text was changed to focus on selector/readiness issues.
- The troubleshooting commands used the deprecated Endpoints API. Kubernetes recommends EndpointSlices, so the command was changed to `kubectl get endpointslices -l kubernetes.io/service-name=web-service`.
- The LoadBalancer example said `nodePort` is auto-assigned or can be specified. Kubernetes can omit NodePort allocation for LoadBalancer Services when supported and configured, so the comment was softened to "usually auto-assigned or can be specified."

## Review Notes
The core explanations of `port`, `targetPort`, `nodePort`, default `targetPort` behavior, named target ports, multiple Service ports, and the default NodePort range are consistent with the official Kubernetes documentation.

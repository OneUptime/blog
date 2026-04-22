# Validation Summary: How to Verify IPv6 Service Endpoints in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- EndpointSlices and legacy Endpoints
- IPv4/IPv6 dual-stack networking
- kubectl
- Bash and Python command-line snippets

## Sources Consulted
- Kubernetes EndpointSlices concept documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes EndpointSlice API reference: https://kubernetes.io/docs/reference/kubernetes-api/service-resources/endpoint-slice-v1/
- Kubernetes Service concept documentation, including Endpoints deprecation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes removed feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- kubectl api-resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- kubectl JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes static Pods documentation: https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/

## Issues Found
- The introduction implied that both Endpoints and EndpointSlices are current dual-stack routing data sources. Updated it to state that EndpointSlices are the current mechanism and the legacy Endpoints API is deprecated and does not support dual-stack clusters.
- The post listed `FQDN` as a normal EndpointSlice `addressType`. Updated the wording to explain that Service-backed EndpointSlices use `IPv4` or `IPv6`, while `FQDN` remains in the API but is deprecated and not processed by kube-proxy.
- The post implied any dual-stack cluster with IPv6 pod addresses would create IPv6 EndpointSlices. Updated the wording to clarify that the Service must be configured for IPv6 or dual-stack.
- The IPv6 connectivity command could concatenate multiple IPv6 endpoints if more than one IPv6 EndpointSlice existed, and the temporary tester pod used the default restart policy. Changed the command to select one endpoint with `head -n 1` and added `--restart=Never`.
- The troubleshooting section assumed `kube-controller-manager` was a Deployment and recommended restarting it. Replaced that with a selector-based log command suitable for static Pods, an EndpointSlice API availability check, and guidance to fix Service or cluster dual-stack configuration instead of restarting the controller manager.
- The health-check script used `grep -c ":" || echo 0`, which can return two lines (`0` and `0`) when no IPv6 endpoints are found. Removed the fallback so the count remains numeric.

## Review Notes
The local environment did not have `kubectl` installed, so kubectl command behavior was verified against the official generated kubectl reference rather than local `--help` output.

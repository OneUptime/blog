# Validation Summary: How to Test Network Partition Scenarios with Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio AuthorizationPolicy
- Istio Bookinfo sample application
- Kubernetes namespaces, labels, pods, deployments, and kubectl commands
- Fortio load testing
- Service mesh fault injection and network partition simulation

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio explicit deny task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- Istio Bookinfo application documentation: https://istio.io/latest/docs/examples/bookinfo/
- Istio Bookinfo release 1.22 sample manifest: https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/platform/kube/bookinfo.yaml
- Istio Bookinfo release 1.22 destination rules: https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/networking/destination-rule-all.yaml
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The asymmetric partition section incorrectly stated that Istio VirtualService does not directly support `sourceLabels` in the `match` block for this fault-injection example. Istio's VirtualService reference documents `sourceLabels` on HTTP match rules and includes a fault-injection example using it. I changed the text to explain that `sourceLabels` is supported, but acts as a workload selector rather than a runtime request match.
- The AuthorizationPolicy alternative used a source principal match without noting that workload identity depends on Istio being able to authenticate the source, typically through mutual TLS. I clarified that requirement in the surrounding text.

## Review Notes
- The post correctly distinguishes Istio HTTP-layer fault injection from true Layer 3 network partitioning.
- The Istio `release-1.22` Bookinfo URLs are still plausible and match the service accounts used by the AuthorizationPolicy example.
- The local environment did not have `kubectl` or `istioctl` installed, so CLI syntax was checked against official Kubernetes and Istio documentation rather than local help output.

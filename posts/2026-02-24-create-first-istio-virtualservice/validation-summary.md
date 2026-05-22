# Validation Summary: How to Create Your First Istio VirtualService

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Kubernetes Deployments, Services, namespaces, and pods
- kubectl
- istioctl
- Envoy sidecar proxy traffic routing

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio istioctl diagnostic tools reference: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Services, Load Balancing, and Networking: https://kubernetes.io/docs/concepts/services-networking/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post said plain Kubernetes routes requests to service pods "selected randomly by kube-proxy." I changed this to "load-balanced by the cluster's service proxy implementation, such as kube-proxy" because Kubernetes documents service proxying more generally, and not every cluster uses kube-proxy or the same balancing behavior.
- The prerequisite said "at least one service deployed with sidecar injection enabled." I changed this to "workloads that send traffic deployed with sidecar injection enabled" because VirtualService routing for in-mesh service calls is enforced by the calling workload's sidecar proxy.
- The setup section said "Deploy version 1" even though the YAML deploys both v1 and v2 plus the Service. I changed it to "Deploy both versions of the service."
- The verification section inspected route config on a reviews server pod before creating the test client. I moved the test-client creation before the route check and inspect the test-client proxy, which is the proxy making the outbound routing decision for the sample requests.
- The `kubectl run test-client ... -- sleep 3600` command would pass `sleep 3600` as arguments to the image entrypoint unless `--command` is specified. I changed it to `kubectl run ... --command -- sleep 3600` and added a readiness wait before using the pod.
- The host-name warning implied that a short `reviews` host would not match clients using the FQDN. I changed it to explain that Istio interprets short names relative to the VirtualService namespace and recommends the FQDN when there is ambiguity.
- The sidecar-injection warning said pods without sidecars get no VirtualService behavior. I tightened this to the pods sending traffic, which is the relevant enforcement point for this tutorial.

## Review Notes
The Istio `networking.istio.io/v1` VirtualService and DestinationRule examples use current fields, including `hosts`, `http`, `match.headers`, `route.destination.subset`, `timeout`, `retries.perTryTimeout`, `retries.retryOn`, and fault injection `delay.percentage.value` with `fixedDelay`. The examples use older Bookinfo image tags (`1.18.0`), but the image references are plausible for a tutorial and not an API deprecation issue.

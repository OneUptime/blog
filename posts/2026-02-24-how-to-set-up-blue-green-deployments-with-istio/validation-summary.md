# Validation Summary: How to Set Up Blue-Green Deployments with Istio

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio Gateway
- Kubernetes Deployments
- Kubernetes Services
- Kubernetes readiness probes
- kubectl
- Bash scripting
- HTTP header-based routing
- Blue-green deployments

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio traffic shifting task: https://istio.io/latest/docs/tasks/traffic-management/traffic-shifting/
- Istio protocol selection guide: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes readiness probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/

## Issues Found
- Istio manifests used `networking.istio.io/v1beta1`. Updated the DestinationRule, VirtualService, and Gateway examples to `networking.istio.io/v1`, which is the current stable API version documented by Istio.
- The Kubernetes Service port did not declare an HTTP protocol. Added `name: http` to the Service port so Istio can explicitly treat the service traffic as HTTP, which is important for HTTP routing and gateway behavior.
- The header-routing curl example did not state that `http://myapp:8080` is an in-cluster mesh address. Clarified that this test is run from inside the mesh.
- The traffic switch explanation claimed "no connections drop", which is too absolute for live routing changes. Reworded it to say that pods do not restart and new HTTP requests follow the updated route as config reaches proxies.
- The readiness check script could pass if no green pods existed or if readiness was not actually confirmed. Replaced the JSONPath/grep check with `kubectl wait --for=condition=Ready` using the green pod label selector and a timeout.
- The smoke-test comment did not specify execution context. Clarified that the test-header curl is run from inside the mesh.

## Review Notes
- Short service names such as `myapp` are valid when the Istio resources are in the same namespace, but Istio recommends fully qualified service names to avoid namespace ambiguity in larger deployments.
- The ingress Gateway example assumes the TLS credential `myapp-tls` exists in the appropriate namespace for the selected ingress gateway setup.
- The post uses Istio's native networking APIs. Istio also supports the Kubernetes Gateway API and indicates it intends to make Gateway API the default traffic management API in the future.

# Validation Summary: How to Test Application Resilience with Istio Fault Injection

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio VirtualService
- Istio fault injection
- Istio traffic management
- Kubernetes
- kubectl
- Bash
- Mermaid

## Sources Consulted
- Istio Fault Injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio Traffic Management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio Traffic Management Problems: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Istio Circuit Breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The Istio `VirtualService` examples used `apiVersion: networking.istio.io/v1beta1`. Current Istio documentation uses the stable `networking.istio.io/v1` API for these examples, so all `VirtualService` snippets were updated to `apiVersion: networking.istio.io/v1`.
- The intermittent failure checklist asked whether the calling service retries failed requests without noting an Istio-specific caveat. Istio documentation states that fault injection and retry or timeout policies do not work as expected when configured on the same `VirtualService`, so the checklist now tells readers to configure and test Istio retries separately from the fault-injection `VirtualService`.

## Review Notes
- The fault injection fields `fault`, `delay.fixedDelay`, `abort.httpStatus`, and `percentage.value` match the current Istio `VirtualService` reference.
- The `kubectl apply`, `kubectl delete`, `kubectl logs`, and `kubectl exec` command forms are valid according to Kubernetes documentation. The local environment did not have `kubectl` installed, so command validation was performed against official Kubernetes references rather than local `--help` output.

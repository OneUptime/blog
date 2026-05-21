# Validation Summary: How to Test Istio Failover Scenarios

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio traffic management
- Kubernetes Deployments, Services, Pods, and NetworkPolicy
- Envoy outlier detection and retries through Istio
- kubectl command-line workflows
- Bash scripting

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio locality failover task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio fault injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio traffic management common problems: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The post description claimed cross-cluster failover coverage, but the body does not include a cross-cluster failover test. Changed the description to mention retry behavior instead.
- The `my-service` Service defaulted `targetPort` to 5678, while the added `httpbin` flaky pod listens on port 80. Added named `http` ports and `targetPort: http` so the Service resolves the correct target port per pod.
- The stable deployment had no version label, which made later subset routing unable to distinguish healthy and flaky backends. Added `version: stable` and used it in the retry subset.
- The outlier detection section used Istio client-side fault injection to imply an upstream endpoint would be ejected. Replaced that with real upstream 5xx responses from `httpbin` via `/status/503`, because outlier detection ejects unhealthy upstream hosts based on upstream failures.
- The retry section combined fault injection and retries on the same VirtualService route. Istio documents that retries are not enabled when faults are enabled on the client-side route, so the example was changed to route 30% of traffic to a flaky backend and retry on real `5xx` responses.
- The retry probability calculation treated `attempts: 3` as three total attempts. Istio defines `attempts` as retries, so the maximum total requests is the initial request plus 3 retries. Updated the probability to `0.3^4 = 0.81%` and added caveats about timeouts, retry budgets, and load balancing.
- The NetworkPolicy section did not mention that Kubernetes NetworkPolicy only works with a network plugin that enforces it. Added that requirement.

## Review Notes
The examples remain illustrative and assume an Istio-injected namespace, a `sleep` client deployment with a `sleep` container, and nodes or pods labelled appropriately for locality and NetworkPolicy tests. Local kubectl help could not be checked because `kubectl` is not installed in this environment, so kubectl syntax was verified against the official generated Kubernetes reference instead.

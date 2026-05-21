# Validation Summary: How to Create Chaos Engineering Runbooks with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService fault injection
- Istio Bookinfo sample application
- Kubernetes kubectl commands
- Envoy sidecar statistics via pilot-agent
- Fortio load testing
- Bash scripting

## Sources Consulted
- Istio fault injection task documentation: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Bookinfo application documentation: https://istio.io/latest/docs/examples/bookinfo/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Fortio command documentation: https://github.com/fortio/fortio

## Issues Found
- The ratings latency runbook said a 5-second ratings delay should make the reviews service time out. Istio's Bookinfo fault injection documentation describes the default reviews-to-ratings timeout as 10 seconds and the productpage-to-reviews timeout as 3 seconds plus one retry, for a total of about 6 seconds. I changed the description and pass criteria to state that a 5-second ratings delay normally adds latency unless the tested reviews version has a shorter ratings timeout.
- The load-generation example ran `fortio load` inside the `ratings-v1` Bookinfo deployment. The Bookinfo ratings container should not be assumed to include the Fortio binary. I changed the snippet to run a one-off `fortio/fortio` pod with `kubectl run`.

## Review Notes
The Istio `VirtualService` examples use the current `networking.istio.io/v1` API and valid HTTP fault injection fields for aborts, delays, percentages, and fixed delays. The examples intentionally use short host names inside the same namespace, which is valid for the shown Bookinfo namespace, though fully qualified service names can be safer in shared runbook libraries.

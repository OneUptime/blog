# Validation Summary: How to Fix Health Check Failures with Istio Sidecar

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Istio sidecar injection and probe rewriting
- Kubernetes liveness, readiness, startup, HTTP, TCP, gRPC, and exec probes
- Kubernetes kubectl troubleshooting commands
- Istio mTLS and sidecar traffic interception

## Sources Consulted
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl reference docs for describe: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post used port 15021 for rewritten application health probes. Current Istio documentation shows rewritten `/app-health/...` probes on port 15020, while port 15021 is used for the sidecar readiness endpoint `/healthz/ready`. Updated the rewritten probe example, manual curl test, and mTLS explanation to use port 15020.
- The global enablement snippet was shaped like a ConfigMap `data.values` fragment, which is easy to misapply. Updated it to the Istio values structure for `sidecarInjectorWebhook.rewriteAppHTTPProbe: true`.
- The TCP probe section said the kubelet connects from localhost and that TCP probes usually work fine through the sidecar. Kubernetes documents TCP probes as checks to the Pod IP, and Istio documents TCP probes as needing rewrite because sidecar redirection can make ports appear open. Updated the explanation to describe the redirect behavior accurately and recommend keeping probe rewriting enabled.
- The exec probe section said exec probes bypass iptables rules. Reworded it to the more precise claim that exec probes do not require Istio network probe rewriting.

## Review Notes
- `kubectl` was not installed in the local environment, so command syntax was checked against the official Kubernetes kubectl reference documentation instead of local `--help` output.
- The sidecar readiness endpoint on port 15021 remains correct for `/healthz/ready`.

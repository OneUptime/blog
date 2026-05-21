# Validation Summary: How to Set Up Incident Management for Istio with OneUptime

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Istio CLI (`istioctl`)
- Kubernetes and `kubectl`
- Istio VirtualService fault injection
- Istio AuthorizationPolicy, PeerAuthentication, and DestinationRule resources
- OneUptime incident management, on-call, escalation, runbooks, and postmortems

## Sources Consulted
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio AuthorizationPolicy HTTP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio managing in-mesh certificates: https://istio.io/latest/docs/ops/configuration/traffic-management/manage-mesh-certificates/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- OneUptime on-call product documentation: https://oneuptime.com/product/on-call
- OneUptime runbook documentation: https://oneuptime.com/docs/en/runbooks/running
- OneUptime incident and alert templating documentation: https://oneuptime.com/docs/monitor/incident-alert-templating

## Issues Found
- The ingress gateway runbook used `deploy/istio-ingressgateway` in `istioctl proxy-config` examples. Updated the examples to `deployment/istio-ingressgateway`, matching the resource form shown in the official Istio command reference.
- The mTLS runbook command for checking sidecars used `kubectl get pods` without selecting a specific pod or namespace. Updated it to `kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.containers[*].name}'` so the command checks the intended workload.
- The postmortem example said an AuthorizationPolicy missing a `from` rule denies all sources. Istio's authorization docs state that an omitted `from` allows any source; an empty spec is the deny-all case. Updated the root cause text accordingly.
- The mTLS runbook suggested restarting `istiod` to trigger workload certificate rotation. Istio documents sidecars as managing their own workload certificate CSRs and private keys, so the mitigation now says to check istiod health and restart affected workloads if rotation is stuck.

## Review Notes
The OneUptime YAML snippets are labeled as conceptual configuration examples rather than exact exported OneUptime resource schemas. The Istio VirtualService fault injection example uses the current `networking.istio.io/v1` API and non-deprecated `percentage.value` field.

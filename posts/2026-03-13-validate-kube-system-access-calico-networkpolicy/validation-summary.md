# Validation Summary: How to Validate Resolution of kube-system Access with Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico network policy enforcement
- kubectl
- CoreDNS
- Metrics Server
- Kubernetes admission webhooks

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Resource Metrics Pipeline documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- Kubernetes Metrics Server README: https://github.com/kubernetes-sigs/metrics-server
- Calico network policy documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy

## Issues Found
- `kubectl run --timeout` was used as if it limited the DNS or curl test duration. In current kubectl, `--timeout` is the timeout for deletion, while `--pod-running-timeout` controls how long kubectl waits for the pod to run. Changed the examples to use `--pod-running-timeout`, and wrapped the DNS loop command with `timeout 30s` to bound the full test command.
- The metrics-server curl example could be misread as requiring HTTP 200 from inside the pod. Metrics Server exposes the Metrics API through the Kubernetes API server, and direct service access can return 401 or 403 while still proving network reachability. Added a note that a non-000 HTTP code confirms connectivity and that auth failures are separate from NetworkPolicy blocks.
- The admission webhook flow suggested adding webhook service egress from the affected namespace. Admission webhooks are called by the API server according to webhook configuration, so failures are more accurately about API server-to-webhook service reachability and webhook pod ingress. Updated the test comment and flowchart node accordingly.
- The emergency policy check said the expected output was `No resources found`, but because the command pipes `kubectl get networkpolicy` to `grep emergency`, the expected result for no match is no output. Corrected the expectation.
- The prevention note implied that a TTL annotation alone auto-deletes NetworkPolicies. Kubernetes does not natively delete arbitrary resources from a TTL annotation, so the text now specifies cleanup automation or an external TTL controller.

## Review Notes
The examples assume common cluster conventions, including CoreDNS pods labeled `k8s-app=kube-dns` and a Metrics Server service named `metrics-server` in `kube-system`. Those are common defaults but may vary by distribution or installation method.

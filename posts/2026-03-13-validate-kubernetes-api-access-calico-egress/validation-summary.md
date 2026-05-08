# Validation Summary: How to Validate Resolution of Kubernetes API Access with Calico Egress

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes ServiceAccounts
- Kubernetes NetworkPolicy
- Calico GlobalNetworkPolicy
- Alertmanager
- jq
- curl
- netcat

## Sources Consulted
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl create job reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_job/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes ServiceAccounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Configure Service Accounts for Pods documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Namespaces and DNS documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Calico GlobalNetworkPolicy documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy

## Issues Found
- The API connectivity test used `$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)` directly in the local shell command. That command substitution would run on the operator's local machine before `kubectl exec`, not inside the target pod. Changed the example to run `sh -c` inside the pod and read the mounted ServiceAccount token there before calling `curl`.
- The synthetic probe commands used `job/manual-probe-*` and `job-name=manual-probe-*`. Shell globbing does not expand Kubernetes resource names, and `kubectl wait` does not treat `*` as a resource-name wildcard. Changed the example to store the generated Job name in `JOB_NAME` and reuse it for create, wait, and logs.

## Review Notes
The remaining commands use current kubectl forms. The examples assume the selected containers include tools such as `nc`, `curl`, and `sh`, and that the synthetic probe CronJob and Alertmanager service names match the local cluster. Those are environment-specific prerequisites rather than technical errors in the post.

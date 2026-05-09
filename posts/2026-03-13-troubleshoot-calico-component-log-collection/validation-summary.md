# Validation Summary: How to Troubleshoot Calico Component Log Collection Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- kubectl
- FelixConfiguration
- Fluent Bit
- Elasticsearch
- Loki

## Sources Consulted
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico component logs documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- Calico troubleshooting commands documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Fluent Bit monitoring documentation: https://docs.fluentbit.io/manual/4.1/administration/monitoring

## Issues Found
- The post said an unset `logSeverityScreen` should be changed to `Info`. Calico documents the default Felix screen log level as `Info`, so an unset value is not itself a problem. Updated the guidance to change only `Fatal` to `Info` and note that unset uses the default `Info` level.
- The post described `kubectl top pods --containers` as checking log bytes per hour. Kubernetes documents `kubectl top` as CPU and memory usage only. Updated the comment to say it checks CPU and memory usage for calico-node containers.
- The RBAC check used `kubectl auth can-i get pods/log`. Kubernetes documents pod log checks with `kubectl auth can-i get pods --subresource=log`. Updated the command to use the documented subresource flag.
- The troubleshooting flow said to set `Info` when the Felix log level was `Fatal` or unset. Updated it to match Calico's documented default behavior for unset values.
- The end-to-end verification used a FelixConfiguration annotation and suggested searching for `FelixConfiguration` in aggregated logs. A Kubernetes annotation update is not a reliable way to create a pod stdout log entry for Fluent Bit collection. Replaced it with a temporary BusyBox pod in `calico-system` that emits a known log line, then updated the search guidance accordingly.
- The conclusion said `Fatal` suppresses all logs. Calico documents `Fatal` as fatal-level logging only. Updated the wording to say it emits only fatal-level logs.

## Review Notes
- `kubectl` was not installed in the local environment, so CLI syntax was verified against the official Kubernetes generated command references instead of local `--help` output.
- Calico documentation notes that `calico-system` is used for operator-based installations and `kube-system` is used for manifest-based installations. The post consistently targets `calico-system`, which is valid for operator-based deployments.

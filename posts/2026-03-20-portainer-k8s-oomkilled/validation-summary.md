# Validation Summary: How to Debug OOMKilled Pods in Portainer - K8s

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- `kubectl`
- Linux OOM kills and container memory limits
- Java/JVM memory tuning
- Node.js memory tuning
- Python `tracemalloc`
- Vertical Pod Autoscaler (VPA)
- Prometheus Operator and `PrometheusRule`
- kube-state-metrics

## Sources Consulted
- Kubernetes resource management docs: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- `kubectl top pod` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes resource metrics pipeline docs: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes `kubectl patch` task guide: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch
- Portainer application inspect docs: https://docs.portainer.io/sts/user/kubernetes/applications/inspect
- Portainer application edit docs: https://docs.portainer.io/user/kubernetes/applications/edit
- Oracle Java docs for `JAVA_TOOL_OPTIONS`: https://docs.oracle.com/en/java/javase/11/troubleshoot/environment-variables-and-system-properties.html
- Oracle Java launcher docs: https://docs.oracle.com/en/java/javase/11/tools/java.html
- Node.js CLI docs for `NODE_OPTIONS` and `--max-old-space-size`: https://nodejs.org/download/release/v22.17.0/docs/api/cli.html
- Kubernetes autoscaler VPA quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The post said exit code `137` always indicates OOM termination. I corrected this to explain that `137` only means the process exited via `SIGKILL`, and that readers should confirm `Reason: OOMKilled` in pod status.
- The post described `kubectl top ... --containers` as metrics history. I corrected this to current per-container metrics and left historical analysis to Prometheus/Grafana.
- The Deployment resource update example used `kubectl apply` with a partial manifest. I changed it to `kubectl patch ... --patch-file`, which matches Kubernetes patch semantics for a partial update.
- The Java examples used `JAVA_OPTS`, which is launcher or image specific. I changed them to `JAVA_TOOL_OPTIONS`, which the JVM officially recognizes.
- The Portainer navigation text referenced pod inspection paths that do not match current Portainer application docs. I updated the wording to the documented `Applications` / `YAML` / `Edit this application` views.
- The VPA example assumed the CRD and controllers were already present. I added a note that Vertical Pod Autoscaler must be installed first.
- The `PrometheusRule` example assumed the required CRD and metrics were already available. I added a note that it requires Prometheus Operator-compatible CRDs and kube-state-metrics.
- The log-filter examples used less portable `grep` alternation. I changed them to `grep -Ei ...`.
- The Python `tracemalloc` example implied a useful snapshot without executing the leaking path. I clarified that the code path must be reproduced before taking the snapshot.

## Review Notes
- The alert expression uses `kube_pod_container_status_last_terminated_reason`, which kube-state-metrics currently documents as an experimental metric.
- The memory sizing table is best treated as workload-specific starting guidance, not universal sizing advice.
- `kubectl` is not installed in this workspace, so CLI verification was done against the official Kubernetes command reference rather than local `--help` output.

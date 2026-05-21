# Validation Summary: How to Validate Istio Resource Allocation for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection and resource annotations
- IstioOperator installation configuration
- Kubernetes resource requests and limits
- kubectl resource inspection
- Prometheus HTTP API and PromQL
- cAdvisor container resource metrics

## Sources Consulted
- Istio resource annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio sidecar injection customization: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio installation customization and IstioOperator component resources: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio performance and scalability guidance: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio Sidecar API and configuration scoping: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Kubernetes resource requests and limits: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- cAdvisor Prometheus metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md

## Issues Found
- Prometheus curl examples embedded raw PromQL in the URL query string. This can break with curl URL globbing and unencoded PromQL characters. Updated the examples to use `curl -G --data-urlencode`.
- The initial CPU throttling command showed restart counts, which do not indicate CPU throttling. Replaced it with a command that lists Istio proxy CPU limits, then kept Prometheus as the precise throttling check.
- The OOMKilled check queried Kubernetes events with `reason=OOMKilled`, but container OOM kills are reliably visible in container termination state. Replaced the command with a pod status query for the `istio-proxy` container's last termination reason.
- The memory utilization PromQL divided by `container_spec_memory_limit_bytes` without filtering zero or unset limits. Updated the query and alert to ignore zero memory limits.
- The capacity planning CPU total used `bc` on Kubernetes CPU quantities such as `50m`, which is not valid arithmetic input. Replaced it with a `jq` command that normalizes CPU requests to millicores.
- The capacity planning memory command listed memory requests without totaling them. Replaced it with a `jq` command that normalizes memory requests to MiB and sums them.

## Review Notes
The guidance is generally accurate for Istio sidecar mode. Resource sizes remain workload-dependent, and the article correctly frames the numeric values as measurement-based rules of thumb rather than fixed production defaults.

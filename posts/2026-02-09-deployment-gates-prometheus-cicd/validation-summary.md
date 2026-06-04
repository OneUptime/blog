# Validation Summary: How to Configure Kubernetes Deployment Gates Using Prometheus Metrics in CI/CD

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Kubernetes Deployments and kubectl rollout commands
- Prometheus configuration, Kubernetes service discovery, HTTP API, and PromQL
- Python requests-based validation script
- GitHub Actions workflows
- Tekton Tasks and Pipelines
- Slack webhook notifications

## Sources Consulted
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus PromQL functions documentation for `rate()` and `histogram_quantile()`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus configuration documentation for Kubernetes service discovery and relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus cAdvisor guide for `container_cpu_usage_seconds_total`: https://prometheus.io/docs/guides/cadvisor/
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/kubectl/generated/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Tekton Tasks documentation: https://tekton.dev/docs/pipelines/tasks/
- Tekton Pipeline API documentation: https://tekton.dev/docs/pipelines/pipeline-api/
- Tekton variables documentation: https://tekton.dev/docs/pipelines/variables/
- GitHub Actions checkout action documentation: https://github.com/actions/checkout

## Issues Found
- Added Prometheus relabeling rules for `namespace`, `pod`, and `app` because Kubernetes service discovery meta labels are removed after relabeling unless copied to normal target labels.
- Removed unused Python imports and added `math` so the CPU gate can reject `NaN` results.
- Fixed the latency query construction to compute the Prometheus quantile from the percentile value instead of concatenating `0.` with the number.
- Corrected the CPU check from a misleading percent calculation to a CPU cores threshold using `container_cpu_usage_seconds_total`, which is a cumulative CPU-seconds counter.
- Updated `actions/checkout` examples from `v3` to the current documented `v6` major version.
- Updated Tekton examples from `tekton.dev/v1beta1` to the stable `tekton.dev/v1` API version.
- Changed Tekton validation steps from `curlimages/curl` to Alpine with `curl`, `jq`, and `bc` installed because the original image did not provide all tools used by the script.
- Replaced the canary example that patched `deployment/myapp` while later deleting `deployment/myapp-canary`; it now creates a separate `myapp-canary` Deployment with matching selector and template labels.
- Made the canary Prometheus URL consistent with the in-cluster service DNS pattern used elsewhere in the post.

## Review Notes
The examples assume the CI runner can reach both the Kubernetes API and the in-cluster Prometheus service, which usually requires a self-hosted runner, VPN, proxy, or port-forwarding setup. The CPU gate also assumes cAdvisor or equivalent kubelet container metrics are being scraped; the pod annotation scrape job alone only covers application-exposed metrics.

# Validation Summary: How to Prevent Per-Pod Metric Averages from Hiding a Hot Shard

## Status
validated

## Post Type
Technical troubleshooting guide with Python, shell, HPA configuration, and a Mermaid decision diagram.

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler (HPA), Deployments, StatefulSets, and Services
- Kubernetes custom and external metrics APIs and metrics adapters
- Python 3
- kubectl, Bash, and jq
- YAML and Mermaid
- Application sharding, queue consumption, routing, and telemetry cardinality

## Sources Consulted
- [Kubernetes HPA algorithm and scaling behavior](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/#algorithm-details)
- [Kubernetes HPA walkthrough, including external metrics](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/)
- [Kubernetes v1.35.0 autoscaling/v2 API definitions](https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/api/autoscaling/v2/types.go)
- [Kubernetes custom metrics v1beta1 response types](https://raw.githubusercontent.com/kubernetes/metrics/master/pkg/apis/custom_metrics/v1beta1/types.go)
- [Kubernetes custom metrics client request construction](https://raw.githubusercontent.com/kubernetes/metrics/master/pkg/client/custom_metrics/versioned_client.go)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes Service session affinity](https://kubernetes.io/docs/concepts/services-networking/service/#session-affinity)
- [Prometheus instrumentation and label cardinality guidance](https://prometheus.io/docs/practices/instrumentation/#do-not-overuse-labels)
- [Python math.ceil](https://docs.python.org/3/library/math.html#math.ceil)
- [jq manual](https://jqlang.org/manual/)
- [Mermaid flowchart syntax](https://mermaid.js.org/syntax/flowchart.html)
- [Author GitHub profile](https://github.com/nawazdhandala)

## Issues Found
No technical issues found.

## Review Notes
- Executed the exact Python example successfully. Both assertions passed, with average 25.0, maximum 100, and desired replica count 3. The example correctly labels this as a simplified recommendation. Real HPA behavior also incorporates tolerance, missing metrics, stabilization, and replica limits.
- Checked the shell snippet with Bash syntax validation and executed its jq filter against a representative custom-metrics response. The extracted Pod name, metric value, and timestamp matched expectations. The quoted wildcard URI, encoded label selector, and --raw option are correct.
- Verified the custom-metrics endpoint structure and response fields against Kubernetes source. The v1beta1 endpoint depends on adapter support, as the post explicitly states; readers must use a served version. No live cluster request was performed.
- Reviewed the YAML fragment against the autoscaling/v2 API and the official external queue example. External, metric.name, metric.selector.matchLabels, AverageValue, and the quoted quantity "20" are valid. This belongs under an HPA's spec.metrics and is intentionally not a complete manifest. A local YAML parser was unavailable; verification was by inspection against the official schema and example.
- External AverageValue expresses backlog per replica; matching external time series are summed. The adapter must expose the intended shard total without duplicate reporting. The selector filters metrics and does not assign work to application workers.
- StatefulSet identity guarantees do not implement application shard rebalancing. The discussion of pinned work, independent scaling boundaries, and maximum-based feedback is consistent with the HPA model. A maximum that remains above target can drive repeated scale-up when used as the proportional signal, subject to scaling limits; this does not imply every possible maximum-metric configuration behaves identically.
- The pinned v1.35.0 source link is valid and supports the stated requirement that scaling signals decrease as capacity increases. It is a versioned reference, not a claim that v1.35.0 is the latest release. The post uses stable autoscaling/v2 fields rather than a deprecated HPA API.
- Reviewed Mermaid node shapes, directional edges, and branch labels against official syntax. No renderer was run.
- All three external links in the post resolved to the intended resources. The author profile redirects from www.github.com to github.com.
- Skewed-traffic, rebalancing, and worker-failure experiments are sensible application validation steps, but were not executed during this documentation review. No README changes were necessary.

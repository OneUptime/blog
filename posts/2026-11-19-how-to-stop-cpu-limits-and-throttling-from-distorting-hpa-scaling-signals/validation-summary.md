# Validation Summary: How to Stop CPU Limits and Throttling from Distorting HPA Scaling Signals

## Status
validated

## Post Type
Technical troubleshooting guide containing shell commands, an HPA configuration fragment, and a PromQL query.

## Technologies Covered
- Kubernetes CPU requests, limits, Pods, and resource metrics
- Horizontal Pod Autoscaler (HPA), including autoscaling/v2 ContainerResource metrics
- Linux CPU bandwidth control and throttling
- cAdvisor CPU counters
- Prometheus and PromQL
- kubectl, jq, and YAML

## Sources Consulted
- Kubernetes resource management: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#requests-and-limits
- Kubernetes HPA behavior and algorithm: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- jq manual, including object construction and array iteration: https://jqlang.org/manual/
- cAdvisor Prometheus metric reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Prometheus rate function: https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
- Prometheus aggregation and arithmetic operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Linux kernel CPU bandwidth control: https://docs.kernel.org/scheduler/sched-bwc.html
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. All three external links resolve to their intended resources.
- Verified that requests influence scheduling and CPU allocation under contention, while Linux CPU limits constrain bandwidth through throttling. The approximate sustained ceiling correctly distinguishes average bandwidth from short bursts.
- Checked the numerical examples: 60% of a 500m request is 300m; a 500m limit allows usage above that target; an 800m absolute target exceeds a 500m sustained ceiling; equal 500m requests and limits imply an approximate 100% utilization ceiling. Raising the limit to 1000m leaves the request-based 300m target unchanged.
- Confirmed the ContainerResource field structure and AverageValue target against the autoscaling/v2 API. The YAML is a spec.metrics list fragment, not a complete manifest, and deliberately demonstrates an unsuitable target. Container resource metrics have been stable since Kubernetes 1.30; older deployments require checking feature availability.
- Verified kubectl resource selection, namespace, label selector, and JSON output flags. The shell block passed bash syntax checking, and both exact jq filters executed successfully against representative Pod-list and HPA JSON fixtures.
- Reviewed PromQL syntax against official documentation: rate is applied to each counter before aggregation, both sides retain matching labels, and division expresses the fraction of throttled enforcement periods. This does not quantify lost CPU demand or latency. Missing counters yield no matching result, and a zero denominator can yield NaN; scrape availability, scoping, and deduplication remain deployment-specific as the post states.
- Confirmed sidecar dilution and the use of a named application container to isolate the scaling signal. Multiple metrics select the greatest replica recommendation. Actual scaling also depends on tolerance, readiness, missing metrics, replica bounds, and stabilization; a target is not an instantaneous trigger.
- Queue or concurrency scaling requires an appropriate metrics API integration. Resource metrics likewise require a working metrics provider. Increasing CPU limits remains a load-test experiment dependent on node capacity and application behavior, as stated in the post.
- Validation was documentation-based with local shell and jq checks. No live Kubernetes workload, Prometheus query evaluation, or load test was performed. A YAML parser was unavailable locally; the fragment was inspected against the official API schema.

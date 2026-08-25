# How to Seed VPA with Prometheus History After a Recommender Restart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Prometheus, Historical Metrics, Reliability

Description: Configure and verify VPA's Prometheus history provider so a restarted recommender restores compatible cAdvisor usage and Pod-label history instead of warming up from live samples alone.

---

The VPA recommender normally persists aggregate state in `VerticalPodAutoscalerCheckpoint` objects. As an alternative, `--storage=prometheus` makes it query Prometheus for historical Pod/container usage during recommender startup. This can seed recommendations after a restart, but only when metric names, units, identity labels, workload labels, retention, and query resolution match VPA's expectations.

Prometheus is a startup history provider in this mode. Fresh ongoing samples still come from the Kubernetes resource metrics API, typically Metrics Server.

## Configure the Recommender Explicitly

```yaml
spec:
  template:
    spec:
      containers:
        - name: recommender
          args:
            - --storage=prometheus
            - --prometheus-address=http://prometheus.monitoring.svc:9090
            - --history-length=8d
            - --history-resolution=1h
            - --prometheus-query-timeout=5m
            - --prometheus-cadvisor-job-name=kubernetes-cadvisor
            - --history-cpu-metric=container_cpu_usage_seconds_total
            - --history-memory-metric=container_memory_working_set_bytes
            - --container-namespace-label=namespace
            - --container-pod-name-label=pod_name
            - --container-name-label=name
            - '--metric-for-pod-labels=up{job="kubernetes-pods"}[8d]'
            - --pod-namespace-label=kubernetes_namespace
            - --pod-name-label=kubernetes_pod_name
            - --pod-label-prefix=pod_label_
```

The history length, resolution, timeout, cAdvisor metrics, job, and identity-label values shown match current upstream defaults. The example deliberately differs in two places: it includes the actual Prometheus Service port, and it adds `[8d]` to the Pod-label expression. Upstream's address default is `http://prometheus.monitoring.svc`, while its Pod-label default is the plain selector `up{job="kubernetes-pods"}`. Current source requires the latter query to return a range matrix, so the documented plain-selector default is not sufficient. Set the address to the real Service port and the range to the history your retention can serve.

Do not assume the identity-label defaults match a modern Prometheus stack. Many installations expose cAdvisor identity as `namespace`, `pod`, and `container`; in that case set `--container-pod-name-label=pod` and `--container-name-label=container`. Configure what the stored series actually contain.

## Validate the Queries VPA Builds

The current history provider constructs CPU history as a rate over the configured resolution and reads memory as a gauge. With the defaults, the effective shapes are:

```promql
rate(container_cpu_usage_seconds_total{
  job="kubernetes-cadvisor",
  pod_name=~".+",
  name!="POD",
  name!=""
}[1h])
```

```promql
container_memory_working_set_bytes{
  job="kubernetes-cadvisor",
  pod_name=~".+",
  name!="POD",
  name!=""
}
```

CPU values must represent cores after `rate`; memory values must be bytes. Each returned series must carry the configured container namespace, Pod name, and container name labels. VPA excludes the synthetic `POD` cgroup.

Run the queries in Prometheus across the intended history range and confirm that terminated as well as current Pods still have samples. Retention shorter than `--history-length` silently limits useful history. The provider runs the raw memory gauge as a range query at the configured step; it does not wrap it in `max_over_time`, so a coarse `--history-resolution` can miss peaks between returned points, while an overly fine resolution can make startup queries expensive.

## Preserve Pod Labels Needed for Workload Matching

Usage series identify old Pods, but VPA also needs their workload-selection labels so it can associate history with a current VPA target. The metric named by `--metric-for-pod-labels` must expose:

- Pod namespace under `--pod-namespace-label`;
- Pod name under `--pod-name-label`; and
- Pod labels with the prefix configured by `--pod-label-prefix`.

The defaults assume a relabeled Pod scrape such as `up{job="kubernetes-pods"}` with labels like `kubernetes_namespace`, `kubernetes_pod_name`, and `pod_label_app`. A kube-state-metrics installation may instead use `kube_pod_labels` with `namespace`, `pod`, and `label_app`; configure all four flags together.

```yaml
- '--metric-for-pod-labels=kube_pod_labels[8d]'
- --pod-namespace-label=namespace
- --pod-name-label=pod
- --pod-label-prefix=label_
```

The range selector is required by the current implementation: `readLastLabels` issues an instant Prometheus query, type-asserts the result to a matrix, and does not append `--history-length` itself. A plain instant-vector selector such as `kube_pod_labels` fails with `expected query to return a matrix`. Keep `[8d]` aligned with the configured history length and available retention, or deliberately choose a shorter range when that is all Prometheus can serve.

Test several historical Pods and verify that the stable labels used by the Deployment, StatefulSet, Job, or CronJob selector are present. Missing identity labels can make the whole history query fail; missing workload labels can leave samples unable to match the target.

## Use Authentication Without Baking Secrets into Arguments

The recommender supports basic authentication through `--username` and `--password` or `PROMETHEUS_USERNAME` and `PROMETHEUS_PASSWORD`. It also supports `--prometheus-bearer-token` and `--prometheus-bearer-token-file`. Prefer a mounted token file or Secret-backed environment values over plaintext command-line arguments.

For HTTPS, keep certificate verification enabled. `--prometheus-insecure=true` skips TLS verification and should be limited to controlled diagnosis, not treated as a normal fix.

## Restart and Verify Initialization

Changing history flags requires a recommender restart because history is loaded during initialization:

```bash
kubectl -n kube-system rollout restart deploy/vpa-recommender
kubectl -n kube-system rollout status deploy/vpa-recommender
kubectl -n kube-system logs deploy/vpa-recommender --since=10m
```

At verbosity 4, look for `Initializing VPA from history provider`, the logged historical CPU and memory queries, and errors about Prometheus responses or labels. Monitor:

- `vpa_recommender_prometheus_client_api_requests_count` by code and method;
- `vpa_recommender_prometheus_client_api_requests_duration_seconds_bucket`, `_sum`, and `_count`; and
- the recommendation, plus `FetchingHistory` only if the deployed recommender implementation actually emits that optional condition.

```bash
kubectl get vpa -A
kubectl -n apps get vpa api -o yaml
```

Do not delete a working checkpoint design casually. Current source sets checkpoint use off when storage is Prometheus, so this is an alternative startup store, not an additional fallback layer.

## Pin a Release with the Fixes You Need

Use a released VPA image and its matching flag documentation. VPA 1.7.1 fixed a regression where custom `--history-cpu-metric` and `--history-memory-metric` names were ignored in Prometheus historical queries, and also fixed checkpoint loading behavior. If custom metric names matter, verify the deployed patch release rather than validating only the master documentation.

## Official Documentation

- [VPA FAQ: Prometheus as history provider](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/faq.md#how-can-i-use-prometheus-as-a-history-provider-for-the-vpa-recommender)
- [VPA recommender history flags](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/flags.md#what-are-the-parameters-to-vpa-recommender)
- [VPA Prometheus history provider source and query construction](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/recommender/input/history/history_provider.go)
- [VPA recommender metric definitions](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/utils/metrics/recommender/recommender.go)
- [VPA components and checkpoint behavior](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/components.md)
- [VPA 1.7.1 release notes](https://github.com/kubernetes/autoscaler/releases/tag/vertical-pod-autoscaler-1.7.1)
- [Kubernetes resource metrics pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)

## Conclusion

Prometheus seeding succeeds only when old usage and old Pod labels remain joinable. Match the real metric and label schema, choose a query range your retention can serve, secure access, restart the recommender, and prove history initialization in logs and metrics. Keep in mind that Prometheus supplies startup history while Metrics Server supplies fresh samples.

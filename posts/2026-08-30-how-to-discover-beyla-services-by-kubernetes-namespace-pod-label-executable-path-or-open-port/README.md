# How to Discover Beyla Services with Kubernetes and Process Filters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, eBPF, Kubernetes, Service Discovery

Description: Build precise Grafana Beyla discovery rules with Kubernetes metadata, executable globs, and listening ports while understanding AND and OR matching.

---

Beyla can instrument one process or a group of related processes selected by `BEYLA_OPEN_PORT` or `BEYLA_AUTO_TARGET_EXE`, but a node usually hosts many unrelated workloads. The YAML `discovery.instrument` list is the safer production interface: it supports multiple selectors, Kubernetes metadata, exclusions, and signal-specific export choices.

The most important rule is simple:

- Selector fields inside one list entry are combined with **AND**.
- A process is selected if it matches any list entry (**OR**).

Misunderstanding that rule either instruments nothing or instruments far more than intended.

## Select by namespace and Pod label

Enable Kubernetes metadata and grant Beyla's ServiceAccount the documented `list` and `watch` access to Pods, Services, Nodes, and ReplicaSets. Then combine a namespace with a label in one entry:

```yaml
attributes:
  kubernetes:
    enable: true

discovery:
  instrument:
    - k8s_namespace: "production"
      k8s_pod_labels:
        observability.example.com/beyla: "enabled"
```

This instruments only processes in Pods that satisfy both conditions. The namespace and label values use glob matching, so a rule can cover a namespace family:

```yaml
discovery:
  instrument:
    - k8s_namespace: "payments-*"
      k8s_pod_labels:
        app.kubernetes.io/component: "api-*"
```

The label key is literal; the label value is a glob. Use a dedicated opt-in label when possible. It makes the instrumentation boundary visible in the workload manifest and avoids relying on generated Pod names.

## Select by executable path

Outside Kubernetes, or when metadata is insufficient, match the full executable command path:

```yaml
discovery:
  instrument:
    - exe_path: "/opt/company/bin/checkout-*"
    - exe_path: "*/java"
      cmd_args: "*checkout-service.jar*"
```

These are two OR alternatives. The second entry uses AND: both the Java executable and its command arguments must match. A broad pattern such as `*java*` can attach to every JVM on a node, including build tools and observability services, so add arguments or Kubernetes metadata to narrow it.

For container-only process discovery, add `containers_only: true`. This is useful on nodes that also run host services. Beyla ignores this option if it lacks permission to inspect process network namespaces:

```yaml
discovery:
  instrument:
    - exe_path: "*/checkout"
      containers_only: true
```

## Select by listening port

`open_ports` accepts comma-separated ports and inclusive ranges:

```yaml
discovery:
  instrument:
    - open_ports: "8080,8443,9000-9099"
```

If a process listens on any listed port, the process matches. Once selected, Beyla instruments supported traffic for that executable; `open_ports` does not restrict telemetry to only the matching socket. This distinction matters for a process that serves an admin API and a public API on different ports.

Combine a port with another field when the port is common:

```yaml
discovery:
  instrument:
    - open_ports: "8080"
      exe_path: "*/checkout"
```

In Kubernetes, internal container ports and process identities are usually more reliable than host-published ports. Namespace, owner, and label selectors also survive replica replacement better than generated Pod names.

## Combine strategies deliberately

This example instruments two independently selected service groups and, when the corresponding exporters are configured, exports different signals:

```yaml
attributes:
  kubernetes:
    enable: true

discovery:
  instrument:
    - k8s_namespace: "production"
      k8s_pod_labels:
        app.kubernetes.io/part-of: "store"
      exports: ["metrics", "traces"]

    - exe_path: "/opt/legacy/bin/order-api"
      open_ports: "8080"
      exports: ["metrics"]

  exclude_instrument:
    - k8s_namespace: "production"
      k8s_pod_labels:
        observability.example.com/beyla: "disabled"
```

If a process matches more than one inclusion entry, the later matching entry overrides earlier `exports` settings. The exclusion list uses the same selector format and wins over inclusion. It is additive to Beyla's default exclusions for Beyla, Alloy, OpenTelemetry Collector executables, and several observability or system namespaces.

## Preview discovery with survey mode

When the selection boundary is uncertain, use `discovery.survey` instead of `instrument`. Survey mode discovers matching processes and emits `survey_info` through the Prometheus exporter without attaching instrumentation:

```yaml
discovery:
  survey:
    - k8s_namespace: "production"
      k8s_pod_labels:
        observability.example.com/beyla: "enabled"

prometheus_export:
  port: 8999
```

Scrape the endpoint and inspect the discovered targets. After reviewing it, move the same entries under `instrument`. This is especially useful before deploying a DaemonSet across a large cluster.

## Verify what actually matched

Enable debug logging temporarily and inspect Beyla's logs while starting one known target:

```bash
kubectl -n observability logs daemonset/beyla --all-pods=true --since=10m | \
  grep -Ei 'discover|instrument|checkout'
```

Then send traffic and query `target_info` or the relevant RED metric grouped by service and per-process instance. When scraping Beyla's Prometheus endpoint directly, configure the scraper with `honor_labels: true`; otherwise Prometheus replaces Beyla's `instance` label with the scrape target. Check every OR branch independently, including the exclusion path. Avoid validating only one replica: metadata availability and process paths can differ across nodes.

## Conclusion

Use one `instrument` entry for conditions that must all match and separate entries for alternatives. Prefer stable Kubernetes labels and owners, add executable or port constraints where they reduce ambiguity, and preview broad rules with survey mode. Precise discovery improves safety, cost, and the signal-to-noise ratio of every downstream metric and trace.

## Official Documentation

- [Configure Beyla service discovery](https://grafana.com/docs/beyla/latest/configure/service-discovery/)
- [Beyla and Kubernetes quickstart](https://grafana.com/docs/beyla/latest/quickstart/kubernetes/)
- [Deploy Beyla in Kubernetes](https://grafana.com/docs/beyla/latest/setup/kubernetes/)
- [Configure Beyla metrics and trace attributes](https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/)

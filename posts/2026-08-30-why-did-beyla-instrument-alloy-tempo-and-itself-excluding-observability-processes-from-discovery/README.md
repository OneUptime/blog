# Why Did Beyla Instrument Alloy, Tempo, and Itself? Excluding Observability Processes from Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, eBPF, Grafana Alloy, Grafana Tempo, OpenTelemetry, Service Discovery

Description: Stop Grafana Beyla from instrumenting telemetry infrastructure by understanding default exclusions and adding precise process or Kubernetes metadata rules.

---

A cluster-wide Beyla rule such as `open_ports: "1-65535"` or `k8s_namespace: "*"` can discover the observability stack along with business services. The result is confusing: Alloy appears as an application, Tempo receives spans about its own ingestion requests, and Beyla may appear to observe itself.

Current Beyla releases include default exclusions, so seeing these processes usually points to one of three causes:

1. the deployment replaced or emptied `default_exclude_instrument`;
2. the process is not covered by a built-in executable or namespace pattern;
3. a custom path, image, wrapper executable, or namespace no longer matches the default.

The fix is to retain the built-ins and add explicit exclusions for the local topology.

## Know what Beyla excludes by default

The default executable patterns cover Beyla/OBI, Grafana Alloy, OpenTelemetry Collector variants, and related helpers. Default Kubernetes exclusions also cover namespaces such as `monitoring`, `grafana-alloy`, `kube-system`, `cert-manager`, and several managed-platform system namespaces.

Tempo is not universally excluded by executable name. It is often protected indirectly because it runs in `monitoring`, but a Tempo Pod in `observability` or a custom namespace can still match a broad inclusion rule.

Do not set `default_exclude_instrument: []` merely to make one application visible. That removes the whole safety net. If an application lives in a default-excluded namespace, move it to an application namespace or define a narrowly reviewed custom default list.

## Add exclusions that match your deployment

Keep broad alternatives in separate entries so they are OR conditions:

```yaml
attributes:
  kubernetes:
    enable: true

discovery:
  instrument:
    - k8s_namespace: "production-*"
    - k8s_namespace: "shared-services"

  exclude_instrument:
    - k8s_namespace: "observability"
    - k8s_pod_labels:
        app.kubernetes.io/part-of: "observability"
    - exe_path: "*/tempo"
    - exe_path: "*/prometheus"
```

User-defined `exclude_instrument` entries are combined with the default exclusions. There is no need to repeat `*/beyla`, `*/alloy`, or `*/otelcol` unless a wrapper changes the executable path so the built-in glob no longer matches.

Fields within one entry are AND conditions. Use that when a namespace contains both applications and infrastructure:

```yaml
discovery:
  exclude_instrument:
    - k8s_namespace: "shared-services"
      k8s_pod_labels:
        observability.example.com/component: "collector-*"
```

This excludes only matching collector Pods in `shared-services`, not the entire namespace.

## Prefer metadata over generated Pod names

Pod names change during rollouts. An exclusion like `k8s_pod_name: "tempo-0"` misses a horizontally scaled or renamed deployment. Prefer, in order:

- a dedicated Pod label owned by the platform team;
- `k8s_deployment_name`, `k8s_statefulset_name`, or `k8s_daemonset_name`;
- a namespace boundary;
- an executable path as a defense for non-Kubernetes or mislabeled processes.

For example:

```yaml
discovery:
  exclude_instrument:
    - k8s_namespace: "observability"
      k8s_statefulset_name: "tempo-*"
    - k8s_namespace: "observability"
      k8s_daemonset_name: "alloy-*"
```

Two entries are necessary because no Pod can normally belong to both the StatefulSet and the DaemonSet.

## Check for an accidental override

Inspect the effective ConfigMap and container arguments:

```bash
kubectl -n observability get configmap beyla-config -o yaml
kubectl -n observability get daemonset beyla \
  -o jsonpath='{.spec.template.spec.containers[0].args}'
```

Look specifically for an empty or customized `default_exclude_instrument`. Also verify that `BEYLA_CONFIG_PATH` points to the mounted file you edited. A correct ConfigMap that is never loaded changes nothing.

Restart the DaemonSet only after the configuration is known to be mounted:

```bash
kubectl -n observability rollout restart daemonset/beyla
kubectl -n observability rollout status daemonset/beyla
```

## Validate from both sides

First inspect Beyla's discovery logs:

```bash
kubectl -n observability logs daemonset/beyla --since=10m | \
  grep -Ei 'tempo|alloy|beyla|instrument|exclude'
```

Then query telemetry for the unwanted service identities. Allow enough time for old Prometheus series and Tempo traces to age out; historical data remains after discovery stops. New requests to Tempo or Alloy should no longer create new Beyla application spans or RED samples.

If the process still appears, confirm the real executable path from its host PID namespace rather than guessing from the container image name. Containers often start through a shell, init wrapper, or renamed binary.

## Avoid filtering only downstream

A Collector filter can drop unwanted spans and Prometheus relabeling can drop unwanted series, but Beyla still discovers, attaches to, and processes those services. Source-side exclusions reduce overhead and eliminate feedback loops earlier. Downstream filtering remains useful as a second guard, not as the primary discovery boundary.

## Conclusion

Beyla already protects common observability components with default exclusions. Preserve that list, add topology-specific exclusions for Tempo and custom wrappers, and express unrelated exclusions as separate OR entries. Stable labels, owners, and namespaces make the policy survive rollouts, while source-side exclusion prevents both noisy telemetry and unnecessary instrumentation work.

## Official Documentation

- [Configure Beyla service discovery](https://grafana.com/docs/beyla/latest/configure/service-discovery/)
- [Beyla and Kubernetes quickstart](https://grafana.com/docs/beyla/latest/quickstart/kubernetes/)
- [Grafana Alloy `beyla.ebpf` discovery reference](https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/#discovery)
- [Kubernetes recommended labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)

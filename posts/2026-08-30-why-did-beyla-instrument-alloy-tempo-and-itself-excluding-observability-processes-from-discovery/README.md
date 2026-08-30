# How to Exclude Alloy, Tempo, and Beyla from Beyla Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, eBPF, Grafana Alloy, Grafana Tempo, OpenTelemetry, Service Discovery

Description: Stop Grafana Beyla from instrumenting telemetry infrastructure by understanding default exclusions and adding precise process or Kubernetes metadata rules.

---

A cluster-wide Beyla rule such as `open_ports: "1-65535"` or `k8s_namespace: "*"` can discover the observability stack along with business services. The result is confusing: Alloy appears as an application, Tempo receives spans about its own ingestion requests, and Beyla may appear to observe itself.

Current Beyla releases include default exclusions, so seeing these processes usually points to one of three causes:

1. the deployment replaced or emptied `default_exclude_instrument`;
2. the process is not covered by a built-in executable, Kubernetes container-name, or namespace pattern;
3. a renamed or multi-call executable, custom container name, or namespace no longer matches the defaults.

The fix is to retain the built-ins and add explicit exclusions for the local topology.

## Know what Beyla excludes by default

The default executable patterns cover Beyla/OBI, Grafana Alloy, standard `otelcol` and `otelcol-contrib` OpenTelemetry Collector names, and related helpers. In Kubernetes, exact default container-name matches provide another guard for these components. Default Kubernetes exclusions also cover namespaces such as `monitoring`, `grafana-alloy`, `kube-system`, `cert-manager`, and several managed-platform system namespaces.

Tempo is not excluded by a default executable or container-name pattern. It is often protected indirectly because it runs in `monitoring`, but a Tempo Pod in `observability` or a custom namespace can still match a broad inclusion rule.

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

User-defined `exclude_instrument` entries are combined with the default exclusions. There is no need to repeat the built-in `*beyla`, `*alloy`, or `*otelcol` patterns. If a renamed or multi-call executable avoids those suffix globs and its Kubernetes container name and namespace are also nonstandard, exclude the actual executable path or stable Kubernetes metadata.

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

Deployment Pod names commonly change during rollouts. A rule for one StatefulSet Pod such as `k8s_pod_name: "tempo-0"` also misses `tempo-1` and other replicas. Prefer, in order:

- a dedicated Pod label owned by the platform team;
- `k8s_deployment_name`, `k8s_statefulset_name`, or `k8s_daemonset_name`;
- a namespace boundary;
- an executable path as a defense for non-Kubernetes or mislabeled processes.

For example:

```yaml
discovery:
  exclude_instrument:
    - k8s_namespace: "observability"
      k8s_statefulset_name: "{tempo,tempo-*}"
    - k8s_namespace: "observability"
      k8s_daemonset_name: "{alloy,alloy-*}"
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
kubectl -n observability logs daemonset/beyla --all-pods=true --since=10m | \
  grep -Ei 'tempo|alloy|beyla|instrument|exclude'
```

Then query telemetry for the unwanted service identities with a time range that starts after the rollout. Prometheus marks a series stale after successful scrapes stop returning it, while previously stored samples remain until retention; existing Tempo traces remain queryable until trace retention expires. New requests to Tempo or Alloy should no longer create server-side Beyla spans or RED metric updates attributed to the excluded service, although an instrumented client can still emit a client span for a call to it.

If the process still appears, confirm the service PID's executable path from its host PID namespace rather than guessing from the container image or entrypoint. A shell or init process may launch the service, and the binary itself may have been renamed.

## Avoid filtering only downstream

A Collector filter can drop unwanted spans and Prometheus relabeling can drop unwanted series, but Beyla still discovers, attaches to, and processes those services. Source-side exclusions reduce overhead and eliminate feedback loops earlier. Downstream filtering remains useful as a second guard, not as the primary discovery boundary.

## Conclusion

Beyla already protects common observability components with default exclusions. Preserve that list, add topology-specific exclusions for Tempo and nonstandard executable names, and express unrelated exclusions as separate OR entries. Stable labels, owners, and namespaces make the policy survive rollouts, while source-side exclusion prevents both noisy telemetry and unnecessary instrumentation work.

## Official Documentation

- [Configure Beyla service discovery](https://grafana.com/docs/beyla/latest/configure/service-discovery/)
- [Beyla and Kubernetes quickstart](https://grafana.com/docs/beyla/latest/quickstart/kubernetes/)
- [Grafana Alloy `beyla.ebpf` discovery reference](https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/#discovery)
- [Kubernetes recommended labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)

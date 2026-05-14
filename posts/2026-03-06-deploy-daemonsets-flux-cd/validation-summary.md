# Validation Summary: How to Deploy DaemonSets with Flux CD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Flux CD Kustomization and HelmRelease
- Kubernetes DaemonSet, ServiceAccount, RBAC, Namespace, Service, tolerations, nodeSelector, and update strategies
- Prometheus node-exporter
- Fluent Bit log collection on Kubernetes
- Datadog Agent Helm chart
- PrometheusRule and kube-state-metrics DaemonSet metrics

## Sources Consulted
- Kubernetes DaemonSet rolling update documentation: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- Kubernetes DaemonSet API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/
- Kubernetes container runtime documentation and dockershim removal notes: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Fluent Bit Kubernetes documentation for version 2.2: https://docs.fluentbit.io/manual/2.2/installation/kubernetes
- Datadog official Helm chart repository and values: https://helm.datadoghq.com/ and https://github.com/DataDog/helm-charts/blob/main/charts/datadog/values.yaml
- kube-state-metrics DaemonSet metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/daemonset-metrics.md

## Issues Found
- The Flux `Kustomization` example set `wait: true` while also listing explicit `healthChecks`. Flux documents that `spec.healthChecks` is ignored when `spec.wait` is true, so I removed `wait: true` to make the listed DaemonSet health checks effective.
- The Fluent Bit example used the Docker log parser and mounted `/var/lib/docker/containers`, which is outdated for a Kubernetes v1.26+ prerequisite because dockershim was removed in Kubernetes v1.24. I changed the example to use Fluent Bit's CRI parser, removed the Docker container log mount, and kept log collection under `/var/log/containers/*.log`.
- The Fluent Bit tail database was configured under `/var/log` while that host path was mounted read-only. I moved the DB path to `/fluent-bit/tail/flb_kube.db` and added a writable `emptyDir` mount for position tracking.

## Review Notes
- The edited Markdown YAML examples were parsed successfully with PyYAML. `kubeconform`/`kubeval` was not installed in the local environment, so schema validation was done against official documentation rather than a local schema validator.
- The node-exporter, Datadog HelmRelease, DaemonSet update strategy, toleration, node selector, RBAC, and kube-state-metrics alert examples are technically consistent with the consulted documentation.

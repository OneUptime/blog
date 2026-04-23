# Validation Summary: How to Optimize Rancher Server Performance - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE2
- K3s
- etcd
- Kubernetes
- Helm
- Metrics Server
- Prometheus/Grafana

## Sources Consulted
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Tuning and Best Practices for Rancher at Scale: https://ranchermanager.docs.rancher.com/v2.12/reference-guides/best-practices/rancher-server/tuning-and-best-practices-for-rancher-at-scale
- Enabling the API Audit Log to Record System Events: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-api-audit-log
- Tuning etcd for Large Installations: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/tune-etcd-for-large-installs
- Setting up a High-availability RKE2 Kubernetes Cluster for Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-cluster-setup/rke2-for-rancher
- Server Configuration Reference (RKE2): https://docs.rke2.io/reference/server_config
- Cluster Datastore (K3s): https://docs.k3s.io/datastore
- Rancher Agents: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/about-rancher-agents
- Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- etcd maintenance guide: https://etcd.io/docs/v3.5/op-guide/maintenance/
- etcd system limits: https://etcd.io/docs/v3.6/dev-guide/limit/

## Issues Found
- The original Helm values used `JAVA_OPTS` and described Rancher/Norman as a JVM service. Rancher Manager is not tuned via JVM heap flags in current Rancher documentation, so that unsupported guidance was removed.
- The original RKE2 config used an invalid nested `etcd:` structure with `snapshotScheduleCron`, `snapshotRetention`, and `extraArgs`. This was replaced with documented RKE2 keys: `etcd-snapshot-schedule-cron`, `etcd-snapshot-retention`, and `etcd-arg`.
- The original etcd tuning block included several generic etcd flags that were not documented by Rancher as the recommended large-install tuning path. The example was narrowed to the documented keyspace and compaction settings.
- The original “external database” section used unsupported Rancher Helm values (`externalTLS` and `databaseURL`). This was corrected to show the actual K3s external datastore configuration path and to note that RKE2 HA uses embedded etcd.
- The original “Tune Rancher API Server” command did not configure API rate limiting and instead set unrelated environment variables. It was replaced with the documented `CATTLE_SYNC_ONLY_CHANGED_OBJECTS` tuning for reducing cache-resync handler work.
- The original monitoring section treated `rancher-audit-log` as a Deployment. Rancher creates `rancher-audit-log` as a sidecar container in the Rancher pod, so the log commands were corrected to target the container in the Rancher pod.
- The original audit log parsing command used `.responseStatus.code`, which does not match the current Rancher audit log field shape. It was updated to use `responseCode` with the current JSON structure.
- The original cluster-agent example patched a Deployment directly and used an incorrect container name. It was replaced with Rancher’s documented `spec.clusterAgentDeploymentCustomization.overrideResourceRequirements` configuration and Rancher’s published baseline requests.
- The original audit logging values used outdated level semantics and the wrong key name `maxBackups`. The section was aligned to the current Rancher chart options and current audit-level behavior, and the example was simplified to the `sidecar` destination that matches the monitoring commands used earlier in the post.
- The original prerequisites claimed `v2.7+`, but the audit log semantics in archived Rancher v2.9 documentation differ from current releases. The post was narrowed to `v2.12+` so the examples are version-consistent.

## Review Notes
- The HPA example is syntactically valid for `autoscaling/v2`, but the target percentages are still workload-specific and should be tuned from real metrics.
- `kubectl top` requires Metrics Server; Prometheus/Grafana alone is not sufficient for that command.
- etcd defragmentation blocks the member being defragmented while it rebuilds state, so it should be performed one member at a time.

# Validation Summary: How to Monitor Rancher HA Cluster Health - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE2
- etcd
- Prometheus
- Prometheus Operator / `PrometheusRule`
- Grafana
- Kubernetes / kube-state-metrics
- Bash

## Sources Consulted
- Rancher Monitoring and Alerting: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/monitoring-and-alerting
- Rancher Enable Monitoring: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher HA install background: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/kubernetes-cluster-setup/high-availability-installs
- Rancher load balancer health checks (`/ping` and `/healthz`): https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/infrastructure-setup/amazon-elb-load-balancer
- Rancher disconnected-cluster guidance: https://ranchermanager.docs.rancher.com/v2.11/reference-guides/best-practices/rancher-managed-clusters/disconnected-clusters
- Rancher cluster connectivity controller source (`Connected` condition): https://raw.githubusercontent.com/rancher/rancher/v2.9.3/pkg/controllers/management/clusterconnected/clusterconnected.go
- RKE2 High Availability: https://docs.rke2.io/install/ha
- RKE2 Embedded datastore / etcd quorum: https://docs.rke2.io/datastore/embedded
- etcd cluster status checks: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- etcd metrics reference: https://etcd.io/docs/v3.6/metrics/
- etcd maintenance and quota metrics: https://etcd.io/docs/v3.3/op-guide/maintenance/
- kube-state-metrics deployment metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- kube-state-metrics pod metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Upstream kube-prometheus-stack etcd alert rules: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/templates/prometheus/rules-1.14/etcd.yaml
- Grafana dashboard import docs: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/

## Issues Found
- The description, introduction, and conclusion claimed the post covered RKE2 API server monitoring, but the post had no API server monitoring section. I removed those claims so the scope matches the content.
- The `EtcdMembersDown` alert expression was checking leader presence instead of member availability. I replaced it with a member-down expression that matches upstream etcd alert semantics.
- The `EtcdHighNumberOfLeaderChanges` alert used `rate(etcd_server_leader_changes_seen_total[15m]) > 3`, which is the wrong unit for this counter and would require an unrealistically high per-second leader change rate. I changed it to an `increase(...[15m:1m]) >= 4` style expression based on upstream rules.
- The `EtcdGRPCRequestsSlow` alert did not aggregate histogram buckets correctly and was not scoped to etcd metrics. I updated it to use the upstream histogram aggregation pattern and scoped it to etcd jobs.
- The etcd quota alert was left as an 80% warning, but I added explicit etcd metric scoping and `last_over_time(...)` to make the expression more stable.
- The `RancherOOMKilled` alert would have fired for any container in `cattle-system`, not just Rancher, and could stay firing indefinitely after an old OOM event because `kube_pod_container_status_last_terminated_reason` reports the last termination reason. I scoped it to the Rancher container and required a recent restart before alerting.
- The managed-cluster connectivity section used `rancher_cluster_ready`, which is not a documented built-in Rancher Monitoring metric. I replaced that section with a connectivity check against Rancher’s `management.cattle.io/v3` `Cluster` objects and their `Connected` condition, which is how Rancher tracks downstream cluster connectivity.
- The Grafana section said dashboard JSON was available at the Grafana dashboard library root URL. That URL is a dashboard catalog, not a direct JSON payload. I corrected the wording.
- The external `/ping` health check was described as validating `LB -> Rancher -> etcd`. Rancher documents `/ping` and `/healthz` as load-balancer / Rancher pod health-check paths; they do not directly validate etcd. I corrected the comment.
- The recovery runbook only checked the local etcd endpoint and then compared the result to a fixed threshold of `2`, which could not correctly validate cluster-wide quorum. I rewrote it to use `etcdctl --cluster endpoint health`, count total members, compute quorum dynamically, and compare healthy members against that quorum.
- The recovery runbook also assumed `readyReplicas` was always present; when it is empty, shell numeric comparisons can fail. I normalized an empty value to `0`.

## Review Notes
- `kube_pod_container_status_last_terminated_reason` is marked EXPERIMENTAL in kube-state-metrics. The revised alert is technically valid, but environments that disable experimental kube-state-metrics series may need to alert from events or logs instead.
- A purely Prometheus-based managed-cluster connectivity alert would require additional federation or custom metric export. The corrected post now uses the Rancher management API objects directly because that is the authoritative connectivity source.
- Some suggested dashboard panels, such as load balancer connection counts, remain environment-specific and may require cloud-provider or load-balancer-specific exporters.

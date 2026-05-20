# Validation Summary: How to Tune ArgoCD Controller for Large Application Counts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD application controller
- Kubernetes
- GitOps
- Prometheus metrics
- Server-Side Apply

## Sources Consulted
- Argo CD High Availability / Scaling Up documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD application controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-options/
- Argo CD FAQ on reconciliation polling interval: https://argo-cd.readthedocs.io/en/latest/faq/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/

## Issues Found
- The post stated that `--status-processors` defaults to 10. Current Argo CD documentation lists the default as 20, so I updated the prose and YAML comments.
- The sharding section described sharding as distributing applications by a hash of application name. Current Argo CD documentation describes controller sharding as distributing clusters across controller replicas, with optional cluster shard values and documented sharding algorithms. I corrected the explanation and noted the current experimental status of `round-robin` and `consistent-hashing`.
- The reconciliation interval example stated a simple 180s default and used a bare numeric value. Current Argo CD documentation describes the current maximum default as 120s plus up to 60s jitter and shows duration strings, so I updated the comment and value to `300s`.
- The kubectl parallelism section stated that the default was 1 and that `--kubectl-parallelism-limit=20` applies 20 resources concurrently during a single sync. Current command documentation lists the default as 20 and defines the flag as the number of allowed concurrent kubectl fork/exec operations. I corrected the explanation.
- The server-side apply section showed `application.sync.serverSideApply: "true"` as a global `argocd-cm` setting. The official sync options documentation describes `ServerSideApply=true` as an Application or resource-level sync option, so I removed the unsupported global ConfigMap example and kept the per-application example.
- The metrics examples used `argocd_app_reconcile_pending` and `argocd_app_reconcile_duration_seconds_bucket`. Argo CD documents `argocd_app_reconcile` as the reconciliation histogram, which appears in Prometheus as `argocd_app_reconcile_bucket`, and controller workqueue metrics expose reconciliation and operation queue depth. I updated the PromQL examples accordingly.

## Review Notes
The sizing table remains a practical starting point rather than an officially guaranteed capacity model. Actual values should be validated with workload-specific metrics, especially repo-server latency, Kubernetes API server latency, and controller memory use.

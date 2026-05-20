# Validation Summary: How to Handle ArgoCD During Capacity Planning

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Prometheus and PromQL
- Redis
- Helm and Kustomize manifest generation

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD argocd-cm ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cm-yaml/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD annotations and labels reference: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Prometheus query function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Argo CD upstream HA install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml
- Argo CD upstream standard install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

## Issues Found
- The resource-inspection `jq` command only read `spec.containers[0]`, which misses sidecars and additional containers such as Redis HA Sentinel. Updated it to iterate over every container in each pod.
- The resource consumption diagram described cluster scaling as API server connections, which could be confused with the Argo CD API server component. Changed it to Kubernetes API connections.
- The Redis memory PromQL example used `redis_memory_used_bytes`, which is not an Argo CD-provided metric and depends on a separate Redis exporter. Replaced it with container memory usage for the Redis container.
- The controller sharding command set `controller.replicas` in `argocd-cmd-params-cm`, but Argo CD sharding requires the StatefulSet replica count to match `ARGOCD_CONTROLLER_REPLICAS`. Updated the command to set that environment variable and left `controller.sharding.algorithm` in the command parameters ConfigMap.
- The Redis memory command did not authenticate to Redis and used only the standard `argocd-redis` Deployment immediately after recommending Redis HA. Added authenticated commands for both the standard install and the HA `argocd-redis-ha-server-0` pod.
- The reconciliation interval section described the current default as a fixed 180 seconds. Current Argo CD documentation describes the default as 120 seconds plus up to 60 seconds of jitter, so the text and ConfigMap snippet were updated.
- The post claimed a per-application reconciliation interval could be set with `argocd.argoproj.io/refresh: "600"`. Argo CD documents this annotation as a one-time refresh marker with `normal` or `hard` values only. Replaced the example with `argocd.argoproj.io/manifest-generate-paths` and clarified that per-application intervals are not configured with `refresh`.

## Review Notes
The sizing values are approximate operational guidance rather than official Argo CD guarantees. They are plausible, but should be benchmarked in each environment because manifest size, repository layout, plugin use, cluster count, and Kubernetes API latency can dominate resource usage.

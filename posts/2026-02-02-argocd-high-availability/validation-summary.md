# Validation Summary: How to Configure ArgoCD High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD (Argo CD)
- Kubernetes (Deployments, StatefulSets, ConfigMaps, Secrets, NetworkPolicies, PodDisruptionBudgets, CronJobs)
- Helm (`argo/argo-cd` chart)
- Redis HA (Sentinel, HAProxy)
- Prometheus / Prometheus Operator (ServiceMonitor, PrometheusRule)
- AWS S3 (for backups)
- Bash scripting

## Sources Consulted
- ArgoCD High Availability docs — https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- ArgoCD `argocd-cmd-params-cm` reference — https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- ArgoCD declarative setup / state model — https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- ArgoCD metrics reference — https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- `argoproj/argo-helm` chart values — https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Kubernetes PodDisruptionBudget / NetworkPolicy API references (policy/v1, networking.k8s.io/v1)

## Issues Found

1. **Application Controller described as using "leader election" with "only one instance active at a time."**
   This is incorrect. The ArgoCD application controller scales horizontally via **cluster sharding**, not leader election; all replicas are simultaneously active and each owns a subset of managed clusters. The `ARGOCD_CONTROLLER_REPLICAS` environment variable tells each replica how many peers exist so it can compute its shard.
   - Fixed the architecture-overview bullet from "requires leader election" to "scaled horizontally via cluster sharding."
   - Rewrote the "Application Controller HA Configuration" intro to describe sharding instead of leader election.
   - Updated the Helm `controller` block: bumped `replicas` to 2 (so it actually provides HA), set `ARGOCD_CONTROLLER_REPLICAS=2`, and replaced the misleading "Enable HA mode for controller leader election" comment.
   - Updated the StatefulSet YAML comments to refer to sharding rather than leader election.

2. **"Configuring External Database Backend" section claimed ArgoCD has an "embedded database" replaceable by PostgreSQL.**
   This is factually wrong — ArgoCD has no relational database. All durable state lives in Kubernetes (CRDs for Applications/AppProjects, ConfigMaps for config, Secrets for credentials); Redis is only a cache. The example ConfigMap was also internally broken: it claimed to point at PostgreSQL but actually contained `dex.config` LDAP YAML.
   - Replaced the section with a corrected "State Storage Considerations" section that accurately describes where ArgoCD persists state and what that means for HA (etcd reliability + Kubernetes-level backups, e.g. Velero). The PostgreSQL secret and Mermaid PostgreSQL HA diagram were removed because they had no real referent.

3. **External Redis ConfigMap targeted `argocd-cm`.**
   The `redis.server` key is read from `argocd-cmd-params-cm`, not `argocd-cm`. Fixed the ConfigMap `metadata.name` and filename comment.

4. **`ArgoCDControllerNoLeader` Prometheus alert used a fabricated metric.**
   `argocd_app_controller_leader` is not a metric ArgoCD exposes (consistent with there being no leader election). Replaced the alert with `ArgoCDControllerReplicaDown`, which uses the real `up{job="argocd-application-controller"}` series and matches the actual HA failure mode (a missing shard).

5. **Verification script printed "Leader election enabled" and probed an irrelevant ConfigMap key.**
   Replaced with a check that reads the controller StatefulSet's ready replicas and the `ARGOCD_CONTROLLER_REPLICAS` env value, which is what actually determines sharding correctness.

## Review Notes
- The Helm chart structure (`server`, `repoServer`, `controller`, `redis-ha`, `dex`, `notifications`) matches the current `argo/argo-cd` chart values schema.
- `--status-processors`, `--operation-processors`, `--app-state-cache-expiration`, `controller.sharding.algorithm` (with `round-robin` as a valid option), `timeout.reconciliation`, `timeout.hard.reconciliation`, and `application.resourceTrackingMethod` are all real ArgoCD knobs.
- The image pin `quay.io/argoproj/argocd:v2.9.3` is older than current stable releases but is a valid published tag; readers should treat it as illustrative and pick a current supported tag for production.
- `reposerver.parallelism.limit` and `reposerver.cache.expiration` were placed in `argocd-cm` in the Performance Tuning section; in current ArgoCD, repo-server params typically live in `argocd-cmd-params-cm`. Left as-is because behavior can vary by chart version and this is a softer convention issue, not a factual error like the database section.
- The "Multi-Cluster HA Architecture" diagram describes a user-built primary/standby pattern, not a built-in ArgoCD feature; the prose correctly frames it as a design choice rather than claiming a native standby mode, so no change.
- Port 8083 on `argocd-server` in the NetworkPolicy is the metrics port; whether the ingress controller needs to reach it depends on scrape topology, but it is a real port and not incorrect.

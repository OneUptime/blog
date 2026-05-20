# Validation Summary: How to Test ArgoCD HA Configuration

## Status
validated

## Post Type
Tutorial / operational testing guide

## Technologies Covered
- Argo CD
- Kubernetes
- Redis Sentinel
- kubectl
- Argo CD CLI
- Bash
- PodDisruptionBudget

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD official HA install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/

## Issues Found
- The Redis failover script used the Sentinel master group name `mymaster`, but Argo CD's official HA manifests configure the Redis Sentinel master group as `argocd`. Changed the script to default `REDIS_MASTER_GROUP` to `argocd` while allowing override through the environment.
- The Redis failover script called `redis-cli` without authentication. Current Argo CD HA manifests configure Redis auth and expose it to the Redis containers as `AUTH`, so the script now runs `redis-cli -a "$AUTH" --no-auth-warning` inside the Redis and Sentinel containers.
- The Redis failover loop treated any non-empty Sentinel response as a successful failover, which could pass before the master changed. Updated it to compare the new master address with the pre-failure master address.
- The controller leader failover script did not fail if no standby controller existed or no new leader appeared. Added checks for at least two ready controller replicas and explicit failure when no new leader is elected within the timeout.
- The API server failure test did not report failure when the API remained unavailable for the full check window. Added an explicit failure condition.
- The API server and repo-server replacement checks used `kubectl wait` against a pod label, which can return without proving the replacement rollout completed. Changed these to `kubectl rollout status` for the relevant Deployment.
- The repo-server test claimed to trigger concurrent syncs while running only one sync. Adjusted the wording to match the command.
- The node drain preflight used `--dry-run=client`, which only performs client-side dry-run behavior. Changed it to `--dry-run=server` so the check is evaluated by the API server.

## Review Notes
- The embedded Bash snippets were syntax-checked with `bash -n`.
- The controller leader failover test only applies to Argo CD installations that have scaled `argocd-application-controller` beyond one replica. The official HA manifest currently ships one controller replica by default, and the Argo CD HA documentation describes scaling controller replicas with matching `ARGOCD_CONTROLLER_REPLICAS` configuration when sharding is needed.
- The PDB checks are useful for environments that add PDBs, but PDB availability depends on the installation method and local chart/manifests.

# Validation Summary: How to Upgrade Helm Charts in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Bitnami Redis Helm chart
- Redis CLI

## Sources Consulted
- Rancher Helm Charts and Apps documentation: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/helm-charts-in-rancher
- Rancher example showing `Edit/Upgrade` from Installed Apps: https://ranchermanager.docs.rancher.com/v2.11/integrations-in-rancher/istio/cpu-and-memory-allocations
- Helm `upgrade` command reference: https://v3.helm.sh/docs/helm/helm_upgrade/
- Helm `search repo` command reference: https://helm.sh/docs/v3/helm/helm_search_repo
- Helm `show` command reference: https://helm.sh/docs/helm/helm_show
- Helm `show values` command reference: https://helm.sh/docs/helm/helm_show_values/
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes `kubectl rollout status` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Bitnami Redis chart README: https://github.com/bitnami/charts/blob/main/bitnami/redis/README.md
- Bitnami Redis chart values: https://github.com/bitnami/charts/blob/main/bitnami/redis/values.yaml
- Helm Diff plugin documentation: https://github.com/databus23/helm-diff

## Issues Found
- The explanation of `helm upgrade --reuse-values` was inaccurate. I changed it to match Helm's documented behavior: it reuses the last release's values and merges any new `--set` or `-f` overrides.
- The monitoring example used `deployment/my-redis-master`, but the Bitnami Redis chart's replication architecture deploys Redis master and replicas as `StatefulSet` resources. I changed the command to `kubectl rollout status statefulset/my-redis-master -n default` and updated the related Rancher UI note.
- The events example used `kubectl get events --sort-by=.lastTimestamp`, which relies on an older event-listing pattern. I replaced it with the current `kubectl events -n default --for statefulset/my-redis-master`.
- The verification example used `redis-cli ping` without authentication. Bitnami Redis enables auth by default and generates a password when one is not provided, so I changed the example to `redis-cli -a YOUR_PASSWORD ping`.
- The "Canary Upgrade" subsection was mislabeled. The commands shown perform normal in-place upgrades in smaller steps, not a true canary rollout with partial traffic shifting, so I renamed it to "Incremental Upgrade".

## Review Notes
- The example chart version `19.0.0` is valid as a fixed example, but readers should always check the currently available chart versions before upgrading.
- Rancher navigation labels can vary slightly by release and context (`Apps` vs. `Apps & Marketplace`), but the documented Installed Apps and `Edit/Upgrade` workflow is technically correct.

# Validation Summary: How to Implement Kubernetes Descheduler

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes
- Kubernetes Descheduler
- Helm
- kubectl
- Kubernetes CronJob and Deployment manifests
- Descheduler policy configuration
- PodDisruptionBudget
- Prometheus metrics and ServiceMonitor

## Sources Consulted
- Kubernetes SIGs Descheduler README: https://github.com/kubernetes-sigs/descheduler
- Kubernetes SIGs Descheduler v0.36.0 documentation and source: https://github.com/kubernetes-sigs/descheduler/tree/v0.36.0
- Kubernetes SIGs Descheduler Helm chart README: https://github.com/kubernetes-sigs/descheduler/tree/master/charts/descheduler
- Kubernetes SIGs Descheduler CLI reference: https://github.com/kubernetes-sigs/descheduler/blob/v0.36.0/docs/cli/descheduler.md
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/

## Issues Found
- The direct manifest installation cloned the descheduler repository without pinning a release. Added `git checkout v0.36.0` so the manifests match a stable published release instead of the development branch.
- The `PodLifeTime` example used `podStatusPhases`, which is not a current v0.36.0 argument. Changed it to `states`, which supports pod phases such as `Running`.
- The namespace filtering example combined `include` and `exclude` under `evictableNamespaces`. Descheduler namespace filters do not allow both at the same time, so the example now uses only `exclude`.
- The `DefaultEvictor` example used deprecated fields: `evictSystemCriticalPods`, `evictLocalStoragePods`, `evictDaemonSetPods`, and `ignorePvcPods`. Replaced the PVC behavior with current `podProtections.extraEnabled`.
- The node filtering example placed `nodeSelector` under `LowNodeUtilization`, where it is not a valid argument. Moved it to the top-level policy field used with `DefaultEvictor.nodeFit`.
- The deployment examples used the older image tag `v0.30.1`. Updated them to `v0.36.0`.
- The Prometheus examples used the deprecated eviction counter `descheduler_pods_evicted`. Updated the metric and queries to `descheduler_pods_evicted_total`.
- The dry-run command referenced `/policy-dir/policy.yaml` without mounting that file into the pod. Replaced it with the Helm chart's documented `cmdOptions.dry-run=true` setting.

## Review Notes
- The post now targets descheduler v0.36.0. Future updates should re-check release-specific docs because the descheduler project explicitly documents behavior by release branch.
- Descheduler policy files are configuration consumed by the descheduler binary, not Kubernetes API resources applied directly as CRDs.

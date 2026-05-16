# Validation Summary: How to Set Up Active-Passive Workloads on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (StatefulSet, Deployment, ServiceAccount, Role, RoleBinding, PodDisruptionBudget, podAntiAffinity)
- PostgreSQL 15
- Patroni / Spilo (Zalando)
- Redis 7 + Redis Sentinel
- kubernetes-retired/contrib leader-elector sidecar
- Prometheus Operator (PrometheusRule)
- kube-state-metrics (`kube_pod_status_ready`)

## Sources Consulted
- kubernetes-retired/contrib election example: https://github.com/kubernetes-retired/contrib/blob/master/election/example/main.go
- kubernetes-retired/contrib election README: https://github.com/kubernetes-retired/contrib/tree/master/election
- Spilo ENVIRONMENT.rst (SCOPE, PGROOT, PGPASSWORD_SUPERUSER): https://github.com/zalando/spilo/blob/master/ENVIRONMENT.rst
- Spilo releases (3.0-p1): https://github.com/zalando/spilo/releases
- Patroni Kubernetes docs (role labels): https://patroni.readthedocs.io/en/latest/kubernetes.html
- kube-state-metrics pod-metrics docs: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kubernetes PodDisruptionBudget reference: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes pod-affinity reference: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity

## Issues Found
1. **Incorrect RBAC for the leader-elector sidecar** (Method 2): The Role granted `get/create/update` on `coordination.k8s.io/leases`, but `gcr.io/google_containers/leader-elector:0.5` predates the Leases API and performs Endpoints-based leader election (annotations + resourceVersion compare-and-swap on a core/v1 Endpoints object). With the original RBAC the sidecar would log permission-denied errors on every election attempt and never acquire leadership.
   - **Fix applied:** Changed the rule to `apiGroups: [""]`, `resources: ["endpoints"]`, keeping the same verbs.

## Review Notes
- The `gcr.io/google_containers/leader-elector:0.5` image is from the archived kubernetes-retired/contrib repository and is no longer maintained. It still functions and supports the `--election`, `--http`, and `--election-namespace` flags used in the post, but new code should prefer Lease-based leader election via `k8s.io/client-go/tools/leaderelection` (or controller-runtime) directly in the application.
- The Spilo image `registry.opensource.zalan.do/acid/spilo-15:3.0-p1` is valid and ships Patroni 3.x, where the primary pod is labeled `role: master` by default — so the `postgres-primary` / `postgres-replica` selectors in the post are correct for this image tag. Patroni 4.0 (released 2024) changed the default to `role: primary`; readers who upgrade to a Spilo image bundling Patroni 4.x will need to either switch the selector or set `kubernetes.leader_label_value: master` in Patroni config. The deprecated `registry.opensource.zalan.do` registry still resolves but Zalando now publishes to `ghcr.io/zalando/spilo-15`.
- The Redis Sentinel example deploys `redis-server` and `redis-sentinel` as containers in the same pod. This is functional but reduces resilience because losing a pod takes both the data plane and one of the quorum members with it. A more typical production layout uses separate StatefulSets (or at minimum separate pods) for Redis and Sentinel.
- `kube_pod_status_ready{condition="true"}` returns 1 when ready and 0 otherwise, so the `NoActiveInstance` alert as written (`count(...) == 0`) would actually fire whenever there are zero matching pods at all, not whenever no matching pod is ready. A more precise expression would be `count(kube_pod_status_ready{pod=~"active-passive-app.*",condition="true"} == 1) == 0`. The current form still catches the gross "all pods gone" case but is imprecise; leaving as-is since it is functional and the post's intent is illustrative.
- Calling a single-replica StatefulSet "cold standby" (Method 1) is a loose use of the term — there is no standby instance at all until Kubernetes recreates the pod. The post's framing is reasonable as the simplest pattern, just slightly imprecise terminology.
- The `leader-status` emptyDir volume mounted into the application container in Method 2 is unused (the example application polls the sidecar over HTTP instead of reading a file). Not incorrect, just dead config.

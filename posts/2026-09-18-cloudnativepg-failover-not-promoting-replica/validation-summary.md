# Validation Summary: CloudNativePG Failover Does Not Promote a Replica: Diagnose Quorum, WAL, and Instance Health

## Status
validated

## Post Type
Technical troubleshooting guide with Kubernetes commands and a PostgreSQL diagnostic query.

## Technologies Covered
- CloudNativePG 1.30 and the cnpg kubectl plugin
- PostgreSQL physical replication, WAL recovery, timelines, and synchronous replication
- Kubernetes Pods, Services, Leases, events, and operator connectivity
- Bash, kubectl, and psql

## Sources Consulted
- CloudNativePG 1.30 release notes: https://cloudnative-pg.io/docs/1.30/release_notes/v1.30/
- CloudNativePG 1.30 automated failover, primary Lease, and failover quorum: https://cloudnative-pg.io/docs/1.30/failover/
- CloudNativePG 1.30 kubectl plugin and status sampling: https://cloudnative-pg.io/docs/1.30/kubectl-plugin/#status
- CloudNativePG 1.30 troubleshooting: https://cloudnative-pg.io/docs/1.30/troubleshooting/
- CloudNativePG 1.30 Service management: https://cloudnative-pg.io/docs/1.30/service_management/
- CloudNativePG 1.30 installation and operator deployment naming: https://cloudnative-pg.io/docs/1.30/installation_upgrade/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- PostgreSQL recovery information and control functions: https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-RECOVERY-CONTROL
- PostgreSQL psql reference: https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL statistics and pg_stat_wal_receiver: https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL continuous archiving and timelines: https://www.postgresql.org/docs/current/continuous-archiving.html

## Issues Found
No technical issues found.

## Review Notes
- README.md required no changes. The article is technically relevant and contains executable diagnostic examples.
- Confirmed the 1.30 primary election Lease, its cluster-based name and namespace, and the distinction between promotion coordination and primary isolation.
- Confirmed the pending target-primary phase, WAL receiver shutdown requirement, failoverDelay versus switchoverDelay, and the relevance of node failure detection.
- Confirmed the synchronous.failoverQuorum field, generated FailoverQuorum resource, annotation precedence, configuration-transition resets, and manual promotion override. With two potential standbys and one required acknowledgment, one reachable standby fails the R + W > N test.
- The legacy alpha.cnpg.io/failoverQuorum annotation is deprecated in 1.30. The article correctly treats it as a legacy setting to inspect.
- Checked namespace, selector, output, sorting, container, log-duration, exec separator, and psql flags against official references. All four Bash blocks passed bash -n syntax validation.
- The recovery query is appropriate for the stated standby context. pg_is_wal_replay_paused() reports whether a pause was requested; pg_get_wal_replay_pause_state() can distinguish a requested pause from a completed pause. The query can fail if the target has already become primary because the pause function requires recovery.
- A null receive LSN can mean streaming has not started or is disabled. Replay state and timeline history are therefore relevant, as the article explains.
- Verified the status sampling caveat and the orders-rw Service naming convention. The CloudNativePG plugin, troubleshooting, and Service pages returned HTTP 200 when fetched directly after the browsing tool reported retrieval errors.
- The PostgreSQL current documentation resolved to PostgreSQL 18 during review. CloudNativePG behavior was checked against the explicitly targeted 1.30 documentation.
- This was a documentation and syntax review. No live Kubernetes cluster, failover experiment, or PostgreSQL query execution was performed. Runtime success depends on the example resources existing, an installed cnpg plugin, and appropriate access permissions.

# Validation Summary: How to Build Site Recovery Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL 15 (streaming replication, WAL configuration, hot standby)
- Kubernetes (StatefulSet, Deployment, ConfigMap, Secret, HorizontalPodAutoscaler)
- AWS (EKS, VPC, VPC Peering, Route 53 failover routing, Route 53 health checks)
- Terraform (HCL — `aws_vpc`, `aws_eks_cluster`, `aws_eks_node_group`, `aws_route53_*`)
- Istio (ServiceEntry, DestinationRule, VirtualService — `networking.istio.io/v1beta1`)
- Prometheus / kube-prometheus PrometheusRule (`monitoring.coreos.com/v1`)
- Bash automation (curl, psql, aws CLI, kubectl, jq, PagerDuty Events API v2, Slack webhooks)
- Mermaid diagrams

## Sources Consulted
- PostgreSQL 15 docs — Recovery Configuration: https://www.postgresql.org/docs/15/recovery-config.html
- PostgreSQL 15 docs — Replication parameters (`primary_conninfo`, `promote_trigger_file`, `recovery_target_timeline`): https://www.postgresql.org/docs/15/runtime-config-replication.html
- PostgreSQL 15 docs — `pg_basebackup`: https://www.postgresql.org/docs/15/app-pgbasebackup.html
- PostgreSQL 13 release notes — introduction of `wal_keep_size`: https://www.postgresql.org/docs/release/13.0/
- PostgreSQL 16 release notes — removal of `promote_trigger_file`: https://www.postgresql.org/docs/release/16.0/
- Kubernetes `autoscaling/v2` HPA: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#horizontalpodautoscaler-v2-autoscaling
- AWS Route 53 health check `request_interval` (10 or 30 seconds): https://docs.aws.amazon.com/Route53/latest/APIReference/API_HealthCheckConfig.html
- AWS Route 53 failover routing: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-failover.html
- AWS provider for Terraform — `aws_route53_record` failover_routing_policy: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Istio `networking.istio.io/v1beta1` (ServiceEntry, DestinationRule, VirtualService): https://istio.io/latest/docs/reference/config/networking/
- PagerDuty Events API v2: https://developer.pagerduty.com/docs/api/events-api-v2/

## Issues Found
1. **PostgreSQL replica config used pre-PG12 syntax with a PG15 image** — the replica ConfigMap defined a `recovery.conf` block containing `standby_mode = on` and `trigger_file = '/tmp/promote_to_primary'`. Since PostgreSQL 12, `recovery.conf` was removed (the server refuses to start if it exists), `standby_mode` was removed entirely (standby is enabled via a `standby.signal` file in the data directory — which `pg_basebackup -R` creates automatically), and `trigger_file` was renamed to `promote_trigger_file`. Because the post pins `postgres:15`, the original config would prevent the replica from starting.
   - **Fix**: Removed the `recovery.conf` ConfigMap key. Moved `primary_conninfo`, `promote_trigger_file` (renamed from `trigger_file`), and `recovery_target_timeline` into `postgresql.conf`. Added a brief comment explaining that `standby.signal` (created by `pg_basebackup -R` in the init container) enables standby mode in PG 12+.

## Review Notes
- `wal_keep_size = 1GB` is correct for PG 15 (introduced in PG 13, replacing `wal_keep_segments`).
- `synchronous_standby_names = 'recovery_site'` is valid — the bare-name form is equivalent to `FIRST 1 (recovery_site)`.
- Setting `synchronous_commit = on` combined with a single `synchronous_standby_names` entry means writes will block if the replica is unreachable. This is technically correct but worth flagging as an operational trade-off (the post does not explicitly call this out).
- `pg_basebackup -R` in PG 12+ writes `primary_conninfo` to `postgresql.auto.conf`. Since `postgresql.auto.conf` is read after `postgresql.conf`, the `primary_conninfo` defined in the ConfigMap will be overridden by whatever `pg_basebackup -R` writes (which uses the connection parameters passed on the command line — `-h postgres-primary.region-a.example.com -U replicator`). The end behavior is correct in this post (both point to the same primary), but the ConfigMap value is effectively documentation rather than the source of truth.
- `promote_trigger_file` was **removed** in PostgreSQL 16. If this post is updated to target PG 16+, the `promote_database_replica` function must switch from `touch /tmp/promote_to_primary` to `pg_ctl promote` or `SELECT pg_promote();`. Currently valid for PG 15.
- Istio APIs use `networking.istio.io/v1beta1`. As of Istio 1.22, `v1` is GA and recommended; `v1beta1` is still supported but considered legacy. Not incorrect, but a forward-looking refresh could move to `v1`.
- The DR test script (`dr-test.sh`) calls `./failover.sh failback`, but the `failover.sh` shown earlier only handles `failover|check-primary|check-recovery` in its case statement. This is an internal inconsistency in illustrative pseudo-scripts (no `failback` command is defined). Not a fact-error against any external API, so left as-is — the post would benefit from either defining a `failback` branch or noting that failback is a separate procedure.
- The `simulate-failure.json` and `restore-primary.json` files referenced in the DR test script are not defined in the post; readers will need to supply their own Route 53 change-batch JSON. This is acceptable for a tutorial but worth a callout.
- Route 53 health check `request_interval` of 10 (fast checks) incurs additional cost vs. the default 30; correct as written, just a cost consideration.

# Validation Summary: How to Prevent MySQL Replication Problems in Calico Networks

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Calico (projectcalico.org/v3 NetworkPolicy)
- Kubernetes (StatefulSet, headless Service, CronJob, kubectl)
- MySQL 8.0+ replication (CHANGE REPLICATION SOURCE TO, SHOW REPLICA STATUS, GTID auto-position)
- Bash scripting (TCP probes via /dev/tcp)

## Sources Consulted
- MySQL 8.0 Reference Manual — SHOW REPLICA STATUS: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual — CHANGE REPLICATION SOURCE TO: https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes Headless Services: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- Kubernetes CronJob (batch/v1): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found

1. **Mismatched MySQL replication status column names (Step 3).** The script ran `SHOW REPLICA STATUS\G` (new MySQL 8.0.22+ command) but grepped for the legacy `Slave_IO_Running|Slave_SQL_Running|Seconds_Behind_Master` columns. `SHOW REPLICA STATUS` emits the renamed columns `Replica_IO_Running`, `Replica_SQL_Running`, and `Seconds_Behind_Source`, so the grep would never match. Updated the grep pattern to the new column names to align with the command being used.

2. **Missing `-i` flag on `kubectl exec` with HEREDOC (Step 2).** `kubectl exec -n database mysql-1 -- mysql -u root -p <<'EOF' ... EOF` would not forward the HEREDOC to the container because `kubectl exec` requires the `-i/--stdin` flag to attach stdin. Added `-i` so the SQL commands are actually delivered to the `mysql` client in the pod.

## Review Notes
- The `mysql -u root -p` (with interactive `-p`) inside the HEREDOC will consume the first line of the HEREDOC as the password prompt response, which is a fragile pattern. It still functions if the user supplies the password as the first body line, but using `MYSQL_PWD` env var, an option file, or `mysql --defaults-file=...` would be more robust. Left as-is since it's stylistic, not incorrect.
- Calico `ports: [3306]` inline-list syntax is valid YAML and accepted by Calico; the Calico docs more commonly use the dash-list form, but both work.
- `SOURCE_AUTO_POSITION=1` assumes GTID-based replication is enabled on both primary and replica (`gtid_mode=ON`, `enforce_gtid_consistency=ON`). The post does not call this out, but the syntax itself is correct.
- The `mysql-primary-allow-replica` policy also allows ingress from `app == "mysql-exporter"`, which is monitoring rather than replication. Reasonable inclusion but the surrounding comment focuses on replication; not a technical defect.
- `calicoctl get networkpolicies` works; `networkpolicy`, `networkpolicies`, and `np` are all accepted aliases.

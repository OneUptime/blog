# Validation Summary: How to Fix MySQL Replication Problems Caused by Calico Networking

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Calico NetworkPolicy and calicoctl
- Kubernetes Services, headless Services, StatefulSets, DNS, and kubectl
- MySQL replication
- TCP connectivity troubleshooting

## Sources Consulted
- Calico NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node status documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes Service documentation for headless Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- MySQL 8.4 replication source configuration documentation: https://dev.mysql.com/doc/refman/8.4/en/replication-howto-slaveinit.html
- MySQL 8.4 CHANGE REPLICATION SOURCE TO documentation: https://dev.mysql.com/doc/refman/8.4/en/change-replication-source-to.html
- MySQL 8.4 replica control statement documentation: https://dev.mysql.com/doc/refman/8.4/en/replication-statements-replica.html

## Issues Found
- The post said MySQL replication connections use IP addresses. MySQL replication uses the configured `SOURCE_HOST`, which can be a host name or an IP address. Updated the text to clarify that the problem applies when replication is configured with pod IP addresses.
- The post implied that creating a headless Service alone guarantees per-pod DNS names such as `mysql-0.mysql-headless.database.svc.cluster.local`. Kubernetes only creates those per-pod records when the pod hostname/subdomain matches the headless Service, which StatefulSets normally provide through their governing `serviceName`. Added a note that the StatefulSet must use `mysql-headless` as its `serviceName`.
- The `CHANGE REPLICATION SOURCE TO SOURCE_HOST=...` example changed `SOURCE_HOST` without specifying GTID auto-positioning or file/position coordinates. MySQL treats a changed source host as a new source and may reset binary log coordinates if no coordinates are supplied. Updated the GTID-based example to include `SOURCE_AUTO_POSITION=1`.
- The heredoc-based `kubectl exec` command omitted `-i`, so stdin would not be forwarded reliably to the MySQL client. Added `-i` to the command.

## Review Notes
The MySQL examples assume GTID-based replication because they use `SOURCE_AUTO_POSITION=1`. For file-position-based replication, the commands would need `SOURCE_LOG_FILE` and `SOURCE_LOG_POS` values from the current source state instead.

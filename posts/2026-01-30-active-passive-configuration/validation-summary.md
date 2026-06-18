# Validation Summary: How to Create Active-Passive Configuration

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Active-passive high availability architecture
- Kubernetes StatefulSets, Deployments, Services, EndpointSlices, ConfigMaps, and kubectl
- Terraform CLI
- AWS CLI for Amazon EKS
- Velero restore operations
- PostgreSQL streaming replication and standby promotion
- MySQL replication and replica promotion
- HAProxy active-passive backend configuration
- NGINX upstream failover configuration
- Bash scripting
- Python health-check controller using requests

## Sources Consulted
- PostgreSQL documentation: Log-Shipping Standby Servers and Streaming Replication - https://www.postgresql.org/docs/current/warm-standby.html
- PostgreSQL documentation: pg_basebackup - https://www.postgresql.org/docs/current/app-pgbasebackup.html
- MySQL 8.4 Reference Manual: Checking Replication Status - https://dev.mysql.com/doc/refman/8.4/en/replication-administration-status.html
- Kubernetes documentation/blog: Endpoints API deprecation and transition to EndpointSlices - https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes kubectl reference: kubectl scale - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Kubernetes kubectl reference: kubectl patch - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- AWS CLI Command Reference: aws eks wait cluster-active - https://docs.aws.amazon.com/cli/latest/reference/eks/wait/cluster-active.html
- Velero Restore Reference - https://velero.io/docs/main/restore-reference/
- NGINX upstream module documentation - https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- HAProxy Configuration Manual - https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/

## Issues Found
- The cold standby pod readiness loop counted the `kubectl get pods` header as a non-running pod and used command exit status in a way that could keep waiting even when all pods were healthy. Changed it to use `--no-headers`, count only pods whose status is not `Running` or `Completed`, and compare the numeric count.
- The PostgreSQL standby setup defined `REPLICATION_PASSWORD` but did not pass it to `pg_basebackup`. Added `export PGPASSWORD="${REPLICATION_PASSWORD}"` so the non-interactive example can authenticate.
- The PostgreSQL standby ConfigMap placed `primary_conninfo` in a separate ConfigMap key, which PostgreSQL would not read as a server setting. Moved it into the `postgresql.conf` content as a proper `primary_conninfo = '...'` parameter.
- The MySQL failover script stopped replication before reading `Seconds_Behind_Source`, which can make lag information unavailable or misleading. Reordered the script to check replication lag before `STOP REPLICA`.
- The Kubernetes active-passive service example used the deprecated core/v1 `Endpoints` API. Updated it to use `discovery.k8s.io/v1` `EndpointSlice`, added a named service port, and changed the failover script to patch the EndpointSlice address and port.
- The failover drill's PostgreSQL lag query could return `NULL` when no transaction replay timestamp exists. Wrapped the value in `COALESCE(..., 0)`.
- The failover drill subtracted 60 seconds from the measured RTO even though the intentional wait was 30 seconds. Corrected the subtraction to 30 seconds.

## Review Notes
The examples are still illustrative and use placeholder hosts, credentials, and provider-specific paths. Production implementations should also add credential handling, fencing/split-brain protection, rollback/failback procedures, and provider-specific validation before automated promotion.

# Validation Summary: How to Expose Database Services with MetalLB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Services, StatefulSets, Secrets, ConfigMaps, and NetworkPolicies
- MetalLB IPAddressPool, L2Advertisement, and LoadBalancer service annotations
- PostgreSQL, TLS configuration, and postgres_exporter
- MySQL, TLS configuration, and mysqld_exporter
- PgBouncer
- ProxySQL
- Calico GlobalNetworkPolicy
- Prometheus database exporters

## Sources Consulted
- MetalLB usage documentation, including service annotations and traffic policies: https://metallb.universe.tf/usage/
- Kubernetes Service documentation, including LoadBalancer behavior, deprecated `spec.loadBalancerIP`, headless Services, session affinity, and external traffic policy: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Secret documentation, including `data`, `stringData`, and TLS Secret behavior: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- PostgreSQL SSL documentation: https://www.postgresql.org/docs/current/ssl-tcp.html
- PostgreSQL connection and SSL settings documentation: https://www.postgresql.org/docs/current/runtime-config-connection.html
- MySQL encrypted connection documentation: https://dev.mysql.com/doc/mysql-security-excerpt/8.0/en/using-encrypted-connections.html
- MySQL 8.0 release notes and EOL notice: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/
- MySQL 8.4 release notes for `mysql_native_password` changes: https://dev.mysql.com/doc/relnotes/mysql/8.4/en/news-8-4-0.html
- MySQL client option and environment variable documentation: https://dev.mysql.com/doc/refman/8.4/en/environment-variables.html
- PgBouncer configuration documentation: https://www.pgbouncer.org/config.html
- Bitnami PgBouncer container environment variable documentation: https://github.com/bitnami/containers/blob/main/bitnami/pgbouncer/README.md
- ProxySQL read/write split and query routing documentation: https://proxysql.com/documentation/proxysql-read-write-split-howto/
- ProxySQL FAQ on destination hostgroups and multiplexing: https://proxysql.com/documentation/frequently-asked-questions/
- Prometheus postgres_exporter documentation: https://github.com/prometheus-community/postgres_exporter
- Prometheus mysqld_exporter documentation and v0.15.0 release notes: https://github.com/prometheus/mysqld_exporter
- Calico GlobalNetworkPolicy documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy

## Issues Found
- The MetalLB Service annotations used the deprecated `metallb.universe.tf/*` prefix. Changed them to the current `metallb.io/address-pool` and `metallb.io/loadBalancerIPs` annotations.
- The PostgreSQL Secret comment said `stringData` values should be base64 encoded. Changed the comment because Kubernetes accepts plain text in `stringData` and stores it under `data`.
- The Service comments and best-practice summary overstated `sessionAffinity: ClientIP` as critical for transaction state. Clarified that existing TCP database connections already remain on their selected backend, and session affinity only influences new connections from the same client IP.
- The MySQL example used `mysql:8.0`, which is past upstream EOL as of April 2026. Updated the example to `mysql:8.4`.
- The MySQL example used `--default-authentication-plugin=mysql_native_password`, which is not appropriate for MySQL 8.4. Removed it and kept the default modern authentication behavior.
- The MySQL probes did not provide valid credentials for the configured root password. Added a Secret-backed MySQL client option file and updated the probes to use it.
- The MySQL exporter referenced an `exporter-password` key that was not defined. Added the missing key to the MySQL Secret example.
- The NetworkPolicy example allowed traffic from MetalLB speaker pods and described that as required for LoadBalancer health checks. Replaced it with explicit `ipBlock` rules for permitted external client ranges, which matches the preserved source-IP behavior described by `externalTrafficPolicy: Local`.
- The PostgreSQL TLS section implied that a ConfigMap alone enabled TLS. Clarified that the ConfigMap and TLS Secret must be mounted into PostgreSQL and referenced by the server configuration.
- The PostgreSQL TLS cipher list explicitly allowed 3DES. Replaced it with a stronger `HIGH:!aNULL` example.
- The ProxySQL example routed `SELECT` queries to hostgroup 1 even though only hostgroup 0 was configured. Changed the destination hostgroup to 0 so the example is internally consistent.
- The PostgreSQL monitoring example referenced a missing `postgres-exporter-secrets` Secret. Added the Secret to the monitoring manifest.
- The PostgreSQL monitoring example used deprecated postgres_exporter flags without mounting the referenced custom query file. Removed the deprecated flags from the example.
- The MySQL non-SSL connectivity test conflicted with `require_secure_transport = ON`. Updated the test to use `--ssl-mode=REQUIRED`.

## Review Notes
- `kubectl` is not installed in the local environment, so cluster-side schema validation was not performed locally. The YAML code fences were parsed successfully with PyYAML.
- The examples still use illustrative passwords and simple self-signed certificate placeholders; those are acceptable for a tutorial but should be replaced with external secret management and real certificate automation in production.

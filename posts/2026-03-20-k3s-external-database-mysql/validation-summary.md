# Validation Summary: How to Configure K3s with an External Database (MySQL)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- K3s
- MySQL
- Kubernetes
- HAProxy
- Nginx
- Linux package management and systemd

## Sources Consulted
- K3s Cluster Datastore: https://docs.k3s.io/datastore
- K3s High Availability External DB: https://docs.k3s.io/datastore/ha
- K3s Cluster Load Balancer: https://docs.k3s.io/datastore/cluster-loadbalancer
- K3s Backup and Restore: https://docs.k3s.io/datastore/backup-restore
- K3s Server CLI: https://docs.k3s.io/cli/server
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Requirements: https://docs.k3s.io/installation/requirements
- MySQL CREATE USER Statement: https://dev.mysql.com/doc/refman/8.4/en/create-user.html
- MySQL GRANT Statement: https://dev.mysql.com/doc/refman/8.4/en/grant.html
- MySQL Server System Variable Reference (`bind_address`): https://dev.mysql.com/doc/refman/8.4/en/server-system-variable-reference.html

## Issues Found
- The post described MySQL as "8.0+". K3s currently documents MySQL as certified against versions 8.0 and 8.4, so I narrowed the wording to supported releases instead of implying any newer major version.
- The additional server example did not include the same fixed-registration-address SAN values shown on the first server. I added the load balancer IP so the certificate example remains consistent across servers.
- The load balancer section said to expose both ports 6443 and 6444. Current K3s documentation uses port 6443 for the external fixed registration address and Kubernetes API in this setup, so I corrected that guidance.
- The backup section only covered the MySQL dump and restore commands. K3s also requires backing up and restoring `/var/lib/rancher/k3s/server/token` when using an external datastore, so I added that requirement.
- The TLS guidance recommended adding `?tls=true` to the MySQL DSN. Current K3s documentation notes a known issue with the MySQL DSN `tls` parameter, so I replaced that advice with the supported datastore TLS file options.
- The replication advice implied a read/write split. K3s uses a single datastore endpoint, so I clarified that failover setups should keep the K3s endpoint directed at the writable primary or an endpoint that routes to it.

## Review Notes
- The SQL statements and core K3s datastore examples are otherwise consistent with the current official documentation.
- The MySQL installation and remote-access example is Debian or Ubuntu specific because it uses `apt-get` and `/etc/mysql/mysql.conf.d/mysqld.cnf`.
- K3s also documents that multi-master MySQL or MariaDB setups that change `auto_increment_increment` or `auto_increment_offset` are not supported.

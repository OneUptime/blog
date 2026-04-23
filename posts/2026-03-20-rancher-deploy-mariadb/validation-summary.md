# Validation Summary: How to Deploy MariaDB on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- MariaDB
- MariaDB Galera Cluster
- MariaDB MaxScale
- Bitnami Helm charts

## Sources Consulted
- Bitnami MariaDB Helm chart README and values: https://github.com/bitnami/charts/tree/main/bitnami/mariadb
- Bitnami MariaDB Galera Helm chart README, values, and templates: https://github.com/bitnami/charts/tree/main/bitnami/mariadb-galera
- Bitnami MariaDB Galera container documentation and startup script behavior: https://github.com/bitnami/containers/tree/main/bitnami/mariadb-galera
- MariaDB MaxScale Galera Monitor docs: https://mariadb.com/docs/maxscale/reference/maxscale-monitors/galera-monitor
- MariaDB MaxScale listener docs: https://mariadb.com/docs/maxscale/reference/maxscale-listeners
- MariaDB MaxScale authentication and service user grant requirements: https://mariadb.com/docs/maxscale/maxscale-security/authentication-modules
- MariaDB MaxScale read/write split tutorial: https://mariadb.com/docs/maxscale/mariadb-maxscale-tutorials/read-write-splitting
- MariaDB deployment guide for MaxScale with Galera: https://mariadb.com/docs/server/deploy/maxscale-galeramon-readwritesplit-mxs22-08/
- MariaDB Galera monitoring and recovery docs: https://mariadb.com/docs/galera-cluster/high-availability/monitoring-mariadb-galera-cluster and https://mariadb.com/docs/galera-cluster/high-availability/recovering-a-primary-component/
- Kubernetes Secrets docs: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The primary/replica example omitted `architecture: replication`, but the Bitnami `mariadb` chart defaults to `standalone`. I added `architecture: replication` so the `secondary` section is actually applied.
- The Galera configuration used an incorrect Bitnami container provider path (`/usr/lib/galera/libgalera_smm.so`) and static node identity settings that do not match how the chart populates node names and addresses. I replaced the Galera values with a Bitnami-compatible configuration and added `galera.mariabackup.password`.
- The verification and troubleshooting commands used `${MARIADB_ROOT_PASSWORD}` in the local shell, which would not expand to the in-pod environment variable. I changed those commands to run `bash -c` inside the pod so the password expands in the container.
- The MaxScale example was incomplete for a working deployment: it did not create the MaxScale backend user with the required grants, it lacked a listener section, and it lacked a Kubernetes Service even though the application later connected to `maxscale.databases.svc.cluster.local`. I added the user-creation command, the listener, and the Service.
- The MaxScale monitor config included `auto_failover=true` under `galeramon`. That setting is documented for MariaDB Monitor, not Galera Monitor. I removed it.
- The application example referenced a Secret from another namespace. Kubernetes Secrets are namespace-scoped, so a Pod in `production` cannot consume the chart-created Secret in `databases` with `secretKeyRef`. I restored a same-namespace `mariadb-passwords` Secret and added the command to create it in `production`.
- The recovery command used an oversimplified bootstrap step. I updated it to the documented `pc.bootstrap=true` form and clarified that it should only be used after stopping the other nodes and selecting the most advanced node.

## Review Notes
- Bitnami now documents OCI-based Helm installs as the default path for both charts, but the repo-based `helm repo add bitnami https://charts.bitnami.com/bitnami` workflow used in the post still resolves the charts correctly.
- `REPLICA MONITOR` is the correct MaxScale Galera monitor privilege for current MariaDB releases; MariaDB 10.4 and earlier require `REPLICATION CLIENT` instead.
- The post remains broadly accurate after these fixes, but MaxScale image version `23.08` is older than the newest MaxScale release line, so this section may need another version check in a future review cycle.

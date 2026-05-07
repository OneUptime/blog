# Validation Summary: How to Set Up Rancher with an External Database

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- K3s
- Kubernetes
- MySQL
- PostgreSQL
- Helm
- cert-manager
- Amazon RDS
- Azure Database for MySQL
- Google Cloud SQL

## Sources Consulted
- K3s Cluster Datastore: https://docs.k3s.io/datastore
- K3s High Availability External DB: https://docs.k3s.io/datastore/ha
- K3s Token CLI: https://docs.k3s.io/cli/token
- K3s Backup and Restore: https://docs.k3s.io/datastore/backup-restore
- Rancher Install/Upgrade on a Kubernetes Cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- cert-manager Helm installation: https://cert-manager.io/docs/installation/helm/
- Helm installation docs: https://helm.sh/docs/intro/install/
- MySQL `mysqldump` reference: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- PostgreSQL `pg_dump` reference: https://www.postgresql.org/docs/17/app-pgdump.html
- Google Cloud SQL Auth Proxy docs: https://cloud.google.com/sql/docs/mysql/connect-auth-proxy

## Issues Found
- The post described the MySQL/PostgreSQL datastore as if Rancher itself used it directly. I corrected the title, description, introduction, architecture note, and summary so the post accurately states that the external database is the K3s datastore that Rancher runs on.
- The additional-server instructions referenced `/var/lib/rancher/k3s/server/node-token` and `<node-token>`. Current K3s documentation uses the server token at `/var/lib/rancher/k3s/server/token`, so I updated the token path and placeholder to `<server-token>`.
- The cert-manager readiness step only waited on a single pod selector. I changed it to wait for the `cert-manager`, `cert-manager-webhook`, and `cert-manager-cainjector` deployments so the walkthrough waits on the components Rancher depends on.
- The backup section implied that backing up only the external database was sufficient. I added the requirement to back up `/var/lib/rancher/k3s/server/token`, which K3s requires during restore.
- The managed-database examples had incorrect or outdated connection guidance. I fixed the Amazon RDS MySQL DSN to use `tcp(...)`, removed the unsupported MySQL `tls` DSN parameter from the Azure example, and updated Google Cloud SQL guidance to use the current Cloud SQL Auth Proxy name.
- The sample datastore endpoint commands used a password placeholder ending in `!` inside double quotes, which can trigger Bash history expansion in interactive shells. I switched those examples to single quotes so they are safer to paste.

## Review Notes
- K3s currently documents certification coverage for MySQL 8.0 and 8.4, and PostgreSQL 15, 16, and 17, in its datastore documentation. This post's local PostgreSQL example remains aligned to the Ubuntu 22.04 package layout used in the article.
- cert-manager now recommends its OCI chart as the source of truth, but Rancher's current installation docs still document the Jetstack Helm repository flow used in the post.

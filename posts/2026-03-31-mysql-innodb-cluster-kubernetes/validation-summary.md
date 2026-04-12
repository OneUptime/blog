# Validation Summary: How to Set Up MySQL InnoDB Cluster on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (InnoDB Cluster, Group Replication)
- MySQL Shell (AdminAPI: `dba.createCluster`, `cluster.addInstance`)
- MySQL Router 8.0
- Kubernetes (StatefulSet, headless Service, Deployment, PersistentVolumeClaim, Secret)

## Sources Consulted
- MySQL Shell 8.0 AdminAPI Reference — `dba.createCluster()` options: https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-innodb-cluster-creating.html
- MySQL Shell 8.0 AdminAPI Reference — `cluster.addInstance()` options: https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-innodb-cluster-adding-instances.html
- MySQL Router 8.0 Docker image documentation: https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-deploying-docker.html
- Official `mysql:8.0` Docker image on Docker Hub: https://hub.docker.com/_/mysql
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes headless Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- MySQL InnoDB Cluster deployment guide: https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-innodb-cluster.html

## Issues Found

### 1. `mysqlsh` not available in `mysql:8.0` Docker image (Critical)
**What was wrong:** The bootstrapping section instructed the reader to run `kubectl exec -it mysql-0 -n mysql-cluster -- mysqlsh ...`, but the official `mysql:8.0` Docker image does not include MySQL Shell (`mysqlsh`). It only includes the MySQL server and standard client utilities (`mysql`). Running the command would fail with an "executable not found" error.

**What was changed:** Added an explicit step to install MySQL Shell in the pod using `microdnf install -y mysql-shell` before attempting to use it. The `mysql:8.0` image is based on Oracle Linux 8 with the MySQL Yum repository pre-configured, so `microdnf` can install the `mysql-shell` package directly.

### 2. Architecture Overview referenced a ConfigMap that does not exist (Minor)
**What was wrong:** The Architecture Overview listed "A ConfigMap for initialization scripts" as a component, but no ConfigMap resource is defined or used anywhere in the tutorial. The init container uses inline bash commands instead.

**What was changed:** Removed the ConfigMap bullet point from the Architecture Overview to match the actual implementation.

## Review Notes
- The tutorial does not explicitly configure Group Replication prerequisites (`gtid_mode=ON`, `enforce_gtid_consistency=ON`) in the MySQL config. This works because MySQL Shell's `dba.createCluster()` sets these dynamically on MySQL 8.0.17+, but adding them to the init container config would make the setup more robust across pod restarts.
- The `mysql-shell` installation via `microdnf` is adequate for a one-time bootstrap operation, but in production you would typically bake MySQL Shell into a custom container image or use the MySQL Operator for Kubernetes.
- The `force: true` option in `createCluster` is acceptable for a tutorial but should not be used in production without understanding the implications.
- MySQL Router ports 6446 (read-write) and 6447 (read-only) are correctly configured. The Router environment variables (`MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_INNODB_CLUSTER_MEMBERS`) are correct for the official `mysql/mysql-router:8.0` Docker image.
- The `password` option in the `cluster.addInstance()` call is valid per MySQL Shell documentation when the password is not included in the connection URI.
- The headless Service correctly uses `clusterIP: None` and exposes both classic (3306) and X Protocol (33060) ports.

# Validation Summary: How to Deploy MySQL Operator on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Operator for Kubernetes (Oracle)
- Kubernetes
- Helm 3
- MySQL InnoDB Cluster
- MySQL Router
- MySQL Shell
- S3-compatible backup storage

## Sources Consulted
- MySQL Operator official documentation: https://dev.mysql.com/doc/mysql-operator/en/
- MySQL Operator GitHub repository: https://github.com/mysql/mysql-operator
- MySQL Operator Helm chart index: https://mysql.github.io/mysql-operator/index.yaml
- MySQL Operator CRD definitions (deploy-crds.yaml) in the GitHub repository
- MySQL Operator source code (cluster_api.py) for secret key verification

## Issues Found

### 1. Incorrect Kubernetes minimum version
- **What was wrong:** The post stated Kubernetes 1.22 or later is required.
- **What was changed:** Corrected to Kubernetes 1.21 or later.
- **Why:** The official MySQL Operator documentation specifies Kubernetes 1.21 as the minimum supported version.

### 2. Non-standard MySQL version
- **What was wrong:** The InnoDBCluster example used `version: "8.3.0"`, which is a short-lived MySQL Innovation Release that is no longer actively maintained.
- **What was changed:** Updated to `version: "8.4.0"`, which is a current LTS release.
- **Why:** MySQL 8.3.0 was an Innovation Release with a short support lifecycle. The operator's Helm chart ships with appVersions for 8.0.x, 8.4.x, and 9.x tracks. Using an LTS version (8.4.x) is the correct recommendation for a production deployment tutorial.

### 3. MySQLBackupSchedule CRD does not exist
- **What was wrong:** The backup section showed a standalone `MySQLBackupSchedule` custom resource (kind: MySQLBackupSchedule) as a separate Kubernetes object. This CRD does not exist in the MySQL Operator.
- **What was changed:** Replaced with the correct approach: backup schedules are configured within the `InnoDBCluster` CR itself using `spec.backupProfiles` and `spec.backupSchedules` arrays. Updated the YAML example to show the full InnoDBCluster resource with embedded backup configuration, including the correct field names (`backupProfileName`, `enabled`, `endpoint`, `prefix`).
- **Why:** The MySQL Operator only defines two MySQL-specific CRDs: `innodbclusters.mysql.oracle.com` and `mysqlbackups.mysql.oracle.com`. Backup scheduling is an integral part of the InnoDBCluster spec, not a separate resource. The `MySQLBackup` CRD represents individual backup jobs created by the operator when scheduled backups trigger.

## Review Notes
- The `mysqlsh -- cluster status` CLI syntax used in the "Checking Cluster Status" section is valid MySQL Shell command-line integration mode, though the official operator documentation demonstrates the interactive approach instead. The syntax shown will work correctly.
- The post uses plaintext passwords in commands (`-pSuperSecretPassword1!`). While acceptable for a tutorial, production deployments should use Kubernetes secrets and avoid passing passwords on the command line.
- The S3 backup configuration uses `config` to reference a Kubernetes Secret containing S3 credentials, which is the correct field name per the operator schema.

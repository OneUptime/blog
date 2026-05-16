# Validation Summary: How to Set Up MongoDB on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- MongoDB 7.0
- MongoDB replica sets
- MongoDB Community Operator
- Helm
- PersistentVolumes and StatefulSets

## Sources Consulted
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config
- Talos Linux User Volumes documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/user
- Talos Linux configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- MongoDB documentation for deploying replica sets with keyfile access control: https://www.mongodb.com/docs/v7.0/tutorial/deploy-replica-set-with-keyfile-access-control/
- MongoDB documentation for transparent huge pages: https://www.mongodb.com/docs/manual/tutorial/disable-transparent-huge-pages/
- MongoDB official Docker image documentation: https://hub.docker.com/_/mongo
- MongoDB official Docker image entrypoint source: https://github.com/docker-library/mongo/blob/master/docker-entrypoint.sh
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes command and args documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- MongoDB Kubernetes Operator documentation: https://www.mongodb.com/docs/kubernetes/current/tutorial/install-fts-vs-with-community/
- MongoDB Helm charts repository: https://github.com/mongodb/helm-charts

## Issues Found
- The Talos machine config snippet used `machine.disks` and `mountpoint`, which does not match current Talos user volume configuration. Replaced it with a `UserVolumeConfig` document and the documented `talosctl patch mc --patch @file` workflow.
- The post said the snippet disabled transparent huge pages but set `vm.max_map_count` instead. Replaced it with Talos `machine.sysfs` settings for `/sys/kernel/mm/transparent_hugepage/enabled` and `/sys/kernel/mm/transparent_hugepage/defrag`.
- The StatefulSet used `command: mongod`, which overrides the official MongoDB image entrypoint and prevents `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` initialization. Changed the MongoDB options to `args` so the image entrypoint is preserved.
- The MongoDB keyfile was mounted directly from a Kubernetes Secret with root ownership. Added an init container that copies the secret to an `emptyDir`, changes ownership to the MongoDB container user, and sets `0400` permissions.
- The MongoDB health probes used unauthenticated `ping` commands. Updated them to authenticate with the configured root credentials.
- The deployment commands created the StatefulSet before the headless Service. Reordered them so the Service exists before the StatefulSet relies on it for stable network identity.
- The Community Operator install command omitted namespace creation and the admin password secret used by the sample custom resource. Added `--create-namespace` and a matching `kubectl create secret` command.
- The backup CronJob referenced `mongodb-backup-pvc` without defining it. Added a matching PersistentVolumeClaim to the backup manifest.

## Review Notes
- The Community Operator Helm chart repository marks the community operator chart as unsupported by MongoDB, even though it is available from the MongoDB Helm charts repository. The post now remains technically usable, but future revisions should call out support status if this section is expanded.
- The `local-path` StorageClass is environment-specific. The post now notes that node-local provisioners must be configured to use the Talos user volume path when relying on the dedicated Talos user volume.

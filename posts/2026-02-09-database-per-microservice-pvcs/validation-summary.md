# Validation Summary: How to Use Database Per Microservice Pattern on Kubernetes with Separate PVCs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes StatefulSet
- Kubernetes Service
- Kubernetes PersistentVolumeClaim
- Kubernetes StorageClass
- Kubernetes Secret
- Kubernetes NetworkPolicy
- Kubernetes Deployment and init containers
- Kubernetes CronJob
- PostgreSQL
- MongoDB
- AWS EBS CSI driver
- AWS CLI / S3 backups

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Amazon EKS StorageClass documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Kubernetes dependent environment variables documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Kubernetes environment variables documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- Kubernetes Pod API reference for command and environment variable expansion: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Docker PostgreSQL official image documentation: https://hub.docker.com/_/postgres
- Docker PostgreSQL guide for supported environment variables: https://docs.docker.com/guides/postgresql/immediate-setup-and-data-persistence/
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/15/app-pgdump.html
- AWS CLI Docker image documentation: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-docker.html

## Issues Found
- The AWS EBS StorageClass examples used the legacy in-tree `kubernetes.io/aws-ebs` provisioner. Updated all three examples to use the current EBS CSI provisioner, `ebs.csi.aws.com`, while keeping the existing EBS parameters.
- The `DATABASE_URL` environment variable referenced `$(DB_USER)` and `$(DB_PASS)` before those variables were defined. Kubernetes only expands variables that are already defined earlier in the same `env` list, so the URL would not resolve as intended. Reordered the environment variables in both the init container and application container.
- The backup CronJob used `image: postgres:15` while also calling `aws s3`. The official PostgreSQL image provides PostgreSQL tooling but not the AWS CLI. Changed the example to a custom backup image and added a sentence stating that the image must include PostgreSQL client tools, gzip, and the AWS CLI.
- The backup cleanup comment said it kept the last 7 days in S3, but the command keeps the last 7 listed backup objects. Updated the comment to say "last 7 backups."

## Review Notes
- The Kubernetes manifests use current stable API versions for StatefulSet, Deployment, Service, Secret usage, NetworkPolicy, StorageClass, and CronJob.
- The StatefulSet PVC name referenced in the monitoring command follows Kubernetes' `volumeClaimTemplateName-statefulSetName-ordinal` naming pattern.
- NetworkPolicy enforcement requires a Kubernetes networking plugin that supports NetworkPolicy.
- `kubectl` was not installed in the local workspace, so CLI command validation was performed against the official Kubernetes generated reference rather than local `kubectl --help` output.

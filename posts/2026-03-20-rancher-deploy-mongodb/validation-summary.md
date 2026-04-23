# Validation Summary: How to Deploy MongoDB on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- MongoDB
- MongoDB Database Tools (`mongodump`)
- MongoDB Kubernetes Operator

## Sources Consulted
- Bitnami MongoDB Helm chart README: https://github.com/bitnami/charts/tree/main/bitnami/mongodb
- Bitnami MongoDB Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/mongodb/values.yaml
- Bitnami MongoDB chart templates (`_helpers.tpl`, `secrets.yaml`, StatefulSet): https://github.com/bitnami/charts/tree/main/bitnami/mongodb/templates
- Bitnami MongoDB container README: https://github.com/bitnami/containers/tree/main/bitnami/mongodb
- Kubernetes Deployments docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes dependent environment variables docs: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Kubernetes Secrets docs: https://kubernetes.io/docs/concepts/configuration/secret/
- MongoDB connection string reference: https://www.mongodb.com/docs/current/reference/connection-string/
- MongoDB `hello` / `db.hello()` docs: https://www.mongodb.com/docs/manual/reference/command/hello/ and https://www.mongodb.com/docs/manual/reference/method/db.hello/
- MongoDB `mongodump` docs: https://www.mongodb.com/docs/manual/reference/mongodump/
- MongoDB Kubernetes Operator install docs: https://www.mongodb.com/docs/kubernetes/current/tutorial/install-k8s-operator/
- MongoDB Kubernetes Operator Helm settings: https://www.mongodb.com/docs/kubernetes/current/reference/helm-operator-settings/
- MongoDB community deployment docs and samples: https://github.com/mongodb/mongodb-kubernetes/tree/master/docs/mongodbcommunity
- MongoDB community CR sample and CRD: https://github.com/mongodb/mongodb-kubernetes/tree/master/public/samples/community and https://github.com/mongodb/mongodb-kubernetes/blob/master/config/crd/bases/mongodbcommunity.mongodb.com_mongodbcommunity.yaml

## Issues Found
- The Bitnami chart install flow was outdated. The post used `helm repo add bitnami https://charts.bitnami.com/bitnami`, but the current Bitnami chart README documents OCI installs and requires Helm 3.8+. I updated the prerequisite and install command to use `oci://registry-1.docker.io/bitnamicharts/mongodb`.
- The values file used `service.port`, but the current chart expects `service.ports.mongodb`. I corrected the values snippet to the documented field shape.
- The values file mixed inline passwords with `auth.existingSecret`. In the current chart, passwords come from the existing secret when that setting is used. I removed the inline password entries and clarified that passwords come from the secret while keeping `auth.usernames` and `auth.databases`, which the chart still uses.
- The replica set key generation command used `openssl rand -base64 32`, but the Bitnami MongoDB container docs require a replica set key without special characters. I changed this to `openssl rand -hex 32`.
- The example passwords contained `@`, but the post later embedded those passwords directly in MongoDB URIs. MongoDB connection strings require reserved characters in usernames/passwords to be percent-encoded. I changed the sample passwords to URI-safe values so the examples work as written.
- The `kubectl exec ... mongosh -p ${MONGODB_ROOT_PASSWORD}` commands assumed the password was exported in the local shell, which the guide never did. I updated those commands to run through `bash -lc` inside the container and use the password environment variable that the Bitnami chart actually sets in the pod.
- The replica set verification used `db.adminCommand({ isMaster: 1 })`, which is deprecated in MongoDB 5.0+ in favor of `hello`. I replaced that with `db.hello()`.
- The post said `mongodb-0` was the primary. Bitnami’s current chart docs explicitly say not to assume a fixed pod remains primary. I changed the wording to connect to a MongoDB pod and verify its role with `db.hello()`.
- The guide tried to create `appuser` manually in Step 4 even though the chart already creates custom users defined by `auth.usernames` and `auth.databases` during initialization. I replaced that step with a verification command.
- The application Deployment manifest was invalid/incomplete for `apps/v1` because it lacked a required selector and matching labels. I added `metadata.labels`, `spec.selector`, and template labels.
- The application Deployment referenced a Secret from a different namespace (`production` vs `databases`), which would fail because Secret references are namespace-scoped. I aligned the example Deployment to the `databases` namespace used elsewhere in the post.
- The application Deployment defined `MONGODB_URI` before `MONGODB_PASSWORD`, but Kubernetes only expands dependent environment variables when the referenced variable is already defined earlier in the `env` list. I reordered them.
- The backup CronJob used `mongodump --replicaSet=rs0`, but current `mongodump` docs show replica set selection via the URI or `--host`, not a `--replicaSet` flag. I moved the replica set setting into the URI.
- The backup example referenced a PVC that was never created. I added a PVC manifest to make the example runnable as written.
- The backup example pinned `bitnami/mongodb:7.0`, while the current Bitnami chart app version is 8.0.13. I aligned the backup image to the current Bitnami chart image shown in the official chart metadata.
- The MongoDB operator section used the older `mongodb/community-operator` chart install flow. Current official MongoDB docs use the `mongodb/mongodb-kubernetes` chart and require the CRDs to be applied. I updated the install commands accordingly.
- The MongoDBCommunity example omitted the password Secret and `scramCredentialsSecretName` for the user example. I added both so the operator example is complete and consistent with the official MongoDB community docs and samples.
- The conclusion still referred to the old Community Operator naming after the install section was updated. I aligned the wording with the current MongoDB Kubernetes Operator naming.

## Review Notes
- The main Helm-based deployment path is now aligned with the Bitnami chart state validated on 2026-04-23, where the chart README documents Helm OCI usage and the chart metadata reports MongoDB app version 8.0.13.
- The alternative operator example still pins `MongoDBCommunity.spec.version` to `7.0.0`. That is a valid MongoDB version, but it is not the newest MongoDB release available as of 2026-04-23.
- MongoDB’s operator documentation is currently split between the newer MongoDB Controllers for Kubernetes docs and the official `mongodb/mongodb-kubernetes` GitHub community documentation. The edited post now uses the current install path plus the official community CR examples.
- The review was documentation-based. The commands and manifests were not executed against a live Rancher-managed cluster in this workspace.

# Back Up CloudNativePG to MinIO or S3 with IAM, Custom CAs, and Path-Style URLs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, PostgreSQL, MinIO, S3, IAM, Backup

Description: Configure Barman Cloud plugin backups with S3-compatible endpoints, private certificate authorities, IAM roles, and verified addressing-style behavior.

---

A CloudNativePG backup configuration must get four independent details right: where objects live, how the pod authenticates, which certificate authority it trusts, and how the S3 client addresses the bucket. A successful connection from your laptop does not establish any of those for the database pod.

Use CloudNativePG 1.30 with a compatible Barman Cloud plugin; the plugin documentation currently describes 0.15.0. Install the plugin and its certificate prerequisites using the [official installation procedure](https://cloudnative-pg.io/plugin-barman-cloud/docs/installation/) before applying `ObjectStore` resources. The examples assume namespace `database`, an existing `orders` Cluster, and a pre-created bucket.

## Configure MinIO with a private CA

Store access credentials through your normal secret-management system. This example expects a Secret named `minio-credentials` containing `ACCESS_KEY_ID` and `ACCESS_SECRET_KEY`.

Create a separate CA Secret from the trusted issuer bundle:

```bash
kubectl create secret generic minio-ca -n database \
  --from-file=ca.crt=./minio-ca.crt
```

Use the MinIO S3 API endpoint, not its web console port:

```yaml
apiVersion: barmancloud.cnpg.io/v1
kind: ObjectStore
metadata:
  name: orders-archive
  namespace: database
spec:
  configuration:
    destinationPath: s3://postgres-backups/production
    endpointURL: https://minio.storage.example.com:9000
    endpointCA:
      name: minio-ca
      key: ca.crt
    s3Credentials:
      accessKeyId:
        name: minio-credentials
        key: ACCESS_KEY_ID
      secretAccessKey:
        name: minio-credentials
        key: ACCESS_SECRET_KEY
    wal:
      compression: gzip
    data:
      compression: gzip
  retentionPolicy: "30d"
```

The endpoint's hostname must match its TLS certificate, and the CA bundle must establish trust. `endpointCA` does not disable hostname verification. CloudNativePG's plugin [object-store provider guide](https://cloudnative-pg.io/plugin-barman-cloud/docs/object_stores/) documents these fields and S3-compatible services.

Keep the bucket in `destinationPath`. Adding `/postgres-backups` to `endpointURL` as well can produce the wrong request path. Leave `ObjectStore.spec.configuration.serverName` empty; the plugin manages archived server identity separately.

## Connect the cluster and schedule base backups

Merge this fragment into the existing Cluster manifest, preserving its other settings:

```yaml
spec:
  plugins:
    - name: barman-cloud.cloudnative-pg.io
      isWALArchiver: true
      parameters:
        barmanObjectName: orders-archive
```

For a cluster already using in-tree Barman support, follow the [migration procedure](https://cloudnative-pg.io/plugin-barman-cloud/docs/migration/) so the old and new archive configurations are changed together. Enabling WAL archiving does not establish a recurring base-backup schedule.

Create one explicitly:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: orders-daily
  namespace: database
spec:
  schedule: "0 0 2 * * *"
  backupOwnerReference: self
  cluster:
    name: orders
  method: plugin
  pluginConfiguration:
    name: barman-cloud.cloudnative-pg.io
```

CloudNativePG schedules have six fields, beginning with seconds. This example requests a daily backup at 02:00 in the scheduler's configured time context; verify that context rather than assuming the application's timezone.

## Use IAM roles on EKS

For AWS S3, use the bucket's S3 destination and normally omit the custom endpoint and private CA. With IRSA, bind an IAM role to the PostgreSQL Cluster's ServiceAccount through the following Cluster fragment:

```yaml
spec:
  serviceAccountTemplate:
    metadata:
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/orders-backup
```

Replace the example account and role. Configure the role's trust policy for the exact namespace and ServiceAccount subject, and omit static access-key references when using the role's credential flow. The [EKS IRSA documentation](https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html) describes the trust and association requirements.

For the AWS variant, replace the MinIO-specific `ObjectStore` connection settings with the appropriate bucket and role-based credentials. Remove the MinIO endpoint, CA reference, and static-key selectors; preserve compression and retention settings as needed:

```yaml
# ObjectStore fragment for AWS S3 with IRSA.
spec:
  configuration:
    destinationPath: s3://aws-postgres-backups/production
    s3Credentials:
      inheritFromIAMRole: true
```

The [ObjectStore schema](https://github.com/cloudnative-pg/plugin-barman-cloud/blob/v0.15.0/config/crd/bases/barmancloud.cnpg.io_objectstores.yaml) documents `inheritFromIAMRole`. Ensure the running Pod actually received the projected token and role environment; changing a ServiceAccount annotation alone does not inject credentials into an already-created Pod.

Scope permissions to the intended bucket and prefix. Backup, recovery, and retention need different operations: object upload, object read and listing, multipart cleanup, and deletion as appropriate. KMS-encrypted archives also need the corresponding key permissions. Verify the identity assumed by the actual backup or recovery pod, not just the operator controller.

## Verify path-style behavior instead of inventing a field

Path-style addresses look like `endpoint/bucket/object`; virtual-hosted addresses look like `bucket.endpoint/object`. DNS and certificate requirements differ. The current plugin provider guide shows a base `endpointURL` with the bucket in `destinationPath` for path-style S3-compatible storage.

There is no general `s3ForcePathStyle` field in the illustrated `ObjectStore` API. Inspect the Barman version shipped in your sidecar and its command help before adding options. Barman 3.20 documents `--addressing-style=path`, `virtual`, or `auto` in its [cloud command reference](https://docs.pgbarman.org/release/3.20.0/user_guide/barman_cloud.html).

For an administrative read-only diagnostic using a compatible Barman version:

```bash
barman-cloud-backup-list --cloud-provider aws-s3 \
  --endpoint-url https://minio.storage.example.com:9000 \
  --addressing-style path --format json \
  s3://postgres-backups/production orders
```

Configure that environment's credentials and CA trust separately. Plugin extra-command arguments are operation-specific; a flag passed to base backup does not automatically configure WAL restore, catalog listing, or retention. Prefer the documented endpoint behavior and test the complete lifecycle before introducing overrides.

## Prove recoverability

Trigger an on-demand plugin backup, inspect its completion and archive logs, then restore into a new isolated Cluster using the original archived server name. Check records and recovery duration. Finally, confirm retention can clean obsolete objects without deleting the recovery window you promised.

A working setup passes upload, WAL archive, listing, restore, and retention checks from the identities and networks that will perform those operations during an incident.

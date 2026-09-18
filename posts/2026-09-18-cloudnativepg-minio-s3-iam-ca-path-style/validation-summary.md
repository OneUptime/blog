# Validation Summary: Back Up CloudNativePG to MinIO or S3 with IAM, Custom CAs, and Path-Style URLs

## Status
validated

## Post Type
Technical configuration guide with Kubernetes YAML and command-line examples.

## Technologies Covered
- CloudNativePG 1.30 and PostgreSQL backup and recovery
- Barman Cloud plugin 0.15.0 and Barman 3.20
- Kubernetes Secrets, ServiceAccounts, and ScheduledBackup resources
- MinIO and Amazon S3
- AWS EKS IRSA, IAM, and KMS
- TLS certificate authorities and S3 addressing styles

## Sources Consulted
- [CloudNativePG 1.30 release notes](https://cloudnative-pg.io/docs/1.30/release_notes/v1.30/) — version availability and in-tree backup deprecation.
- [CloudNativePG 1.30 backup documentation source](https://github.com/cloudnative-pg/cloudnative-pg/blob/release-1.30/docs/src/backup.md) — six-field schedules and backup ownership. Used the official repository source because the rendered backup documentation could not be retrieved.
- [Barman Cloud plugin installation](https://cloudnative-pg.io/plugin-barman-cloud/docs/installation/) — plugin version, operator compatibility, and certificate prerequisites.
- [Plugin object-store providers](https://cloudnative-pg.io/plugin-barman-cloud/docs/object_stores/) — MinIO endpoints, credential selectors, private CAs, IRSA, and S3-compatible endpoint examples.
- [Using the plugin](https://cloudnative-pg.io/plugin-barman-cloud/docs/usage/) — WAL archiver configuration, backup methods, and archived server identity during recovery.
- [Plugin migration procedure](https://cloudnative-pg.io/plugin-barman-cloud/docs/migration/) — atomic Cluster configuration changes and plugin ScheduledBackup fields.
- [ObjectStore v0.15.0 CRD](https://raw.githubusercontent.com/cloudnative-pg/plugin-barman-cloud/v0.15.0/config/crd/bases/barmancloud.cnpg.io_objectstores.yaml) — field names, IAM inheritance, compression, retention syntax, and operation-specific extra arguments. Retrieved the raw file corresponding to the post's GitHub link.
- [Plugin retention policies](https://cloudnative-pg.io/plugin-barman-cloud/docs/retention/) — recovery-window retention and automated cleanup.
- [Barman 3.20 cloud command reference](https://docs.pgbarman.org/release/3.20.0/user_guide/barman_cloud.html) — backup-list arguments, JSON output, and addressing-style options.
- [Kubernetes kubectl create secret generic](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/) — named file keys and Secret creation syntax.
- [AWS EKS ServiceAccount role association](https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html) — IRSA annotation, OIDC trust subject, and role association.
- [Boto3 configuration](https://docs.aws.amazon.com/boto3/latest/guide/configuration.html) — CA bundle configuration and S3 addressing modes.
- [S3 operation permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html) — object access, listing, multipart operations, and KMS permissions.

## Issues Found
No technical issues found. README.md was left unchanged.

## Review Notes
- Parsed all five YAML examples successfully with PyYAML and checked their fields against official documentation and the versioned ObjectStore schema. Cluster fragments are intentionally partial and must be merged into an existing manifest as instructed.
- Confirmed the Secret command's explicit file-to-key mapping and the Barman listing command's provider, endpoint, addressing style, output format, and positional arguments.
- The plugin documentation identifies version 0.15.0 and requires CloudNativePG 1.26 or newer; the stated 1.30 version satisfies that requirement. In-tree Barman support is deprecated, and the 1.30 release notes schedule removal for 1.31.
- The schedule includes seconds and requests 02:00 daily. The post correctly avoids assuming that the application's timezone controls the scheduler.
- The provider guide illustrates a base endpoint with a separate bucket destination. This is not a universal guarantee of addressing behavior under every client configuration; the post appropriately requires verification and distinguishes the diagnostic command from plugin-wide configuration.
- The archived server name defaults to the Cluster name in this example. Recovery must reference the original archive identity through the plugin configuration, while ObjectStore.configuration.serverName remains empty.
- Validation was based on official documentation, schema inspection, and local YAML parsing. No Kubernetes cluster, MinIO service, or AWS account was used to execute backup, TLS, IAM, restore, or retention tests. Those environment-specific lifecycle checks remain necessary as the post describes.

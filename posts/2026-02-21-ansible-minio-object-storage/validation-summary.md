# Validation Summary: How to Use Ansible to Set Up a MinIO Object Storage Server

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- MinIO Server
- MinIO Client (`mc`)
- S3-compatible object storage
- TLS certificates
- systemd
- AWS CLI

## Sources Consulted
- MinIO Server reference: https://min.io/docs/minio/linux/reference/minio-server/minio-server.html
- MinIO Linux deployment guide: https://min.io/docs/minio/linux/operations/install-deploy-manage/deploy-minio-single-node-multi-drive.html
- MinIO TLS network encryption documentation: https://min.io/docs/minio/linux/operations/network-encryption.html
- MinIO Client reference: https://min.io/docs/minio/linux/reference/minio-mc.html
- MinIO `mc anonymous set` reference: https://min.io/docs/minio/linux/reference/minio-mc/mc-anonymous-set.html
- MinIO `mc version enable` reference: https://min.io/docs/minio/linux/reference/minio-mc/mc-version-enable.html
- MinIO `mc ilm rule add` reference: https://min.io/docs/minio/linux/reference/minio-mc/mc-ilm-rule-add.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- AWS CLI `s3 ls` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/ls.html

## Issues Found
- The `minio_version` default was declared but not used. The server download task fetched the current latest MinIO binary instead of the pinned release. Updated the URL to use MinIO's archived binary path for `{{ minio_version }}`.
- The role defined `minio_api_port`, but the MinIO service did not pass `--address`, so changing the variable would not change the API listener. Added `--address :{{ minio_api_port }}` to `MINIO_OPTS`.
- TLS was enabled by default, but the health check, `mc alias set`, and AWS CLI example used `http://localhost:9000`. Updated the role to build a `minio_endpoint` from the TLS setting and domain, then use that endpoint consistently.
- The environment template used `MINIO_CERTS_DIR`, but MinIO documentation describes configuring a custom certificate directory with the `--certs-dir` server option. Updated `MINIO_OPTS` to pass `--certs-dir {{ minio_config_dir }}/certs` when TLS is enabled.
- The systemd `ExecStart` placed volumes before options. Updated it to match MinIO's documented service pattern: `minio server $MINIO_OPTS $MINIO_VOLUMES`.
- The handlers listed `restart minio` before `reload systemd`. Since Ansible runs handlers in definition order, a service-file change could restart before systemd reloaded unit files. Reordered handlers so `reload systemd` runs first.

## Review Notes
The `mc` bucket, anonymous policy, versioning, lifecycle, and AWS CLI command forms are current and match the referenced documentation. The example assumes `s3.example.internal` resolves to the MinIO host and that the TLS certificate is trusted by clients.

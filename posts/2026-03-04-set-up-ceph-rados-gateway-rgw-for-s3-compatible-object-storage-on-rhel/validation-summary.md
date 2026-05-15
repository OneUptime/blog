# Validation Summary: How to Set Up Ceph RADOS Gateway (RGW) for S3-Compatible Object Storage on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Ceph Storage / Ceph
- Cephadm orchestrator
- Ceph RADOS Gateway (RGW)
- S3-compatible object storage
- AWS CLI
- firewalld

## Sources Consulted
- Ceph RGW Service documentation: https://docs.ceph.com/en/latest/cephadm/services/rgw/
- Ceph radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph RGW Admin Guide: https://docs.ceph.com/en/latest/radosgw/admin/
- Red Hat Ceph Storage Object Gateway Guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/8/html-single/object_gateway_guide/object_gateway_guide
- AWS CLI endpoint configuration documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-endpoints.html
- AWS CLI s3 mb command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/mb.html

## Issues Found
- The HTTPS configuration example used `ceph config set ... rgw_frontends` with a local certificate path. For cephadm-managed RGW services, current official documentation recommends applying an RGW service spec with `ssl: true` and either inline, referenced, or cephadm-signed certificates. I replaced the command with an inline certificate service spec and `ceph orch apply -i rgw-https.yaml`.
- The quota section was titled "Set Bucket Quotas", but the commands used `--quota-scope=user`, which sets a user quota. I changed the heading to "Set User Quotas" to match the commands.

## Review Notes
The examples assume a running and healthy Ceph cluster managed by cephadm, RGW-capable hosts already added to the orchestrator, and DNS or host resolution for `node1`. The AWS CLI examples correctly use `--endpoint-url` for a custom S3-compatible endpoint.

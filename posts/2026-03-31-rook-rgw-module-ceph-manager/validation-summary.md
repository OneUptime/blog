# Validation Summary: How to Configure the RGW Module in Ceph Manager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph Manager (mgr) RGW module
- RADOS Gateway (RGW)
- Ceph Orchestrator
- Rook Ceph Operator (CephObjectStore CRD)
- radosgw-admin CLI
- AWS CLI (S3-compatible endpoint access)

## Sources Consulted
- Ceph official documentation: RGW module (https://docs.ceph.com/en/latest/mgr/rgw/)
- Ceph official documentation: radosgw-admin (https://docs.ceph.com/en/latest/radosgw/admin/)
- Ceph official documentation: Orchestrator CLI (https://docs.ceph.com/en/latest/cephadm/services/rgw/)
- Rook documentation: CephObjectStore CRD (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/)
- AWS CLI documentation: s3 commands (https://docs.aws.amazon.com/cli/latest/reference/s3/)

## Issues Found
1. **Incorrect AWS CLI credential flags**: The post used `--aws-access-key-id` and `--aws-secret-access-key` as command-line flags to `aws s3 ls`. The AWS CLI does not accept credentials as command-line options. Fixed by using inline environment variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` instead, which is the standard approach for one-off commands.

## Review Notes
- The `ceph mgr module enable rgw` command and the realm/zonegroup/zone creation workflow are all correct and follow current Ceph documentation.
- The `ceph orch apply rgw` command uses the correct `realm.zonegroup.zone` service ID format with valid `--placement` and `--port` flags.
- The Rook CephObjectStore YAML uses the correct `ceph.rook.io/v1` API version and valid spec fields.
- The `ceph orch ps --daemon-type rgw` command is correct for listing RGW daemons.
- The `radosgw-admin user create` command uses correct flags.

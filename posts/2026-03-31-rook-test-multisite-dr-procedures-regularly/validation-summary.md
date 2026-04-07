# Validation Summary: How to Test Multisite DR Procedures Regularly

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway) Multisite
- Rook (Ceph operator for Kubernetes)
- radosgw-admin CLI
- AWS CLI (S3-compatible operations)
- Prometheus alerting rules
- Bash scripting
- systemd (ceph-radosgw service management)

## Sources Consulted
- Ceph official documentation on multisite sync: https://docs.ceph.com/en/latest/radosgw/multisite/
- radosgw-admin CLI reference: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- AWS CLI S3 commands reference: https://docs.aws.amazon.com/cli/latest/reference/s3/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
No technical issues found.

## Review Notes
- The post is tagged with "Rook" but uses `systemctl` commands (`systemctl stop ceph-radosgw@rgw.us-east`, etc.) which apply to bare-metal/non-containerized Ceph deployments. In a Rook-managed environment, you would instead scale down Kubernetes deployments or delete RGW pods. The `radosgw-admin` commands are valid in both contexts (run from the Rook toolbox pod in Kubernetes). This is acceptable since the concepts transfer, but readers using Rook should adapt the service management commands to Kubernetes equivalents (e.g., `kubectl scale deployment` or `kubectl delete pod`).
- The Prometheus metric `ceph_rgw_metadata_sync_behind_shards` is used illustratively. The actual metric names exposed by the ceph-mgr Prometheus module may differ depending on the Ceph version. Readers should verify available metrics in their environment via the Ceph Prometheus endpoint.
- The failback procedure is simplified for drill purposes. In production, you would need to ensure data has fully resynced to the original primary before promoting it back to master.

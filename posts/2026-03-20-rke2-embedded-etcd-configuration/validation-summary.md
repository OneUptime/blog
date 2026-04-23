# Validation Summary: How to Configure RKE2 with Embedded etcd - Configuration

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- RKE2
- Embedded etcd
- Kubernetes
- etcdctl
- YAML configuration
- S3-compatible object storage
- Linux systemd services

## Sources Consulted
- RKE2 Embedded Datastore documentation: https://docs.rke2.io/datastore/embedded
- RKE2 High Availability documentation: https://docs.rke2.io/install/ha
- RKE2 Configuration Options documentation: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Backup and Restore documentation: https://docs.rke2.io/datastore/backup_restore
- RKE2 CIS self-assessment etcd configuration references: https://docs.rke2.io/security/cis_self_assessment19
- K3s embedded etcd source defaults used by RKE2 datastore code: https://github.com/k3s-io/k3s/blob/main/pkg/etcd/etcd.go
- etcd v3.6 Configuration Options documentation: https://etcd.io/docs/v3.6/op-guide/configuration/
- etcd Tuning documentation: https://etcd.io/docs/v3.4/tuning/
- etcd Maintenance documentation: https://etcd.io/docs/v3.5/op-guide/maintenance/
- etcd cluster status documentation: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/

## Issues Found
- The post described HA as "three or more server nodes." RKE2 HA guidance requires at least three server nodes and recommends an odd number of server nodes because of etcd quorum behavior. Updated the wording.
- The etcd tuning example cited the upstream etcd 100ms heartbeat default and used `heartbeat-interval=150` / `election-timeout=1500`, which are below RKE2's embedded etcd defaults of 500ms / 5000ms. Updated the example to use 1000ms / 10000ms for a high-latency or disk-latency tuning example, and noted that the values should remain consistent on all members.
- The restore command used a local snapshot path even though the earlier configuration can enable S3 snapshots. RKE2 documentation says a local restore with S3 configuration present should pass `--etcd-s3=false`; updated the command accordingly.
- The multi-server restore flow restarted all nodes immediately after `--cluster-reset`. RKE2 documentation requires starting the restored server first, then removing the old database on peer etcd servers before they rejoin. Updated the restore example to back up and move the old database directory on the other server nodes before restarting them.

## Review Notes
The RKE2 and etcd commands were reviewed against official documentation and source references rather than executed, because running the restore and service commands would stop or reset RKE2 services on the review host. A future improvement would be to show the S3 restore variant separately, where the restore path is only the snapshot filename and S3 flags are supplied on the command line.

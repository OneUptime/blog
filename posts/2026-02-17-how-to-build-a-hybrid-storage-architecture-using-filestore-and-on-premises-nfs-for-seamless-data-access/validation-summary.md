# Validation Summary: How to Build a Hybrid Storage Architecture Using Filestore and On-Premises NFS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Filestore
- NFSv3
- Compute Engine
- Google Kubernetes Engine PersistentVolumes and PersistentVolumeClaims
- Cloud VPN and Cloud Interconnect
- Google Cloud CLI
- Cloud Monitoring dashboards and alerting policies
- rsync and inotify
- Python subprocess-based sync scripting

## Sources Consulted
- Google Cloud Filestore instance creation documentation: https://docs.cloud.google.com/filestore/docs/creating-instances
- `gcloud filestore instances create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/filestore/instances/create
- Google Cloud Filestore overview, service tiers, protocol support, and connectivity: https://docs.cloud.google.com/filestore/docs/overview
- Google Cloud Filestore remote mounting documentation: https://docs.cloud.google.com/filestore/docs/remote-mounting
- Google Cloud Filestore firewall rules documentation: https://docs.cloud.google.com/filestore/docs/configuring-firewall
- Google Cloud Filestore monitoring documentation: https://docs.cloud.google.com/filestore/docs/monitoring-instances
- Google Cloud Monitoring metric type list for Filestore metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_d_h
- `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Kubernetes PersistentVolume documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Linux `inotify(7)` manual page: https://man7.org/linux/man-pages/man7/inotify.7.html

## Issues Found
- The Basic HDD Filestore example was described as "high-performance", but Google Cloud documents Basic tiers as legacy/basic file sharing tiers. Changed the comment to "cost-effective" while leaving the valid `BASIC_HDD` command intact.
- The firewall rule example created an ingress rule from on-premises IP ranges to the VPC, which does not match Filestore's documented firewall guidance. Updated it to an egress rule for restrictive VPC environments and used the documented NFS ports for traffic to Filestore.
- The inotify example implied that a watcher on an NFS mount could provide general near-real-time sync. The Linux `inotify` API does not catch remote filesystem events, so the example now says to run the watcher on the NFS server or another host where writes happen locally.
- The scheduled Python sync example claimed to provide conflict detection, but the conflict detection functions were never called by `sync()`. Changed the explanation and code to accurately describe a scheduled bidirectional `rsync --update` approach where newer files win.
- The Cloud Monitoring dashboard panel was titled "Read/Write IOPS" but included only the read operation metric. Added the documented `file.googleapis.com/nfs/server/write_ops_count` metric to the same chart.
- The alerting policy command used outdated or invalid threshold flags. Replaced them with the current documented `gcloud monitoring policies create` syntax using `--duration=300s` and `--if='> 80'`.

## Review Notes
The post is now technically consistent with current Google Cloud documentation. For a production migration, a future revision should recommend Filestore CSI driver usage for dynamic GKE provisioning and a stateful or managed synchronization tool for true multi-writer conflict detection, but those are design-depth improvements rather than correctness blockers for this guide.

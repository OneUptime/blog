# Validation Summary: How to Deploy OpenEBS with ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD Applications
- GitOps
- Kubernetes StorageClasses
- OpenEBS 4.0.0
- OpenEBS Local PV Hostpath, LVM, and ZFS
- OpenEBS Replicated PV Mayastor
- Prometheus Operator ServiceMonitor and PrometheusRule

## Sources Consulted
- OpenEBS 4.0.x installation documentation: https://openebs.io/docs/4.0.x/quickstart-guide/installation
- OpenEBS 4.0.x upgrade and Helm repository documentation: https://openebs.io/docs/4.0.x/user-guides/upgrade
- OpenEBS 4.0.0 Helm chart values and dependencies: https://github.com/openebs/openebs/blob/v4.0.0/charts/values.yaml and https://github.com/openebs/openebs/blob/v4.0.0/charts/Chart.yaml
- OpenEBS Local PV Hostpath documentation: https://openebs.io/docs/3.8.x/user-guides/localpv-hostpath
- OpenEBS 4.0.x Local PV LVM configuration: https://openebs.io/docs/4.0.x/user-guides/local-storage-user-guide/local-pv-lvm/lvm-configuration
- OpenEBS 4.0.x Local PV ZFS configuration: https://openebs.io/docs/4.0.x/user-guides/local-storage-user-guide/local-pv-zfs/zfs-configuration
- OpenEBS 4.0.x Replicated PV Mayastor configuration: https://openebs.io/docs/4.0.x/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/rs-configuration
- OpenEBS Replicated PV Mayastor monitoring documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/advanced-operations/monitoring
- Argo CD resource health customization documentation: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/health/

## Issues Found
- The OpenEBS Helm values included unsupported `localpv-provisioner.enabled`, `lvm-localpv.storageClass`, and `zfs-localpv.storageClass` keys for the OpenEBS 4.0.0 umbrella chart. Removed those unsupported keys and kept StorageClass creation in the explicit Kubernetes manifests later in the post.
- The lightweight installation enabled Local PV LVM while only configuring Hostpath storage. Changed the LVM engine flag to `false` so the snippet matches the lightweight Hostpath-only example.
- The Mayastor StorageClass used `repl_count` and `ioTimeout`, but Replicated PV Mayastor 2.6.0 documents `repl` and `protocol` for the basic replicated StorageClass. Changed `repl_count: "3"` to `repl: "3"` and removed `ioTimeout`.
- The DiskPool custom health check tested `status.state == "Online"`, but OpenEBS reports pool health in `status.pool_status` while `status.state` represents lifecycle state such as `Created`. Updated the health check to evaluate `pool_status`.
- The Prometheus metric names and alert expressions used non-documented `openebs_*` metric names. Replaced them with documented Mayastor exporter and kubelet volume metrics such as `disk_pool_status`, `disk_pool_total_size_bytes`, `disk_pool_used_size_bytes`, `volume_bytes_read`, and `kubelet_volume_stats_used_bytes`.
- The ServiceMonitor used a 30-second scrape interval, while the Mayastor monitoring documentation recommends a Prometheus poll interval of at least five minutes. Changed the interval to `5m`.

## Review Notes
OpenEBS 4.0.x documentation is no longer the actively maintained documentation stream, but the post pins chart version `4.0.0`, so version-specific examples were validated against the OpenEBS 4.0.x docs and the `v4.0.0` chart sources. Newer OpenEBS versions use `openebs.io/v1beta3` for DiskPool examples, while OpenEBS 4.0.x documents `openebs.io/v1beta2`.

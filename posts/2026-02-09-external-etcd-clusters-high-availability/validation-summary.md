# Validation Summary: How to Set Up External etcd Clusters for Kubernetes High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubeadm
- etcd
- etcdctl
- etcdutl
- TLS certificates with cfssl
- systemd
- Prometheus
- cron

## Sources Consulted
- etcd v3.5 configuration options: https://etcd.io/docs/v3.5/op-guide/configuration/
- etcd v3.5 maintenance guide: https://etcd.io/docs/v3.5/op-guide/maintenance/
- etcd v3.5 monitoring guide: https://etcd.io/docs/v3.5/op-guide/monitoring/
- etcd v3.4 disaster recovery guide: https://etcd.io/docs/v3.4/op-guide/recovery/
- etcd May 2026 security patch release: https://etcd.io/blog/2026/may-patch-release/
- Kubernetes kubeadm HA external etcd guide: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/setup-ha-etcd-with-kubeadm/
- Kubernetes kubeadm HA topology guide: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/
- Kubernetes kubeadm v1beta4 configuration API: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes kubeadm config reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-config/

## Issues Found
- The opening description implied etcd maintenance can happen without affecting the control plane. Updated the wording to clarify that external etcd separates etcd maintenance from control plane node maintenance, while API servers still depend on etcd.
- The architecture section stated etcd failures do not directly impact control plane nodes. Updated the statement to avoid implying Kubernetes API availability is independent of etcd availability.
- The guide said etcd node counts should always be odd. Updated this to "prefer odd numbers for optimal quorum" because even-member etcd clusters can run but do not improve failure tolerance efficiently.
- The installation example used etcd v3.5.10. Updated it to v3.5.30, the patched v3.5 release noted by the etcd project in May 2026.
- The TLS section said etcd requires TLS. Updated this to say production external etcd clusters should use TLS, since TLS is strongly recommended for secure Kubernetes deployments but not a hard etcd runtime requirement.
- The kubeadm example used the deprecated `kubeadm.k8s.io/v1beta3` configuration API and an old Kubernetes version. Updated it to `kubeadm.k8s.io/v1beta4` and Kubernetes `v1.35.5`.
- The backup script attempted to write `/usr/local/bin/etcd-backup.sh` and set executable permissions without privilege. Updated the script creation to use `sudo tee` and `sudo chmod`.
- The snapshot verification command used `etcdctl snapshot status`. Updated it to `etcdutl snapshot status`, matching current etcd maintenance documentation for snapshot status inspection.
- The manual compaction command extracted all endpoint revisions, which can pass multiple revision arguments to `etcdctl compact`. Updated the `jq` expression to select the maximum revision from the endpoint status response.

## Review Notes
The TLS certificate examples are functional for a tutorial but production deployments should normally issue separate peer, server, health-check, and API server etcd client certificates, as shown in the kubeadm external etcd documentation. The Prometheus scrape example assumes the client certificate is accepted by etcd and that the certificate SANs match the configured targets.

# Validation Summary: How to Troubleshoot Rancher HA Cluster Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- RKE2
- K3s
- etcd
- MySQL / MariaDB
- kubectl
- AWS Elastic Load Balancing

## Sources Consulted
- Rancher About High-availability Installations: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/kubernetes-cluster-setup/high-availability-installs
- Rancher Troubleshooting the Rancher Server Kubernetes Cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/troubleshooting
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher Setting up a High-availability K3s Kubernetes Cluster for Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-cluster-setup/k3s-for-rancher
- RKE2 High Availability: https://docs.rke2.io/install/ha
- RKE2 Backup and Restore: https://docs.rke2.io/datastore/backup_restore
- RKE2 Certificate Management: https://docs.rke2.io/security/certificates
- K3s Cluster Datastore: https://documentation.suse.com/cloudnative/k3s/latest/en/datastore/datastore.html
- K3s Backup and Restore: https://documentation.suse.com/external-tree/en-us/cloudnative/k3s/latest/en/datastore/backup-restore.html
- Kubernetes Well-Known Labels, Annotations and Taints: https://kubernetes.io/docs/reference/labels-annotations-taints/
- MySQL Group Replication FAQ: https://dev.mysql.com/doc/refman/9.1/en/group-replication-frequently-asked-questions.html
- MySQL SHOW REPLICA STATUS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html

## Issues Found
- The architecture section implied that an HA Rancher installation stores its state directly in an external MySQL database behind the Rancher pods. Updated the text and diagram to reflect Rancher's documented HA model: Rancher runs on a management cluster, and its state depends on that cluster's datastore.
- The Kubernetes node selector used `node-role.kubernetes.io/control-plane=true`, which is not the standard control-plane label form. Updated it to an existence selector and clarified that the embedded-etcd commands shown are RKE2-specific examples.
- The load balancer section said the target group should contain Rancher replicas and checked `https://<pod-ip>:443/ping` directly on pod IPs. Corrected this to Rancher's documented node/ingress-oriented topology and changed the direct pod check to HTTP on port 80, with an explicit note that pod-network reachability is required.
- The etcd recovery section used a raw `etcdctl snapshot restore` workflow and a placeholder snapshot filename that do not match current RKE2 disaster-recovery guidance. Replaced it with the documented `rke2 server --cluster-reset --cluster-reset-restore-path=...` restore flow and the required peer-node rejoin step.
- The external MySQL section mixed together asynchronous replication, Group Replication, and Galera-style assumptions. Replaced it with narrower external-datastore checks that are supportable from current K3s/RKE2 datastore documentation, including the K3s restriction on MySQL/MariaDB multi-master configurations that change `auto_increment_increment` or `auto_increment_offset`.

## Review Notes
- The etcd commands in Step 2 and Step 5 are intentionally scoped as RKE2 examples. K3s uses different binary paths, and when K3s is backed by an external datastore, backup and restore are handled by that datastore rather than by K3s itself.
- Rancher Helm chart defaults still use `replicas: 3`, but the exact HA behavior also depends on the underlying Kubernetes cluster, ingress controller, and load balancer topology.

# Validation Summary: How to Perform Rancher HA Failover Testing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE2
- Kubernetes
- `kubectl`
- etcd
- `etcdctl`
- Keepalived
- HAProxy / NGINX
- `curl`

## Sources Consulted
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Setting up Amazon ELB Network Load Balancer | Rancher: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/infrastructure-setup/amazon-elb-load-balancer
- About High-availability Installations | Rancher: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/kubernetes-cluster-setup/high-availability-installs
- Setting up a High-availability RKE2 Kubernetes Cluster for Rancher | Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-cluster-setup/rke2-for-rancher
- Rancher Agents | Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/about-rancher-agents
- Communicating with Downstream User Clusters | Rancher: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/rancher-manager-architecture/communicating-with-downstream-user-clusters
- Checklist for Production-Ready Clusters | Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/checklist-for-production-ready-clusters
- RK-API Quick Start Guide | Rancher: https://ranchermanager.docs.rancher.com/v2.14/api/quickstart
- Advanced Options and Configuration | RKE2: https://docs.rke2.io/advanced
- Backup and Restore | RKE2: https://docs.rke2.io/datastore/backup_restore
- kubectl drain | Kubernetes: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Implementation details | Kubernetes: https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/
- Operating etcd clusters for Kubernetes | Kubernetes: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- How to check Cluster status | etcd: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- Keepalived Introduction: https://www.keepalived.org/doc/introduction.html

## Issues Found
- The post used `/ping` as the Rancher availability check in an RKE2-based HA setup. I changed those checks to `/healthz`, and for the VIP test I added the `Host` header, because current Rancher docs document `/healthz` as the Rancher health endpoint and recommend combining the Rancher hostname with `/ping` or `/healthz` for accurate load balancer checks.
- The single-node failure section referred to a Rancher node as a "non-leader." I removed that wording because Rancher HA is described as multiple Rancher replicas behind a load balancer, while leader election in the documented HA architecture applies to etcd, not to Rancher application replicas in this context.
- The abrupt-failure section said it would "kill kubelet" but the command actually stopped `rke2-server`. I corrected the explanation to match the command and current RKE2 service model.
- The etcd test said an etcd member was "removed" even though the command only stopped an `rke2-server` service. I corrected the wording to reflect member loss/unavailability rather than membership removal.
- The load balancer failover step stopped `haproxy` and assumed the VIP would move. I changed this to stopping `keepalived`, because Keepalived's VRRP function is what actually drives VIP failover; stopping HAProxy alone does not inherently force VIP migration.
- The managed-cluster step assumed scaling `cattle-cluster-agent` to zero would make the cluster show as disconnected. I corrected that expectation because Rancher documents that Rancher-provisioned RKE2/K3s clusters can remain connected through `rancher-system-agent` when `cattle-cluster-agent` is unavailable.
- The conclusion claimed failover interruptions would be under 30 seconds and implied zero-downtime failover. I softened that language because the reviewed documentation does not guarantee those timings; the observed interruption depends on pod placement and load balancer or ingress health-check behavior.
- The description and introduction claimed the guide covered network partitions, but the post did not contain a network-partition test. I aligned that wording with the scenarios the post actually covers.

## Review Notes
- The commands using `settings.management.cattle.io` and `clusters.management.cattle.io` assume the operator is using a Rancher-aware kubeconfig with permissions to Rancher management APIs, not just a plain downstream cluster kubeconfig.
- Rancher recommends production architectures with at least three etcd nodes, at least two controlplane nodes, and at least two worker nodes for general workload rescheduling. A dedicated Rancher management cluster can still be a valid three-node HA setup when it only runs Rancher workloads.
- This review validated the post against current official documentation on April 23, 2026. The commands were not executed against a live Rancher environment as part of this review.

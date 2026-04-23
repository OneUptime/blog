# Validation Summary: How to Perform Rancher HA Failover Testing - Testing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RKE2
- K3s
- etcd
- iptables
- Keepalived
- curl
- Bash

## Sources Consulted
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- K3s Stopping K3s: https://docs.k3s.io/upgrades/killall
- K3s Advanced Options / Configuration (`etcdctl` usage): https://docs.k3s.io/advanced
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Embedded Datastore: https://docs.rke2.io/datastore/embedded
- RKE2 Logging: https://docs.rke2.io/reference/logging
- etcd: How to check Cluster status: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- Kubernetes: Create static Pods: https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/
- GNU Bash Reference Manual, Here Documents: https://www.gnu.org/software/bash/manual/bash.html
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The single-node failure test said stopping `RKE2/K3s` on one node simulated a node failure. That is inaccurate for K3s because the K3s docs state that containers continue running when the `k3s` service is stopped. I corrected the section to make the command explicitly RKE2-specific and noted that K3s should be tested via an actual host outage or network isolation.
- The etcd leader-election test used a hard-coded static-pod name (`etcd-server-1`), which is not portable because Kubernetes mirror pod names for static pods are suffixed with the node hostname. I replaced it with an `etcdctl` workflow run from a server node instead of assuming a fixed pod name.
- The original etcd snippet omitted `etcdctl` prerequisites and TLS client authentication details. I updated it to use the documented Rancher-managed etcd certificates and `ETCDCTL_API=3`, matching the official K3s and etcd guidance.
- The original leader-election timing loop only waited for `kubectl get nodes` to return, which does not directly verify that etcd re-elected a leader. I changed the loop to poll `etcdctl --cluster endpoint status` until a leader is reported again.
- The network-partition test appended DROP rules and then restored networking with `iptables -F`, which would flush unrelated firewall rules. I changed it to insert specific DROP rules and remove only those rules afterward.
- The load-balancer failover check curled the VIP IP directly over HTTPS, which does not preserve the Rancher hostname required for accurate routing and TLS/SNI behavior. I changed it to use `curl --resolve` so the request still targets the VIP while using the Rancher hostname.
- The results-recording snippet used a quoted here-document delimiter, which prevents `$(date)` from expanding. I changed the heredoc delimiter to unquoted form so the generated report contains the actual timestamp.

## Review Notes
- The post is technically relevant and suitable for publication after correction.
- The RTO values in the planning table are environment-specific targets rather than universal Rancher guarantees.
- The revised etcd test assumes `etcdctl` is installed on the server node used for the check; K3s explicitly documents that `etcdctl` is not bundled.

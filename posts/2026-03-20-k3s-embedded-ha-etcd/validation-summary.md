# Validation Summary: How to Configure K3s with Embedded HA (etcd)

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- K3s
- Kubernetes
- Embedded etcd
- HAProxy
- Linux system preparation
- etcdctl

## Sources Consulted
- K3s High Availability Embedded etcd: https://docs.k3s.io/datastore/ha-embedded
- K3s Cluster Load Balancer: https://docs.k3s.io/datastore/cluster-loadbalancer
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- K3s etcd Snapshot CLI: https://docs.k3s.io/cli/etcd-snapshot
- K3s Advanced Options / Using etcdctl: https://docs.k3s.io/advanced
- Kubernetes Swap Memory Management: https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/
- etcd Cluster Status Guide: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/

## Issues Found
- The introduction and requirements treated a load balancer as mandatory for embedded-etcd HA itself. I corrected this to match current K3s guidance, which recommends a fixed registration address such as a load balancer for stable registration and API access.
- The Step 1 module persistence example loaded `overlay` but only persisted `br_netfilter`. I updated the modules-load file to persist both modules.
- The HAProxy example exposed a separate `9345` listener. Current K3s load-balancer documentation fronts server nodes on `6443`, which carries K3s supervisor and Kubernetes API traffic, so I removed the extra `9345` frontend/backend and updated the comment.
- The agent installation example omitted `sudo mkdir -p /etc/rancher/k3s`, which would fail on a fresh node, and it relied on `INSTALL_K3S_EXEC="agent"` before `sudo`, which is not a reliable way to preserve that environment variable through `sudo`. I added the directory creation and switched the install command to `sudo sh -s - agent`.
- The etcd membership verification example used `kubectl exec` against an `etcd` pod. K3s runs embedded etcd within the K3s server process and does not bundle `etcdctl`, so I replaced this with the documented `etcdctl` installation and local `endpoint health` / `member list` commands using K3s-managed certificates.
- The snapshot restore example was incomplete for a multi-server embedded-etcd cluster and used a base snapshot name instead of the actual generated snapshot filename. I replaced it with the documented HA restore flow: stop all servers, restore on the first server, restart it, clear peer server databases, and rejoin the peers.

## Review Notes
- The post now aligns with the current K3s embedded-etcd HA, load-balancer, `etcdctl`, and snapshot-restore documentation.
- A single external load balancer remains its own point of failure. The K3s load-balancer documentation shows redundant endpoint patterns such as HAProxy plus Keepalived if end-to-end endpoint HA is required.

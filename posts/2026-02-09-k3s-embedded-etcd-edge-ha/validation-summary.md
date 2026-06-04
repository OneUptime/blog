# Validation Summary: How to Configure K3s with Embedded etcd for High Availability at the Edge

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Kubernetes
- Embedded etcd
- HAProxy
- etcdctl
- K3s etcd snapshots and S3 backup configuration
- Kubernetes API server readiness checks

## Sources Consulted
- K3s High Availability Embedded etcd documentation: https://docs.k3s.io/datastore/ha-embedded
- K3s Cluster Load Balancer documentation: https://docs.k3s.io/datastore/cluster-loadbalancer
- K3s etcd-snapshot CLI documentation: https://docs.k3s.io/cli/etcd-snapshot
- K3s server CLI documentation: https://docs.k3s.io/cli/server
- K3s Configuration Options documentation: https://docs.k3s.io/installation/configuration
- K3s Requirements documentation: https://docs.k3s.io/installation/requirements
- K3s Advanced Options / Using etcdctl documentation: https://docs.k3s.io/advanced#using-etcdctl
- Kubernetes API health endpoints documentation: https://kubernetes.io/docs/reference/using-api/health-checks
- Kubernetes kubeadm high availability documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability

## Issues Found
- The post said K3s includes etcdctl. K3s does not bundle etcdctl, so the verification and failed-member examples were updated to install etcdctl and use the K3s-managed etcd client certificate paths documented by K3s.
- The introduction implied traditional HA Kubernetes requires external etcd clusters or databases. Kubernetes HA can also use stacked etcd, so the wording was narrowed to describe the broader control-plane and datastore planning overhead.
- The etcd health section used `crictl exec` against an etcd container and certificate filenames that do not match the K3s documentation. Replaced those commands with direct `etcdctl` calls against `https://127.0.0.1:2379` using `server-ca.crt`, `client.crt`, and `client.key`.
- The HAProxy example load balanced port `9345`. Current K3s networking documentation lists port `6443` for the K3s supervisor and Kubernetes API server, so the extra `9345` frontend/backend was removed.
- The backup examples rewrote the full systemd `ExecStart` and used `--cluster-init` on every server, which could discard existing install-script arguments. Replaced this with K3s config drop-ins under `/etc/rancher/k3s/config.yaml.d/`.
- The restore instructions removed only `/var/lib/rancher/k3s/server/db/etcd` on peer servers. K3s restore documentation says to delete the peer server database directory, so this was changed to `/var/lib/rancher/k3s/server/db/`.
- The failure test said a quorum-lost cluster becomes read-only. In practice, the API generally becomes unavailable until etcd quorum is restored. Updated the wording accordingly.
- The monitoring manifest attempted to run `k3s etcd-snapshot` inside a pod and referenced a kube-system `etcd` Endpoint that is not a reliable K3s embedded-etcd health check. Replaced it with API server `/readyz?verbose` and direct `etcdctl endpoint status` checks.

## Review Notes
The article is technically relevant and remains a valid K3s embedded-etcd HA guide after the corrections. Future improvements could include calling out that server nodes are schedulable by default unless tainted, and that S3 snapshot credentials are better managed with the K3s S3 config Secret feature where supported.

# Validation Summary: How to Set Up RKE2 High Availability - Setup

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- RKE2
- Kubernetes
- Embedded etcd
- HAProxy / load balancers
- SUSE Rancher
- Linux systemd services
- kubectl, crictl, and etcdctl

## Sources Consulted
- RKE2 High Availability documentation: https://docs.rke2.io/install/ha
- RKE2 Requirements / network ports documentation: https://docs.rke2.io/install/requirements
- RKE2 Quick Start installation documentation: https://docs.rke2.io/install/quickstart
- RKE2 CLI Tools reference: https://docs.rke2.io/reference/cli_tools
- RKE2 Server Configuration reference: https://docs.rke2.io/reference/server_config
- RKE2 Network Options documentation: https://docs.rke2.io/networking/basic_network_options
- RKE2 Backup and Restore / etcd snapshots documentation: https://docs.rke2.io/datastore/backup_restore
- Rancher RKE2 HA cluster setup documentation: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/kubernetes-cluster-setup/rke2-for-rancher
- SUSE Support: Troubleshooting RKE2 etcd Nodes: https://www.suse.com/support/kb/doc/?id=000021653
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/

## Issues Found
- The HAProxy example sent both the Kubernetes API frontend on `6443` and the RKE2 supervisor/registration frontend on `9345` to a single backend whose servers all used port `6443`. I split the configuration into separate `6443` and `9345` backends and added explicit TCP mode so registration traffic reaches the RKE2 supervisor port.
- The server startup examples enabled `rke2-server.service` without installing RKE2 first. I added the official installation script command before enabling the service on the first and additional server nodes.
- The first `kubectl get nodes` command assumed `kubectl` and the kubeconfig were already available in the shell environment. I changed it to use `/var/lib/rancher/rke2/bin/kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml`, matching RKE2 documentation.
- The control-plane node verification used the selector `node-role.kubernetes.io/control-plane=true`, which can miss role labels that are selected by key presence. I changed it to `node-role.kubernetes.io/control-plane`.
- The etcd member-list command used a host-level `/var/lib/rancher/rke2/bin/etcdctl` path. RKE2 documentation lists `kubectl`, `ctr`, and `crictl` as shipped CLI tools, and SUSE guidance runs `etcdctl` inside the etcd container. I updated the command to locate the etcd container with `crictl` and execute `etcdctl` there with the documented RKE2 etcd client certificate paths.
- The load balancer failure-tolerance row said existing connections are unaffected if the load balancer is down. I corrected this to state that existing cluster components can continue, but new registration and clients using the load balancer cannot connect until it recovers.
- The best-practice health check used Kubernetes API `/healthz`, which Kubernetes documents as deprecated. I changed it to `/readyz` on port `6443`.

## Review Notes
The post remains a compact setup guide rather than a full production runbook. Future improvements could add firewall rules for ports `6443`, `9345`, `2379`, and `2380`, note that the load balancer itself should be highly available, and include an example `node-taint` value for dedicated server nodes.

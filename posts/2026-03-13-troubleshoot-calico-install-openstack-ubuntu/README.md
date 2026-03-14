# How to Troubleshoot Installation Issues with Calico on OpenStack Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Ubuntu, Networking, Troubleshooting

Description: A diagnostic guide for resolving Calico installation and networking failures in Ubuntu-based OpenStack deployments.

---

## Introduction

Calico installation failures in Ubuntu OpenStack deployments have several unique failure modes: etcd connectivity issues that prevent Felix from reading configuration, Neutron plugin misconfiguration that causes VM network creation to fail, and BGP session failures that prevent VM IPs from being reachable across the physical network. Unlike Kubernetes deployments, OpenStack uses etcd as the primary datastore rather than the Kubernetes API, so etcd health is critical.

The diagnostic surface spans three layers: OpenStack Neutron, the Calico etcd datastore, and Felix on compute nodes. Understanding which layer is failing tells you which log to read.

## Prerequisites

- Calico partially installed as the Neutron backend on Ubuntu OpenStack
- Root access to controller and compute nodes
- `calicoctl` installed

## Step 1: Check etcd Health

etcd is the foundation of Calico in OpenStack mode.

```bash
# On the controller node
etcdctl endpoint health
etcdctl cluster-health
```

If etcd is unhealthy, fix it before troubleshooting anything else.

## Step 2: Check Neutron Server Logs

```bash
sudo journalctl -u neutron-server --since "30 minutes ago" | grep -iE "error|calico|fail"
sudo tail -100 /var/log/neutron/neutron-server.log | grep -iE "error|calico"
```

Common Neutron-Calico errors:
- `Failed to connect to etcd` — etcd endpoint wrong
- `Calico mechanism driver not found` — package not installed
- `Invalid IP pool CIDR` — IP pool misconfiguration

## Step 3: Check Felix Logs on Compute Nodes

```bash
sudo journalctl -u calico-felix --since "30 minutes ago" | grep -iE "error|fatal"
sudo tail -100 /var/log/calico/felix.log | grep -iE "error|fatal"
```

## Step 4: Verify etcd Connectivity from Compute Nodes

```bash
# On a compute node
etcdctl --endpoints http://<controller-ip>:2379 ls /calico
```

If this fails, check firewall rules for port 2379 between compute and controller nodes.

## Step 5: Check BGP Status on Compute Nodes

```bash
sudo calicoctl node status
```

BGP sessions that are `Idle` or `Active` instead of `Established` indicate routing configuration issues.

## Step 6: Verify Calico Workload Endpoint Creation

After a VM is created in OpenStack, check if Calico creates a workload endpoint.

```bash
calicoctl get workloadendpoints -A
openstack port list | grep <vm-id>
```

If the port appears in Neutron but not in Calico, the Neutron-to-Calico synchronization has a bug. Check the neutron-server logs again.

## Conclusion

Troubleshooting Calico in Ubuntu OpenStack proceeds from etcd health (the shared datastore), through Neutron plugin logs (for VM network creation failures), to Felix logs on compute nodes (for data plane failures), and finally to BGP session state (for routing failures). Each layer has specific logs and tools, and working through them in order quickly identifies the root cause.

# How to Fix NVMEOF_SINGLE_GATEWAY Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, NVMe-oF, Health Check, High Availability

Description: Learn how to fix NVMEOF_SINGLE_GATEWAY in Ceph, a warning that the NVMe-oF gateway has only one instance, creating a single point of failure for NVMe-oF clients.

---

## What Is NVMEOF_SINGLE_GATEWAY?

`NVMEOF_SINGLE_GATEWAY` is a Ceph health warning that appears when the Ceph NVMe-oF (NVMe over Fabrics) gateway service is configured with only a single gateway instance. The NVMe-oF feature (introduced in Ceph Reef) allows block storage to be exported over NVMe-oF protocol, but running a single gateway means there is no high availability - if the gateway pod fails, all NVMe-oF clients lose access.

This warning is Ceph's way of telling you the NVMe-oF setup lacks redundancy.

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] NVMEOF_SINGLE_GATEWAY: NVMe-oF gateway has only one instance
    gateway group 'group0' has only 1 gateway; high availability requires 2 or more
```

Check NVMe-oF gateway status:

```bash
ceph nvmeof gw show
ceph nvmeof gw list
```

## Understanding NVMe-oF Gateway HA

Ceph NVMe-oF uses active-active or active-passive gateway pairs. Each gateway exports NVMe namespaces (backed by Ceph RBD images). For HA, you need at least 2 gateways per gateway group so that if one fails, the other can serve NVMe-oF initiators without interruption.

## Fix Steps

### Step 1 - Check Current Gateway Configuration

```bash
ceph nvmeof gw show
kubectl -n rook-ceph get pods -l app=ceph-nvmeof
```

### Step 2 - Add a Second NVMe-oF Gateway

In Rook, scale the NVMe-oF gateway by updating the `CephNVMEoF` CR:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNVMEoF
metadata:
  name: my-nvmeof
  namespace: rook-ceph
spec:
  serviceAccountName: rook-ceph-operator
  gateway:
    svcPort: 5500
    instances: 2
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"
      limits:
        cpu: "1"
        memory: "1Gi"
```

Apply the configuration:

```bash
kubectl apply -f nvmeof.yaml
```

### Step 3 - Verify Two Gateways Are Running

```bash
kubectl -n rook-ceph get pods -l app=ceph-nvmeof
ceph nvmeof gw list
```

Expected output should show 2 gateways in the same group.

### Step 4 - Configure NVMe-oF Client for Multi-Path

After adding a second gateway, configure NVMe-oF initiators for multipath to take advantage of HA:

```bash
nvme connect-all --transport=tcp --traddr=<gw1-ip> --trsvcid=4420
nvme connect-all --transport=tcp --traddr=<gw2-ip> --trsvcid=4420
```

Enable multipath:

```bash
nvme list
cat /etc/nvme/hostnqn
```

## Verifying HA Functionality

Test failover by deleting one gateway pod:

```bash
kubectl -n rook-ceph delete pod ceph-nvmeof-<hash>
```

NVMe-oF clients should reconnect to the surviving gateway without I/O errors.

## Summary

`NVMEOF_SINGLE_GATEWAY` warns that your Ceph NVMe-oF deployment has no redundancy. Fix it by configuring at least 2 gateway instances in your `CephNVMEoF` CR. With 2 or more gateways, NVMe-oF initiators can fail over automatically when a gateway becomes unavailable, ensuring continuous block storage access.

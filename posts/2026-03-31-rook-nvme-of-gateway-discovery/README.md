# How to Configure NVMe-oF Gateway Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NVMe-oF, Discovery, Gateway

Description: Learn how to configure NVMe-oF discovery in Rook-Ceph so initiators can automatically find and connect to NVMe subsystems without manual configuration.

---

## NVMe-oF Discovery Overview

NVMe-oF discovery allows initiators to automatically find all available NVMe subsystems on a target system without knowing individual target addresses. The NVMe Discovery Service runs on a well-known address/port and returns a log of all subsystems that an initiator is allowed to connect to.

In Rook-Ceph NVMe-oF environments, configuring a discovery service eliminates the need to manually specify target addresses for each subsystem, simplifying client configuration.

## Step 1 - Deploy the Discovery Service

The Ceph NVMe-oF gateway includes a discovery log service. Ensure the gateway is deployed and the discovery port is exposed:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNVMeOFGateway
metadata:
  name: nvmeof-gateway
  namespace: rook-ceph
spec:
  image: quay.io/ceph/nvmeof:1.5
  pool: .nvmeof       # required - must reference an existing CephBlockPool
  group: gateway-grp   # required - gateway ANA group name
  instances: 2
```

## Step 2 - Register Subsystems in the Discovery Log

All subsystems must be registered with the discovery controller. Check that subsystems are visible in the discovery log:

```bash
kubectl exec -it deploy/rook-ceph-nvmeof-nvmeof-gateway -n rook-ceph -- \
  ceph-nvmeof subsystem list
```

Each subsystem should appear in the gateway's discovery log automatically after creation.

## Step 3 - Discover Available Subsystems from the Client

On the NVMe/TCP initiator, run discovery against the gateway's discovery port:

```bash
nvme discover -t tcp -a 192.168.1.50 -s 8009
```

Sample discovery log output:

```text
Discovery Log Number of Records 2, Generation counter 5
=====Discovery Log Entry 0======
trtype:  tcp
adrfam:  ipv4
subtype: nvme subsystem
treq:    not specified, sq flow control disable supported
portid:  0
trsvcid: 4420
subnqn:  nqn.2026-03.com.ceph:subsystem-01
traddr:  192.168.1.50
=====Discovery Log Entry 1======
trtype:  tcp
adrfam:  ipv4
subtype: nvme subsystem
treq:    not specified
portid:  1
trsvcid: 4420
subnqn:  nqn.2026-03.com.ceph:subsystem-02
traddr:  192.168.1.51
```

## Step 4 - Connect to All Discovered Subsystems

Use `nvme connect-all` to automatically connect to all subsystems returned by discovery:

```bash
nvme connect-all -t tcp -a 192.168.1.50 -s 8009
```

This command:
1. Queries the discovery log
2. Connects to all listed subsystems
3. Sets up multipath for subsystems with multiple paths

## Step 5 - Configure Persistent Discovery on the Client

Save discovery configuration for automatic reconnection at boot:

```bash
cat > /etc/nvme/discovery.conf << EOF
--transport=tcp --traddr=192.168.1.50 --trsvcid=8009
--transport=tcp --traddr=192.168.1.51 --trsvcid=8009
EOF

systemctl enable nvmf-autoconnect
systemctl start nvmf-autoconnect
```

## Step 6 - Configure NQN Filtering

Restrict which initiators can see which subsystems in the discovery log by host NQN:

```bash
kubectl exec -it deploy/rook-ceph-nvmeof-nvmeof-gateway -n rook-ceph -- \
  ceph-nvmeof host add \
  --subsystem nqn.2026-03.com.ceph:subsystem-01 \
  --host-nqn "nqn.2014-08.org.nvmexpress:uuid:client-host-uuid"
```

Clients not in the allowed host list will not see the subsystem in their discovery results.

## Summary

NVMe-oF discovery in Rook-Ceph allows initiators to automatically find available subsystems without manual address configuration. Run `nvme discover` against the gateway's discovery port (8009) to list all available subsystems, and use `nvme connect-all` for automatic connection. Configure host NQN filtering to control which clients can discover specific subsystems, and set up `nvmf-autoconnect` for persistent connection at client boot.

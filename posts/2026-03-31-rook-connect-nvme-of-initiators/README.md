# How to Connect NVMe-oF Initiators to Ceph Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NVMe-oF, Initiator, Block Storage

Description: Step-by-step instructions for configuring NVMe-oF initiators on Linux hosts and Kubernetes nodes to connect to Ceph NVMe-oF gateways.

---

## Overview

An NVMe-oF initiator is the client side of the NVMe over Fabrics connection. On Linux, the `nvme-cli` tool manages initiator configuration. Once connected, the remote Ceph storage appears as a local NVMe block device.

## Install NVMe-oF Initiator Tools

```bash
# Debian/Ubuntu
apt-get install -y nvme-cli

# RHEL/CentOS
yum install -y nvme-cli

# Verify installation
nvme version
```

Load required kernel modules:

```bash
modprobe nvme-fabrics
modprobe nvme-tcp
# For RDMA transport:
# modprobe nvme-rdma

# Verify modules loaded
lsmod | grep nvme
```

## Discover Available Subsystems

```bash
GATEWAY_IP="10.0.1.10"
GATEWAY_PORT="4420"

# Discover all subsystems on the gateway
nvme discover -t tcp -a $GATEWAY_IP -s $GATEWAY_PORT

# Example output:
# Discovery Log Number of Records 1, Generation counter 2
# =====Discovery Log Entry 0======
# trtype:  tcp
# adrfam:  ipv4
# subtype: nvme subsystem
# treq:    not specified
# portid:  1
# trsvcid: 4420
# subnqn:  nqn.2024-01.io.ceph:mysubsystem
# traddr:  10.0.1.10
```

## Connect to a Specific Subsystem

```bash
# Connect using NQN and transport details
nvme connect \
  --transport tcp \
  --traddr 10.0.1.10 \
  --trsvcid 4420 \
  --nqn nqn.2024-01.io.ceph:mysubsystem \
  --reconnect-delay 10 \
  --ctrl-loss-tmo 600

# Verify connection
nvme list
# Output:
# Node             SN                   Model              ...
# /dev/nvme0n1     ...                  Ceph bdev ...
```

## Connect All Discovered Subsystems

```bash
# Connect to all subsystems discovered from gateway
nvme connect-all \
  --transport tcp \
  --traddr 10.0.1.10 \
  --trsvcid 4420
```

## Configure Persistent Connections

Create an nvme-cli configuration file for automatic reconnect on boot:

```bash
mkdir -p /etc/nvme

cat > /etc/nvme/discovery.conf << 'EOF'
--transport=tcp --traddr=10.0.1.10 --trsvcid=4420 --reconnect-delay=10 --ctrl-loss-tmo=600
EOF

# Enable nvmf-autoconnect service
systemctl enable nvmf-autoconnect
systemctl start nvmf-autoconnect
```

## Use NVMe Devices in Kubernetes

After connecting on the host, create a PV backed by the NVMe device:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nvmeof-pv
spec:
  capacity:
    storage: 100Gi
  volumeMode: Block
  accessModes:
    - ReadWriteOnce
  local:
    path: /dev/nvme0n1
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - worker-node-1
```

## Summary

Connecting NVMe-oF initiators to Ceph involves loading the nvme-fabrics and nvme-tcp kernel modules, using `nvme discover` to find available subsystems, and `nvme connect` to establish the connection. Persistent connections via systemd ensure reconnection after reboots. Connected devices appear as standard NVMe block devices and can be used directly or exposed as local Kubernetes PersistentVolumes.

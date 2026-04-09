# How to Configure NVMe-oF Discovery Service in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NVMe-oF, Discovery, Storage

Description: Configure the NVMe-oF Discovery Service in Ceph to allow initiators to automatically discover available subsystems and gateways without manual configuration.

---

## Overview

The NVMe-oF Discovery Service (DS) allows initiator hosts to query a well-known endpoint to discover all available subsystems across all gateways. Instead of manually configuring each subsystem target on every initiator, the discovery service centralizes this information.

## How NVMe-oF Discovery Works

Initiators connect to the discovery controller on port 8009 (default) or a custom port. The discovery controller returns a list of all discovery log entries (DLE), each describing a subsystem, transport type, address, and port.

## Enable the Discovery Service

Ceph NVMe-oF gateways expose a discovery endpoint automatically. Verify it is accessible:

```bash
# Get gateway pod IP
GATEWAY_IP=$(kubectl -n rook-ceph get pod rook-ceph-nvmeof-gw-0 \
  -o jsonpath='{.status.hostIP}')

# From an initiator node, discover available subsystems
nvme discover -t tcp -a $GATEWAY_IP -s 8009
```

## Configure Discovery Port

If using a custom discovery port, configure it in the gateway:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNVMeOFGateway
metadata:
  name: nvmeof-gw
  namespace: rook-ceph
spec:
  image: quay.io/ceph/nvmeof:latest
  instances: 2
  pool: nvmeof
  group: group-a
  ports:
    discoveryPort: 8009
```

## Add Subsystems to Discovery Log

When creating subsystems, they are automatically added to the discovery log:

```bash
# Create subsystem - appears in discovery automatically
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof subsystem add \
  --subsystem nqn.2024-01.io.ceph:subsystem-1

# Verify discovery log entry
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof subsystem list
```

## Configure Persistent Discovery on Initiators

Set up persistent NVMe-oF discovery on initiator nodes using systemd:

```bash
# Create discovery configuration
cat > /etc/nvme/discovery.conf << 'EOF'
--transport=tcp --traddr=10.0.1.10 --trsvcid=8009
EOF

# Enable persistent discovery controller (reads /etc/nvme/discovery.conf automatically)
nvme connect-all
```

Enable automatic reconnect with udev rules:

```bash
cat > /etc/udev/rules.d/70-nvmf-autoconnect.rules << 'EOF'
ACTION=="change", SUBSYSTEM=="nvme", ENV{NVME_AEN}=="0x70f002", \
  RUN+="/bin/systemctl --no-block restart nvmf-connect@--transport=tcp\x20--traddr=10.0.1.10\x20--trsvcid=8009.service"
EOF

udevadm control --reload-rules
```

## Verify Discovery from All Initiators

```bash
#!/bin/bash
GATEWAY_IP="10.0.1.10"

echo "Discovering NVMe-oF subsystems from $GATEWAY_IP..."
nvme discover -t tcp -a $GATEWAY_IP -s 8009 -o normal

echo ""
echo "Currently connected devices:"
nvme list
```

## Kubernetes Service for Discovery

Expose the discovery endpoint via a Kubernetes Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nvmeof-discovery
  namespace: rook-ceph
spec:
  selector:
    app: rook-ceph-nvmeof
  ports:
    - name: discovery
      port: 8009
      targetPort: 8009
  type: ClusterIP
```

## Summary

The NVMe-oF Discovery Service in Ceph provides a centralized endpoint where initiators can query all available subsystems without per-subsystem manual configuration. Subsystems appear in the discovery log automatically upon creation. Using persistent discovery configuration and systemd on initiator nodes ensures automatic reconnection after reboots or gateway failovers.

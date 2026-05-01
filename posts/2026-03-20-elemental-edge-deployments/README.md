# How to Configure Elemental for Edge Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elemental, Edge Computing, Kubernetes, Rancher, IoT

Description: Configure Elemental for real-world edge deployments including low-bandwidth connectivity, offline operation, and hardware-specific optimizations.

---

## Introduction

Edge deployments present unique challenges: intermittent connectivity, limited hardware resources, physical security concerns, and the need for autonomous operation. Elemental is purpose-built for these scenarios, providing an immutable OS with Kubernetes-native management that works even in challenging edge environments.

## Edge-Specific Design Principles

1. **Immutable OS**: Reduces drift and simplifies recovery
2. **Declarative provisioning**: Installation and initial configuration are defined from the central cluster
3. **Offline capability**: Nodes continue operating when disconnected
4. **TPM attestation**: Hardware-backed identity for secure registration
5. **Low resource footprint**: Optimized for embedded hardware

## Configuring for Low-Bandwidth Environments

```yaml
# MachineRegistration labeled for constrained edge links

apiVersion: elemental.cattle.io/v1beta1
kind: MachineRegistration
metadata:
  name: edge-nodes
  namespace: fleet-default
spec:
  machineInventoryLabels:
    environment: edge
    connectivity: low-bandwidth

  config:
    elemental:
      install:
        device: /dev/sda
        reboot: true
```

Elemental does not document `MachineRegistration` fields for tuning agent reconnect or apply intervals; use labels to target intermittently connected nodes with separate cluster policies instead.

## Hardware-Specific Optimizations

### For Resource-Constrained Devices

```yaml
cloud-config:
  write_files:
    # Tune kernel for embedded hardware
    - path: /etc/sysctl.d/99-edge-tuning.conf
      content: |
        # Reduce memory overcommit
        vm.overcommit_ratio = 50
        # Limit dirty page ratio
        vm.dirty_ratio = 10
        vm.dirty_background_ratio = 5
        # Reduce swap usage
        vm.swappiness = 10
      permissions: "0644"

  runcmd:
    # Disable unnecessary services to save memory
    - systemctl disable --now bluetooth.service || true
    - systemctl disable --now cups.service || true
    - systemctl disable --now avahi-daemon.service || true
    # Apply tuning
    - sysctl --system
```

### For Industrial Hardware

```yaml
cloud-config:
  write_files:
    # Configure hardware watchdog
    - path: /etc/systemd/system.conf.d/10-watchdog.conf
      content: |
        [Manager]
        RuntimeWatchdogSec=30s
        RebootWatchdogSec=10min
      permissions: "0644"

    # Configure serial console for headless operation
    - path: /etc/systemd/system/serial-getty@ttyS0.service.d/override.conf
      content: |
        [Service]
        ExecStart=
        ExecStart=-/sbin/agetty --keep-baud 115200,57600,38400,9600 %I $TERM
      permissions: "0644"

  runcmd:
    - systemctl daemon-reload
    - systemctl restart serial-getty@ttyS0.service
```

## Configuring for Offline Operation

```yaml
cloud-config:
  write_files:
    # Pre-seeded local registry for offline operation
    - path: /etc/rancher/k3s/registries.yaml
      content: |
        mirrors:
          docker.io:
            endpoint:
              - "http://localhost:5000"
          registry.k8s.io:
            endpoint:
              - "http://localhost:5000"
      permissions: "0644"
    - path: /etc/rancher/k3s/config.yaml
      content: |
        disable-default-registry-endpoint: true
      permissions: "0644"

  runcmd:
    # Start the pre-seeded local registry
    - |
      podman run -d \
        --name local-registry \
        --restart always \
        -p 5000:5000 \
        -v /opt/registry:/var/lib/registry \
        registry:2
```

## Physical Security Configuration

```yaml
cloud-config:
  write_files:
    # Disable autologin on the physical console
    - path: /etc/systemd/system/getty@tty1.service.d/override.conf
      content: |
        [Service]
        ExecStart=
        ExecStart=-/sbin/agetty --noclear %I $TERM
      permissions: "0644"

  runcmd:
    - systemctl daemon-reload
    - systemctl restart getty@tty1.service
```

## Monitoring Edge Connectivity

```bash
# Check MachineInventory readiness on edge nodes
kubectl get machineinventory -n fleet-default \
  -l environment=edge \
  -o custom-columns=NAME:.metadata.name,READY:.status.conditions[?(@.type=="Ready")].status,PLAN:.status.plan.state

# Identify nodes that are not Ready
kubectl get machineinventory -n fleet-default \
  -o json | jq -r '.items[] | select([.status.conditions[]? | select(.type == "Ready" and .status == "False")] | length > 0) | .metadata.name'
```

## Conclusion

Elemental's architecture is well-suited for edge deployments where connectivity is unreliable and physical access is limited. By tuning resource usage, configuring offline image sources, and hardening console access through cloud-config, you can build a resilient edge fleet that operates autonomously while remaining centrally manageable from Rancher.

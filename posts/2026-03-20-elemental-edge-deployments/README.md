# How to Configure Elemental for Edge Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elemental, Edge Computing, Kubernetes, Rancher, IoT

Description: Configure Elemental for real-world edge deployments including low-bandwidth connectivity, offline operation, and hardware-specific optimizations.

---

## Introduction

Edge deployments present unique challenges: intermittent connectivity, limited hardware resources, physical security concerns, and the need for autonomous operation. Elemental is purpose-built for these scenarios, providing an immutable OS with Kubernetes-native management that works even in challenging edge environments.

## Edge-Specific Design Principles

1. **Immutable OS**: Reduces drift and simplifies recovery
2. **Declarative configuration**: Changes are applied from the central cluster
3. **Offline capability**: Nodes continue operating when disconnected
4. **Secure boot**: TPM integration for hardware attestation
5. **Low resource footprint**: Optimized for embedded hardware

## Configuring for Low-Bandwidth Environments

```yaml
# MachineRegistration optimized for edge

apiVersion: elemental.cattle.io/v1beta1
kind: MachineRegistration
metadata:
  name: edge-nodes
  namespace: fleet-default
spec:
  machineLabels:
    environment: edge
    connectivity: low-bandwidth

  config:
    cloud-config:
      write_files:
        # Configure Rancher agent for low-bandwidth
        - path: /etc/rancher/agent/config.yaml
          content: |
            # Increase reconnect intervals for flaky connections
            connectionTimeout: 120
            pingInterval: 60
          permissions: "0644"

    elemental:
      install:
        device: /dev/sda
        reboot: true
      system-agent:
        # Reduce check-in frequency for low-bandwidth
        applyInterval: 300
```

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
    - systemctl disable --now bluetooth
    - systemctl disable --now cups
    - systemctl disable --now avahi-daemon
    # Apply tuning
    - sysctl --system
```

### For Industrial Hardware

```yaml
cloud-config:
  write_files:
    # Configure hardware watchdog
    - path: /etc/systemd/system/watchdog.conf
      content: |
        RuntimeWatchdogSec=30
        ShutdownWatchdogSec=10min
      permissions: "0644"

    # Configure serial console for headless operation
    - path: /etc/systemd/system/serial-getty@ttyS0.service.d/override.conf
      content: |
        [Service]
        ExecStart=
        ExecStart=-/sbin/agetty --autologin root --keep-baud 115200,57600,38400,9600 %I $TERM
      permissions: "0644"
```

## Configuring for Offline Operation

```yaml
cloud-config:
  write_files:
    # Local container registry for offline operation
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

  runcmd:
    # Start local registry
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
    # Lock down physical console
    - path: /etc/systemd/system/getty@tty1.service.d/override.conf
      content: |
        [Service]
        ExecStart=
        ExecStart=-/sbin/agetty --autologin root %I $TERM
      permissions: "0644"

  runcmd:
    # Require password for GRUB
    - grub2-setpassword
    # Enable TPM-based disk encryption
    - systemd-cryptenroll --tpm2-device=auto /dev/sda3
```

## Monitoring Edge Connectivity

```bash
# Check agent connectivity status on edge nodes
kubectl get machineinventory -n fleet-default \
  -l environment=edge \
  -o custom-columns=NAME:.metadata.name,LAST-CONTACT:.status.conditions

# Identify disconnected nodes
kubectl get machineinventory -n fleet-default \
  -o json | jq '.items[] | select(.status.conditions[] | .type == "Connected" and .status == "False") | .metadata.name'
```

## Conclusion

Elemental's architecture is well-suited for edge deployments where connectivity is unreliable and physical access is limited. By tuning resource usage, configuring offline operation, and implementing hardware security features through cloud-config, you can build a resilient edge fleet that operates autonomously while remaining centrally manageable from Rancher.

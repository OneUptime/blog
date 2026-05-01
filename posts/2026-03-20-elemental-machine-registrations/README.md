# How to Create Elemental Machine Registrations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elemental, Kubernetes, Rancher, MachineRegistration, Edge

Description: Learn how to create and configure Elemental MachineRegistration resources to enable bare metal nodes to register with your Rancher management cluster.

## Introduction

A MachineRegistration is the Kubernetes resource that defines how edge or bare metal machines identify themselves and register with the Elemental Operator. When a machine boots with an Elemental OS image, it reads the registration configuration and contacts the Rancher management cluster to join the inventory.

This guide explains the structure of a MachineRegistration and walks through creating one for your environment.

## Prerequisites

- Elemental Operator installed in your Rancher cluster
- `kubectl` access to the management cluster
- A namespace for your Elemental resources

## Understanding MachineRegistration

The `MachineRegistration` resource defines:

- **Registration configuration**: Endpoint and authentication settings used during machine onboarding
- **Machine inventory labels and annotations**: Metadata applied to the `MachineInventory` created for each registered machine
- **Cloud-config**: OS configuration injected into the node and evaluated after reboot
- **Installation settings**: Target device and install behavior such as reboot or debug output

## Creating a Basic MachineRegistration

```yaml
# machine-registration.yaml

apiVersion: elemental.cattle.io/v1beta1
kind: MachineRegistration
metadata:
  # Name of the registration endpoint
  name: my-nodes
  namespace: fleet-default
spec:
  # Labels applied to the MachineInventory created for this endpoint
  machineInventoryLabels:
    location: datacenter-1
    role: worker
    environment: production

  # Cloud-config injected into the registering machine
  config:
    cloud-config:
      users:
        - name: root
          passwd: "$6$rounds=4096$randomsalt$hashedpassword"

    elemental:
      install:
        # Device to install the OS onto
        device: /dev/sda
        # Reboot after installation
        reboot: true
        # Power off after installation
        poweroff: false
```

```bash
# Apply the MachineRegistration
kubectl apply -f machine-registration.yaml

# Wait for the registration endpoint to become ready
kubectl wait --for=condition=Ready machineregistration/my-nodes -n fleet-default

# Check registration status
kubectl get machineregistration my-nodes -n fleet-default -o yaml
```

## Retrieving the Registration URL

After the MachineRegistration becomes `Ready`, the operator exposes a registration endpoint URL and token:

```bash
# Get the registration URL
kubectl get machineregistration my-nodes -n fleet-default \
  -o jsonpath='{.status.registrationURL}'

# Get the registration token
kubectl get machineregistration my-nodes -n fleet-default \
  -o jsonpath='{.status.registrationToken}'
```

## Advanced MachineRegistration Configuration

### With Device Selector Options

```yaml
apiVersion: elemental.cattle.io/v1beta1
kind: MachineRegistration
metadata:
  name: edge-nodes
  namespace: fleet-default
spec:
  machineInventoryLabels:
    location: factory-floor
    tier: edge

  config:
    elemental:
      install:
        reboot: true
        debug: true
        # Select a target disk dynamically
        device-selector:
          - key: Size
            operator: Lt
            values:
              - 100Gi
          - key: Size
            operator: Gt
            values:
              - 30Gi
```

### With Hardware Label Collection

```yaml
apiVersion: elemental.cattle.io/v1beta1
kind: MachineRegistration
metadata:
  name: hardware-labeled-nodes
  namespace: fleet-default
spec:
  # Collect hardware info as labels
  machineInventoryLabels:
    # CPU model
    cpuModel: "${CPU/Processor/Model}"
    # Total physical memory in bytes
    totalMemoryBytes: "${Memory/TotalPhysicalBytes}"
    # Serial number
    serialNumber: "${Product/SerialNumber}"
```

## Verifying Machine Registration

```bash
# Watch for machines registering
kubectl get machineinventory -n fleet-default --watch

# Describe a registered machine
kubectl describe machineinventory -n fleet-default <machine-name>

# Check machine labels
kubectl get machineinventory -n fleet-default \
  --show-labels
```

## Updating a MachineRegistration

```bash
# Edit the registration in place
kubectl edit machineregistration my-nodes -n fleet-default

# Or apply updated YAML
kubectl apply -f updated-machine-registration.yaml
```

## Conclusion

MachineRegistrations are the entry point for bringing bare metal and edge machines into your Rancher-managed Kubernetes fleet. By defining labels, cloud-config, and installation parameters in a MachineRegistration, you establish a consistent, automated path for machines to self-register and become ready for Kubernetes cluster provisioning.

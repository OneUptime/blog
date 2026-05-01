# How to Manage Elemental Machine Inventory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elemental, Kubernetes, Machine Inventory, Edge, Rancher

Description: A guide to managing the Elemental MachineInventory, including viewing, labeling, filtering, and maintaining registered bare metal nodes.

## Introduction

The Elemental MachineInventory is a Kubernetes-native registry of all bare metal and edge machines that have registered with your Rancher management cluster. Each registered machine appears as a MachineInventory resource containing hardware information, labels, and current adoption status. Effective inventory management ensures you can track, organize, and provision your entire edge fleet.

## Viewing Machine Inventory

```bash
# List all machines in inventory

kubectl get machineinventory -n fleet-default

# Get detailed output with labels
kubectl get machineinventory -n fleet-default \
  --show-labels \
  -o wide

# Get YAML for a specific machine
kubectl get machineinventory -n fleet-default <machine-name> -o yaml

# Describe a machine for full details
kubectl describe machineinventory -n fleet-default <machine-name>
```

## Understanding MachineInventory Fields

```yaml
# Example MachineInventory resource
apiVersion: elemental.cattle.io/v1beta1
kind: MachineInventory
metadata:
  name: m-abc12345
  namespace: fleet-default
  labels:
    # Custom labels inherited from MachineRegistration
    location: datacenter-1
    role: worker
    # Hardware labels templated from SMBIOS data
    serialNumber: "SN1234567"
  annotations:
    # System annotations added during registration
    elemental.cattle.io/auth: tpm
    elemental.cattle.io/registration-ip: 192.168.122.152
  ownerReferences:
    # When adopted, owned by the selector matching this machine to a cluster
    - apiVersion: elemental.cattle.io/v1beta1
      controller: true
      kind: MachineInventorySelector
      name: my-cluster-selector-abcd1
      uid: 11111111-2222-3333-4444-555555555555
spec:
  # TPM hash for secure identification
  tpmHash: "abc123..."
```

## Labeling Machines

Labels are essential for organizing your inventory and targeting machines with selectors:

```bash
# Add a label to a machine
kubectl label machineinventory -n fleet-default m-abc12345 \
  rack=rack-01 \
  floor=1

# Update an existing label
kubectl label machineinventory -n fleet-default m-abc12345 \
  role=control-plane \
  --overwrite

# Remove a label
kubectl label machineinventory -n fleet-default m-abc12345 \
  temporary-

# Label multiple machines at once
kubectl label machineinventory -n fleet-default \
  -l location=datacenter-1 \
  status=ready
```

## Filtering and Querying Inventory

```bash
# Filter by label selector
kubectl get machineinventory -n fleet-default \
  -l location=datacenter-1

# Filter by multiple labels
kubectl get machineinventory -n fleet-default \
  -l "location=datacenter-1,role=worker"

# Find machines NOT yet adopted (available for provisioning)
kubectl get machineinventory -n fleet-default \
  -o json | jq -r '.items[] | select(([.metadata.ownerReferences[]? | select(.kind == "MachineInventorySelector")] | length) == 0) | .metadata.name'

# Find adopted machines
kubectl get machineinventory -n fleet-default \
  -o json | jq -r '.items[] | select(([.metadata.ownerReferences[]? | select(.kind == "MachineInventorySelector")] | length) > 0) | .metadata.name'
```

## Updating Machine Annotations

```bash
# Add a maintenance annotation
kubectl annotate machineinventory -n fleet-default m-abc12345 \
  maintenance.example.com/scheduled="2026-04-01T00:00:00Z" \
  maintenance.example.com/reason="firmware-update"

# Remove an annotation
kubectl annotate machineinventory -n fleet-default m-abc12345 \
  maintenance.example.com/scheduled-
```

## Exporting Inventory Data

```bash
# Export all inventory to JSON
kubectl get machineinventory -n fleet-default -o json > inventory.json

# Generate a CSV report of machines
kubectl get machineinventory -n fleet-default \
  -o json | jq -r '
    ["NAME","LOCATION","ROLE","ADOPTED"],
    (
      .items[] |
      [
        .metadata.name,
        (.metadata.labels.location // ""),
        (.metadata.labels.role // ""),
        (if ([.metadata.ownerReferences[]? | select(.kind == "MachineInventorySelector")] | length) > 0 then "true" else "false" end)
      ]
    ) | @csv' > inventory-report.csv

# Count machines by location
kubectl get machineinventory -n fleet-default \
  -o json | jq '[.items[].metadata.labels.location] | group_by(.) | map({location: .[0], count: length})'
```

## Deleting Machines from Inventory

```bash
# Remove a specific machine (if reset is enabled for that machine, deletion triggers the reset workflow)
kubectl delete machineinventory -n fleet-default m-abc12345

# Remove all machines with a specific label
kubectl delete machineinventory -n fleet-default \
  -l status=decommissioned
```

## Conclusion

Managing the Elemental MachineInventory effectively is key to operating a large edge or bare metal fleet. By keeping inventory labels accurate and up to date, you enable precise targeting with MachineInventorySelectors for cluster provisioning. Regular inventory audits help identify unused machines, plan for capacity, and maintain an accurate picture of your infrastructure.

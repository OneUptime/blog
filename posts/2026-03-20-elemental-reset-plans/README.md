# How to Configure Elemental Reset Plans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elemental, Reset, Kubernetes, Edge, Operation

Description: Learn how to use Elemental reset plans to wipe and re-provision nodes back to a clean state declaratively.

## Introduction

Elemental reset plans allow you to wipe and re-provision nodes back to a clean state without manual intervention. This is useful for decommissioning nodes, recovering from corruption, or repurposing machines from one cluster to another. The reset process is enabled declaratively through the `MachineRegistration` and triggered when a reset-enabled machine is deleted, making it auditable and repeatable.

## Understanding the Reset Process

When a reset is triggered:
1. Reset is enabled in the `MachineRegistration`, or the `MachineInventory` is marked as resettable
2. When the `MachineInventory` is deleted, the operator creates a reset plan
3. The `elemental-system-agent` reboots the machine into recovery mode
4. The recovery environment runs `elemental-register-reset` and applies the configured reset options
5. A new `MachineInventory` is created and the `MachineRegistration` cloud-config is applied again

## Configuring Reset in MachineRegistration

Include reset configuration in your MachineRegistration:

```yaml
# machine-registration-with-reset.yaml

apiVersion: elemental.cattle.io/v1beta1
kind: MachineRegistration
metadata:
  name: my-nodes
  namespace: fleet-default
spec:
  config:
    cloud-config:
      users:
        - name: root
          passwd: "$6$rounds=4096$salt$hashedpass"
    elemental:
      reset:
        enabled: true
        # Reboot after reset completes
        reboot: true
        # Wipe the persistent partition
        reset-persistent: true
        # Wipe the OEM partition (registration info)
        reset-oem: true
        # Additional cloud-init applied during reset
        config-urls:
          - "https://my-config.example.com/reset-extra.yaml"
```

## Triggering a Reset via MachineInventory

```bash
# Mark a machine as resettable
kubectl annotate machineinventory -n fleet-default m-abc12345 \
  elemental.cattle.io/resettable="true" \
  --overwrite

# Or patch the machine inventory annotations
kubectl patch machineinventory -n fleet-default m-abc12345 \
  --type merge \
  -p '{"metadata":{"annotations":{"elemental.cattle.io/resettable":"true"}}}'

# Delete the machine inventory to trigger reset
kubectl delete machineinventory -n fleet-default m-abc12345
```

## Inspecting the Reset Plan Resource

```yaml
# The Elemental operator creates a reset plan Secret after the
# MachineInventory is marked for deletion.
apiVersion: v1
kind: Secret
type: elemental.cattle.io/plan
metadata:
  name: m-abc12345
  namespace: fleet-default
  annotations:
    elemental.cattle.io/plan.type: reset
  labels:
    elemental.cattle.io/managed: "true"
```

## Resetting Specific Nodes

```bash
# Delete a single reset-enabled MachineInventory to reset just that machine
kubectl delete machineinventory -n fleet-default m-abc12345

# Watch for the machine to re-register after reset
kubectl get machineinventory -n fleet-default --watch
```

## Reset with Data Preservation

```yaml
# Partial reset - preserve specific persistent data
apiVersion: elemental.cattle.io/v1beta1
kind: MachineRegistration
metadata:
  name: preserve-data-nodes
  namespace: fleet-default
spec:
  config:
    cloud-config:
      runcmd:
        # Custom cleanup script reapplied after reset
        - /usr/local/bin/cleanup-app-data.sh
    elemental:
      reset:
        enabled: true
        reboot: true
        # Keep persistent partition (app data)
        reset-persistent: false
        # Wipe OEM partition (registration info)
        reset-oem: true
```

## Monitoring Reset Operations

```bash
# Check which reset-enabled machines are currently marked for deletion
kubectl get machineinventory -n fleet-default \
  -o json | jq '.items[] | select(.metadata.deletionTimestamp != null and .metadata.annotations["elemental.cattle.io/resettable"] == "true") | .metadata.name'

# Inspect the reset plan reference on a machine
kubectl get machineinventory -n fleet-default m-abc12345 -o yaml

# Watch for machines re-registering after reset
kubectl get machineinventory -n fleet-default --watch

# Follow reset execution on the node
journalctl -u elemental-system-agent -f
```

## Bulk Reset Operations

```bash
# Mark all matching machines as resettable
kubectl annotate machineinventory -n fleet-default \
  -l location=datacenter-old \
  elemental.cattle.io/resettable="true" \
  --overwrite

# Delete the matching inventory entries to trigger reset
kubectl delete machineinventory -n fleet-default \
  -l location=datacenter-old
```

## Conclusion

Elemental reset plans provide a clean, auditable way to wipe and re-provision nodes without manual intervention. Whether you're decommissioning hardware, recovering from OS corruption, or repurposing nodes for different workloads, the declarative reset mechanism ensures the process is consistent and traceable. After reset, machines automatically re-register and can be adopted into new cluster assignments.

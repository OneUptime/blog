# How to Monitor Elemental Machine State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elemental, Monitoring, Kubernetes, Edge, Observability

Description: Monitor the health and state of Elemental-managed nodes using Rancher's machine inventory, conditions, and metrics.

## Introduction

Monitoring the state of Elemental machines is essential for maintaining a healthy edge or bare metal fleet. The Elemental Operator exposes machine status through Kubernetes resource conditions, which can be queried directly, integrated with monitoring systems, or used to trigger automated remediation.

## Understanding Machine Conditions

`MachineInventory` does not expose a single phase field. Instead, it reports conditions that reflect registration, provisioning, and adoption progress:

| Condition | Description |
|-----------|-------------|
| Ready | Machine has been registered and provisioned with an Elemental OS |
| AdoptionReady | Machine has been adopted by a `MachineInventorySelector` to become part of a cluster |

## Querying Machine State

```bash
# Get all machines with their Ready and AdoptionReady conditions
kubectl get machineinventory -n fleet-default \
  -o json | jq -r '
    ["NAME", "READY", "ADOPTION_READY", "CREATED"],
    (
      .items[] | [
        .metadata.name,
        ((.status.conditions // [] | map(select(.type == "Ready") | .status) | first) // "Unknown"),
        ((.status.conditions // [] | map(select(.type == "AdoptionReady") | .status) | first) // "Unknown"),
        .metadata.creationTimestamp
      ]
    ) | @tsv'

# Get machines that are not Ready
kubectl get machineinventory -n fleet-default \
  -o json | jq '
    .items[]
    | (.status.conditions // [] | map(select(.type == "Ready")) | first) as $ready
    | select($ready == null or $ready.status != "True")
    | {
        name: .metadata.name,
        status: ($ready.status // "Unknown"),
        reason: ($ready.reason // "MissingReadyCondition"),
        message: ($ready.message // "Ready condition not present")
      }'

# Watch MachineInventory objects for changes
kubectl get machineinventory -n fleet-default --watch
```

## Checking Machine Conditions

```bash
# Get conditions for all machines
kubectl get machineinventory -n fleet-default \
  -o json | jq '.items[] | {
    name: .metadata.name,
    conditions: (.status.conditions // [] | map({type, status, reason, message}))
  }'

# Check a specific machine's conditions
kubectl get machineinventory -n fleet-default m-abc12345 \
  -o json | jq '.status.conditions'
```

## Setting Up Prometheus Monitoring

`MachineInventory` is a custom resource, so expose its conditions through kube-state-metrics custom resource state metrics before alerting on them.

```yaml
# machineinventory-metrics.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-state-metrics-custom-resource-state-config
  namespace: monitoring
data:
  config.yaml: |
    kind: CustomResourceStateMetrics
    spec:
      resources:
        - groupVersionKind:
            group: elemental.cattle.io
            version: v1beta1
            kind: MachineInventory
          labelsFromPath:
            name: [metadata, name]
            namespace: [metadata, namespace]
          metrics:
            - name: machineinventory_condition
              help: "Elemental MachineInventory status conditions"
              each:
                type: Gauge
                gauge:
                  path: [status, conditions]
                  labelsFromPath:
                    type: [type]
                    reason: [reason]
                    status: [status]
                  valueFrom: [status]
---
# Mount this ConfigMap into kube-state-metrics and run it with:
# --custom-resource-state-config-file=/etc/kube-state-metrics/custom-resource-state/config.yaml
# and RBAC that allows it to list/watch customresourcedefinitions.apiextensions.k8s.io
# and machineinventories.elemental.cattle.io
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: elemental-machine-alerts
  namespace: monitoring
spec:
  groups:
    - name: elemental.machines
      interval: 60s
      rules:
        # Alert when MachineInventory objects are not Ready
        - alert: ElementalMachineNotReady
          expr: |
            kube_customresource_machineinventory_condition{
              customresource_group="elemental.cattle.io",
              customresource_version="v1beta1",
              customresource_kind="MachineInventory",
              type="Ready"
            } == 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Elemental machine {{ $labels.name }} is not ready"
            description: "MachineInventory Ready condition has not been true for more than 5 minutes"
```

## Monitoring with kubectl Plugins

```bash
# Install the resource-capacity plugin with Krew
kubectl krew install resource-capacity

# View pod resource requests and limits across cluster nodes
kubectl resource-capacity --pods --sort cpu.limit

# Create a simple dashboard script
cat > ./elemental-status << 'EOF'
#!/bin/bash
echo "=== Elemental Fleet Status ==="
echo ""
echo "Total machines:"
kubectl get machineinventory -n fleet-default -o json | jq '.items | length'

echo ""
echo "Adopted machines:"
kubectl get machineinventory -n fleet-default \
  -o json | jq '[.items[] | select(any(.status.conditions[]?; .type == "AdoptionReady" and .status == "True"))] | length'

echo ""
echo "Waiting for adoption:"
kubectl get machineinventory -n fleet-default \
  -o json | jq '[.items[] | select((any(.status.conditions[]?; .type == "AdoptionReady" and .status == "True")) | not)] | length'

echo ""
echo "Machines by location label (if present):"
kubectl get machineinventory -n fleet-default \
  -o json | jq '[.items[] | (.metadata.labels.location // "unlabeled")] | group_by(.) | map({location: .[0], count: length})'
EOF
chmod +x ./elemental-status
```

## Grafana Dashboard Integration

```bash
# Write machine inventory metrics for node_exporter's textfile collector
# Run node_exporter with --collector.textfile.directory=/var/lib/node_exporter/textfile_collector
cat > ./elemental-metrics-exporter << 'EOF'
#!/bin/bash
set -euo pipefail

NAMESPACE=${NAMESPACE:-fleet-default}
TEXTFILE_DIR=${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}
mkdir -p "$TEXTFILE_DIR"

TOTAL=$(kubectl get machineinventory -n "$NAMESPACE" -o json | jq '.items | length')
ADOPTED=$(kubectl get machineinventory -n "$NAMESPACE" -o json | jq '[.items[] | select(any(.status.conditions[]?; .type == "AdoptionReady" and .status == "True"))] | length')
UNADOPTED=$((TOTAL - ADOPTED))
TMP_FILE=$(mktemp "${TEXTFILE_DIR}/elemental-machines.prom.XXXXXX")

cat > "$TMP_FILE" <<METRICS
# HELP elemental_machines_total Total number of registered Elemental machines
# TYPE elemental_machines_total gauge
elemental_machines_total ${TOTAL}
# HELP elemental_machines_adopted Number of machines adopted by a selector
# TYPE elemental_machines_adopted gauge
elemental_machines_adopted ${ADOPTED}
# HELP elemental_machines_unadopted Number of machines not yet adopted by a selector
# TYPE elemental_machines_unadopted gauge
elemental_machines_unadopted ${UNADOPTED}
METRICS

mv "$TMP_FILE" "${TEXTFILE_DIR}/elemental-machines.prom"
EOF
chmod +x ./elemental-metrics-exporter
```

## Conclusion

Monitoring Elemental machine state through Kubernetes conditions, custom scripts, and Prometheus integration gives you comprehensive visibility into your edge fleet. By setting up alerts for machines that remain unready or fail adoption, you can proactively address issues before they impact workloads. The Kubernetes-native approach means your existing monitoring stack can be extended to cover your entire bare metal and edge fleet.

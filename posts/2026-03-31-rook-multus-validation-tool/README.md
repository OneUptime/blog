# How to Run the Multus Validation Tool for Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Multus, Validation, Networking

Description: Learn how to use Rook's built-in Multus validation tool to verify Multus networking is correctly configured before deploying or troubleshooting a Rook-Ceph cluster.

---

Rook ships a Multus validation tool that tests whether the Multus networking configuration works correctly for Ceph. The tool checks that pods can be created with the specified NetworkAttachmentDefinitions, receive IPs, and communicate across the storage network. Running this tool before deploying Rook (or when troubleshooting networking issues) identifies problems early.

## What the Validation Tool Checks

The Rook Multus validation tool verifies:
1. NetworkAttachmentDefinitions exist in the `rook-ceph` namespace
2. Pods can be created with the NADs attached
3. Pods receive IP addresses from the specified network
4. Cross-node connectivity works (pods on different nodes can reach each other)
5. Network stability (detecting flaky connections, IP conflicts, and routing issues)

## Prerequisites

Before running the validation tool:
- Multus must be installed as a meta-CNI plugin
- NetworkAttachmentDefinitions must be created (public and/or cluster network)
- At least two Kubernetes nodes must be available for cross-node tests

## Running the Validation Tool

Rook provides a validation manifest you can apply directly:

```bash
ROOK_VERSION="v1.14.0"
kubectl apply -f \
  https://raw.githubusercontent.com/rook/rook/${ROOK_VERSION}/deploy/examples/multus-validation.yaml
```

Or download and customize it first:

```bash
curl -o multus-validation.yaml \
  https://raw.githubusercontent.com/rook/rook/${ROOK_VERSION}/deploy/examples/multus-validation.yaml

# Edit to match your NAD names
cat multus-validation.yaml
```

The manifest creates a Job that runs the validation logic.

## Customizing the Validation Tool

The validation tool accepts configuration via CLI flags passed as container args:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: rook-ceph-multus-validation
  namespace: rook-ceph
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: validation
        image: rook/ceph:v1.14.0
        command: ["rook"]
        args:
        - multus
        - validation
        - run
        - "--public-network=rook-ceph/rook-public-network"
        - "--cluster-network=rook-ceph/rook-cluster-network"
        - "--daemons-per-node=16"
        env:
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: ROOK_LOG_LEVEL
          value: "INFO"
```

Apply the customized validation:

```bash
kubectl apply -f multus-validation.yaml
```

## Monitoring Validation Progress

Watch the validation Job:

```bash
kubectl -n rook-ceph get job rook-ceph-multus-validation -w
```

View real-time output:

```bash
kubectl -n rook-ceph logs -l job-name=rook-ceph-multus-validation -f
```

Expected successful output:

```text
[INFO] Starting Multus validation
[INFO] Checking NAD rook-ceph/rook-public-network... OK
[INFO] Checking NAD rook-ceph/rook-cluster-network... OK
[INFO] Creating test pods on each node...
[INFO] Pod on node-1 received IP 192.168.100.15 on public network
[INFO] Pod on node-2 received IP 192.168.100.16 on public network
[INFO] Pod on node-3 received IP 192.168.100.17 on public network
[INFO] Testing connectivity: node-1 -> node-2 (public)... OK (latency: 0.4ms)
[INFO] Testing connectivity: node-1 -> node-3 (public)... OK (latency: 0.6ms)
[INFO] Testing connectivity: node-2 -> node-3 (public)... OK (latency: 0.5ms)
[INFO] Cluster network connectivity tests... OK
[INFO] All validation tests PASSED
```

## Interpreting Validation Failures

**NAD not found:**
```text
[ERROR] NAD rook-ceph/rook-public-network not found
```
Create the missing NetworkAttachmentDefinition.

**IP assignment failure:**
```text
[ERROR] Pod on node-2 failed to receive IP from rook-public-network
```
Check the IPAM configuration in the NAD and verify the DHCP server or Whereabouts is running.

**Connectivity failure:**
```text
[ERROR] Connectivity test failed: node-1 -> node-2 (latency: timeout)
```
The storage network has a routing or firewall issue preventing node-to-node communication on the Multus interface.

**Master interface missing:**
```text
[ERROR] Interface eth1 not found on node-3
```
The `master` interface specified in the NAD does not exist on node-3. Check interface names:

```bash
ssh node-3 "ip link show"
```

## Cleaning Up After Validation

After the validation Job completes (success or failure), clean up resources using the built-in cleanup command:

```bash
rook multus validation cleanup --namespace rook-ceph
```

Alternatively, clean up manually:

```bash
kubectl -n rook-ceph delete job rook-ceph-multus-validation
# The Job also creates test pods; delete any that remain
kubectl -n rook-ceph delete pods -l app=rook-multus-validation
```

## Using the CLI Directly

If you have the Rook binary available, run validation from the CLI:

```bash
rook multus validation run \
  --namespace rook-ceph \
  --public-network rook-ceph/rook-public-network \
  --cluster-network rook-ceph/rook-cluster-network \
  --daemons-per-node 16
```

## Running Validation After Changes

Re-run the validation tool after any changes to:
- NetworkAttachmentDefinition configuration
- Multus plugin upgrades
- Physical network changes (NIC additions, VLAN changes)
- Node additions to the cluster

This ensures new nodes and updated configurations work correctly before Ceph daemons are deployed or rescheduled.

## Summary

The Rook Multus validation tool verifies that NetworkAttachmentDefinitions are correctly configured, pods receive IPs from the specified networks, and cross-node connectivity works on the storage network. Run it by applying the validation Job manifest from the Rook examples, monitor progress via logs, and interpret failures to identify NAD, IPAM, or network connectivity problems. Clean up validation resources after completion and re-run the tool after any network configuration changes.

# Validating Results After Running calicoctl node run

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Node, Validation, BGP, Kubernetes

Description: Comprehensive validation procedures to confirm that calicoctl node run started the Calico node correctly, with BGP peering, Felix operation, and datastore connectivity verified.

---

## Introduction

After running `calicoctl node run`, confirming that the Calico node is operating correctly requires more than just checking that the container is running. You need to validate that Felix is programming network policies, BIRD is establishing BGP sessions, the node is registered in the datastore, and routes are being exchanged.

A Calico node can appear to be running while having silent failures in any of these subsystems. Without proper validation, you might deploy workloads to a node that cannot enforce network policies or route traffic correctly.

This guide provides a systematic validation procedure that covers every aspect of a healthy Calico node.

## Prerequisites

- A host where `calicoctl node run` has been executed
- Root access to the host
- `calicoctl` and `kubectl` (if applicable) available
- Understanding of your expected BGP topology

## Step 1: Verify the Container Is Running

```bash
# Check container status
docker ps --filter name=calico-node --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check container health
docker inspect calico-node --format '{{.State.Status}} - Running: {{.State.Running}}'
```

Expected: The container should be running and not restarting.

## Step 2: Verify Node Registration

```bash
# Check the node appears in the Calico datastore
calicoctl get node $(hostname) -o yaml
```

Validate:
- The node exists in the datastore
- The `spec.bgp.ipv4Address` matches the expected IP
- The `status` section shows the node as running

```bash
# Quick check of all registered nodes
calicoctl get nodes -o wide
```

## Step 3: Check Calico Node Status

```bash
sudo calicoctl node status
```

Expected output for a healthy node:

```text
Calico process is running.

IPv4 BGP status
+---------------+-------------------+-------+----------+-------------+
| PEER ADDRESS  |     PEER TYPE     | STATE |  SINCE   |    INFO     |
+---------------+-------------------+-------+----------+-------------+
| 10.0.1.11     | node-to-node mesh | up    | 08:15:30 | Established |
| 10.0.1.12     | node-to-node mesh | up    | 08:15:31 | Established |
+---------------+-------------------+-------+----------+-------------+

IPv6 BGP status
No IPv6 peers found.
```

Key checks:
- "Calico process is running" confirms Felix and BIRD are active
- All expected peers show STATE as "up" and INFO as "Established"

## Step 4: Validate Felix Operation

```bash
# Check Felix logs for errors
docker logs calico-node 2>&1 | grep -i "felix" | grep -i "error" | tail -10

# Check Felix is programming rules
docker logs calico-node 2>&1 | grep "felix" | grep -i "ready" | tail -5

# Verify iptables rules are created
sudo iptables -L -n | grep -c "cali-"
```

A healthy Felix instance creates numerous iptables chains prefixed with `cali-`. If the count is zero, Felix is not programming rules correctly.

## Step 5: Verify BGP Route Exchange

```bash
# Check that routes from other nodes are present
ip route | grep "bird"

# Or check for Calico-managed routes
ip route | grep "cali"

# Check the BIRD routing table
docker exec calico-node birdcl show route | head -20
```

## Step 6: Verify IP Pool Configuration

```bash
# Check IP pools
calicoctl get ippools -o wide

# Verify the node can allocate IPs from the pool
calicoctl ipam show --ip=192.168.0.1
```

## Comprehensive Validation Script

```bash
#!/bin/bash
# validate-calico-node.sh
# Run on a host after calicoctl node run

CHECKS_PASSED=0
CHECKS_FAILED=0

pass() { echo "PASS: $1"; CHECKS_PASSED=$((CHECKS_PASSED + 1)); }
fail() { echo "FAIL: $1"; CHECKS_FAILED=$((CHECKS_FAILED + 1)); }

echo "=== Calico Node Validation ==="
echo "Host: $(hostname)"
echo "Date: $(date)"
echo ""

# 1. Container running
if docker ps --filter name=calico-node --format '{{.Status}}' | grep -q "Up"; then
  pass "calico-node container is running"
else
  fail "calico-node container is not running"
fi

# 2. Node registered
if calicoctl get node "$(hostname)" > /dev/null 2>&1; then
  pass "Node is registered in datastore"
else
  fail "Node not found in datastore"
fi

# 3. Calico process running
if sudo calicoctl node status 2>&1 | grep -q "Calico process is running"; then
  pass "Calico process is running"
else
  fail "Calico process is not running"
fi

# 4. BGP peers established
PEER_COUNT=$(sudo calicoctl node status 2>&1 | grep "Established" | wc -l)
if [ "$PEER_COUNT" -gt 0 ]; then
  pass "BGP peers established: $PEER_COUNT"
else
  fail "No BGP peers established"
fi

# 5. iptables rules present
RULE_COUNT=$(sudo iptables -L -n 2>/dev/null | grep -c "cali-")
if [ "$RULE_COUNT" -gt 0 ]; then
  pass "iptables rules present: $RULE_COUNT chains"
else
  fail "No Calico iptables rules found"
fi

# 6. No Felix errors in last 5 minutes
RECENT_ERRORS=$(docker logs calico-node --since 5m 2>&1 | grep -ci "error")
if [ "$RECENT_ERRORS" -lt 5 ]; then
  pass "Minimal Felix errors in last 5 minutes ($RECENT_ERRORS)"
else
  fail "Multiple Felix errors in last 5 minutes ($RECENT_ERRORS)"
fi

echo ""
echo "=== Results ==="
echo "Passed: $CHECKS_PASSED"
echo "Failed: $CHECKS_FAILED"
exit $CHECKS_FAILED
```

## Verification

Run the validation script and confirm all checks pass:

```bash
chmod +x validate-calico-node.sh
sudo ./validate-calico-node.sh
```

Expected output:

```yaml
=== Calico Node Validation ===
Host: worker-01
Date: 2026-03-14 10:30:00

PASS: calico-node container is running
PASS: Node is registered in datastore
PASS: Calico process is running
PASS: BGP peers established: 2
PASS: iptables rules present: 45 chains
PASS: Minimal Felix errors in last 5 minutes (0)

=== Results ===
Passed: 6
Failed: 0
```

## Troubleshooting

- **Container running but no BGP peers**: Check firewall rules on port 179 between nodes. Verify the BGP configuration with `calicoctl get bgpconfigurations`.
- **Felix errors about iptables**: Ensure kernel modules `ip_tables`, `iptable_filter`, and `iptable_nat` are loaded with `lsmod`.
- **Node registered but with wrong IP**: Delete and re-register the node with the correct IP using `calicoctl delete node <name>` followed by a fresh `calicoctl node run`.
- **Routes not appearing**: Check that IPIP or VXLAN encapsulation mode matches between nodes. Mismatched encapsulation prevents route exchange.

## Conclusion

Thorough validation after `calicoctl node run` ensures your Calico node is fully operational before workloads are scheduled on it. By checking container status, node registration, BGP peering, Felix operation, and routing tables, you can confirm that all Calico subsystems are working together correctly.

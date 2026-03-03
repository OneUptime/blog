# How to Test Disaster Recovery Procedures for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Disaster Recovery, Testing, Kubernetes, Site Reliability

Description: A practical guide to testing disaster recovery procedures for Talos Linux clusters including simulation strategies, automated testing, and validation techniques.

---

Having a disaster recovery plan written down is only half the battle. If you have never actually tested those procedures, you have no idea if they will work when you need them. Talos Linux clusters present unique testing challenges because of the API-driven, immutable nature of the operating system. You cannot simply SSH into a box and fix things manually. Your recovery procedures need to be correct and complete.

This guide covers how to set up and run disaster recovery tests for Talos Linux environments so you can be confident your procedures will hold up under real pressure.

## Why Testing DR Matters More Than Writing DR Docs

Most teams write a disaster recovery document once and then forget about it. Over time, the cluster evolves - new nodes get added, network configurations change, storage backends get swapped out. The DR document drifts further and further from reality. When a real disaster hits, the team discovers that half the steps are wrong, backups are missing, or credentials have expired.

Regular testing catches these problems before they matter.

## Setting Up a Test Environment

You need a dedicated environment for DR testing. Running recovery drills on production is a bad idea. There are a few approaches that work well.

### Option 1: Dedicated Staging Cluster

Maintain a small Talos Linux cluster that mirrors your production topology. It does not need to be the same size, but it should have the same architecture - multiple control plane nodes, workers, and similar networking.

```yaml
# Minimal staging cluster config for DR testing
# 3 control plane nodes + 2 workers
cluster:
  name: dr-staging
  endpoint: https://dr-staging.internal:6443
  clusterNetwork:
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
```

### Option 2: Virtual Machines with QEMU

For teams without spare hardware, QEMU or libvirt works great for spinning up throwaway Talos clusters.

```bash
# Create a virtual Talos cluster for DR testing
# Download the Talos QEMU image
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/nocloud-amd64.raw.xz
xz -d nocloud-amd64.raw.xz

# Create control plane VM
qemu-img create -f qcow2 -b nocloud-amd64.raw -F raw cp-1.qcow2 10G

# Boot the VM
qemu-system-x86_64 \
  -m 2048 \
  -cpu host \
  -enable-kvm \
  -drive file=cp-1.qcow2,format=qcow2 \
  -net nic -net user,hostfwd=tcp::50000-:50000
```

### Option 3: Docker-based Talos Clusters

The fastest option for basic testing uses Talos in Docker containers.

```bash
# Create a disposable cluster with talosctl
talosctl cluster create \
  --name dr-test \
  --controlplanes 3 \
  --workers 2 \
  --wait-timeout 5m
```

## Test Scenario 1: Single Node Recovery

Start with the simplest failure mode. Kill one worker node and verify recovery.

```bash
# Step 1: Deploy a test workload
kubectl create deployment nginx --image=nginx --replicas=3

# Step 2: Record the current state
kubectl get pods -o wide > pre-failure-state.txt
kubectl get nodes > pre-failure-nodes.txt

# Step 3: Simulate node failure (power off the VM or container)
talosctl -n 10.0.2.10 shutdown --force

# Step 4: Wait for Kubernetes to notice
kubectl get nodes -w
# The node should transition to NotReady after ~40 seconds

# Step 5: Execute recovery procedure
# Remove the old node
kubectl delete node worker-1

# Step 6: Boot a new node and apply config
talosctl apply-config --insecure \
  --nodes 10.0.2.20 \
  --file worker-config.yaml

# Step 7: Verify recovery
kubectl get nodes
kubectl get pods -o wide
```

**What to validate:**
- New node joins within your RTO window
- Pods are rescheduled correctly
- No persistent data was lost
- Cluster health checks pass

## Test Scenario 2: Control Plane Node Failure

This is more critical because it involves etcd.

```bash
# Step 1: Check current etcd health
talosctl -n 10.0.1.10 etcd member list
talosctl -n 10.0.1.10 etcd status

# Step 2: Simulate control plane node failure
talosctl -n 10.0.1.12 shutdown --force

# Step 3: Verify etcd quorum is maintained
# With 3 CP nodes, losing 1 should maintain quorum
talosctl -n 10.0.1.10 etcd status

# Step 4: Verify Kubernetes API is still responding
kubectl get nodes
kubectl get cs

# Step 5: Remove failed etcd member
MEMBER_ID=$(talosctl -n 10.0.1.10 etcd member list | grep cp-3 | awk '{print $1}')
talosctl -n 10.0.1.10 etcd remove-member $MEMBER_ID

# Step 6: Bring up replacement node
talosctl apply-config --insecure \
  --nodes 10.0.1.12 \
  --file controlplane-config.yaml

# Step 7: Verify etcd cluster is healthy with 3 members again
talosctl -n 10.0.1.10 etcd member list
```

## Test Scenario 3: Full Cluster Recovery from Backup

This is the big one. Destroy everything and rebuild from backups.

```bash
# Step 1: Take a fresh etcd snapshot before the test
talosctl -n 10.0.1.10 etcd snapshot pre-test-backup.snapshot

# Step 2: Record all cluster state
kubectl get all --all-namespaces > full-cluster-state.txt

# Step 3: Destroy the entire cluster
talosctl cluster destroy --name dr-test

# Step 4: Create fresh nodes (no existing state)
# Boot new VMs or containers

# Step 5: Apply control plane config to first node
talosctl apply-config --insecure \
  --nodes 10.0.1.10 \
  --file controlplane-config.yaml

# Step 6: Bootstrap with etcd recovery
talosctl bootstrap --recover-from=./pre-test-backup.snapshot \
  --nodes 10.0.1.10

# Step 7: Join remaining control plane nodes
talosctl apply-config --insecure \
  --nodes 10.0.1.11 \
  --file controlplane-config.yaml
talosctl apply-config --insecure \
  --nodes 10.0.1.12 \
  --file controlplane-config.yaml

# Step 8: Join worker nodes
talosctl apply-config --insecure \
  --nodes 10.0.2.10 \
  --file worker-config.yaml

# Step 9: Compare state
kubectl get all --all-namespaces > post-recovery-state.txt
diff full-cluster-state.txt post-recovery-state.txt
```

## Automating DR Tests

Manual testing is good for learning, but automated tests catch regressions. Here is a script framework for automated DR validation.

```bash
#!/bin/bash
# dr-test-runner.sh - Automated DR test suite

set -e

RESULTS_FILE="dr-test-results-$(date +%Y%m%d).json"
PASSED=0
FAILED=0

run_test() {
  local test_name=$1
  local test_func=$2
  echo "Running: $test_name"

  START_TIME=$(date +%s)
  if $test_func; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "PASS: $test_name (${DURATION}s)"
    PASSED=$((PASSED + 1))
  else
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "FAIL: $test_name (${DURATION}s)"
    FAILED=$((FAILED + 1))
  fi
}

test_etcd_snapshot_exists() {
  # Verify recent backup exists
  LATEST=$(ls -t /backups/etcd/*.snapshot 2>/dev/null | head -1)
  [ -n "$LATEST" ] && [ -f "$LATEST" ]
}

test_configs_current() {
  # Verify stored configs match running configs
  for node in 10.0.1.10 10.0.1.11 10.0.1.12; do
    talosctl -n $node get machineconfig -o yaml > /tmp/running-config.yaml
    # Compare with stored config (ignoring dynamic fields)
    diff <(yq 'del(.metadata)' /tmp/running-config.yaml) \
         <(yq 'del(.metadata)' /backups/talos/${node}-config.yaml) || return 1
  done
}

test_credentials_valid() {
  # Verify talosctl can connect
  talosctl -n 10.0.1.10 version > /dev/null 2>&1
}

run_test "etcd_snapshot_exists" test_etcd_snapshot_exists
run_test "configs_current" test_configs_current
run_test "credentials_valid" test_credentials_valid

echo "Results: $PASSED passed, $FAILED failed"
```

## Measuring Recovery Performance

Track these metrics during every DR test:

- **Time to detect failure**: How long before your monitoring catches the problem
- **Time to begin recovery**: How long before someone starts following the runbook
- **Time to restore service**: When does the cluster become healthy again
- **Data loss assessment**: Was any data lost compared to the pre-failure state

Log these numbers and trend them over time. If recovery times are getting longer, something in your process or infrastructure has drifted.

## Common Pitfalls in DR Testing

**Expired certificates**: Talos certificates have a default lifetime. If your backup contains expired certs, recovery will fail. Test with realistic certificate ages.

**Network assumptions**: Your DR procedure might assume specific IPs are available. Test with different network conditions.

**Storage dependencies**: If your workloads use persistent volumes backed by external storage, make sure your DR test includes that storage layer.

**Stale configurations**: Machine configs stored months ago might reference old Talos versions or deprecated settings. Always verify configs are current before a drill.

## Scheduling and Reporting

Run basic validation tests weekly through CI/CD. Schedule full DR drills quarterly with the whole team. After each drill, write a brief post-mortem documenting what worked, what broke, and what needs updating in the runbook.

The goal is not perfection on every drill. The goal is continuous improvement so that each test goes a little smoother than the last. Over time, your team builds muscle memory for recovery procedures, and that muscle memory is what saves you at 3 AM when a real failure happens.

## Conclusion

Testing disaster recovery for Talos Linux requires adapting your approach to the API-driven, immutable nature of the platform. Start with simple single-node recovery tests, work up to full cluster rebuilds, and automate as much validation as possible. Regular testing is the only way to know your DR plan actually works. Build it into your team's routine and treat DR drills as a normal part of operations, not an afterthought.

# How to Test High Availability Scenarios in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, High Availability, Testing, Chaos Engineering, Kubernetes, Reliability

Description: Practical methods for testing high availability scenarios in Talos Linux clusters, including node failures, network partitions, and resource exhaustion.

---

Building a highly available Talos Linux cluster is only half the battle. You also need to verify that it actually works when things go wrong. Too many teams set up HA clusters but never test them, only to discover during a real incident that failover does not work as expected. Regular HA testing gives you confidence in your infrastructure and reveals problems before they impact production.

This guide provides a structured approach to testing HA scenarios in Talos Linux, from basic node failure tests to more complex chaos engineering experiments.

## Why Test HA?

You should test HA because:

- Configuration mistakes may prevent failover from working
- Timeout values might not be tuned correctly for your network
- Applications may not handle brief API server unavailability gracefully
- Storage replication gaps can cause data loss during failover
- Recovery procedures might have undocumented dependencies

## Setting Up a Test Framework

Before running HA tests, establish a baseline and monitoring:

```bash
# Record baseline cluster state
kubectl get nodes -o wide > baseline-nodes.txt
kubectl get pods -A -o wide > baseline-pods.txt

# Start continuous monitoring in the background
kubectl get events -A --watch > events.log &

# Start a continuous connectivity test
while true; do
  RESULT=$(kubectl get nodes --no-headers 2>&1)
  echo "$(date '+%H:%M:%S') - $RESULT"
  sleep 2
done > connectivity.log &
```

Deploy a test workload that will help you observe the impact of failures:

```yaml
# ha-test-workload.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ha-test-app
  namespace: default
spec:
  replicas: 6
  selector:
    matchLabels:
      app: ha-test
  template:
    metadata:
      labels:
        app: ha-test
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: ha-test
      containers:
        - name: nginx
          image: nginx:alpine
          ports:
            - containerPort: 80
          readinessProbe:
            httpGet:
              path: /
              port: 80
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ha-test-svc
spec:
  selector:
    app: ha-test
  ports:
    - port: 80
```

## Test 1: Single Worker Node Failure

This is the simplest HA test. Verify that workloads reschedule when a worker node fails:

```bash
# Record current pod distribution
kubectl get pods -l app=ha-test -o wide

# Shutdown a worker node
talosctl shutdown --nodes <worker-node-ip>

# Monitor pod rescheduling
kubectl get pods -l app=ha-test -o wide -w

# Time how long it takes for pods to be rescheduled
# Expected: pods become Terminating after node-monitor-grace-period
# New pods start on remaining nodes
```

Observe and record:

- How long before Kubernetes marks the node as NotReady
- How long before pods are evicted from the failed node
- How long before replacement pods are running

```bash
# Bring the node back
talosctl reset --nodes <worker-node-ip> --graceful=false
# Re-apply config if needed
```

## Test 2: Control Plane Node Failure

```bash
# Identify the current etcd leader
talosctl etcd status --nodes <cp1>,<cp2>,<cp3>

# Record which control plane node holds the VIP
talosctl get addresses --nodes <cp1>,<cp2>,<cp3> | grep vip

# Shutdown a control plane node (preferably the leader for maximum impact)
talosctl shutdown --nodes <leader-node-ip>

# Immediately test API access
time kubectl get nodes

# Monitor etcd recovery
talosctl etcd status --nodes <remaining-cp1>,<remaining-cp2>

# Test that you can still create workloads
kubectl run failover-test --image=nginx:alpine --restart=Never
kubectl delete pod failover-test
```

Record the following:

- Time until VIP migrates to another node
- Time until etcd elects a new leader
- Time until kubectl commands succeed again
- Whether any pods were affected

## Test 3: Network Partition Simulation

Simulate a network partition where one node cannot communicate with the others. On Talos, you cannot modify iptables directly, so use an external mechanism:

```bash
# If using VMs, disconnect the network interface
# For physical machines, unplug the network cable
# For cloud instances, modify security group rules

# Monitor from both sides of the partition
# Side 1 (majority partition):
talosctl etcd members --nodes <cp1>,<cp2>
kubectl get nodes

# Side 2 (isolated node):
talosctl etcd status --nodes <isolated-cp>
```

The majority partition should continue operating normally. The isolated node should detect that it lost quorum and stop serving API requests.

## Test 4: Storage Failover

If using replicated storage (Longhorn, Rook-Ceph), test that volumes survive node failures:

```yaml
# storage-test.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ha-storage-test
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: longhorn
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: storage-writer
spec:
  containers:
    - name: writer
      image: alpine
      command:
        - sh
        - -c
        - |
          # Write data continuously
          COUNT=0
          while true; do
            echo "Entry $COUNT at $(date)" >> /data/test.log
            COUNT=$((COUNT + 1))
            sleep 1
          done
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: ha-storage-test
```

```bash
# Deploy the writer
kubectl apply -f storage-test.yaml

# Wait for some data to be written
sleep 30

# Fail the node where the writer is running
NODE=$(kubectl get pod storage-writer -o jsonpath='{.spec.nodeName}')
talosctl shutdown --nodes $NODE

# Wait for the pod to be rescheduled
kubectl get pod storage-writer -w

# Once rescheduled, verify data integrity
kubectl exec storage-writer -- tail /data/test.log
```

Check that the data written before the failure is still present.

## Test 5: Resource Exhaustion

Test what happens when a node runs out of resources:

```yaml
# resource-exhaustion-test.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: memory-hog
spec:
  replicas: 1
  selector:
    matchLabels:
      app: memory-hog
  template:
    metadata:
      labels:
        app: memory-hog
    spec:
      containers:
        - name: stress
          image: polinux/stress
          command: ["stress"]
          args: ["--vm", "1", "--vm-bytes", "4G", "--vm-hang", "0"]
          resources:
            requests:
              memory: 4Gi
            limits:
              memory: 4Gi
```

Watch how the cluster handles the pressure:

```bash
kubectl apply -f resource-exhaustion-test.yaml
kubectl get events -w
kubectl top nodes
```

## Test 6: Rolling Update During Failure

Verify that rolling updates work correctly even when a node is down:

```bash
# Take a worker node offline
talosctl shutdown --nodes <worker-ip>

# Trigger a rolling update
kubectl set image deployment/ha-test-app nginx=nginx:1.25-alpine

# Watch the rollout
kubectl rollout status deployment/ha-test-app

# Verify all pods are running
kubectl get pods -l app=ha-test -o wide
```

## Automated HA Testing with Chaos Engineering

For regular automated testing, consider deploying a chaos engineering tool:

```bash
# Install Litmus Chaos
helm repo add litmuschaos https://litmuschaos.github.io/litmus-helm/
helm install litmus litmuschaos/litmus \
  --namespace litmus \
  --create-namespace
```

Create a chaos experiment:

```yaml
# node-failure-experiment.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: node-failure-test
  namespace: default
spec:
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: node-drain
      spec:
        components:
          env:
            - name: TARGET_NODE
              value: "<worker-node-name>"
            - name: TOTAL_CHAOS_DURATION
              value: "120"
            - name: APP_NAMESPACE
              value: "default"
            - name: APP_LABEL
              value: "app=ha-test"
```

## Creating an HA Test Runbook

Document your test results in a structured format:

```text
HA Test Report - [Date]
Cluster: [name]
Talos Version: [version]

Test 1: Worker Node Failure
  - Node failed: worker-2
  - Time to NotReady: 42s
  - Time to pod eviction: 5m30s
  - Time to full recovery: 6m15s
  - Result: PASS

Test 2: Control Plane Failover
  - Node failed: cp-1 (etcd leader)
  - Time to new leader: 8s
  - Time to VIP migration: 3s
  - Time to API availability: 12s
  - Result: PASS

Test 3: Network Partition
  - Isolated: cp-3
  - Majority partition continued: YES
  - Isolated node stopped serving: YES
  - Recovery after heal: 15s
  - Result: PASS
```

## Scheduling Regular Tests

Run HA tests on a schedule. Monthly tests are a good starting point for most organizations, with additional tests after any cluster configuration changes.

```bash
# Add to your team's operations calendar
# Monthly HA test day - rotate through test scenarios
# Week 1: Node failure tests
# Week 2: Network partition tests
# Week 3: Storage failover tests
# Week 4: Combined failure tests
```

## Conclusion

Testing high availability is as important as implementing it. By systematically working through node failures, network partitions, storage failover, and resource exhaustion scenarios, you build confidence that your Talos Linux cluster will handle real-world failures gracefully. Regular testing catches configuration drift, identifies timeout misconfigurations, and ensures your recovery procedures work as documented. Make HA testing a regular part of your operations process, not a one-time activity.

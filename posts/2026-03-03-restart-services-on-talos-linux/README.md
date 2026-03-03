# How to Restart Services on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Service, Restart, Troubleshooting, Kubernetes, Operations

Description: Learn how to safely restart system services on Talos Linux including when restarts are needed, what happens during a restart, and how to verify service recovery.

---

Sometimes services need a restart. Maybe a service is stuck, consuming too much memory, or behaving unexpectedly after a configuration change. On traditional Linux, you would SSH in and run `systemctl restart`. Talos Linux does not have SSH, so you interact with services through the Talos API using `talosctl`. This guide covers how to restart services safely and when you should (and should not) do it.

## When to Restart Services

Not every problem requires a service restart. Before restarting, understand whether it will actually help:

**Good reasons to restart a service:**
- The service is stuck or unresponsive
- You applied a configuration change that requires a restart
- The service is consuming excessive resources
- You need to clear a transient error state
- A dependency was restarted and this service needs to reconnect

**Bad reasons to restart a service:**
- You do not know what is wrong (restarting might mask the real issue)
- The service is failing due to a misconfiguration (it will just fail again)
- There is a known bug that requires a patch, not a restart

## Restarting a Service

The basic command to restart a service is:

```bash
# Restart a specific service
talosctl service <service-name> restart -n <node-ip>
```

For example:

```bash
# Restart kubelet
talosctl service kubelet restart -n 10.0.0.11

# Restart containerd
talosctl service containerd restart -n 10.0.0.11

# Restart etcd (be very careful with this one)
talosctl service etcd restart -n 10.0.0.1

# Restart the CRI service
talosctl service cri restart -n 10.0.0.11
```

## Restarting kubelet

Restarting the kubelet is the most common service restart you will perform. It is relatively safe and often resolves node-level issues.

```bash
# Check kubelet status first
talosctl service kubelet -n <node-ip>

# Look for errors in kubelet logs
talosctl logs kubelet -n <node-ip> | tail -50

# Restart kubelet
talosctl service kubelet restart -n <node-ip>

# Verify it came back healthy
talosctl service kubelet -n <node-ip>

# Check that the node is still Ready in Kubernetes
kubectl get node <node-name>
```

When you restart kubelet:
- All pods on the node continue running (they are managed by containerd, not kubelet)
- The node may briefly show as NotReady in Kubernetes
- kubelet re-registers with the API server
- Static pods (kube-proxy, etc.) may be restarted

## Restarting containerd

Restarting containerd is more disruptive because it affects all containers on the node:

```bash
# Before restarting containerd, consider draining the node first
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Restart containerd
talosctl service containerd restart -n <node-ip>

# Wait for it to recover
sleep 15
talosctl service containerd -n <node-ip>

# Check that kubelet recovered
talosctl service kubelet -n <node-ip>

# Uncordon the node
kubectl uncordon <node-name>
```

When you restart containerd, all containers on the node are stopped and must be restarted by kubelet. This means pod disruptions on that node.

## Restarting etcd

Restarting etcd is the most sensitive operation. Do it only when absolutely necessary.

```bash
# BEFORE restarting etcd:
# 1. Verify etcd cluster health
talosctl etcd status -n 10.0.0.1

# 2. Make sure all other etcd members are healthy
talosctl etcd members -n 10.0.0.1

# 3. Take a snapshot
talosctl etcd snapshot /tmp/etcd-before-restart.db -n 10.0.0.1

# Restart etcd on ONE node (never restart all etcd members at once)
talosctl service etcd restart -n 10.0.0.1

# Wait and verify
sleep 10
talosctl etcd status -n 10.0.0.1
talosctl etcd members -n 10.0.0.1
```

Rules for etcd restarts:
- Only restart one etcd member at a time
- Wait for the restarted member to fully rejoin before restarting the next
- Never restart more members than the cluster can tolerate (for 3-node etcd, only 1)
- Always take a snapshot before restarting

## Restarting apid

Restarting apid is tricky because it is the service that handles `talosctl` commands. After restarting it, there might be a brief period where `talosctl` cannot connect.

```bash
# Restart apid
talosctl service apid restart -n 10.0.0.11

# Wait a few seconds for it to come back
sleep 5

# Verify connectivity
talosctl version -n 10.0.0.11
```

## Restarting Kubernetes Control Plane Components

The Kubernetes control plane components (kube-apiserver, kube-controller-manager, kube-scheduler) run as static pods, not as Talos services. You restart them differently:

```bash
# The static pod manifests are managed by Talos
# To restart a control plane component, you can delete the static pod

# Restart kube-apiserver (the kubelet will recreate it)
kubectl delete pod -n kube-system kube-apiserver-<node-name>

# Or trigger a restart by touching the machine config
# (this causes all control plane static pods to restart)
talosctl patch machineconfig \
    --patch '[{"op": "add", "path": "/cluster/apiServer/extraArgs/audit-log-maxage", "value": "30"}]' \
    -n <control-plane-ip>
```

## What Happens During a Service Restart

Understanding the restart sequence helps you predict the impact:

1. Talos sends a stop signal to the service
2. The service has a grace period to shut down cleanly
3. After the grace period, the service is forcefully terminated
4. Talos starts the service again
5. The service goes through its normal startup sequence
6. Health checks begin running

```bash
# You can watch this process in real time
talosctl service <service-name> -n <node-ip>

# The events section shows the state transitions:
# Running -> Stopping -> Preparing -> Running
```

## Cascading Restarts

Some service restarts cause dependent services to restart too. For example:

- Restarting **containerd** may cause **CRI**, **kubelet**, and running containers to restart
- Restarting **machined** effectively reboots the node
- Restarting **udevd** may trigger device re-detection

Be aware of these cascading effects when planning restarts.

## Safely Restarting Services on Production Nodes

For production environments, follow this protocol:

```bash
#!/bin/bash
# safe-restart.sh
# Safely restart a service on a production node

NODE_IP=$1
SERVICE=$2

if [ -z "$NODE_IP" ] || [ -z "$SERVICE" ]; then
    echo "Usage: ./safe-restart.sh <node-ip> <service-name>"
    exit 1
fi

# Get the node name
NODE_NAME=$(kubectl get nodes -o wide --no-headers | grep "$NODE_IP" | awk '{print $1}')

echo "Preparing to restart $SERVICE on $NODE_NAME ($NODE_IP)"

# Check current status
echo "Current status:"
talosctl service "$SERVICE" -n "$NODE_IP"

# For disruptive services, drain the node first
case "$SERVICE" in
    containerd|cri)
        echo "Draining node before restarting $SERVICE..."
        kubectl drain "$NODE_NAME" --ignore-daemonsets --delete-emptydir-data --timeout=300s
        DRAINED=true
        ;;
    *)
        DRAINED=false
        ;;
esac

# Restart the service
echo "Restarting $SERVICE..."
talosctl service "$SERVICE" restart -n "$NODE_IP"

# Wait and verify
echo "Waiting for service to recover..."
sleep 15

# Check status
talosctl service "$SERVICE" -n "$NODE_IP"

# Uncordon if we drained
if [ "$DRAINED" = true ]; then
    echo "Uncordoning node..."
    kubectl uncordon "$NODE_NAME"
fi

# Final verification
echo "Final status:"
talosctl services -n "$NODE_IP"
kubectl get node "$NODE_NAME"

echo "Restart complete"
```

## Restarting All Services (Full Node Restart)

If you need to restart everything, it is better to reboot the node:

```bash
# Drain the node first
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Reboot the entire node
talosctl reboot -n <node-ip>

# Wait for the node to come back
talosctl health -n <node-ip> --wait-timeout 10m

# Uncordon
kubectl uncordon <node-name>
```

A reboot is cleaner than restarting all services individually because it guarantees a consistent state.

## Verifying After Restart

After any service restart, verify that everything is healthy:

```bash
# Check all services
talosctl services -n <node-ip>

# Run health check
talosctl health -n <node-ip>

# Check Kubernetes node status
kubectl get node <node-name>

# Check pods on the node
kubectl get pods --all-namespaces --field-selector=spec.nodeName=<node-name>

# Look for errors in logs
talosctl logs <service-name> -n <node-ip> | grep -i error | tail -10
```

## Automating Stuck Service Recovery

For services that occasionally get stuck, you can automate recovery:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: kubelet-health-check
  namespace: monitoring
spec:
  schedule: "*/10 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: checker
            image: ghcr.io/siderolabs/talosctl:v1.9.0
            command:
            - /bin/sh
            - -c
            - |
              for node in 10.0.0.11 10.0.0.12 10.0.0.13; do
                HEALTH=$(talosctl service kubelet -n "$node" 2>/dev/null | grep "HEALTH" | awk '{print $3}')
                if [ "$HEALTH" != "OK" ]; then
                  echo "Kubelet unhealthy on $node, restarting..."
                  talosctl service kubelet restart -n "$node"
                fi
              done
          restartPolicy: OnFailure
```

## Conclusion

Restarting services on Talos Linux is straightforward with `talosctl service <name> restart`, but the key is knowing when to restart, what the impact will be, and how to verify recovery. Always check logs before restarting to understand the root cause. Drain nodes before restarting disruptive services like containerd. Be extremely careful with etcd. And when in doubt, a clean reboot is often better than surgically restarting individual services. With these practices, service restarts become a safe, predictable operation.

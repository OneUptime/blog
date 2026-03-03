# How to Migrate from External Load Balancer to VIP in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, VIP, Load Balancer, Migration, High Availability, Kubernetes

Description: Step-by-step guide to migrating your Talos Linux cluster from an external load balancer to the built-in VIP feature for Kubernetes API server high availability.

---

Many Talos Linux clusters start with an external load balancer in front of the control plane. This is a solid approach, but it adds infrastructure you need to maintain - another machine, another service to monitor, another potential point of failure. If your control plane nodes are all on the same Layer 2 network, you can simplify your setup by migrating to Talos Linux's built-in VIP feature instead.

This guide walks through the migration process step by step, covering planning, execution, and validation.

## Why Migrate to VIP?

There are good reasons to move from an external load balancer to the built-in VIP:

- **Fewer moving parts**: No separate load balancer machine or service to maintain
- **Lower cost**: No additional hardware or VM needed
- **Simpler architecture**: VIP is built into Talos - nothing extra to install or configure
- **Faster failover**: VIP failover is typically 3-12 seconds, comparable to most load balancers
- **Less operational overhead**: One less thing to monitor, patch, and troubleshoot

## Prerequisites

Before migrating, verify these requirements:

1. All control plane nodes are on the same Layer 2 subnet
2. You have an available IP address on that subnet for the VIP
3. You have at least 3 control plane nodes (recommended for reliable failover)
4. etcd is healthy on all control plane nodes
5. You have a maintenance window planned (brief API downtime expected)

```bash
# Verify all control plane nodes are on the same subnet
for node in <cp1> <cp2> <cp3>; do
  echo -n "$node: "
  talosctl -n $node get addresses | grep eth0
done

# Check etcd health
talosctl -n <cp1> get etcdmembers

# Verify you have 3+ control plane nodes
kubectl get nodes -l node-role.kubernetes.io/control-plane
```

## Understanding the Current Setup

Before making changes, document your current load balancer configuration:

```bash
# What is your current cluster endpoint?
kubectl config view | grep server
# Example: server: https://lb.example.com:6443

# What IP does the load balancer use?
dig lb.example.com
# Or check the load balancer's configuration directly
```

Typical external load balancer setup:

```
                    Clients / Workers
                         |
                   [Load Balancer]
                   lb.example.com
                   IP: 192.168.1.50
                   /      |       \
              CP Node 1  CP Node 2  CP Node 3
              .10        .11        .12
```

Target VIP setup:

```
                    Clients / Workers
                         |
                   [VIP: 192.168.1.100]
                   (owned by one CP node)
                   /      |       \
              CP Node 1  CP Node 2  CP Node 3
              .10        .11        .12
```

## Step 1: Choose the VIP Address

Pick an available IP address on the same subnet as your control plane nodes:

```bash
# Verify the chosen IP is not in use
ping -c 3 192.168.1.100
# Should get no response

# Check ARP table
arp -n | grep 192.168.1.100
# Should not exist

# Make sure it is outside any DHCP range
```

You can even use the same IP as your current load balancer if you plan to decommission it. This would make the migration transparent to clients. However, this requires more careful timing.

## Step 2: Add VIP Configuration to Control Plane Nodes

Update the machine configuration on each control plane node to include the VIP:

```yaml
# Updated control plane machine config
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
        vip:
          ip: 192.168.1.100    # New VIP address
```

Apply to all control plane nodes:

```bash
# Apply VIP config to each control plane node
talosctl -n 192.168.1.10 apply-config --file cp-01-with-vip.yaml
talosctl -n 192.168.1.11 apply-config --file cp-02-with-vip.yaml
talosctl -n 192.168.1.12 apply-config --file cp-03-with-vip.yaml

# Verify VIP is assigned to one node
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  echo -n "$node: "
  talosctl -n $node get addresses 2>/dev/null | grep "192.168.1.100" || echo "no VIP"
done
```

At this point, both the load balancer and the VIP are active. Traffic still flows through the load balancer since that is what your kubeconfig and worker nodes reference.

## Step 3: Verify VIP Is Working

Before switching traffic, verify the VIP works:

```bash
# Test API server through VIP
curl -sk https://192.168.1.100:6443/healthz
# Should return "ok"

# Test with kubectl using VIP
kubectl --server=https://192.168.1.100:6443 get nodes

# Test VIP failover
# Reboot the VIP owner and verify it moves
talosctl -n <vip-owner> reboot

# Check VIP moved to another node
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  echo -n "$node: "
  talosctl -n $node get addresses 2>/dev/null | grep "192.168.1.100" || echo "no VIP"
done
```

## Step 4: Update the Cluster Endpoint

This is the critical step. You need to update all references from the load balancer address to the VIP address.

### Update Machine Configuration

The cluster endpoint in the machine config tells worker nodes and kubelets where to find the API server:

```yaml
# Update cluster endpoint to VIP
cluster:
  controlPlane:
    endpoint: https://192.168.1.100:6443    # Changed from load balancer to VIP
```

Apply to all nodes (both control plane and workers):

```bash
# Apply to control plane nodes
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  talosctl -n $node apply-config --file cp-vip-endpoint.yaml
done

# Apply to worker nodes
for node in 192.168.1.20 192.168.1.21 192.168.1.22; do
  talosctl -n $node apply-config --file worker-vip-endpoint.yaml
done
```

### Update Kubeconfig

```bash
# Update your kubeconfig to use the VIP
kubectl config set-cluster my-cluster --server=https://192.168.1.100:6443

# Verify the update
kubectl config view | grep server

# Test that kubectl works with the new endpoint
kubectl get nodes
```

### Update Any External References

Check for any other systems that reference the old load balancer address:

- CI/CD pipelines
- Monitoring systems
- Backup tools
- External applications that talk to the API server
- ArgoCD or Flux configurations
- Helm release configurations

## Step 5: Verify Everything Works Through VIP

Run a comprehensive check:

```bash
# Check all nodes are communicating properly
kubectl get nodes -o wide

# Verify all pods are running
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Check kubelet status on worker nodes
for worker in 192.168.1.20 192.168.1.21 192.168.1.22; do
  echo -n "Worker $worker kubelet: "
  talosctl -n $worker service kubelet | grep "State"
done

# Run a quick workload test
kubectl create deployment test-migration --image=nginx --replicas=3
kubectl wait --for=condition=available deployment/test-migration --timeout=60s
kubectl delete deployment test-migration
```

## Step 6: Decommission the External Load Balancer

Once you have confirmed everything works through the VIP, you can remove the external load balancer:

1. Stop the load balancer service (but do not delete it yet)
2. Wait and monitor for any issues (24-48 hours recommended)
3. If everything is stable, decommission the load balancer machine

```bash
# On the load balancer machine:
# Stop HAProxy/Nginx/whatever you are using
sudo systemctl stop haproxy

# Monitor the cluster for issues
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed
```

Keep the load balancer configuration files archived in case you need to roll back.

## Rollback Plan

If something goes wrong during migration, here is how to roll back:

```bash
# Step 1: Start the load balancer again
sudo systemctl start haproxy

# Step 2: Update kubeconfig back to load balancer
kubectl config set-cluster my-cluster --server=https://lb.example.com:6443

# Step 3: Update machine configs back to load balancer endpoint
# (Revert the cluster.controlPlane.endpoint change)

# Step 4: Optionally remove VIP from machine config
# (VIP can stay configured without harm, even if not used as primary endpoint)
```

## Using the Same IP Address

If you want to use the same IP as your load balancer (avoiding updates to all clients), the process is slightly different:

```bash
# Step 1: Stop the load balancer (causes brief downtime)
sudo systemctl stop haproxy

# Step 2: Immediately apply VIP config with the load balancer's IP
# VIP: 192.168.1.50 (same as old load balancer)
talosctl -n 192.168.1.10 apply-config --file cp-01.yaml
talosctl -n 192.168.1.11 apply-config --file cp-02.yaml
talosctl -n 192.168.1.12 apply-config --file cp-03.yaml

# Step 3: Wait for VIP election (a few seconds)

# Step 4: Verify API is accessible at the same address
curl -sk https://192.168.1.50:6443/healthz
```

This approach minimizes the number of things you need to update because the IP stays the same. The downside is that there is a brief window where neither the load balancer nor the VIP is active.

## Post-Migration Monitoring

After migration, monitor closely for the first few days:

```bash
# Continuous VIP health monitoring
while true; do
  result=$(curl -sk --connect-timeout 5 https://192.168.1.100:6443/healthz 2>/dev/null)
  if [ "$result" = "ok" ]; then
    echo "$(date): VIP OK"
  else
    echo "$(date): VIP PROBLEM!"
  fi
  sleep 30
done
```

Set up proper alerting in your monitoring system for VIP failures.

## Conclusion

Migrating from an external load balancer to Talos Linux's built-in VIP simplifies your infrastructure and reduces operational overhead. The migration itself is straightforward: add VIP configuration, verify it works, update endpoints, and decommission the load balancer. The key is doing it methodically with verification at each step and having a rollback plan ready. Once complete, you have one less piece of infrastructure to worry about, and your cluster's API server high availability is handled natively by Talos Linux.

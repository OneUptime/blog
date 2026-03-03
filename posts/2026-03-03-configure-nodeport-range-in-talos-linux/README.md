# How to Configure NodePort Range in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NodePort, Kubernetes Networking, API Server, Cluster Configuration

Description: Learn how to customize the Kubernetes NodePort range in Talos Linux to accommodate application requirements and avoid port conflicts.

---

By default, Kubernetes allocates NodePort services from the port range 30000 to 32767. This range works fine for most clusters, but there are situations where you need to change it. Maybe your applications expect specific port numbers outside this range, your network team has allocated a different port block for Kubernetes services, or you simply need more ports than the default range provides. In Talos Linux, the NodePort range is configured through the Kubernetes API server's extra arguments.

This guide covers how to change the NodePort range, what to consider before making the change, and how to handle the related firewall configuration.

## Why Change the NodePort Range

There are several legitimate reasons to modify the default NodePort range:

**Application requirements**: Some applications or legacy systems expect to reach services on specific ports (like 8080, 8443, or 9090) that fall outside the default range.

**Port count**: The default range provides 2768 ports (32767 minus 30000 plus 1). If you run hundreds of NodePort services, you might need more.

**Organizational standards**: Your network team might have allocated a specific port range for Kubernetes in the overall port allocation scheme.

**Avoiding conflicts**: In some environments, the default range conflicts with other services running on the same host network.

## Configuring the NodePort Range

The NodePort range is set through the `service-node-port-range` flag on the Kubernetes API server. In Talos Linux, you configure this through `cluster.apiServer.extraArgs`:

```yaml
# Change the NodePort range
cluster:
  apiServer:
    extraArgs:
      service-node-port-range: "20000-40000"
```

This expands the NodePort range to 20001 ports (20000 through 40000), which is significantly more than the default 2768.

## Common Range Configurations

Here are some commonly used NodePort range configurations:

```yaml
# Expanded range with more ports
cluster:
  apiServer:
    extraArgs:
      service-node-port-range: "30000-40000"
```

```yaml
# Lower range for applications that need common ports
cluster:
  apiServer:
    extraArgs:
      service-node-port-range: "1024-32767"
```

```yaml
# Narrow range for tightly controlled environments
cluster:
  apiServer:
    extraArgs:
      service-node-port-range: "30000-30100"
```

Be careful with ranges that include low ports (below 1024). These are traditionally privileged ports on Linux, and including them in the NodePort range can create security concerns. Also, avoid overlapping with ports used by Kubernetes system components:

- 2379-2380: etcd
- 6443: Kubernetes API server
- 10250: Kubelet
- 10257: Controller manager
- 10259: Scheduler

## Step-by-Step Configuration

Here is the complete process for changing the NodePort range in Talos Linux:

**Step 1: Update the machine configuration**

```yaml
# controlplane.yaml - update the API server args
cluster:
  apiServer:
    extraArgs:
      service-node-port-range: "20000-40000"
```

**Step 2: Update the firewall rules to match the new range**

If you are using Talos NetworkRuleConfig for the firewall, update the port rules:

```yaml
# Update firewall to match new NodePort range
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-nodeports
spec:
  ingress:
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 20000-40000     # Updated to match new range
    - subnet: 10.0.0.0/8
      protocol: udp
      ports:
        - 20000-40000
```

**Step 3: Apply the configuration**

```bash
# Apply to control plane nodes (where the API server runs)
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml

# Apply firewall rules to all nodes (NodePorts work on every node)
talosctl apply-config \
  --nodes 192.168.1.110 \
  --file worker.yaml \
  --config-patch @nodeport-firewall.yaml
```

**Step 4: Verify the change**

```bash
# Check that the API server is using the new range
kubectl -n kube-system get pod kube-apiserver-cp-01 -o yaml | grep "node-port-range"

# Create a test service with a port in the new range
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --type=NodePort --port=80 --target-port=80

# Check the assigned port
kubectl get svc nginx
# Should show a port in the 20000-40000 range
```

## Specifying a NodePort for a Service

Once you have configured your range, you can specify exact port numbers when creating services:

```yaml
# Service with a specific NodePort
apiVersion: v1
kind: Service
metadata:
  name: my-web-app
spec:
  type: NodePort
  selector:
    app: my-web-app
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 20080     # Must be within the configured range
```

The `nodePort` value must be within your configured range. If you try to use a port outside the range, the API server will reject the request:

```bash
# This will fail if 8080 is outside the NodePort range
kubectl expose deployment my-app --type=NodePort --port=80 --node-port=8080
# Error: provided port is not in the valid range
```

## Kube-Proxy Configuration

If you change the NodePort range, kube-proxy needs to be aware of it. In most cases, kube-proxy picks up the range from the API server automatically. However, if you are running kube-proxy in IPVS mode, verify that it is handling the new range correctly:

```bash
# Check kube-proxy logs for NodePort handling
kubectl -n kube-system logs -l k8s-app=kube-proxy | grep -i "nodeport\|port-range"
```

## Impact on Existing Services

Changing the NodePort range does not affect services that are already running with ports in the old range, as long as the old ports are still within the new range. However, if you shrink the range and existing services use ports that are now outside the range, those services will continue to work but you will not be able to update them without changing the port.

For example, if you change from 30000-32767 to 20000-25000, a service using port 31000 would still work but could not be recreated with that port.

## External Load Balancer Integration

If you use an external load balancer in front of your cluster, update its configuration to forward traffic on the new NodePort range:

```yaml
# Example load balancer configuration (pseudo-code)
# Update the health check and backend ports to match the new range
frontend:
  bind: *:80
  default_backend: kubernetes-nodes

backend:
  kubernetes-nodes:
    server node1 10.0.1.10:20080
    server node2 10.0.1.11:20080
    server node3 10.0.1.12:20080
```

## Using NodePort Sparingly

While this guide covers how to configure the NodePort range, it is worth noting that NodePort is often not the best approach for exposing services. Consider these alternatives:

- **LoadBalancer services**: If you have MetalLB or a cloud load balancer, use LoadBalancer type services instead
- **Ingress controllers**: For HTTP/HTTPS traffic, an Ingress controller with a single LoadBalancer is cleaner
- **Gateway API**: The newer Gateway API provides even more flexibility

NodePorts are most useful for non-HTTP services, debugging, and environments where you do not have a load balancer available.

## Rolling Out Range Changes

If you need to change the NodePort range on a running cluster, plan the rollout carefully:

```bash
# Step 1: Audit existing NodePort services
kubectl get services --all-namespaces -o wide | grep NodePort

# Step 2: Verify all existing ports fall within the new range
# If not, create new services with ports in the new range first

# Step 3: Apply config change to control plane nodes (one at a time)
talosctl apply-config --nodes 192.168.1.100 --file controlplane.yaml
# Wait for API server to restart
kubectl get nodes
# Continue with next node
talosctl apply-config --nodes 192.168.1.101 --file controlplane.yaml

# Step 4: Update firewall rules on all nodes
talosctl apply-config --nodes 192.168.1.110 --file worker.yaml --config-patch @new-firewall.yaml

# Step 5: Verify everything works
kubectl get services --all-namespaces | grep NodePort
```

## Best Practices

Choose a range that gives you enough ports for growth without being excessively large. A wide-open range increases the surface area for port scanning. Always update your firewall rules when you change the NodePort range - forgetting this is a common mistake that leads to services being inaccessible. Document your chosen range and the reason for any deviation from the default. Prefer LoadBalancer and Ingress services over NodePort whenever possible, as they provide better abstraction and do not expose implementation details like port numbers to your users.

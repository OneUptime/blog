# How to Troubleshoot Service Load Balancer Issues on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Load Balancer, Kubernetes Service, MetalLB, Troubleshooting

Description: Resolve Kubernetes service load balancer issues on Talos Linux clusters, covering MetalLB configuration, pending external IPs, and traffic routing problems.

---

Kubernetes services of type LoadBalancer provide external access to your applications. On cloud providers, a load balancer is automatically provisioned. But on bare-metal Talos Linux clusters, you need to deploy your own load balancer solution, and this is where many issues arise. The most common symptom is a service stuck with a Pending external IP that never gets assigned. This guide covers how to troubleshoot and fix load balancer issues on Talos Linux.

## Understanding Load Balancers on Talos

In cloud environments (AWS, GCP, Azure), the cloud controller manager automatically provisions a load balancer when you create a LoadBalancer service. On bare-metal Talos Linux, there is no cloud controller manager, so you need a solution like MetalLB, kube-vip, or a similar project.

Without a load balancer controller:

```bash
# Check service status
kubectl get svc -A | grep LoadBalancer
```

You will see:

```text
NAMESPACE   NAME       TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)
default     myapp-svc  LoadBalancer   10.96.100.50   <pending>     80:30123/TCP
```

The `<pending>` state will persist indefinitely because nothing is there to assign an external IP.

## Setting Up MetalLB on Talos Linux

MetalLB is the most common load balancer for bare-metal Kubernetes. Install it:

```bash
# Install MetalLB
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.3/config/manifests/metallb-native.yaml

# Wait for MetalLB pods to be ready
kubectl -n metallb-system get pods -w
```

Configure an IP address pool:

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.250   # Range of IPs MetalLB can assign
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default
  namespace: metallb-system
spec:
  ipAddressPools:
    - default-pool
```

Apply the configuration:

```bash
kubectl apply -f metallb-config.yaml
```

## Issue: External IP Stuck in Pending

If MetalLB is installed but services still show Pending:

```bash
# Check MetalLB controller logs
kubectl -n metallb-system logs -l component=controller --tail=100

# Check MetalLB speaker logs
kubectl -n metallb-system logs -l component=speaker --tail=100
```

Common reasons for Pending external IPs:

**No IP address pool configured:**

```bash
# Check if address pools exist
kubectl get ipaddresspools -n metallb-system
```

If no pools exist, create one as shown above.

**IP pool exhausted:**

If all IPs in the pool are already assigned:

```bash
# Check which IPs are in use
kubectl get svc -A -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,EXTERNAL-IP:.status.loadBalancer.ingress[0].ip | grep -v "<none>"
```

Add more IPs to the pool or release unused IPs.

**MetalLB speaker not running on all nodes:**

```bash
# Check MetalLB speaker DaemonSet
kubectl -n metallb-system get daemonset speaker

# Check if all speakers are ready
kubectl -n metallb-system get pods -l component=speaker -o wide
```

If speakers are not running on all nodes, check for node taints or resource issues.

## Issue: External IP Assigned but Not Reachable

If the service has an external IP but you cannot reach it:

```bash
# Check the assigned IP
kubectl get svc <service-name> -n <namespace>

# Try to ping the IP from outside the cluster
ping <external-ip>

# Try to access the service
curl http://<external-ip>:<port>
```

**ARP not working (Layer 2 mode):**

In MetalLB's Layer 2 mode, one node responds to ARP requests for the external IP. If ARP is not working:

```bash
# Check which node is handling the IP
kubectl -n metallb-system logs -l component=speaker | grep <external-ip>

# Verify ARP from your network
arping <external-ip>
```

**The IP is not on the same subnet:**

The MetalLB IP pool must be on the same Layer 2 network as your nodes. If you assign IPs from a different subnet, ARP will not work in L2 mode.

**Firewall blocking traffic:**

Check that no firewall is blocking traffic to the external IP on the assigned ports.

## Issue: Traffic Not Reaching Pods

If the external IP is reachable but the service is not working:

```bash
# Check service endpoints
kubectl get endpoints <service-name> -n <namespace>

# If endpoints are empty, check pod labels
kubectl get pods -n <namespace> --show-labels

# Compare with service selector
kubectl get svc <service-name> -n <namespace> -o yaml | grep -A5 selector
```

If the service has no endpoints, the pod selector labels do not match any running pods.

Also check if kube-proxy is working correctly:

```bash
# Check kube-proxy pods
kubectl -n kube-system get pods -l k8s-app=kube-proxy

# Check kube-proxy logs for errors
kubectl -n kube-system logs -l k8s-app=kube-proxy --tail=50
```

## Issue: MetalLB and kube-vip Conflict

If you are using Talos's built-in VIP feature for the control plane endpoint and also running MetalLB, make sure they do not use overlapping IP ranges:

```yaml
# Talos VIP (in machine config)
machine:
  network:
    interfaces:
      - interface: eth0
        vip:
          ip: 192.168.1.100  # Should NOT be in the MetalLB pool
```

The MetalLB pool should exclude the VIP address:

```yaml
spec:
  addresses:
    - 192.168.1.200-192.168.1.250  # Does not include .100
```

## Issue: Session Affinity and Load Distribution

If your service needs sticky sessions but traffic is being distributed across pods:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  type: LoadBalancer
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
  ports:
    - port: 80
      targetPort: 8080
  selector:
    app: myapp
```

## Issue: ExternalTrafficPolicy

By default, services use `externalTrafficPolicy: Cluster`, which may cause source IP masquerading. If you need the real client IP:

```yaml
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local  # Preserves source IP
```

However, `externalTrafficPolicy: Local` means traffic only goes to nodes that have a backend pod. If a node does not have the pod running, MetalLB will not advertise the IP from that node.

```bash
# Check which nodes have backend pods
kubectl get pods -n <namespace> -l <selector> -o wide
```

## Issue: BGP Mode Configuration

For larger deployments, MetalLB's BGP mode provides better load distribution. If BGP is not working:

```bash
# Check BGP peer status
kubectl -n metallb-system logs -l component=speaker | grep -i bgp

# Verify BGP peer configuration
kubectl get bgppeers -n metallb-system
```

Make sure your network router is configured to accept BGP peering from the MetalLB speakers.

## Alternative: Using NodePort Instead

If you cannot get LoadBalancer services working, NodePort is a simpler alternative:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  type: NodePort
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30080
  selector:
    app: myapp
```

Access the service through any node's IP on the node port:

```bash
curl http://<any-node-ip>:30080
```

This works without any load balancer controller but requires clients to know the node IPs and port numbers.

## Summary

Load balancer issues on Talos Linux primarily occur because bare-metal clusters need a dedicated load balancer controller like MetalLB. Make sure MetalLB is installed, has a valid IP address pool on the same subnet as your nodes, and that its speaker pods are running on all nodes. For external IP assignment issues, check the MetalLB logs. For traffic routing problems, verify service endpoints, kube-proxy health, and external traffic policies.

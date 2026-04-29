# How to Configure Kubernetes Services with externalIPs for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Service, ExternalIPs, IPv4, Networking, Load Balancing

Description: Use Kubernetes Service externalIPs to bind a Service to one or more specific external IPv4 addresses, enabling traffic routing to cluster pods from outside the cluster.

## Introduction

Kubernetes Services normally expose applications through NodePort, LoadBalancer, or ClusterIP. The `externalIPs` field is an alternative that exposes a Service on one or more external IPv4 addresses routed to cluster nodes. Traffic arriving on a node at the specified external IP and port is routed to the Service's pods. As of Kubernetes v1.36, `externalIPs` is deprecated, so prefer a load balancer controller or Gateway API when possible.

## When to Use externalIPs

- **Bare-metal clusters** without a cloud load balancer controller
- Binding a Service to a specific VIP (Virtual IP) managed externally (e.g., keepalived)
- Providing a predictable external IP without a LoadBalancer service type

## Basic externalIPs Service

```yaml
# service-externalips.yaml

apiVersion: v1
kind: Service
metadata:
  name: web-service
  namespace: default
spec:
  selector:
    app: web               # Selects pods with this label
  type: ClusterIP          # Can also use NodePort or LoadBalancer
  ports:
    - name: http
      port: 80             # Service port
      targetPort: 8080     # Pod port
      protocol: TCP
  externalIPs:
    - 192.168.1.200        # External IPv4 address routed to one or more cluster nodes
    - 192.168.1.201        # Additional external IP (optional)
```

Apply the manifest:

```bash
kubectl apply -f service-externalips.yaml

# Verify the Service
kubectl get service web-service
```

## How It Works

The kube-proxy on each node programs forwarding rules for Services based on its proxy mode. In `iptables` mode, for example, it installs rules for the externalIPs. When a packet arrives at a node destined for `192.168.1.200:80`, kube-proxy intercepts it and load-balances it to one of the matching pods, regardless of which node the pod runs on.

## Routing the External IP to the Cluster

The external IP must be routed to one or more cluster nodes. On bare-metal, one common option is to assign a VIP to a network interface on a node:

```bash
# Add the virtual IP to a node's interface
sudo ip addr add 192.168.1.200/24 dev eth0

# For persistence across reboots (with Netplan)
# Add 192.168.1.200/24 to the interface's addresses list
```

Using keepalived for HA (highly recommended for production):

```bash
# keepalived can move the VIP to the active node automatically
# Configure keepalived to manage 192.168.1.200
```

## Verifying Traffic Routing

```bash
# From outside the cluster, test the external IP
curl http://192.168.1.200/

# If kube-proxy is running in iptables mode, inspect the NAT rules
sudo iptables -t nat -L -n | grep 192.168.1.200
```

## Security Consideration

**externalIPs require strict policy controls**. Because Kubernetes does not manage allocation of `externalIPs`, a user with permission to create or update Services could specify an IP they do not own and potentially redirect traffic. Restrict or block `externalIPs` with admission control. RBAC can limit who may create or update Services, but it cannot by itself enforce field-level restrictions on `spec.externalIPs`.

```bash
# Example: block new externalIPs usage cluster-wide
kube-apiserver --enable-admission-plugins=DenyServiceExternalIPs
```

## MetalLB as an Alternative

For production bare-metal clusters, MetalLB manages external IPs automatically using layer 2 or BGP advertisements:

```bash
# MetalLB is generally preferred over manual externalIPs for production
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml
```

## Conclusion

`externalIPs` provides a simple way to expose Kubernetes Services on specific IPv4 addresses without a cloud load balancer, but the feature is deprecated as of Kubernetes v1.36. For production bare-metal deployments, if you must keep using it, combine it with keepalived for VIP failover or prefer MetalLB for automated IP management.

# How to Expose Portainer on Kubernetes via NodePort

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, NodePort, Networking, Installation

Description: Learn how to expose Portainer on Kubernetes using NodePort so you can access it from outside the cluster.

## What Is NodePort?

A Kubernetes NodePort service exposes an application on a static port on every node in the cluster. Any traffic to `<NodeIP>:<NodePort>` is forwarded to the service. By default, NodePort values are in the range `30000–32767`.

This is the simplest way to expose Portainer without a cloud load balancer.

## Deploying Portainer with NodePort via Helm

```bash
# Add the Portainer Helm repository
helm repo add portainer https://portainer.github.io/k8s/
helm repo update

# Install Portainer with NodePort service type
helm upgrade --install portainer portainer/portainer \
  --namespace portainer \
  --create-namespace \
  --set service.type=NodePort \
  --set service.httpNodePort=30777 \
  --set service.httpsNodePort=30779
```

## Deploying Portainer with a Manifest (NodePort)

If you prefer to use a raw Kubernetes manifest:

```bash
# Download Portainer's official NodePort manifest
curl -L -o portainer-nodeport.yaml https://downloads.portainer.io/ce-lts/portainer.yaml
```

```bash
# Apply the manifest
kubectl apply -f portainer-nodeport.yaml
```

## Finding the Node IP

```bash
# Get node IPs
kubectl get nodes -o wide

# Access Portainer at:
# https://<any-node-ip>:30779
# http://<any-node-ip>:30777
```

## Changing the NodePort on an Existing Installation

```bash
# Patch the service to change the HTTP NodePort
kubectl patch service portainer \
  --namespace portainer \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/ports/0/nodePort", "value": 30800}]'
```

## Security Consideration

NodePort exposes the service on all nodes. Restrict access with firewall rules:

```bash
# Example: Allow only specific IPs to reach Portainer NodePorts
# Using iptables (adjust for your firewall tool)
iptables -A INPUT -p tcp -m multiport --dports 30776,30777,30779 -s 203.0.113.0/24 -j ACCEPT
iptables -A INPUT -p tcp -m multiport --dports 30776,30777,30779 -j DROP
```

## Conclusion

NodePort is the quickest way to expose Portainer on Kubernetes without requiring a cloud load balancer. It's ideal for on-premises clusters, home labs, and development environments. For production, consider using a LoadBalancer or Ingress instead.

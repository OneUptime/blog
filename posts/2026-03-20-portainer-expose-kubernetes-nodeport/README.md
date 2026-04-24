# How to Expose Portainer on Kubernetes via NodePort - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, NodePort, Networking, DevOps

Description: Learn how to expose Portainer running on Kubernetes via NodePort service type for direct node-level access.

## Introduction

NodePort is the simplest way to expose Portainer on Kubernetes - it opens a port on every cluster node that forwards traffic to Portainer. This works without a LoadBalancer or Ingress controller, making it ideal for on-premises clusters, development environments, and clusters without cloud provider load balancers.

## Prerequisites

- Kubernetes cluster
- Helm 3 installed if you want to install Portainer in this guide
- Network access to cluster nodes
- `kubectl` configured with cluster access

## Understanding NodePort

NodePort exposes a service on a specific port on all cluster nodes:

```text
External client → <any-node-ip>:<node-port> → Portainer pod
```

NodePort ports must be in the range 30000-32767 by default.

## Step 1: Install Portainer with NodePort

```bash
# Add the Portainer Helm repository
helm repo add portainer https://portainer.github.io/k8s/
helm repo update

# Install Portainer with NodePort service
helm upgrade --install portainer portainer/portainer \
  --namespace portainer \
  --create-namespace \
  --set service.type=NodePort \
  --set service.httpNodePort=30777 \
  --set service.edgeNodePort=30776 \
  --set service.httpsNodePort=30779

# Or specify in values.yaml:
```

```yaml
# portainer-nodeport-values.yaml
service:
  type: NodePort
  httpNodePort: 30777    # HTTP port
  httpsNodePort: 30779   # HTTPS port
  edgeNodePort: 30776    # Edge agent port
```

## Step 2: Verify the NodePort Service

```bash
# Check the service
kubectl get svc portainer -n portainer

# Expected output:
# NAME        TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)                                               AGE
# portainer   NodePort   10.96.1.100    <none>        9000:30777/TCP,9443:30779/TCP,30776:30776/TCP        5m
```

## Step 3: Find Node IPs

```bash
# Get all node IPs
kubectl get nodes -o wide

# Output:
# NAME            STATUS   ROLES           AGE   VERSION   INTERNAL-IP   EXTERNAL-IP
# control-plane   Ready    control-plane   10d   v1.28     10.0.1.10     203.0.113.10
# worker-1        Ready    <none>          10d   v1.28     10.0.1.11     203.0.113.11
# worker-2        Ready    <none>          10d   v1.28     10.0.1.12     203.0.113.12
```

## Step 4: Access Portainer via NodePort

```bash
# Access using any node IP (worker or control-plane)
http://203.0.113.10:30777    # HTTP
https://203.0.113.10:30779   # HTTPS

http://203.0.113.11:30777    # Same on worker-1
http://203.0.113.12:30777    # Same on worker-2
```

By default, all node IPs work because Kubernetes routes traffic to the Portainer pod regardless of which node receives the request.

## Step 5: Configure a Specific NodePort (Optional)

If you want a specific port number:

```bash
# Patch the service to use a specific NodePort
kubectl patch svc portainer -n portainer \
  --type='json' \
  -p='[
    {"op": "replace", "path": "/spec/ports/0/nodePort", "value": 30777},
    {"op": "replace", "path": "/spec/ports/1/nodePort", "value": 30779},
    {"op": "replace", "path": "/spec/ports/2/nodePort", "value": 30776}
  ]'
```

## Step 6: Set Up a Firewall Rule (Security)

NodePort opens the port on ALL nodes. Restrict access with firewall rules:

```bash
# AWS Security Group: allow access only from your IP
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 30779 \
  --cidr 203.0.113.0/32    # Your IP only

# UFW (Ubuntu Firewall)
ufw allow from 203.0.113.0/32 to any port 30779
```

## Step 7: Create a NodePort Service Manually

If Portainer is already running without a NodePort service, match the selector labels and target ports to your existing Portainer deployment:

```yaml
# portainer-nodeport-svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: portainer-nodeport
  namespace: portainer
spec:
  type: NodePort
  selector:
    app.kubernetes.io/name: portainer
    app.kubernetes.io/instance: portainer
  ports:
    - name: http
      port: 9000
      targetPort: 9000
      nodePort: 30777
    - name: https
      port: 9443
      targetPort: 9443
      nodePort: 30779
    - name: edge
      port: 30776
      targetPort: 30776
      nodePort: 30776
```

```bash
kubectl apply -f portainer-nodeport-svc.yaml
```

## Step 8: Use a Load Balancer in Front of NodePort

For high availability, put a load balancer in front of your cluster nodes:

```text
Client → HAProxy/Nginx → Node 1:30779
                       → Node 2:30779
                       → Node 3:30779
```

```haproxy
# HAProxy configuration
frontend portainer
    bind *:443 ssl crt /etc/ssl/portainer.pem
    default_backend portainer_backend

backend portainer_backend
    balance roundrobin
    server node1 10.0.1.10:30779 check ssl verify none
    server node2 10.0.1.11:30779 check ssl verify none
    server node3 10.0.1.12:30779 check ssl verify none
```

## Troubleshooting NodePort Access

### Cannot Connect

```bash
# Verify the pod is running
kubectl get pods -n portainer

# Check the service EndpointSlices
kubectl get endpointslices -n portainer -l kubernetes.io/service-name=portainer

# Test from inside the cluster
kubectl run test-curl \
  --image=curlimages/curl \
  --restart=Never \
  -- curl -k https://portainer.portainer.svc.cluster.local:9443
```

### NodePort Not Opening

Ensure the cluster's Service proxy is healthy and the firewall allows the port. If your cluster uses kube-proxy:

```bash
# Check kube-proxy
kubectl get daemonset -n kube-system kube-proxy

# Test the port from the node itself using a real node IP
curl -k https://<node-ip>:30779
```

## Conclusion

NodePort is a straightforward way to expose Portainer on Kubernetes without requiring additional infrastructure. It works well for on-premises clusters and development environments. For production deployments, combine NodePort with a dedicated load balancer or reverse proxy, and always restrict access with firewall rules to prevent unauthorized access to the Portainer management interface.

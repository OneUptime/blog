# How to Resolve 'Service External IP Pending' Issues in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Services, LoadBalancer, Networking, Troubleshooting

Description: Learn why Kubernetes Services show External IP as Pending and how to fix it. This guide covers cloud load balancers, MetalLB for bare metal, and alternative approaches.

---

You created a LoadBalancer Service in Kubernetes expecting to get an external IP, but `kubectl get svc` shows `<pending>` in the EXTERNAL-IP column. This happens when Kubernetes cannot provision a load balancer for your Service. Let us fix it.

## Why External IP Stays Pending

LoadBalancer Services rely on external infrastructure to assign IP addresses. In cloud environments, this means the cloud provider's load balancer (AWS ELB, GCP Load Balancer, Azure Load Balancer). On bare metal or local clusters, no such infrastructure exists by default.

```bash
# Check your Service status
kubectl get svc my-service

# Typical output when stuck pending
# NAME         TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
# my-service   LoadBalancer   10.96.45.123   <pending>     80:31234/TCP   10m
```

## Step 1: Identify Your Environment

The solution depends on where your cluster runs:

| Environment | Solution |
|-------------|----------|
| AWS (EKS) | AWS Load Balancer Controller |
| GCP (GKE) | Built-in (usually works automatically) |
| Azure (AKS) | Azure Load Balancer (usually automatic) |
| Bare metal | MetalLB or similar |
| Minikube | `minikube tunnel` |
| Kind | MetalLB or port forwarding |
| K3s | Built-in ServiceLB or MetalLB |

## Step 2: Check Cloud Controller Manager

In cloud environments, the cloud controller manager provisions load balancers. Verify it is running:

```bash
# Check for cloud controller manager pods
kubectl get pods -n kube-system | grep cloud-controller

# For EKS, check the AWS Load Balancer Controller
kubectl get pods -n kube-system | grep aws-load-balancer

# Check Service events for provisioning errors
kubectl describe svc my-service
```

Look at the Events section for messages like:
- "Error syncing load balancer"
- "Insufficient permissions"
- "Quota exceeded"

## Step 3: Fix Cloud-Specific Issues

### AWS EKS

EKS requires the AWS Load Balancer Controller for LoadBalancer Services:

```bash
# Check if AWS Load Balancer Controller is installed
kubectl get deployment -n kube-system aws-load-balancer-controller

# If missing, install it (requires IAM setup first)
# See: https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html
```

Common AWS issues:
- Missing IAM permissions for the controller
- Subnet tags not configured for load balancer discovery
- Security group restrictions

Verify subnet tags:

```bash
# Public subnets need this tag for internet-facing LBs
# kubernetes.io/role/elb = 1

# Private subnets need this tag for internal LBs
# kubernetes.io/role/internal-elb = 1
```

### GCP GKE

GKE usually provisions load balancers automatically. If stuck:

```bash
# Check if you hit the quota
gcloud compute forwarding-rules list --project=your-project

# Verify cluster has necessary permissions
gcloud container clusters describe your-cluster --zone=your-zone
```

### Azure AKS

```bash
# Check Azure cloud controller logs
kubectl logs -n kube-system -l component=cloud-controller-manager

# Verify the cluster's service principal has permissions
az role assignment list --assignee <service-principal-id>
```

## Step 4: Install MetalLB for Bare Metal

On bare metal, on-premises, or local clusters, install MetalLB to handle LoadBalancer Services:

```bash
# Install MetalLB
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.3/config/manifests/metallb-native.yaml

# Wait for pods to be ready
kubectl wait --namespace metallb-system \
  --for=condition=ready pod \
  --selector=app=metallb \
  --timeout=90s
```

Configure an IP address pool that MetalLB can assign:

```yaml
# metallb-config.yaml
# Define a pool of IP addresses MetalLB can use
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
  # Use a range from your network that is not used by DHCP
  - 192.168.1.240-192.168.1.250
---
# Tell MetalLB to announce these IPs via Layer 2
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

# Your Service should now get an IP
kubectl get svc my-service
# NAME         TYPE           CLUSTER-IP     EXTERNAL-IP     PORT(S)        AGE
# my-service   LoadBalancer   10.96.45.123   192.168.1.240   80:31234/TCP   15m
```

## Step 5: Use Minikube Tunnel

For minikube, run the tunnel command in a separate terminal:

```bash
# Start the tunnel (requires sudo, runs in foreground)
minikube tunnel

# In another terminal, check your Service
kubectl get svc my-service
# The EXTERNAL-IP should now be assigned
```

Keep the tunnel running while you need external access. It routes traffic from your host to the cluster.

## Alternative Approaches

If you cannot get LoadBalancer working, consider these alternatives:

### Use NodePort Instead

NodePort exposes your Service on every node's IP at a specific port:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: NodePort  # Changed from LoadBalancer
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
    nodePort: 30080  # Optional: specify port (30000-32767)
```

Access via `http://<any-node-ip>:30080`.

### Use Ingress Controller

Ingress handles HTTP/HTTPS routing and only needs one LoadBalancer IP for many Services:

```yaml
# First, install an Ingress controller (e.g., nginx-ingress)
# Then create Ingress resources for your Services

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
spec:
  ingressClassName: nginx
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-service  # Can be ClusterIP type
            port:
              number: 80
```

### Use kubectl port-forward

For development and debugging, forward a local port directly:

```bash
# Forward local port 8080 to Service port 80
kubectl port-forward svc/my-service 8080:80

# Access at http://localhost:8080
```

## Diagnostic Commands

Quick commands to troubleshoot LoadBalancer issues:

```bash
# Check Service status and events
kubectl describe svc my-service

# View cloud controller manager logs (if applicable)
kubectl logs -n kube-system -l component=cloud-controller-manager --tail=100

# Check MetalLB speaker logs (if using MetalLB)
kubectl logs -n metallb-system -l component=speaker --tail=100

# List all LoadBalancer Services
kubectl get svc --all-namespaces --field-selector spec.type=LoadBalancer

# Check node external IPs (for NodePort fallback)
kubectl get nodes -o wide
```

## Summary

External IP Pending means Kubernetes cannot provision a load balancer. On cloud platforms, check that the cloud controller or load balancer controller is running and has proper permissions. On bare metal or local clusters, install MetalLB and configure an IP pool. For development, minikube tunnel or kubectl port-forward work well. If LoadBalancer is not an option, NodePort or Ingress provide good alternatives for exposing Services externally.

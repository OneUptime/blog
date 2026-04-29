# How to Configure kind Clusters for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kind, Kubernetes, IPv6, Dual-Stack, Local Development, Testing

Description: A guide to creating kind (Kubernetes in Docker) clusters with IPv6 or dual-stack networking for local development and testing.

kind (Kubernetes in Docker) is the standard tool for running local Kubernetes clusters in Docker containers. It supports both IPv6-only and dual-stack cluster configurations through a simple YAML configuration file.

## Prerequisites

- Docker installed and running
- `kind` CLI installed (`go install sigs.k8s.io/kind@latest`)
- `kubectl` installed
- Docker daemon configured to support IPv6

## Step 1: Enable IPv6 in Docker Daemon

Docker must have IPv6 enabled before kind can use it. Edit `/etc/docker/daemon.json`:

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00:1::/64"
}
```

Restart Docker after editing:

```bash
sudo systemctl restart docker
```

## Step 2: Create a Dual-Stack kind Cluster Config

```yaml
# kind-dual-stack.yaml - kind cluster configuration for dual-stack

kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  # Enable dual-stack
  ipFamily: dual
  # Define the pod and service CIDRs for both address families
  podSubnet: "10.244.0.0/16,fd00:10:244::/56"
  serviceSubnet: "10.96.0.0/16,fd00:10:96::/112"
nodes:
  - role: control-plane
  - role: worker
  - role: worker
```

## Step 3: Create an IPv6-Only kind Cluster Config

```yaml
# kind-ipv6-only.yaml - kind cluster configuration for IPv6-only
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  # IPv6-only cluster
  ipFamily: ipv6
  apiServerAddress: 127.0.0.1
  podSubnet: "fd00:10:244::/56"
  serviceSubnet: "fd00:10:96::/112"
nodes:
  - role: control-plane
  - role: worker
```

## Step 4: Create the Cluster

```bash
# Create the dual-stack cluster
kind create cluster --config kind-dual-stack.yaml --name ipv6-test

# Or create the IPv6-only cluster
kind create cluster --config kind-ipv6-only.yaml --name ipv6-only

# Set kubectl context to the dual-stack cluster
kubectl config use-context kind-ipv6-test

# Or set kubectl context to the IPv6-only cluster
kubectl config use-context kind-ipv6-only
```

## Step 5: Verify Dual-Stack Configuration

```bash
# Pick a node and confirm it has both IPv4 and IPv6 Pod CIDRs
NODE=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
kubectl get node "$NODE" -o go-template='{{range .spec.podCIDRs}}{{printf "%s\n" .}}{{end}}'

# Check node addresses - should include both IPv4 and IPv6
kubectl get node "$NODE" -o go-template='{{range .status.addresses}}{{printf "%s: %s\n" .type .address}}{{end}}'

# Deploy a test pod and confirm dual IP assignment
kubectl run test --image=busybox:1.36 --restart=Never -- sleep 3600
kubectl wait --for=condition=Ready pod/test --timeout=60s
kubectl get pod test -o go-template='{{range .status.podIPs}}{{printf "%s\n" .ip}}{{end}}'
```

## Step 6: Test IPv6 Pod Connectivity

```bash
# Get the IPv6 address of the test pod
POD_IPV6=$(kubectl get pod test -o go-template='{{range .status.podIPs}}{{printf "%s\n" .ip}}{{end}}' | grep ':')

# From another pod, ping the IPv6 address
kubectl run pinger --image=busybox:1.36 --restart=Never -- ping -6 -c 3 "$POD_IPV6"

# Check the result
kubectl logs pinger
```

## Step 7: Test IPv6 Service

```bash
# Deploy nginx
kubectl create deployment nginx --image=nginx
kubectl rollout status deployment/nginx

# Create a dual-stack service
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: nginx
spec:
  ipFamilyPolicy: PreferDualStack
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
EOF

# Check the service for both ClusterIPs
kubectl get svc nginx -o jsonpath='{.spec.clusterIPs}'

# Curl the IPv6 ClusterIP from a pod
IPV6_SVC=$(kubectl get svc nginx -o jsonpath='{range .spec.clusterIPs[*]}{.}{"\n"}{end}' | grep ':')
kubectl exec test -- wget -O- "http://[$IPV6_SVC]/"
```

## Cleanup

```bash
# Delete the dual-stack cluster
kind delete cluster --name ipv6-test

# Or delete the IPv6-only cluster
kind delete cluster --name ipv6-only
```

kind's native dual-stack support makes it an excellent tool for testing IPv6 application behavior before deploying to production Kubernetes clusters.

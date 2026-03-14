# How to Set Up Flux CD on k3s with Embedded etcd

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, K3s, etcd, High Availability

Description: Bootstrap Flux CD on k3s with embedded etcd for high availability, enabling GitOps-driven workload management on lightweight Kubernetes clusters.

---

## Introduction

k3s is a lightweight, certified Kubernetes distribution designed for resource-constrained environments, edge computing, and IoT. Its embedded etcd mode provides high availability without the operational complexity of managing a separate etcd cluster. When running k3s in HA mode with embedded etcd, you get a production-grade control plane on hardware that traditional Kubernetes distributions would find challenging.

Flux CD runs excellently on k3s - the distribution's lightweight footprint means more resources are available for Flux's controllers and your workloads. Bootstrapping Flux on a k3s HA cluster with embedded etcd follows the same process as any Kubernetes cluster, with a few k3s-specific considerations around the kubeconfig path and the cluster endpoint configuration.

This guide covers deploying a k3s cluster with embedded etcd, configuring a highly available endpoint, and bootstrapping Flux CD.

## Prerequisites

- Three Linux nodes (2 CPU, 4GB RAM each minimum) for the HA k3s control plane
- A load balancer or virtual IP for the k3s API server (e.g., kube-vip)
- `kubectl` and `flux` CLI installed on your workstation
- A GitHub/GitLab repository for Flux CD bootstrap

## Step 1: Initialize the First k3s Server with Embedded etcd

```bash
# On the first control plane node
# K3S_TOKEN is a shared secret for cluster joining
export K3S_TOKEN="my-shared-cluster-secret"

curl -sfL https://get.k3s.io | sh -s - server \
  --cluster-init \
  --tls-san=192.168.1.100 \    # Load balancer or VIP address
  --tls-san=k3s.example.com \  # Optional DNS name for the VIP
  --disable=traefik \          # Disable built-in traefik if using nginx
  --flannel-backend=vxlan \
  --etcd-expose-metrics=true   # Expose etcd metrics for Prometheus
```

## Step 2: Join Additional Control Plane Nodes

```bash
# On the second and third control plane nodes
export K3S_TOKEN="my-shared-cluster-secret"

curl -sfL https://get.k3s.io | sh -s - server \
  --server=https://192.168.1.101:6443 \  # First node's IP
  --tls-san=192.168.1.100 \
  --tls-san=k3s.example.com \
  --disable=traefik
```

## Step 3: Deploy kube-vip for Virtual IP (Optional but Recommended)

```bash
# On the first node, deploy kube-vip as a static pod for HA
export VIP=192.168.1.100
export INTERFACE=eth0

kubectl apply -f https://kube-vip.io/manifests/rbac.yaml

# Apply kube-vip DaemonSet
curl -s https://kube-vip.io/manifests/daemonset | \
  sed "s/INTERFACE/${INTERFACE}/g" | \
  sed "s/VIP/${VIP}/g" | \
  kubectl apply -f -
```

## Step 4: Configure kubectl Access

```bash
# Copy the kubeconfig from the first node
scp node1:/etc/rancher/k3s/k3s.yaml ~/.kube/k3s-config

# Update the server address to use the VIP/load balancer
sed -i 's/127.0.0.1/192.168.1.100/g' ~/.kube/k3s-config
export KUBECONFIG=~/.kube/k3s-config

# Verify cluster access
kubectl get nodes
# Expected output:
# NAME     STATUS   ROLES                       AGE
# node1    Ready    control-plane,etcd,master   5m
# node2    Ready    control-plane,etcd,master   3m
# node3    Ready    control-plane,etcd,master   2m
```

## Step 5: Bootstrap Flux CD on k3s

```bash
# Set your GitHub token
export GITHUB_TOKEN=ghp_your_github_token

# Bootstrap Flux CD
flux bootstrap github \
  --owner=my-org \
  --repository=my-k3s-fleet \
  --branch=main \
  --path=clusters/k3s-ha \
  --personal

# Watch Flux pods start
kubectl get pods -n flux-system -w
```

## Step 6: Verify Flux Is Reconciling

```yaml
# clusters/k3s-ha/apps/test/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
        - name: nginx
          image: nginx:stable
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
```

```bash
# Push the test deployment and watch Flux apply it
git add clusters/k3s-ha/
git commit -m "feat: add test deployment"
git push

# Watch reconciliation
flux get kustomizations --watch
kubectl get pods -n default
```

## Step 7: Verify etcd Health

```bash
# Check etcd cluster health
kubectl exec -n kube-system etcd-node1 -- \
  etcdctl --cacert=/var/lib/rancher/k3s/server/tls/etcd/server-ca.crt \
    --cert=/var/lib/rancher/k3s/server/tls/etcd/server-client.crt \
    --key=/var/lib/rancher/k3s/server/tls/etcd/server-client.key \
    endpoint health --cluster
```

## Best Practices

- Always use an odd number of k3s server nodes (3 or 5) when using embedded etcd to maintain quorum.
- Place a load balancer or kube-vip in front of the control plane nodes so the Flux `GitRepository` source uses a stable endpoint.
- Disable k3s components you do not need (`--disable=traefik`, `--disable=servicelb`) to reduce control plane resource consumption and leave more capacity for Flux controllers.
- Set resource limits on Flux controllers in the `flux-system` namespace to prevent them from consuming the k3s node's limited resources during large reconciliation bursts.
- Configure etcd snapshots (`--etcd-snapshot-schedule-cron`) for automated backups of cluster state.

## Conclusion

k3s with embedded etcd provides a lightweight yet production-grade Kubernetes foundation for Flux CD. The combination is particularly well-suited for edge clusters, on-premises labs, and cost-sensitive environments where you need real HA without the infrastructure overhead of a full Kubernetes distribution. Once bootstrapped, Flux manages your workloads with the same GitOps discipline as any other cluster.

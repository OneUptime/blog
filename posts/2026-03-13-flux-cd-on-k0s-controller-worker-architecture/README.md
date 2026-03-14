# How to Set Up Flux CD on k0s with Controller-Worker Architecture

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, K0s, Controller, Worker, Architecture

Description: Deploy Flux CD on k0s Kubernetes with a separated controller and worker node architecture for clean control-plane and data-plane separation.

---

## Introduction

k0s (pronounced "k-zeros") is a zero-friction Kubernetes distribution that packages everything into a single binary with no external dependencies. Its unique architecture cleanly separates the control plane (controllers) from the data plane (workers) without requiring nodes to run any Kubernetes-specific OS components. k0s controllers run the API server and schedulers, while workers run only the kubelet and container runtime.

This controller-worker separation makes k0s particularly attractive for environments where you want strong isolation between your control plane infrastructure and your application workloads. Flux CD runs on k0s just like any other Kubernetes cluster, but understanding the k0s-specific bootstrap and network configuration ensures a smooth deployment.

This guide covers deploying a k0s cluster with separate controller and worker nodes, then bootstrapping Flux CD.

## Prerequisites

- At least one controller node and one worker node (Linux)
- `k0s` binary installed on all nodes
- `kubectl` and `flux` CLI on your workstation
- A Git repository for Flux CD bootstrap

## Step 1: Install k0s and Generate Default Configuration

```bash
# Install k0s on all nodes
curl -sSLf https://get.k0s.sh | sudo sh

# On the controller node, generate a default config
k0s config create > /etc/k0s/k0s.yaml
```

## Step 2: Customize k0s Controller Configuration

```yaml
# /etc/k0s/k0s.yaml (on controller node)
apiVersion: k0s.k0sproject.io/v1beta1
kind: ClusterConfig
metadata:
  name: k0s
spec:
  api:
    # API server address (controller node IP or VIP)
    address: 192.168.1.10
    sans:
      - 192.168.1.10
      - k0s.example.com
  network:
    provider: calico
    podCIDR: 10.244.0.0/16
    serviceCIDR: 10.96.0.0/12
  # Store state using embedded etcd
  storage:
    type: etcd
  # Disable default components not needed
  extensions:
    helm:
      repositories: []
      charts: []
```

## Step 3: Start the k0s Controller

```bash
# Install and start the k0s controller service
k0s install controller --config /etc/k0s/k0s.yaml
k0s start

# Check the controller status
k0s status

# Wait for the API server to be ready
kubectl --kubeconfig /var/lib/k0s/pki/admin.conf get nodes
```

## Step 4: Generate a Worker Join Token

```bash
# Create a join token valid for 24 hours
k0s token create --role=worker --expiry=24h > /tmp/worker-token.txt

# Display the token for the worker node
cat /tmp/worker-token.txt
```

## Step 5: Join Worker Nodes

```bash
# On each worker node
# Copy the token from the controller
export JOIN_TOKEN="$(cat worker-token.txt)"

# Install the worker component
k0s install worker --token-file /etc/k0s/join-token
k0s start

# Verify the worker joined
# Back on controller:
kubectl --kubeconfig /var/lib/k0s/pki/admin.conf get nodes
```

## Step 6: Configure kubectl on Your Workstation

```bash
# Export the kubeconfig from the controller
scp controller:/var/lib/k0s/pki/admin.conf ~/.kube/k0s-config

# Update the server address if needed
sed -i 's/localhost/192.168.1.10/g' ~/.kube/k0s-config
export KUBECONFIG=~/.kube/k0s-config

kubectl get nodes
# Expected:
# NAME         STATUS   ROLES           AGE
# controller   Ready    control-plane   10m
# worker1      Ready    <none>          5m
# worker2      Ready    <none>          4m
```

## Step 7: Bootstrap Flux CD on k0s

```bash
export GITHUB_TOKEN=ghp_your_github_token

flux bootstrap github \
  --owner=my-org \
  --repository=k0s-fleet \
  --branch=main \
  --path=clusters/k0s-prod \
  --personal

# Verify Flux is running on the worker nodes
kubectl get pods -n flux-system -o wide
```

## Step 8: Configure Node Affinity for Flux Controllers

Ensure Flux controllers run on worker nodes (not controllers) by using node selectors:

```yaml
# clusters/k0s-prod/flux-system/patches/controller-nodeaffinity.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      # Prefer worker nodes for Flux controllers
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: node-role.kubernetes.io/control-plane
                    operator: DoesNotExist
```

## Step 9: Verify Flux Reconciliation

```yaml
# clusters/k0s-prod/apps/demo/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: demo
```

```bash
git add clusters/k0s-prod/
git commit -m "feat: initial k0s fleet configuration"
git push

flux get kustomizations --watch
```

## Best Practices

- Taint k0s controller nodes with `node-role.kubernetes.io/control-plane:NoSchedule` to prevent application pods from running on the control plane.
- Use k0s's built-in support for multiple controllers (`k0s install controller --enable-worker` is NOT recommended for production - keep controllers and workers separate).
- Configure k0s with a network provider like Calico or Cilium that supports network policies for proper microsegmentation between Flux system pods and application pods.
- Use the k0s autopilot feature for automated, rolling k0s version upgrades managed declaratively through Kubernetes resources.
- Monitor k0s controller health with `k0s status` and the Kubernetes control plane metrics exposed on port 10249-10259.

## Conclusion

k0s's clean controller-worker architecture provides excellent isolation between Kubernetes control plane operations and application workloads. Flux CD fits naturally into this model - its controllers run on worker nodes managing the same workloads they reconcile. The single-binary k0s installation combined with Flux's GitOps model creates a highly reproducible cluster that is straightforward to deploy, upgrade, and manage.

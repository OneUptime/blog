# How to Set Up Flux CD on k0s with Controller-Worker Architecture

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, k0s, Controller, Worker, Architecture

Description: Deploy Flux CD on k0s Kubernetes with a separated controller and worker node architecture for clean control-plane and data-plane separation.

---

## Introduction

k0s (pronounced "k-zeros") is a zero-friction Kubernetes distribution that packages everything into a single binary with minimal external runtime dependencies. Its unique architecture cleanly separates the control plane (controllers) from the data plane (workers) without requiring nodes to run Kubernetes-specific OS packages. k0s controllers run the API server and scheduler, while workers run components such as the kubelet, kube-proxy, and container runtime.

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
sudo mkdir -p /etc/k0s
k0s config create | sudo tee /etc/k0s/k0s.yaml >/dev/null
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
sudo k0s install controller --config /etc/k0s/k0s.yaml
sudo k0s start

# Check the controller status
sudo k0s status

# Wait for the API server to be ready
sudo k0s kubectl get --raw='/readyz?verbose'
```

## Step 4: Generate a Worker Join Token

```bash
# Create a join token valid for 24 hours
sudo k0s token create --role=worker --expiry=24h > /tmp/worker-token.txt

# Display the token for the worker node
cat /tmp/worker-token.txt
```

## Step 5: Join Worker Nodes

```bash
# On each worker node
# Copy worker-token.txt from the controller, then install it
sudo mkdir -p /etc/k0s
sudo install -m 600 worker-token.txt /etc/k0s/join-token

# Install the worker component
sudo k0s install worker --token-file /etc/k0s/join-token
sudo k0s start

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
# NAME      STATUS   ROLES    AGE
# worker1   Ready    <none>   5m
# worker2   Ready    <none>   4m
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

Prefer worker nodes for Flux controllers by adding a Kustomize patch to the Flux bootstrap manifests:

```yaml
# clusters/k0s-prod/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: Deployment
      labelSelector: app.kubernetes.io/part-of=flux
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all
      spec:
        template:
          spec:
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

- Keep k0s controllers as controller-only nodes. If you intentionally run controllers with `--enable-worker`, use the default control-plane taints or add your own taints to prevent application pods from running there.
- Use k0s's built-in support for multiple controllers (`k0s install controller --enable-worker` is NOT recommended for production - keep controllers and workers separate).
- Configure k0s with an integrated network provider like Calico, or a custom CNI such as Cilium, that supports network policies for proper microsegmentation between Flux system pods and application pods.
- Use the k0s autopilot feature for automated, rolling k0s version upgrades managed declaratively through Kubernetes resources.
- Monitor k0s controller health with `k0s status` and the Kubernetes control plane metrics endpoints such as the controller-manager on 10257 and scheduler on 10259.

## Conclusion

k0s's clean controller-worker architecture provides excellent isolation between Kubernetes control plane operations and application workloads. Flux CD fits naturally into this model - its controllers run on worker nodes managing the same workloads they reconcile. The single-binary k0s installation combined with Flux's GitOps model creates a highly reproducible cluster that is straightforward to deploy, upgrade, and manage.

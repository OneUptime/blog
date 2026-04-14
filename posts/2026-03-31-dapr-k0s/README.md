# How to Use Dapr with k0s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, k0s, Kubernetes, Zero-Friction, Deployment

Description: Deploy Dapr on k0s zero-friction Kubernetes by installing k0s as a single binary and configuring Dapr with Helm for a minimal production-ready setup.

---

k0s is a zero-friction, single-binary Kubernetes distribution that includes all components in one executable. It runs on any Linux system without external dependencies and is ideal for development, testing, and production environments where simplicity is a priority.

## Installing k0s

```bash
# Download and install k0s
curl -sSLf https://get.k0s.sh | sudo sh

# Install k0s as a system service
sudo k0s install controller --single

# Start k0s
sudo k0s start

# Check status
sudo k0s status
```

## Configuring kubectl for k0s

```bash
# Generate kubeconfig
sudo k0s kubeconfig admin > ~/.kube/config
chmod 600 ~/.kube/config

# Verify cluster access
kubectl get nodes
kubectl cluster-info
```

## Installing Dapr on k0s

k0s is fully Kubernetes compatible, so standard Dapr installation works:

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set global.ha.enabled=true \
  --wait

# Verify installation
dapr status -k
```

## k0s Multi-Node Configuration

For a multi-node k0s cluster, configure join tokens:

```bash
# On the controller, generate a join token
sudo k0s token create --role worker > /tmp/worker-token.txt

# On each worker node
sudo k0s install worker \
  --token-file /tmp/worker-token.txt

sudo k0s start
```

## k0s Configuration for Dapr Networking

Create a k0s configuration file to tune networking for Dapr:

```yaml
# k0s.yaml
apiVersion: k0s.k0sproject.io/v1beta1
kind: ClusterConfig
metadata:
  name: k0s
spec:
  network:
    provider: calico
    calico:
      mode: vxlan
    podCIDR: 10.244.0.0/16
    serviceCIDR: 10.96.0.0/12
```

Apply during installation:

```bash
sudo k0s install controller \
  --config /etc/k0s/k0s.yaml \
  --single
```

## Deploying a Dapr Application on k0s

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "api-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: api-service
        image: myrepo/api-service:latest
        ports:
        - containerPort: 8080
```

```bash
kubectl apply -f deployment.yaml

# Verify sidecar was injected
kubectl get pods -o jsonpath='{.items[*].spec.containers[*].name}'
```

## k0s Automated Upgrade with Dapr

When upgrading k0s, ensure Dapr is compatible with the new Kubernetes version:

```bash
# Check Dapr Kubernetes version compatibility
# https://docs.dapr.io/operations/support/support-kubernetes/

# Upgrade k0s
sudo k0s stop
sudo curl -sSLf https://get.k0s.sh | sudo sh
sudo k0s start

# Verify Dapr is still healthy after upgrade
kubectl get pods -n dapr-system
dapr status -k
```

## Summary

Dapr on k0s combines the simplicity of a single-binary Kubernetes distribution with Dapr's microservices runtime. k0s installs in minutes on any Linux system and provides full Kubernetes API compatibility, allowing standard Dapr Helm installations to work without modification. The combination is particularly effective for teams that want production-grade microservices without complex infrastructure setup.

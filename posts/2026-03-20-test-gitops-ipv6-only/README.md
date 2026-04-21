# How to Test GitOps Pipelines in IPv6-Only Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, GitOps, Testing, Kind, Kubernetes, CI/CD

Description: Set up IPv6-only Kubernetes test clusters with kind or k3s, validate GitOps pipelines in IPv6-only environments, and test that application deployments function correctly without IPv4 fallback.

## Introduction

Testing GitOps pipelines in IPv6-only environments validates that applications and their configuration work without IPv4 connectivity. This is critical before migrating production systems to IPv6-only. IPv6-only testing covers: GitOps controllers connecting to Git sources over IPv6, Kubernetes services receiving IPv6 cluster IPs, and application containers binding to IPv6 addresses.

## Create IPv6-Only kind Cluster for Testing

```yaml
# kind-ipv6-only.yaml

kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4

networking:
  # IPv6-only networking
  ipFamily: ipv6

  # IPv6 pod subnet
  podSubnet: "fd00:10:244::/56"

  # IPv6 service subnet
  serviceSubnet: "fd00:10:96::/112"

  # Keep kind's default CNI enabled
  disableDefaultCNI: false

nodes:
  - role: control-plane
  - role: worker
  - role: worker
```

```bash
# Create the IPv6-only cluster

kind create cluster --config kind-ipv6-only.yaml --name ipv6-test

# Verify cluster is IPv6-only
kubectl get nodes -o wide | grep -v "NAME"
# Should show IPv6 addresses for InternalIP

# Check pod networking is IPv6
kubectl get pod -n kube-system -o wide | head -5
# Pod IPs should be fd00:10:244:: addresses

# Check service CIDR is IPv6
kubectl get svc kubernetes -o jsonpath='{.spec.clusterIP}'
# Should return fd00:10:96:: address
```

## Install Flux in IPv6-Only Cluster

```bash
# Install Flux CD in the IPv6-only test cluster
flux install

# Check all Flux components are running
kubectl get pods -n flux-system
# All pods should be Running with IPv6 pod IPs

# Check Flux services have IPv6 cluster IPs
kubectl get svc -n flux-system -o wide
# ClusterIPs should be in fd00:10:96:: range

# Create a GitRepository pointing to an IPv6 Git server
# Replace 2001:db8::10 with the IPv6 address of your Git server
flux create source git myapp \
    --url="ssh://git@[2001:db8::10]:22/org/myapp.git" \
    --branch=main \
    --secret-ref=git-ssh-key
```

## Install ArgoCD in IPv6-Only Cluster

```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd --server-side --force-conflicts -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
kubectl rollout status deployment/argocd-server -n argocd

# Check ArgoCD has IPv6 cluster IPs
kubectl get svc argocd-server -n argocd -o jsonpath='{.spec.clusterIP}'
# Should be fd00:10:96:: address

# Port-forward for local testing
kubectl port-forward svc/argocd-server -n argocd 8080:443 &

# Access ArgoCD through the local port-forward
argocd login localhost:8080 --insecure
```

## Test Application Deployment in IPv6-Only Cluster

```bash
# Deploy a test application that uses IPv6
cat > test-app.yaml << 'EOF'
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
        - name: app
          image: python:3.12-alpine
          command: ["python", "-m", "http.server", "8080", "--bind", "::"]
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: test-app
spec:
  ipFamilyPolicy: SingleStack   # IPv6-only service
  ipFamilies: [IPv6]
  selector:
    app: test-app
  ports:
    - port: 80
      targetPort: 8080
EOF

kubectl apply -f test-app.yaml

# Verify service got IPv6 cluster IP
kubectl get svc test-app -o jsonpath='{.spec.clusterIP}'
# Should be fd00:10:96:: address

# Test connectivity over IPv6
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- \
    curl -6 "http://[$(kubectl get svc test-app -o jsonpath='{.spec.clusterIP}')]:80"
```

## Automated Test Suite for IPv6 GitOps

```python
#!/usr/bin/env python3
# test_gitops_ipv6.py

import subprocess
import sys
import json
import ipaddress

def run(cmd: list) -> str:
    result = subprocess.run(cmd, capture_output=True, text=True)
    assert result.returncode == 0, f"{' '.join(cmd)} failed: {result.stderr.strip()}"
    return result.stdout.strip()

def is_ipv6(addr: str) -> bool:
    try:
        ip = ipaddress.ip_address(addr.split('/')[0])
        return isinstance(ip, ipaddress.IPv6Address)
    except ValueError:
        return False

def test_nodes_have_ipv6():
    out = run(["kubectl", "get", "nodes", "-o", "json"])
    nodes = json.loads(out)
    for node in nodes["items"]:
        addresses = node["status"]["addresses"]
        internal_ips = [a["address"] for a in addresses if a["type"] == "InternalIP"]
        assert internal_ips, f"Node {node['metadata']['name']} has no InternalIP"
        non_ipv6 = [ip for ip in internal_ips if not is_ipv6(ip)]
        assert not non_ipv6, f"Node {node['metadata']['name']} has non-IPv6 InternalIP(s): {non_ipv6}"
    print("✓ All nodes have only IPv6 internal IPs")

def test_services_have_ipv6():
    out = run(["kubectl", "get", "svc", "-A", "-o", "json"])
    services = json.loads(out)
    for svc in services["items"]:
        cluster_ips = [ip for ip in svc["spec"].get("clusterIPs", []) if ip != "None"]
        if cluster_ips:
            non_ipv6 = [ip for ip in cluster_ips if not is_ipv6(ip)]
            assert not non_ipv6, f"Service {svc['metadata']['name']} has non-IPv6 cluster IP(s): {non_ipv6}"
    print("✓ All services have only IPv6 cluster IPs")

def test_flux_sources_ready():
    out = run(["kubectl", "get", "gitrepositories", "-A", "-o", "json"])
    repos = json.loads(out)
    for repo in repos["items"]:
        conditions = repo["status"].get("conditions", [])
        ready = next((c for c in conditions if c["type"] == "Ready"), None)
        assert ready and ready["status"] == "True", \
            f"GitRepository {repo['metadata']['name']} is not ready: {ready}"
    print("✓ All Flux GitRepositories are ready")

def test_pods_have_ipv6():
    out = run(["kubectl", "get", "pods", "-A", "-o", "json"])
    pods = json.loads(out)
    for pod in pods["items"]:
        if pod["status"].get("phase") != "Running":
            continue
        pod_ips = [p["ip"] for p in pod["status"].get("podIPs", [])]
        assert pod_ips, f"Pod {pod['metadata']['name']} has no pod IPs"
        non_ipv6 = [ip for ip in pod_ips if not is_ipv6(ip)]
        assert not non_ipv6, f"Pod {pod['metadata']['name']} has non-IPv6 pod IP(s): {non_ipv6}"
    print("✓ All running pods have only IPv6 addresses")

if __name__ == "__main__":
    tests = [
        test_nodes_have_ipv6,
        test_services_have_ipv6,
        test_pods_have_ipv6,
        test_flux_sources_ready,
    ]
    failed = 0
    for test in tests:
        try:
            test()
        except AssertionError as e:
            print(f"✗ FAIL: {e}")
            failed += 1
    sys.exit(failed)
```

## CI Pipeline with IPv6-Only Testing

```yaml
# .github/workflows/ipv6-test.yaml

name: Test GitOps in IPv6-Only Cluster
on: [push, pull_request]

jobs:
  ipv6-gitops-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Enable IPv6 on runner
        run: |
          sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
          sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0

      - name: Create IPv6-only kind cluster
        run: |
          kind create cluster --config kind-ipv6-only.yaml --name ipv6-test
          kubectl wait --for=condition=Ready nodes --all --timeout=60s

      - name: Install Flux CD
        run: flux install

      - name: Apply manifests
        run: kubectl apply -k kubernetes/overlays/ipv6-only

      - name: Run IPv6 tests
        run: python3 test_gitops_ipv6.py

      - name: Cleanup
        if: always()
        run: kind delete cluster --name ipv6-test
```

## Conclusion

Testing GitOps pipelines in IPv6-only environments requires a test cluster with IPv6-only pod and service subnets, created with `kind` using `ipFamily: ipv6` or k3s with `--cluster-cidr` and `--service-cidr` set to IPv6 prefixes. Flux CD and ArgoCD install and operate identically in IPv6-only clusters - their pods receive IPv6 addresses from the cluster CNI. The key validation is that GitOps sources (GitRepository, HelmRepository) can reach their upstream servers over IPv6. An automated test suite checks node IPs, pod IPs, service IPs, and GitOps source readiness using `ipaddress.ip_address()` to validate IPv6 format. CI pipelines can integrate this testing by creating kind IPv6 clusters, deploying applications via GitOps, and asserting IPv6 connectivity before merging.

# How to Upgrade Kubernetes Addons After Control Plane Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Addons, Upgrades

Description: Learn how to safely upgrade Kubernetes addons after control plane upgrades, including CoreDNS, kube-proxy, CNI plugins, and cloud provider addons with version compatibility checks.

---

When you upgrade the Kubernetes control plane, your cluster addons don't automatically upgrade themselves. This creates a version mismatch that can lead to compatibility issues, degraded performance, or even cluster instability. Understanding how to properly upgrade addons after a control plane upgrade is essential for maintaining a healthy cluster.

## Why Addon Upgrades Matter

Kubernetes addons are critical components that provide essential cluster functionality. After upgrading the control plane, running outdated addon versions can cause problems because the Kubernetes API may have changed, deprecated features might be removed, or security vulnerabilities might remain unpatched.

The main addons that require attention after control plane upgrades include CoreDNS, kube-proxy, CNI plugins, metrics-server, and cloud provider-specific addons like AWS VPC CNI or Azure CNI.

## Checking Current Addon Versions

Before upgrading addons, you need to know what versions are currently running and what versions are compatible with your new control plane version.

```bash
# Check CoreDNS version
kubectl get deployment coredns -n kube-system -o jsonpath='{.spec.template.spec.containers[0].image}'

# Check kube-proxy version
kubectl get daemonset kube-proxy -n kube-system -o jsonpath='{.spec.template.spec.containers[0].image}'

# Check all addon versions
kubectl get deployments,daemonsets -n kube-system -o custom-columns=NAME:.metadata.name,IMAGE:.spec.template.spec.containers[*].image

# Check CNI plugin version (for Calico example)
kubectl get daemonset calico-node -n kube-system -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Upgrading CoreDNS

CoreDNS is the default DNS service for Kubernetes. After upgrading the control plane, you should upgrade CoreDNS to ensure compatibility.

```bash
# Get the recommended CoreDNS version for your Kubernetes version
# For Kubernetes 1.28, CoreDNS 1.10.1 is recommended
# For Kubernetes 1.29, CoreDNS 1.11.1 is recommended

# Backup current CoreDNS configuration
kubectl get configmap coredns -n kube-system -o yaml > coredns-backup.yaml

# Update CoreDNS using kubectl
kubectl set image deployment/coredns -n kube-system coredns=registry.k8s.io/coredns/coredns:v1.11.1

# Verify the rollout
kubectl rollout status deployment/coredns -n kube-system

# Check CoreDNS pods are running
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Test DNS resolution
kubectl run test-dns --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default
```

If you encounter issues, you can rollback CoreDNS quickly.

```bash
# Rollback CoreDNS to previous version
kubectl rollout undo deployment/coredns -n kube-system

# Verify rollback
kubectl rollout status deployment/coredns -n kube-system
```

## Upgrading kube-proxy

The kube-proxy component handles network routing for services. It should match or be close to your control plane version.

```bash
# Update kube-proxy to match control plane version (e.g., 1.29.0)
kubectl set image daemonset/kube-proxy -n kube-system kube-proxy=registry.k8s.io/kube-proxy:v1.29.0

# Watch the rollout across all nodes
kubectl rollout status daemonset/kube-proxy -n kube-system

# Verify kube-proxy is running on all nodes
kubectl get pods -n kube-system -l k8s-app=kube-proxy -o wide

# Check kube-proxy logs for errors
kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=50
```

The kube-proxy DaemonSet uses a rolling update strategy, updating one node at a time. This minimizes service disruption during the upgrade.

## Upgrading CNI Plugins

CNI plugins handle pod networking. The upgrade process varies by CNI provider, but the general approach is similar.

For Calico:

```bash
# Check current Calico version
kubectl get pods -n kube-system -l k8s-app=calico-node -o jsonpath='{.items[0].spec.containers[0].image}'

# Download new Calico manifest
curl https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml -o calico-v3.27.0.yaml

# Review the manifest for any breaking changes
diff <(kubectl get daemonset calico-node -n kube-system -o yaml) calico-v3.27.0.yaml

# Apply the new version
kubectl apply -f calico-v3.27.0.yaml

# Monitor the rollout
kubectl rollout status daemonset/calico-node -n kube-system

# Verify connectivity
kubectl run test-connectivity --image=busybox --rm -it --restart=Never -- ping -c 3 8.8.8.8
```

For Cilium:

```bash
# Upgrade Cilium using Helm
helm repo update
helm upgrade cilium cilium/cilium --version 1.15.0 \
  --namespace kube-system \
  --reuse-values

# Check Cilium status
cilium status --wait

# Run connectivity tests
cilium connectivity test
```

## Upgrading Cloud Provider Addons

Cloud providers like AWS, GCP, and Azure have their own addons that need upgrading.

For AWS EKS:

```bash
# List available addon versions
aws eks describe-addon-versions --addon-name vpc-cni --kubernetes-version 1.29

# Update VPC CNI addon
aws eks update-addon \
  --cluster-name my-cluster \
  --addon-name vpc-cni \
  --addon-version v1.16.0-eksbuild.1 \
  --resolve-conflicts OVERWRITE

# Check addon status
aws eks describe-addon \
  --cluster-name my-cluster \
  --addon-name vpc-cni

# Update kube-proxy addon
aws eks update-addon \
  --cluster-name my-cluster \
  --addon-name kube-proxy \
  --addon-version v1.29.0-eksbuild.1

# Update CoreDNS addon
aws eks update-addon \
  --cluster-name my-cluster \
  --addon-name coredns \
  --addon-version v1.11.1-eksbuild.4
```

For GKE:

```bash
# GKE typically manages addons automatically, but you can verify
gcloud container clusters describe my-cluster \
  --zone us-central1-a \
  --format="value(addonsConfig)"

# Manually update addons if needed
gcloud container clusters update my-cluster \
  --zone us-central1-a \
  --update-addons=HttpLoadBalancing=ENABLED,HorizontalPodAutoscaling=ENABLED
```

## Upgrading metrics-server

The metrics-server provides resource metrics for kubectl top and HPA.

```bash
# Download the latest metrics-server manifest
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify metrics-server is running
kubectl get deployment metrics-server -n kube-system

# Test metrics collection
kubectl top nodes
kubectl top pods -A
```

## Verification and Testing

After upgrading all addons, perform comprehensive verification to ensure everything works correctly.

```bash
# Create a test script
cat > verify-addons.sh << 'EOF'
#!/bin/bash

echo "Checking CoreDNS..."
kubectl get pods -n kube-system -l k8s-app=kube-dns

echo "Checking kube-proxy..."
kubectl get pods -n kube-system -l k8s-app=kube-proxy

echo "Checking CNI..."
kubectl get pods -n kube-system | grep -E "calico|cilium|flannel"

echo "Testing DNS resolution..."
kubectl run test-dns --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default

echo "Testing service connectivity..."
kubectl run test-curl --image=curlimages/curl --rm -it --restart=Never -- curl -s kubernetes.default.svc.cluster.local:443 -k

echo "Checking metrics-server..."
kubectl top nodes

echo "All addon checks complete!"
EOF

chmod +x verify-addons.sh
./verify-addons.sh
```

## Handling Addon Upgrade Failures

If an addon upgrade fails, you need a quick recovery strategy.

```bash
# For deployment-based addons (CoreDNS)
kubectl rollout undo deployment/coredns -n kube-system

# For daemonset-based addons (kube-proxy, CNI)
kubectl rollout undo daemonset/kube-proxy -n kube-system

# Restore from backup
kubectl apply -f coredns-backup.yaml

# Check addon logs for error details
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=100
```

## Automated Addon Management

You can automate addon upgrades using tools like Helm or custom operators.

```yaml
# Example: Managing addons with ArgoCD
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: coredns
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/coredns/helm
    targetRevision: 1.24.0
    chart: coredns
  destination:
    server: https://kubernetes.default.svc
    namespace: kube-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Best Practices

Always backup addon configurations before upgrading. Use staging environments to test addon upgrades before applying them to production. Monitor addon health continuously using Prometheus and alerting. Keep addon versions within one minor version of your control plane. Document your addon versions and upgrade procedures in your runbooks.

Upgrading Kubernetes addons after control plane upgrades is a critical maintenance task that ensures your cluster remains stable, secure, and performant. By following a systematic approach and testing thoroughly, you can minimize risks and maintain high availability throughout the upgrade process.

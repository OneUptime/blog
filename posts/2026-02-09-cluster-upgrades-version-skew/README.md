# How to Plan Kubernetes Cluster Upgrades with Version Skew Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Upgrade, Operation

Description: Plan safe Kubernetes cluster upgrades by understanding version skew policies between control plane components, kubelet versions, and kubectl clients to avoid compatibility issues.

---

Kubernetes version skew policies define the supported version differences between cluster components. Violating these policies leads to API incompatibilities, failed workload deployments, and cluster instability. Understanding skew policies ensures upgrade plans maintain component compatibility throughout the process.

This guide explains version skew rules, demonstrates planning multi-stage upgrades across control plane and worker nodes, and provides verification procedures to confirm upgrade readiness.

## Understanding Version Skew Policy

Kubernetes follows semantic versioning with three version components: major.minor.patch (e.g., 1.28.4). The skew policy primarily concerns minor versions, allowing specific differences between components.

In highly available clusters, kube-apiserver instances must be within one minor version of each other. Control plane components (kube-controller-manager, kube-scheduler, cloud-controller-manager) must not be newer than the kube-apiserver instances they communicate with. They are expected to match the kube-apiserver minor version, but can be one minor version older during live upgrades.

Kubelet must not be newer than kube-apiserver. For kubelet 1.25 and newer, it can be up to three minor versions older than kube-apiserver; older kubelet versions are limited to two minor versions older. Kube-proxy follows the same kube-apiserver skew rule and can also be up to three minor versions older or newer than the kubelet it runs alongside. Kubectl is supported within one minor version (older or newer) of kube-apiserver, providing flexibility in client upgrades.

## Checking Current Cluster Versions

Identify versions across all cluster components.

```bash
# Check control plane version

kubectl version

# Check individual control plane component versions
kubectl get pods -n kube-system -o json | \
  jq -r '.items[] | select(.metadata.name | startswith("kube-apiserver")) |
    {name: .metadata.name, image: .spec.containers[0].image}'

# Check all nodes kubelet versions
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
VERSION:.status.nodeInfo.kubeletVersion,\
OS:.status.nodeInfo.osImage

# Check node component versions. The kubeProxyVersion node field is
# deprecated and unreliable, so check kube-proxy from the DaemonSet image.
kubectl get nodes -o json | \
  jq -r '.items[] | {
    name: .metadata.name,
    kubelet: .status.nodeInfo.kubeletVersion,
    containerRuntime: .status.nodeInfo.containerRuntimeVersion
  }'

kubectl get daemonset kube-proxy -n kube-system -o json | \
  jq -r '.spec.template.spec.containers[] | select(.name == "kube-proxy") |
    {name: .name, image: .image}'
```

## Planning the Upgrade Path

Plan upgrades in stages respecting version skew.

Example scenario: Upgrading from 1.34 to 1.36

```bash
# Current state: All components at 1.34
# Target state: All components at 1.36

# Stage 1: Upgrade control plane to 1.35
# - kube-apiserver: 1.34 → 1.35
# - controller-manager, scheduler: 1.34 → 1.35
# - kubelet: Remains at 1.34 (within supported skew of apiserver 1.35)

# Stage 2: Upgrade worker nodes to 1.35
# - kubelet: 1.34 → 1.35
# - kube-proxy: 1.34 → 1.35

# Stage 3: Upgrade control plane to 1.36
# - kube-apiserver: 1.35 → 1.36
# - controller-manager, scheduler: 1.35 → 1.36
# - kubelet: Remains at 1.35 (within supported skew of apiserver 1.36)

# Stage 4: Upgrade worker nodes to 1.36
# - kubelet: 1.35 → 1.36
# - kube-proxy: 1.35 → 1.36
```

## Documenting Upgrade Plan

Create a formal upgrade plan document.

```yaml
# upgrade-plan.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-upgrade-plan
  namespace: kube-system
data:
  plan.yaml: |
    cluster: production
    currentVersion: 1.34.0
    targetVersion: 1.36.0

    stages:
    - stage: 1
      name: "Control Plane 1.34 → 1.35"
      date: "2026-06-15"
      components:
        - name: kube-apiserver
          from: 1.34.0
          to: 1.35.0
        - name: kube-controller-manager
          from: 1.34.0
          to: 1.35.0
        - name: kube-scheduler
          from: 1.34.0
          to: 1.35.0
      validation:
        - "Verify API server responds"
        - "Check control plane pod health"
        - "Run conformance subset"

    - stage: 2
      name: "Worker Nodes 1.34 → 1.35"
      date: "2026-06-17"
      rolloutStrategy: "rolling"
      maxUnavailable: 1
      components:
        - name: kubelet
          from: 1.34.0
          to: 1.35.0
        - name: kube-proxy
          from: 1.34.0
          to: 1.35.0
      validation:
        - "Verify node Ready status"
        - "Check workload health"
        - "Monitor application metrics"

    - stage: 3
      name: "Control Plane 1.35 → 1.36"
      date: "2026-06-22"
      components:
        - name: kube-apiserver
          from: 1.35.0
          to: 1.36.0
        - name: kube-controller-manager
          from: 1.35.0
          to: 1.36.0
        - name: kube-scheduler
          from: 1.35.0
          to: 1.36.0
      validation:
        - "Verify API server responds"
        - "Check deprecated API usage"
        - "Validate admission webhooks"

    - stage: 4
      name: "Worker Nodes 1.35 → 1.36"
      date: "2026-06-24"
      rolloutStrategy: "rolling"
      maxUnavailable: 2
      components:
        - name: kubelet
          from: 1.35.0
          to: 1.36.0
        - name: kube-proxy
          from: 1.35.0
          to: 1.36.0
      validation:
        - "Verify all nodes at target version"
        - "Run full conformance tests"
        - "Performance baseline comparison"

    rollback:
      supported: false
      procedure: "Restore from tested backups or use provider-specific rollback if supported; do not rely on Kubernetes control plane downgrades"
      maxRestoreWindow: "24 hours"

    communicationPlan:
      - stakeholder: "Development Teams"
        notification: "7 days before"
        method: "Email + Slack"
      - stakeholder: "Operations"
        notification: "3 days before"
        method: "Ticket + Meeting"
```

## Verifying Skew Compliance

Create a script to validate version skew compliance.

```bash
# check-version-skew.sh
#!/bin/bash

# Get kube-apiserver version
API_VERSION=$(kubectl version -o json | jq -r '.serverVersion.minor' | sed 's/[^0-9]//g')

echo "API Server version: 1.$API_VERSION"

# Check control plane components
echo -e "\n=== Control Plane Components ==="
kubectl get pods -n kube-system -o json | \
  jq -c '.items[] | select(.metadata.name | test("kube-controller-manager|kube-scheduler|cloud-controller-manager")) |
    {
      name: .metadata.name,
      image: .spec.containers[0].image,
      version: (.spec.containers[0].image | capture("v(?<version>[0-9]+\\.[0-9]+)") | .version)
    }' | \
  while read -r line; do
    COMPONENT_VERSION=$(echo "$line" | jq -r '.version' | cut -d'.' -f2)
    SKEW=$((API_VERSION - COMPONENT_VERSION))

    if [ $SKEW -lt 0 ]; then
      echo "VIOLATION: $(echo "$line" | jq -r '.name') is newer than kube-apiserver"
    elif [ $SKEW -gt 1 ]; then
      echo "VIOLATION: $(echo "$line" | jq -r '.name') is $SKEW versions behind (max 1)"
    else
      echo "OK: $(echo "$line" | jq -r '.name'): v$(echo "$line" | jq -r '.version') (skew: $SKEW)"
    fi
  done

# Check kubelet versions
echo -e "\n=== Kubelet Versions ==="
kubectl get nodes -o json | \
  jq -c '.items[] | {
    name: .metadata.name,
    version: .status.nodeInfo.kubeletVersion
  }' | \
  while read -r line; do
    NODE_NAME=$(echo "$line" | jq -r '.name')
    KUBELET_VERSION=$(echo "$line" | jq -r '.version' | sed 's/v1\.//' | cut -d'.' -f1)
    SKEW=$((API_VERSION - KUBELET_VERSION))

    if [ $SKEW -lt 0 ]; then
      echo "VIOLATION: $NODE_NAME kubelet is newer than kube-apiserver"
    elif [ "$KUBELET_VERSION" -lt 25 ] && [ $SKEW -gt 2 ]; then
      echo "VIOLATION: $NODE_NAME kubelet is $SKEW versions behind (max 2 for kubelet < 1.25)"
    elif [ $SKEW -gt 3 ]; then
      echo "VIOLATION: $NODE_NAME kubelet is $SKEW versions behind (max 3)"
    else
      echo "OK: $NODE_NAME: v1.$KUBELET_VERSION (skew: $SKEW)"
    fi
  done

# Check kube-proxy version from DaemonSet image
echo -e "\n=== kube-proxy Version ==="
KUBE_PROXY_VERSION=$(kubectl get daemonset kube-proxy -n kube-system -o json | \
  jq -r '.spec.template.spec.containers[] | select(.name == "kube-proxy") |
    .image | capture("v(?<version>[0-9]+\\.[0-9]+)") | .version' | cut -d'.' -f2)
KUBE_PROXY_SKEW=$((API_VERSION - KUBE_PROXY_VERSION))

if [ $KUBE_PROXY_SKEW -lt 0 ]; then
  echo "VIOLATION: kube-proxy is newer than kube-apiserver"
elif [ "$KUBE_PROXY_VERSION" -lt 25 ] && [ $KUBE_PROXY_SKEW -gt 2 ]; then
  echo "VIOLATION: kube-proxy is $KUBE_PROXY_SKEW versions behind (max 2 for kube-proxy < 1.25)"
elif [ $KUBE_PROXY_SKEW -gt 3 ]; then
  echo "VIOLATION: kube-proxy is $KUBE_PROXY_SKEW versions behind (max 3)"
else
  echo "OK: kube-proxy: v1.$KUBE_PROXY_VERSION (skew: $KUBE_PROXY_SKEW)"
fi

# Check kubectl version
echo -e "\n=== kubectl Version ==="
KUBECTL_VERSION=$(kubectl version -o json | jq -r '.clientVersion.minor' | sed 's/[^0-9]//g')
KUBECTL_SKEW=$((API_VERSION - KUBECTL_VERSION))

if [ ${KUBECTL_SKEW#-} -gt 1 ]; then
  echo "WARNING: kubectl is ${KUBECTL_SKEW#-} versions different (max 1)"
else
  echo "OK: kubectl: v1.$KUBECTL_VERSION (skew: $KUBECTL_SKEW)"
fi
```

Run the validation:

```bash
chmod +x check-version-skew.sh
./check-version-skew.sh
```

## Handling Multi-Cluster Upgrades

When managing multiple clusters, stagger upgrades to reduce risk.

```yaml
# multi-cluster-schedule.yaml
clusters:
  - name: dev
    currentVersion: 1.34.0
    targetVersion: 1.36.0
    upgradeWindow: "2026-06-10 to 2026-06-11"
    priority: low

  - name: staging
    currentVersion: 1.34.0
    targetVersion: 1.36.0
    upgradeWindow: "2026-06-15 to 2026-06-16"
    priority: medium
    dependsOn: ["dev"]

  - name: production
    currentVersion: 1.34.0
    targetVersion: 1.36.0
    upgradeWindow: "2026-06-22 to 2026-06-25"
    priority: critical
    dependsOn: ["staging"]
    soakPeriod: 168h  # 1 week in staging before prod
```

## Testing Upgrade Compatibility

Before production upgrades, test in lower environments.

```bash
# Create test cluster at target version
kind create cluster --name upgrade-test --image kindest/node:v1.36.0

# Deploy representative workloads
kubectl apply -f production-workloads/

# Run compatibility tests
kubectl run test-pod --image=nginx:1.25 --restart=Never
kubectl wait --for=condition=ready pod/test-pod --timeout=60s

# Test API access
kubectl get pods --v=6

# Test custom resource definitions
kubectl get crd

# Clean up
kind delete cluster --name upgrade-test
```

## Monitoring During Upgrades

Track metrics during upgrade execution.

```bash
# Watch control plane pod status
watch -n 2 'kubectl get pods -n kube-system | grep -E "kube-apiserver|kube-controller|kube-scheduler"'

# Monitor node status
watch -n 5 'kubectl get nodes'

# Check for API errors
kubectl logs -n kube-system -l component=kube-apiserver --tail=100 -f | grep -i error

# Track workload health
kubectl get pods -A -o wide | grep -v Running
```

Understanding and respecting version skew policies prevents compatibility issues during Kubernetes upgrades. By planning upgrades in stages, validating version compatibility, and testing in non-production environments first, you ensure smooth transitions between versions. The combination of careful planning, validation scripts, and staged rollouts minimizes risk while keeping clusters current with security patches and new features.

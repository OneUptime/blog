# How to Upgrade Kubernetes With Feature Gate Changes and Deprecations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Feature-Gates, Configuration

Description: Navigate Kubernetes feature gate changes and deprecations during upgrades with comprehensive guides on identifying enabled features, managing transitions, and adapting to new default behaviors safely.

---

Feature gates control experimental and graduated features in Kubernetes. As you upgrade, feature gates change their default states, graduate to GA, or get deprecated. Understanding these changes prevents unexpected behavior and ensures smooth transitions between Kubernetes versions.

## Understanding Feature Gates

Feature gates are key-value pairs that enable or disable specific Kubernetes features. Alpha features are disabled by default and require explicit enablement. Beta features are often enabled by default but can be disabled. GA features are always enabled and their feature gates are eventually removed.

When upgrading, you need to track which feature gates are changing state, which experimental features you're using, and how to adapt your configuration for new defaults.

## Checking Current Feature Gates

Identify which feature gates are currently enabled in your cluster.

```bash
#!/bin/bash
# check-feature-gates.sh

echo "Checking current feature gates..."

# For API server
kubectl get pod -n kube-system -l component=kube-apiserver -o yaml | \
  grep -A 10 "feature-gates"

# For kubelet on nodes
kubectl get nodes -o json | jq -r '.items[0].metadata.name' | \
  xargs -I {} kubectl get --raw /api/v1/nodes/{}/proxy/configz | \
  jq '.kubeletconfig.featureGates'

# For controller manager
kubectl get pod -n kube-system -l component=kube-controller-manager -o yaml | \
  grep -A 10 "feature-gates"

# For scheduler
kubectl get pod -n kube-system -l component=kube-scheduler -o yaml | \
  grep -A 10 "feature-gates"
```

## Reviewing Feature Gate Changes

Check what feature gate changes are coming in your target Kubernetes version.

```bash
#!/bin/bash
# review-feature-gate-changes.sh

CURRENT_VERSION="1.28"
TARGET_VERSION="1.29"

echo "Reviewing feature gate changes from $CURRENT_VERSION to $TARGET_VERSION..."

# Feature gates that graduated to GA (will be removed)
cat << EOF
Feature Gates Graduating to GA in $TARGET_VERSION:
- ReadWriteOncePod: Now always enabled
- CSIStorageCapacity: Now always enabled
- PodSecurity: Now always enabled

Feature Gates Removed (already GA):
- CronJobTimeZone
- CSIMigration

New Alpha Features Available:
- SELinuxMountReadWriteOncePod
- StrictCostEnforcementForVAP

Check documentation: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
EOF
```

## Adapting to Graduated Features

When features graduate to GA, adjust your configuration to remove explicit feature gate settings.

```bash
#!/bin/bash
# remove-graduated-feature-gates.sh

echo "Removing graduated feature gates from configuration..."

# Update API server manifest
sudo sed -i '/--feature-gates=.*ReadWriteOncePod/d' \
  /etc/kubernetes/manifests/kube-apiserver.yaml

# Update kubelet config
sudo sed -i '/ReadWriteOncePod/d' /var/lib/kubelet/config.yaml
sudo systemctl restart kubelet

# Update controller manager
sudo sed -i '/--feature-gates=.*ReadWriteOncePod/d' \
  /etc/kubernetes/manifests/kube-controller-manager.yaml

echo "Graduated feature gates removed"
```

## Testing Alpha/Beta Features Before Upgrade

If you're using experimental features, test them against the new version.

```bash
#!/bin/bash
# test-experimental-features.sh

TARGET_VERSION="1.29.0"

echo "Testing experimental features with Kubernetes $TARGET_VERSION..."

# Create test cluster with specific feature gates
cat <<EOF | kind create cluster --name feature-test --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  image: kindest/node:v$TARGET_VERSION
  kubeadmConfigPatches:
  - |
    kind: ClusterConfiguration
    apiServer:
      extraArgs:
        feature-gates: "MyNewFeature=true"
    controllerManager:
      extraArgs:
        feature-gates: "MyNewFeature=true"
    scheduler:
      extraArgs:
        feature-gates: "MyNewFeature=true"
- role: worker
  image: kindest/node:v$TARGET_VERSION
  kubeadmConfigPatches:
  - |
    kind: JoinConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        feature-gates: "MyNewFeature=true"
EOF

# Test your workloads
kubectl --context kind-feature-test apply -f ./test-manifests/

# Cleanup
kind delete cluster --name feature-test
```

## Managing Deprecated Feature Gates

Handle feature gates that are being deprecated or removed.

```bash
#!/bin/bash
# handle-deprecated-gates.sh

echo "Checking for deprecated feature gates..."

# List of deprecated gates in 1.29
DEPRECATED_GATES=(
  "DynamicKubeletConfig"
  "SomeOldFeature"
)

for gate in "${DEPRECATED_GATES[@]}"; do
  echo "Checking for $gate..."

  # Check API server
  if kubectl get pod -n kube-system -l component=kube-apiserver -o yaml | grep -q "$gate"; then
    echo "WARNING: $gate found in API server config"
  fi

  # Check kubelet configs
  kubectl get nodes -o json | jq -r '.items[].metadata.name' | while read node; do
    if kubectl get --raw /api/v1/nodes/$node/proxy/configz | jq '.kubeletconfig.featureGates' | grep -q "$gate"; then
      echo "WARNING: $gate found on node $node"
    fi
  done
done
```

## Updating Feature Gate Configuration

Update feature gate configuration across cluster components.

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
apiServer:
  extraArgs:
    feature-gates: "CSIStorageCapacity=true,ReadWriteOncePod=true"
controllerManager:
  extraArgs:
    feature-gates: "CSIStorageCapacity=true,ReadWriteOncePod=true"
scheduler:
  extraArgs:
    feature-gates: "CSIStorageCapacity=true"
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
nodeRegistration:
  kubeletExtraArgs:
    feature-gates: "CSIStorageCapacity=true"
```

Update via configuration files:

```bash
#!/bin/bash
# update-feature-gates.sh

FEATURE_GATES="CSIStorageCapacity=true,ReadWriteOncePod=true"

# Update API server
sudo sed -i "s/--feature-gates=.*/--feature-gates=$FEATURE_GATES/" \
  /etc/kubernetes/manifests/kube-apiserver.yaml

# Update kubelet
cat >> /var/lib/kubelet/config.yaml << EOF
featureGates:
  CSIStorageCapacity: true
  ReadWriteOncePod: true
EOF

sudo systemctl restart kubelet
```

## Monitoring Feature Gate Impact

Monitor how feature gate changes affect your workloads.

```bash
#!/bin/bash
# monitor-feature-impact.sh

echo "Monitoring feature gate impact..."

# Check API server logs for feature gate warnings
kubectl logs -n kube-system -l component=kube-apiserver | \
  grep -i "feature\|gate"

# Monitor workload behavior
kubectl get pods -A --watch

# Check for deprecated API usage
kubectl get --raw /metrics | grep apiserver_requested_deprecated_apis

# Track feature usage metrics
kubectl get --raw /metrics | grep feature_enabled
```

## Documenting Feature Gate Strategy

Create documentation for your feature gate management strategy.

```bash
#!/bin/bash
# document-feature-gates.sh

cat > feature-gate-strategy.md << 'EOF'
# Feature Gate Management Strategy

## Current Kubernetes Version: 1.28

## Enabled Feature Gates

### Alpha Features
- None currently enabled in production

### Beta Features
- CSIStorageCapacity: Enabled (graduating to GA in 1.29)
- ReadWriteOncePod: Enabled (graduating to GA in 1.29)

## Upgrade Plan to 1.29

### Actions Required
1. Remove explicit feature gate flags for graduated features
2. Test workloads without explicit gates
3. Monitor for any behavior changes

### Timeline
- Week 1: Test in staging
- Week 2: Update production configuration
- Week 3: Perform upgrade

## Review Schedule
- Review feature gates quarterly
- Check release notes for each Kubernetes upgrade
- Update documentation with each change

Last Updated: $(date)
EOF

echo "Documentation created: feature-gate-strategy.md"
```

Successfully managing feature gates during Kubernetes upgrades requires understanding which features you're using, tracking graduation paths, and adapting configuration as gates change states. By proactively reviewing feature gate changes, testing new defaults, and maintaining clear documentation, you can upgrade Kubernetes smoothly without unexpected behavior from feature gate changes.

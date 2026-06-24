# How to Upgrade Kubernetes Networking CNI Plugins Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CNI, Networking

Description: Learn how to upgrade Kubernetes CNI plugins like Calico, Cilium, and Flannel without network disruption using rolling updates, dual-stack approaches, and proper validation techniques.

---

CNI plugin upgrades are among the most sensitive Kubernetes maintenance tasks. Since CNI plugins handle pod networking, a failed upgrade can disconnect workloads from each other or from the cluster network. Proper planning, testing, and execution are essential for upgrading CNI plugins without causing network outages.

## Understanding CNI Plugin Architecture

Container Network Interface plugins are responsible for allocating IP addresses to pods, setting up network interfaces, and configuring routing between pods. They run as DaemonSets on every node and integrate deeply with the kernel networking stack. This makes CNI upgrades particularly risky compared to other cluster components.

Popular CNI plugins include Calico for network policy enforcement, Cilium for eBPF-based networking, Flannel for simple overlay networks, and Weave for automatic mesh networking. Each has its own upgrade procedures and considerations.

## Pre-Upgrade Preparation

Before upgrading any CNI plugin, thoroughly test in a staging environment and verify current network functionality.

```bash
#!/bin/bash
# pre-cni-upgrade-check.sh

echo "Checking CNI plugin health before upgrade..."

# Identify current CNI plugin

CNI_INFO=$(kubectl get ds -A -o json | \
  jq -r '.items[] | select(.metadata.name | test("calico|cilium|flannel|weave")) | "\(.metadata.namespace) \(.metadata.name)"' | head -1)
CNI_NAMESPACE=$(echo "$CNI_INFO" | awk '{print $1}')
CNI_PLUGIN=$(echo "$CNI_INFO" | awk '{print $2}')

case "$CNI_PLUGIN" in
  calico-node) CNI_SELECTOR="k8s-app=calico-node" ;;
  cilium) CNI_SELECTOR="k8s-app=cilium" ;;
  kube-flannel-ds) CNI_SELECTOR="app=flannel" ;;
  weave-net) CNI_SELECTOR="name=weave-net" ;;
  *) echo "Unknown CNI plugin"; exit 1 ;;
esac

echo "Current CNI plugin: $CNI_PLUGIN in namespace $CNI_NAMESPACE"

# Check CNI pod health
kubectl get pods -n "$CNI_NAMESPACE" -l "$CNI_SELECTOR" -o wide

# Test pod-to-pod connectivity
kubectl run test-source --image=busybox --restart=Never -- sleep 3600
kubectl run test-dest --image=nginx --restart=Never

kubectl wait --for=condition=Ready pod/test-source --timeout=60s
kubectl wait --for=condition=Ready pod/test-dest --timeout=60s

SOURCE_POD=$(kubectl get pod test-source -o jsonpath='{.status.podIP}')
DEST_POD=$(kubectl get pod test-dest -o jsonpath='{.status.podIP}')

echo "Testing connectivity from $SOURCE_POD to $DEST_POD"
kubectl exec test-source -- wget -T 5 -qO- http://$DEST_POD

# Test DNS resolution
kubectl exec test-source -- nslookup kubernetes.default

# Clean up test pods
kubectl delete pod test-source test-dest

echo "Pre-upgrade connectivity tests passed"
```

## Upgrading Calico

Calico upgrades typically involve updating the manifest or Helm chart to a new version.

```bash
#!/bin/bash
# upgrade-calico.sh

OLD_VERSION="v3.26.0"
NEW_VERSION="v3.27.0"

echo "Upgrading Calico from $OLD_VERSION to $NEW_VERSION..."

# Backup current configuration
kubectl get felixconfigurations,bgpconfigurations,ippools -o yaml > calico-config-backup.yaml

# Download new Calico manifest
curl https://raw.githubusercontent.com/projectcalico/calico/$NEW_VERSION/manifests/calico.yaml -o calico-$NEW_VERSION.yaml
curl https://raw.githubusercontent.com/projectcalico/calico/$OLD_VERSION/manifests/calico.yaml -o calico-$OLD_VERSION.yaml

# Review differences
diff <(kubectl get ds calico-node -n kube-system -o yaml) \
     <(grep -A 100 "kind: DaemonSet" calico-$NEW_VERSION.yaml | head -100)

# Apply new version (rolling update)
kubectl apply --server-side --force-conflicts -f calico-$NEW_VERSION.yaml

# Monitor rollout
kubectl rollout status daemonset/calico-node -n kube-system --timeout=10m

# Verify Calico node status with a calicoctl version compatible with the cluster
kubectl get nodes -o wide
calicoctl version
calicoctl node status

echo "Calico upgrade complete"
```

Using Helm for Calico upgrades:

```bash
#!/bin/bash
# upgrade-calico-helm.sh

NEW_VERSION="v3.27.0"

echo "Upgrading Calico using Helm..."

# Add Calico Helm repo
helm repo add projectcalico https://docs.tigera.io/calico/charts
helm repo update

# Check current version
helm list -n tigera-operator | grep calico

# Apply CRDs for the target Calico version
kubectl apply --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/projectcalico/calico/$NEW_VERSION/manifests/v1_crd_projectcalico_org.yaml

# Upgrade Calico
helm upgrade calico projectcalico/tigera-operator \
  --version $NEW_VERSION \
  --namespace tigera-operator \
  --reuse-values

# Monitor upgrade
kubectl get tigerastatus
kubectl get pods -n calico-system

echo "Helm upgrade complete"
```

## Upgrading Cilium

Cilium upgrades require careful attention to eBPF programs and agent versioning. Cilium's tested upgrade and rollback path is between consecutive minor releases; traffic that uses L7 policy, Ingress, Gateway API, or other userspace proxy paths can be disrupted during an agent upgrade and may need to reconnect.

```bash
#!/bin/bash
# upgrade-cilium.sh

OLD_VERSION="1.14.5"
NEW_VERSION="1.15.0"

echo "Upgrading Cilium from $OLD_VERSION to $NEW_VERSION..."

# Check current Cilium status
cilium status --wait

# Save and review current Helm values before changing chart versions
helm get values cilium --namespace kube-system -o yaml > cilium-old-values.yaml

# Pre-upgrade connectivity check
cilium connectivity test

# Upgrade using Helm
helm repo add cilium https://helm.cilium.io/
helm repo update
helm upgrade cilium cilium/cilium \
  --version $NEW_VERSION \
  --namespace kube-system \
  -f cilium-old-values.yaml \
  --set upgradeCompatibility=${OLD_VERSION%.*}

# Monitor upgrade progress
kubectl rollout status daemonset/cilium -n kube-system --timeout=10m

# Verify Cilium status
cilium status --wait

# Run post-upgrade connectivity test
cilium connectivity test

echo "Cilium upgrade complete"
```

## Upgrading Flannel

Flannel is simpler but still requires careful execution.

```bash
#!/bin/bash
# upgrade-flannel.sh

NEW_VERSION="v0.24.0"

echo "Upgrading Flannel to $NEW_VERSION..."

# Download new Flannel manifest
curl -L https://github.com/flannel-io/flannel/releases/download/$NEW_VERSION/kube-flannel.yml -o flannel-$NEW_VERSION.yaml

# Review changes
diff <(kubectl get ds kube-flannel-ds -n kube-flannel -o yaml) flannel-$NEW_VERSION.yaml

# Apply update
kubectl apply -f flannel-$NEW_VERSION.yaml

# Monitor rollout
kubectl rollout status daemonset/kube-flannel-ds -n kube-flannel

# Verify pod networking
kubectl get pods -n kube-flannel -l app=flannel

echo "Flannel upgrade complete"
```

## Testing Network Connectivity During Upgrades

Continuously test connectivity while upgrading CNI plugins to catch issues immediately.

```bash
#!/bin/bash
# monitor-network-during-upgrade.sh

TEST_INTERVAL=5
DURATION=600

echo "Monitoring network connectivity during CNI upgrade..."

# Deploy test pods
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: network-test-server
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    ports:
    - containerPort: 80
---
apiVersion: v1
kind: Pod
metadata:
  name: network-test-client
spec:
  containers:
  - name: busybox
    image: busybox
    command: ['sleep', '3600']
EOF

kubectl wait --for=condition=Ready pod/network-test-server --timeout=60s
kubectl wait --for=condition=Ready pod/network-test-client --timeout=60s

SERVER_IP=$(kubectl get pod network-test-server -o jsonpath='{.status.podIP}')

start_time=$(date +%s)
failures=0
successes=0

while [ $(($(date +%s) - start_time)) -lt $DURATION ]; do
  if kubectl exec network-test-client -- wget -T 2 -qO- http://$SERVER_IP > /dev/null 2>&1; then
    echo "$(date): Connectivity OK"
    ((successes++))
  else
    echo "$(date): Connectivity FAILED"
    ((failures++))
  fi

  sleep $TEST_INTERVAL
done

# Cleanup
kubectl delete pod network-test-server network-test-client

echo "Test complete: $successes successes, $failures failures"

if [ $failures -gt 0 ]; then
  echo "WARNING: Network disruptions detected during upgrade"
  exit 1
fi
```

## Handling CNI Upgrade Failures

If a CNI upgrade fails, you need to recover quickly to restore network connectivity.

```bash
#!/bin/bash
# rollback-cni-upgrade.sh

BACKUP_FILE="calico-config-backup.yaml"

echo "Rolling back CNI plugin upgrade..."

# Apply backup configuration and restore the previous manifest or Helm release
kubectl apply -f $BACKUP_FILE
kubectl apply --server-side --force-conflicts -f calico-v3.26.0.yaml
# If Calico was installed with Helm instead, use:
# helm rollback calico <REVISION> --namespace tigera-operator

# Restart CNI pods
kubectl delete pods -n kube-system -l k8s-app=calico-node

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -n kube-system -l k8s-app=calico-node --timeout=300s

# Verify connectivity
kubectl run test-rollback --image=busybox --rm -i --restart=Never -- ping -c 3 8.8.8.8

echo "CNI rollback complete"
```

## Post-Upgrade Validation

After upgrading, run comprehensive validation tests.

```bash
#!/bin/bash
# validate-cni-upgrade.sh

echo "Validating CNI upgrade..."

# Check all CNI pods are running
cni_pods=$(kubectl get pods -n kube-system -l k8s-app=calico-node --no-headers | wc -l)
ready_pods=$(kubectl get pods -n kube-system -l k8s-app=calico-node -o json | \
  jq '[.items[] | select(.status.conditions[]? | select(.type=="Ready" and .status=="True"))] | length')

echo "CNI pods: $ready_pods/$cni_pods ready"

if [ $ready_pods -ne $cni_pods ]; then
  echo "ERROR: Not all CNI pods are ready"
  exit 1
fi

# Test pod-to-pod connectivity
kubectl run test-src --image=busybox --restart=Never -- sleep 60 &
kubectl run test-dst --image=nginx --restart=Never &

kubectl wait --for=condition=Ready pod/test-src --timeout=60s
kubectl wait --for=condition=Ready pod/test-dst --timeout=60s

SRC_IP=$(kubectl get pod test-src -o jsonpath='{.status.podIP}')
DST_IP=$(kubectl get pod test-dst -o jsonpath='{.status.podIP}')

echo "Testing pod connectivity: $SRC_IP -> $DST_IP"
kubectl exec test-src -- ping -c 3 $DST_IP

# Test service connectivity
echo "Testing service connectivity..."
kubectl exec test-src -- nslookup kubernetes.default

# Test external connectivity
echo "Testing external connectivity..."
kubectl exec test-src -- ping -c 3 8.8.8.8

# Cleanup
kubectl delete pod test-src test-dst

# Test network policies (if using Calico/Cilium)
echo "Testing network policies..."
kubectl run test-netpol --image=nginx --labels="app=test"
kubectl expose pod test-netpol --port=80

cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: test-policy
spec:
  podSelector:
    matchLabels:
      app: test
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          access: allowed
EOF

# Test policy enforcement
kubectl run test-blocked --image=busybox --rm -i --restart=Never -- wget -T 2 -qO- http://test-netpol && echo "FAIL: Should be blocked" || echo "PASS: Correctly blocked"

kubectl run test-allowed --labels="access=allowed" --image=busybox --rm -i --restart=Never -- wget -T 2 -qO- http://test-netpol && echo "PASS: Correctly allowed" || echo "FAIL: Should be allowed"

# Cleanup
kubectl delete pod test-netpol
kubectl delete svc test-netpol
kubectl delete networkpolicy test-policy

echo "CNI validation complete"
```

Upgrading CNI plugins without downtime requires careful planning, continuous monitoring, and thorough validation. By following proper upgrade procedures specific to your CNI plugin, testing connectivity throughout the process, and having rollback procedures ready, you can safely upgrade the networking foundation of your Kubernetes cluster while maintaining uninterrupted service.

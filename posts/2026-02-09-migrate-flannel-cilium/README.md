# How to Migrate from Flannel CNI to Cilium Without Cluster Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CNI, Cilium

Description: Learn how to migrate your Kubernetes cluster from Flannel to Cilium CNI without downtime using a rolling node replacement strategy with eBPF-powered networking.

---

Flannel provides simple overlay networking for Kubernetes, but Cilium offers advanced features like eBPF-based networking, network policies, service mesh capabilities, and observability through Hubble. Migrating between CNI plugins is risky because networking changes can cause cluster-wide outages. This guide shows you how to migrate from Flannel to Cilium safely using a rolling node replacement strategy.

## Understanding the Migration Strategy

CNI migration requires careful planning because you cannot run two CNI plugins simultaneously on the same node.

```yaml
# Migration approach overview
apiVersion: v1
kind: ConfigMap
metadata:
  name: cni-migration-plan
  namespace: kube-system
data:
  strategy.md: |
    # Flannel to Cilium Migration Strategy

    ## Phase 1: Preparation (Week 1)
    - Audit current network policies
    - Document service dependencies
    - Backup cluster state
    - Create test cluster for validation

    ## Phase 2: Deploy Cilium in Parallel (Week 2)
    - Add new node pool with Cilium
    - Label nodes appropriately
    - Test pod connectivity between CNIs
    - Validate network policies

    ## Phase 3: Workload Migration (Week 3-4)
    - Gradually cordon Flannel nodes
    - Drain workloads to Cilium nodes
    - Validate application functionality
    - Monitor network metrics

    ## Phase 4: Cleanup (Week 5)
    - Remove Flannel nodes
    - Uninstall Flannel components
    - Consolidate Cilium configuration
    - Document new networking setup
```

This phased approach minimizes risk by running both CNIs temporarily during migration.

## Preparing the Cluster for Migration

Audit your current networking configuration before starting.

```bash
#!/bin/bash
# Pre-migration audit script

echo "=== Current CNI Configuration ==="
kubectl get nodes -o=jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'

echo -e "\n=== Flannel Configuration ==="
kubectl get cm -n kube-flannel kube-flannel-cfg -o yaml

echo -e "\n=== Network Policies ==="
kubectl get netpol -A

echo -e "\n=== Service CIDR ==="
kubectl cluster-info dump | grep -m 1 service-cluster-ip-range

echo -e "\n=== Pod CIDR ==="
kubectl cluster-info dump | grep -m 1 cluster-cidr

# Save current state
kubectl get all -A -o yaml > pre-migration-state.yaml
kubectl get netpol -A -o yaml > network-policies-backup.yaml

# Test current connectivity
kubectl run test-pod --image=nicolaka/netshoot -it --rm -- /bin/bash <<'EOF'
# Test DNS
nslookup kubernetes.default
# Test external connectivity
curl -I https://www.google.com
# Test pod-to-pod
ping -c 3 $(kubectl get pod -l app=sample -o jsonpath='{.items[0].status.podIP}')
EOF

echo "Pre-migration audit complete. Review output before proceeding."
```

This captures the baseline configuration for comparison after migration.

## Creating New Node Pool with Cilium

Add new nodes without Flannel for Cilium deployment.

```bash
#!/bin/bash
# Create new node pool for Cilium (AWS example)

CLUSTER_NAME="production"
NODE_GROUP_NAME="cilium-nodes"
INSTANCE_TYPE="t3.large"
MIN_SIZE=3
MAX_SIZE=10
DESIRED_SIZE=3

# Create new node group without Flannel
aws eks create-nodegroup \
    --cluster-name ${CLUSTER_NAME} \
    --nodegroup-name ${NODE_GROUP_NAME} \
    --subnets subnet-abc123 subnet-def456 \
    --instance-types ${INSTANCE_TYPE} \
    --scaling-config minSize=${MIN_SIZE},maxSize=${MAX_SIZE},desiredSize=${DESIRED_SIZE} \
    --node-role arn:aws:iam::ACCOUNT_ID:role/EKSNodeRole \
    --labels cni=cilium,node-type=new \
    --taints key=cilium,value=true,effect=NoSchedule

# Wait for nodes to be ready
aws eks wait nodegroup-active \
    --cluster-name ${CLUSTER_NAME} \
    --nodegroup-name ${NODE_GROUP_NAME}

# Label Flannel nodes for tracking
kubectl label nodes --all cni=flannel --overwrite
kubectl label nodes -l cni=cilium cni-

echo "New node pool created with label cni=cilium"
```

The taint prevents pods from scheduling on Cilium nodes until Cilium is installed.

## Installing Cilium on New Nodes

Deploy Cilium to the new node pool without affecting Flannel nodes.

```bash
#!/bin/bash
# Install Cilium using Helm

helm repo add cilium https://helm.cilium.io/
helm repo update

# Get current cluster pod CIDR (must match)
POD_CIDR=$(kubectl get nodes -o jsonpath='{.items[0].spec.podCIDR}' | cut -d'/' -f1 | sed 's/\.[0-9]*$/\.0/')

# Install Cilium with configuration matching Flannel
helm install cilium cilium/cilium \
    --version 1.14.5 \
    --namespace kube-system \
    --set ipam.mode=cluster-pool \
    --set ipam.operator.clusterPoolIPv4PodCIDRList="${POD_CIDR}/16" \
    --set tunnel=vxlan \
    --set nodeSelector."cni"=cilium \
    --set operator.nodeSelector."cni"=cilium \
    --set hubble.enabled=true \
    --set hubble.relay.enabled=true \
    --set hubble.ui.enabled=true \
    --set prometheus.enabled=true \
    --set operator.prometheus.enabled=true

# Wait for Cilium to be ready
kubectl rollout status daemonset/cilium -n kube-system --timeout=300s

# Remove taint from Cilium nodes
kubectl taint nodes -l cni=cilium cilium:NoSchedule-

# Verify Cilium installation
kubectl -n kube-system exec -it ds/cilium -- cilium status
```

This installs Cilium only on the new nodes using node selectors.

## Validating Cilium Connectivity

Test network connectivity between Flannel and Cilium pods.

```yaml
# Test pod on Cilium node
apiVersion: v1
kind: Pod
metadata:
  name: test-cilium
  namespace: default
spec:
  nodeSelector:
    cni: cilium
  containers:
  - name: netshoot
    image: nicolaka/netshoot
    command: ["sleep", "3600"]
---
# Test pod on Flannel node
apiVersion: v1
kind: Pod
metadata:
  name: test-flannel
  namespace: default
spec:
  nodeSelector:
    cni: flannel
  containers:
  - name: netshoot
    image: nicolaka/netshoot
    command: ["sleep", "3600"]
```

```bash
#!/bin/bash
# Test connectivity between CNIs

kubectl apply -f test-pods.yaml
kubectl wait --for=condition=ready pod/test-cilium --timeout=60s
kubectl wait --for=condition=ready pod/test-flannel --timeout=60s

CILIUM_IP=$(kubectl get pod test-cilium -o jsonpath='{.status.podIP}')
FLANNEL_IP=$(kubectl get pod test-flannel -o jsonpath='{.status.podIP}')

echo "Testing Flannel -> Cilium connectivity..."
kubectl exec test-flannel -- ping -c 3 $CILIUM_IP

echo "Testing Cilium -> Flannel connectivity..."
kubectl exec test-cilium -- ping -c 3 $FLANNEL_IP

echo "Testing service connectivity..."
kubectl create deployment nginx --image=nginx --replicas=2
kubectl expose deployment nginx --port=80

kubectl exec test-cilium -- curl -s http://nginx
kubectl exec test-flannel -- curl -s http://nginx

echo "Cross-CNI connectivity validated successfully"
```

Both CNIs must communicate for safe migration.

## Migrating Workloads to Cilium Nodes

Gradually move workloads from Flannel to Cilium nodes.

```bash
#!/bin/bash
# Rolling workload migration script

FLANNEL_NODES=$(kubectl get nodes -l cni=flannel -o jsonpath='{.items[*].metadata.name}')

for NODE in $FLANNEL_NODES; do
    echo "Processing node: $NODE"

    # Check if enough Cilium capacity available
    CILIUM_CAPACITY=$(kubectl get nodes -l cni=cilium -o json | jq '[.items[].status.allocatable.pods | tonumber] | add')
    CURRENT_USAGE=$(kubectl get pods --all-namespaces --field-selector spec.nodeName!=${NODE} -o json | jq '[.items[]] | length')

    if [ $CURRENT_USAGE -gt $((CILIUM_CAPACITY * 80 / 100)) ]; then
        echo "WARNING: Cilium node capacity at 80%. Adding more nodes..."
        # Add more Cilium nodes here
        sleep 300
    fi

    # Cordon node
    kubectl cordon $NODE
    echo "Node $NODE cordoned"

    # Drain node with grace period
    kubectl drain $NODE \
        --ignore-daemonsets \
        --delete-emptydir-data \
        --grace-period=300 \
        --timeout=600s \
        --pod-selector='!app.kubernetes.io/name=cilium'

    # Verify pods rescheduled successfully
    sleep 60

    NOT_RUNNING=$(kubectl get pods --all-namespaces -o wide | grep $NODE | grep -v "Running\|Completed" | wc -l)
    if [ $NOT_RUNNING -gt 0 ]; then
        echo "WARNING: Some pods not running after drain"
        kubectl get pods --all-namespaces -o wide | grep $NODE | grep -v "Running\|Completed"
    fi

    # Check application health
    echo "Validating application health..."
    sleep 30

    ERROR_RATE=$(kubectl top pods -n production --containers | grep -c "Error\|CrashLoop")
    if [ $ERROR_RATE -gt 0 ]; then
        echo "ERROR: Applications showing errors. Uncordoning $NODE for rollback"
        kubectl uncordon $NODE
        exit 1
    fi

    echo "Node $NODE successfully drained. Pods moved to Cilium nodes."

    # Wait before processing next node
    sleep 120
done

echo "All workloads migrated to Cilium nodes"
```

This script safely migrates workloads one node at a time with health checks.

## Converting Network Policies

Translate Flannel-compatible policies to Cilium's extended capabilities.

```yaml
# Original Kubernetes NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
---
# Enhanced Cilium NetworkPolicy
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-policy-cilium
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
  egress:
  - toEndpoints:
    - matchLabels:
        app: database
    toPorts:
    - ports:
      - port: "5432"
        protocol: TCP
  - toFQDNs:
    - matchName: "external-api.example.com"
    toPorts:
    - ports:
      - port: "443"
        protocol: TCP
  - toEntities:
    - world
    toPorts:
    - ports:
      - port: "53"
        protocol: UDP
```

Cilium policies offer FQDN-based rules and entity matching unavailable in standard NetworkPolicies.

## Removing Flannel and Old Nodes

Clean up Flannel after successful migration.

```bash
#!/bin/bash
# Remove Flannel and old nodes

echo "Verifying all workloads on Cilium nodes..."
PODS_ON_FLANNEL=$(kubectl get pods --all-namespaces -o json | jq '[.items[] | select(.spec.nodeName | IN("'$(kubectl get nodes -l cni=flannel -o jsonpath='{.items[*].metadata.name}' | tr ' ' '","')'"))] | length')

if [ $PODS_ON_FLANNEL -gt 0 ]; then
    echo "ERROR: $PODS_ON_FLANNEL pods still on Flannel nodes. Migration incomplete."
    exit 1
fi

echo "Deleting Flannel DaemonSet..."
kubectl delete daemonset kube-flannel-ds -n kube-flannel

echo "Removing Flannel configuration..."
kubectl delete namespace kube-flannel

# Remove Flannel nodes from cluster
FLANNEL_NODES=$(kubectl get nodes -l cni=flannel -o jsonpath='{.items[*].metadata.name}')
for NODE in $FLANNEL_NODES; do
    echo "Deleting node: $NODE"
    kubectl delete node $NODE

    # Delete from cloud provider (AWS example)
    INSTANCE_ID=$(aws ec2 describe-instances \
        --filters "Name=tag:Name,Values=$NODE" \
        --query 'Reservations[].Instances[].InstanceId' \
        --output text)

    if [ -n "$INSTANCE_ID" ]; then
        aws ec2 terminate-instances --instance-ids $INSTANCE_ID
    fi
done

# Clean up Flannel CNI configuration from nodes
kubectl get nodes -o name | xargs -I {} kubectl debug {} -it --image=busybox -- rm -rf /etc/cni/net.d/10-flannel.conflist

echo "Flannel removal complete"
```

Only remove Flannel after confirming all workloads run successfully on Cilium.

## Enabling Advanced Cilium Features

Leverage Cilium's advanced capabilities after migration.

```bash
#!/bin/bash
# Enable advanced Cilium features

# Enable Hubble observability
helm upgrade cilium cilium/cilium \
    --namespace kube-system \
    --reuse-values \
    --set hubble.enabled=true \
    --set hubble.relay.enabled=true \
    --set hubble.ui.enabled=true

# Enable L7 network policies
helm upgrade cilium cilium/cilium \
    --namespace kube-system \
    --reuse-values \
    --set l7Proxy=true

# Enable bandwidth manager
helm upgrade cilium cilium/cilium \
    --namespace kube-system \
    --reuse-values \
    --set bandwidthManager.enabled=true

# Enable kube-proxy replacement
helm upgrade cilium cilium/cilium \
    --namespace kube-system \
    --reuse-values \
    --set kubeProxyReplacement=strict

echo "Advanced features enabled. Access Hubble UI:"
kubectl port-forward -n kube-system svc/hubble-ui 12000:80
```

These features provide enhanced observability and performance.

## Validating Post-Migration Networking

Confirm networking functions correctly after migration.

```bash
#!/bin/bash
# Post-migration validation

echo "=== Cilium Status ==="
kubectl -n kube-system exec ds/cilium -- cilium status

echo -e "\n=== Connectivity Test ==="
kubectl -n kube-system exec ds/cilium -- cilium connectivity test

echo -e "\n=== Network Policies ==="
kubectl get ciliumnetworkpolicies -A

echo -e "\n=== Service Connectivity ==="
kubectl run test --image=curlimages/curl --rm -it --restart=Never -- curl -s http://kubernetes.default.svc.cluster.local

echo -e "\n=== External Connectivity ==="
kubectl run test --image=curlimages/curl --rm -it --restart=Never -- curl -s https://www.google.com -I

echo -e "\n=== DNS Resolution ==="
kubectl run test --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default

echo -e "\n=== Hubble Flows ==="
kubectl -n kube-system exec ds/cilium -- hubble observe --last 100

echo "Post-migration validation complete"
```

This comprehensive test ensures all networking functions work correctly.

## Conclusion

Migrating from Flannel to Cilium requires careful planning to avoid cluster-wide networking outages. Create a new node pool without Flannel and install Cilium using node selectors to run both CNIs in parallel. Validate cross-CNI connectivity between pods before migrating workloads. Gradually drain Flannel nodes one at a time, moving workloads to Cilium nodes with health checks at each step. Convert standard NetworkPolicies to CiliumNetworkPolicies to leverage advanced features like FQDN-based rules. Remove Flannel only after confirming all workloads run successfully on Cilium. Enable advanced Cilium features like Hubble observability, L7 policies, and kube-proxy replacement. This rolling node replacement strategy minimizes risk and provides rollback capability at every stage, ensuring safe CNI migration without cluster downtime.

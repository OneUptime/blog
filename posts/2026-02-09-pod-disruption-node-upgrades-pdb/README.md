# How to Handle Pod Disruption During Node Upgrades with PodDisruptionBudget

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, PodDisruptionBudget, Availability

Description: Master PodDisruptionBudgets to protect application availability during Kubernetes node upgrades with policies that prevent excessive pod evictions and maintain service reliability.

---

Pod Disruption Budgets are your safety net during node upgrades. They define how many pods of an application can be unavailable simultaneously, preventing upgrades from taking down your entire service. Without PDBs, a node drain could evict all replicas at once, causing a complete outage.

## Understanding Pod Disruption Budgets

A PodDisruptionBudget is a policy that limits the number of pods that can be down due to voluntary disruptions like node drains during upgrades. It does not protect against involuntary disruptions like node failures or crashes, but it prevents maintenance operations from causing excessive downtime.

PDBs work by blocking drain operations when they would violate the budget. If draining a node would take down too many pods, the drain command waits until pods can be safely evicted without violating the PDB. This ensures your applications maintain minimum availability during upgrades.

## Creating Basic PodDisruptionBudgets

Define PDBs for your applications before performing node upgrades.

```yaml
# Minimum available replicas PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web-app
      tier: frontend
---
# Maximum unavailable replicas PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
  namespace: production
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: api
      tier: backend
---
# Percentage-based PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: worker-pdb
  namespace: production
spec:
  minAvailable: 75%
  selector:
    matchLabels:
      app: worker
```

Apply PDBs to your cluster:

```bash
kubectl apply -f pod-disruption-budgets.yaml

# Verify PDBs
kubectl get pdb -n production
kubectl describe pdb web-app-pdb -n production
```

## Choosing Between minAvailable and maxUnavailable

Understanding when to use minAvailable versus maxUnavailable is important for effective pod disruption management.

Use minAvailable when you have a specific minimum number of replicas that must always be running. This is ideal for applications where you need a guaranteed minimum capacity regardless of the total number of replicas. For example, a web application that requires at least 3 replicas to handle load.

Use maxUnavailable when you want to limit how many pods can be disrupted at once. This is better when you scale your application up and down frequently, as it automatically adjusts based on the current replica count. For example, allowing only 1 pod to be disrupted at a time regardless of whether you have 5 or 50 replicas.

```bash
#!/bin/bash
# compare-pdb-strategies.sh

cat << 'EOF'
minAvailable Examples:
- minAvailable: 2 (always keep at least 2 pods running)
- minAvailable: 50% (always keep at least half pods running)

maxUnavailable Examples:
- maxUnavailable: 1 (only 1 pod can be down at a time)
- maxUnavailable: 25% (up to 25% of pods can be down)

Choosing the right strategy:
- Use minAvailable for critical services with hard requirements
- Use maxUnavailable for flexible services that can tolerate some disruption
- Never set minAvailable: 100% (this blocks all drains)
- For single-replica apps, use minAvailable: 1 to block drains entirely
EOF
```

## PDBs for Different Application Types

Configure PDBs appropriately for different application patterns.

```yaml
# Stateless web application - allow aggressive draining
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: stateless-web-pdb
  namespace: production
spec:
  maxUnavailable: 50%
  selector:
    matchLabels:
      app: web
      type: stateless
---
# Stateful database - conservative draining
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: database-pdb
  namespace: production
spec:
  minAvailable: 100%
  selector:
    matchLabels:
      app: postgres
      role: master
---
# Background workers - flexible draining
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: worker-pdb
  namespace: production
spec:
  maxUnavailable: 2
  selector:
    matchLabels:
      app: worker
      queue: jobs
---
# Cache layer - maintain quorum
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: redis-pdb
  namespace: production
spec:
  minAvailable: 51%
  selector:
    matchLabels:
      app: redis
      role: cache
```

## Testing PodDisruptionBudgets

Validate that your PDBs work correctly before performing actual upgrades.

```bash
#!/bin/bash
# test-pdb-behavior.sh

NAMESPACE="production"
APP_NAME="web-app"

echo "Testing PodDisruptionBudget behavior..."

# Check current PDB status
kubectl get pdb -n $NAMESPACE $APP_NAME-pdb -o yaml

# Get allowed disruptions
allowed=$(kubectl get pdb -n $NAMESPACE $APP_NAME-pdb -o jsonpath='{.status.disruptionsAllowed}')
echo "Currently allowed disruptions: $allowed"

# Get current replicas
current=$(kubectl get pdb -n $NAMESPACE $APP_NAME-pdb -o jsonpath='{.status.currentHealthy}')
desired=$(kubectl get pdb -n $NAMESPACE $APP_NAME-pdb -o jsonpath='{.status.desiredHealthy}')

echo "Current healthy: $current"
echo "Desired healthy: $desired"

# Try to evict a pod
POD=$(kubectl get pods -n $NAMESPACE -l app=$APP_NAME -o jsonpath='{.items[0].metadata.name}')

echo "Attempting to evict pod: $POD"
kubectl delete pod $POD -n $NAMESPACE --grace-period=30

# Watch PDB status change
echo "Watching PDB status..."
kubectl get pdb -n $NAMESPACE $APP_NAME-pdb --watch
```

## Monitoring PDB Status During Upgrades

Monitor PodDisruptionBudgets actively during node upgrades to identify blocking issues.

```bash
#!/bin/bash
# monitor-pdb-during-upgrade.sh

echo "Monitoring PodDisruptionBudgets during upgrade..."

# Watch all PDBs
watch -n 5 'kubectl get pdb -A -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
MIN_AVAILABLE:.spec.minAvailable,\
MAX_UNAVAILABLE:.spec.maxUnavailable,\
ALLOWED_DISRUPTIONS:.status.disruptionsAllowed,\
CURRENT:.status.currentHealthy,\
DESIRED:.status.desiredHealthy'

# Alternative: continuous monitoring script
while true; do
  echo "========== $(date) =========="

  # Find PDBs with zero allowed disruptions
  kubectl get pdb -A -o json | jq -r '
    .items[] |
    select(.status.disruptionsAllowed == 0) |
    "\(.metadata.namespace)/\(.metadata.name): \(.status.currentHealthy)/\(.status.desiredHealthy)"
  '

  # Check for pods pending eviction
  kubectl get pods -A --field-selector status.phase=Terminating

  sleep 30
done
```

## Handling PDB Violations During Drains

When PDBs block node drains, you need strategies to resolve the situation.

```bash
#!/bin/bash
# handle-pdb-blocking-drain.sh

NODE_NAME="$1"

if [ -z "$NODE_NAME" ]; then
  echo "Usage: $0 <node-name>"
  exit 1
fi

echo "Analyzing PDB blocks for node: $NODE_NAME"

# Find pods on the node
PODS=$(kubectl get pods -A -o json --field-selector spec.nodeName=$NODE_NAME | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"')

echo "Pods on node $NODE_NAME:"
echo "$PODS"

# Check which PDBs apply to these pods
echo "$PODS" | while read ns pod; do
  labels=$(kubectl get pod $pod -n $ns -o jsonpath='{.metadata.labels}' | jq -r 'to_entries | map("\(.key)=\(.value)") | join(",")')

  # Find matching PDBs
  matching_pdbs=$(kubectl get pdb -n $ns -o json | \
    jq -r --arg labels "$labels" '
    .items[] |
    select(.spec.selector.matchLabels | to_entries | map("\(.key)=\(.value)") | join(",") | contains($labels)) |
    .metadata.name
  ')

  if [ ! -z "$matching_pdbs" ]; then
    echo "Pod $ns/$pod is protected by PDB: $matching_pdbs"

    # Show PDB status
    for pdb in $matching_pdbs; do
      kubectl get pdb $pdb -n $ns -o json | \
        jq '{name:.metadata.name, minAvailable:.spec.minAvailable, maxUnavailable:.spec.maxUnavailable, disruptionsAllowed:.status.disruptionsAllowed}'
    done
  fi
done
```

## Temporarily Adjusting PDBs for Upgrades

In some cases, you may need to temporarily relax PDBs to complete urgent upgrades.

```bash
#!/bin/bash
# relax-pdb-for-upgrade.sh

NAMESPACE="production"
PDB_NAME="critical-app-pdb"

echo "Temporarily relaxing PDB: $NAMESPACE/$PDB_NAME"

# Backup original PDB
kubectl get pdb $PDB_NAME -n $NAMESPACE -o yaml > $PDB_NAME-backup.yaml

# Get current minAvailable
current=$(kubectl get pdb $PDB_NAME -n $NAMESPACE -o jsonpath='{.spec.minAvailable}')
echo "Current minAvailable: $current"

# Patch to allow more disruptions
kubectl patch pdb $PDB_NAME -n $NAMESPACE --type='json' -p='[
  {"op": "replace", "path": "/spec/minAvailable", "value": 1}
]'

echo "PDB relaxed to minAvailable: 1"
echo "Perform your upgrade now"
read -p "Press enter when upgrade is complete..."

# Restore original PDB
kubectl apply -f $PDB_NAME-backup.yaml
rm $PDB_NAME-backup.yaml

echo "PDB restored to original configuration"
```

## Creating PDBs for Operator-Managed Applications

Many applications deployed via operators need PDBs configured correctly.

```yaml
# PostgreSQL operator PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-cluster-pdb
  namespace: databases
spec:
  minAvailable: 2
  selector:
    matchLabels:
      postgres-operator.crunchydata.com/cluster: production-db
      postgres-operator.crunchydata.com/role: master
---
# MongoDB operator PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: mongodb-pdb
  namespace: databases
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: mongodb-community
      app.kubernetes.io/instance: production-mongo
---
# Kafka operator PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: kafka-pdb
  namespace: streaming
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      strimzi.io/cluster: production-kafka
      strimzi.io/kind: Kafka
```

## Automated PDB Creation

Automatically create PDBs for deployments that don't have them.

```bash
#!/bin/bash
# auto-create-pdbs.sh

echo "Creating PDBs for deployments without them..."

kubectl get deploy -A -o json | jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name) \(.spec.replicas)"' | \
while read ns name replicas; do
  # Skip single-replica deployments
  if [ "$replicas" -le 1 ]; then
    continue
  fi

  # Check if PDB already exists
  labels=$(kubectl get deploy $name -n $ns -o jsonpath='{.spec.selector.matchLabels}')
  existing=$(kubectl get pdb -n $ns -o json | \
    jq -r --arg labels "$labels" '.items[] | select(.spec.selector.matchLabels == ($labels | fromjson)) | .metadata.name')

  if [ ! -z "$existing" ]; then
    echo "PDB already exists for $ns/$name: $existing"
    continue
  fi

  echo "Creating PDB for $ns/$name (replicas: $replicas)"

  # Create PDB
  cat <<EOF | kubectl apply -f -
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: $name-pdb
  namespace: $ns
spec:
  maxUnavailable: 1
  selector:
    matchLabels: $(echo $labels | jq '.')
EOF

done

echo "PDB creation complete"
```

## Validating PDB Coverage

Ensure all critical deployments have appropriate PDBs before starting upgrades.

```bash
#!/bin/bash
# validate-pdb-coverage.sh

echo "Validating PodDisruptionBudget coverage..."

# Find deployments without PDBs
kubectl get deploy -A -o json | jq -r '.items[] | select(.spec.replicas > 1) | "\(.metadata.namespace)/\(.metadata.name)"' | \
while read deploy; do
  ns=$(echo $deploy | cut -d/ -f1)
  name=$(echo $deploy | cut -d/ -f2)

  labels=$(kubectl get deploy $name -n $ns -o jsonpath='{.spec.selector.matchLabels}')

  # Check for matching PDB
  pdb=$(kubectl get pdb -n $ns -o json | \
    jq -r --arg labels "$labels" \
    '.items[] | select(.spec.selector.matchLabels == ($labels | fromjson)) | .metadata.name')

  if [ -z "$pdb" ]; then
    echo "WARNING: No PDB found for $deploy"
  else
    # Check PDB configuration
    disruptionsAllowed=$(kubectl get pdb $pdb -n $ns -o jsonpath='{.status.disruptionsAllowed}')
    echo "OK: $deploy protected by $pdb (disruptions allowed: $disruptionsAllowed)"
  fi
done
```

## Best Practices for PDBs

Implement these best practices to maximize PDB effectiveness:

Never set minAvailable to 100 percent or equal to replicas for non-critical apps, as this completely blocks node drains. Always create PDBs for multi-replica deployments before performing cluster upgrades. Use percentage-based PDBs for applications that scale dynamically. Test PDBs in staging before relying on them in production. Monitor PDB status during upgrades to catch blocking issues early. Document PDB configurations and their rationale for future reference.

For critical stateful applications like databases, use conservative PDBs that allow only one pod disruption at a time. For stateless applications, you can be more aggressive, allowing higher disruption percentages to speed up node upgrades.

PodDisruptionBudgets are essential for safe Kubernetes node upgrades. By properly configuring PDBs for your applications, monitoring their status during upgrades, and having strategies to handle blocking situations, you can perform cluster maintenance with confidence that your applications will maintain availability throughout the process.

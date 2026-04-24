# How to Set Up Pod Disruption Budgets via Portainer - K8s Pdb

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, PDB, High Availability, Maintenance

Description: Configure Kubernetes Pod Disruption Budgets to ensure minimum availability during voluntary disruptions like node drains and cluster upgrades.

## Introduction

Pod Disruption Budgets (PDBs) protect applications from voluntary disruptions like node drains, cluster upgrades, and maintenance operations. They tell Kubernetes the minimum number of pods that must remain available during disruptions, preventing all pods from being evicted simultaneously.

## Understanding PDB Parameters

- **minAvailable**: Minimum number/percentage of pods that must be available
- **maxUnavailable**: Maximum number/percentage of pods that can be unavailable

You can specify either `minAvailable` OR `maxUnavailable`, not both.

## Creating PDBs via Portainer

In Portainer: **Kubernetes > Applications > Create from code > Manifest**

Then select the namespace and paste the resource YAML into the web editor.

```yaml
# pdb-examples.yml - deploy via Portainer

# Example 1: Web application must maintain 50% availability
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
spec:
  minAvailable: "50%"      # At least 50% of pods must be available
  selector:
    matchLabels:
      app: web-app
---
# Example 2: Database must always have at least 1 replica
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-pdb
  namespace: production
spec:
  minAvailable: 1          # Always keep at least 1 postgres pod
  selector:
    matchLabels:
      app: postgres
---
# Example 3: Stateless API can lose up to 1 pod at a time
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-service-pdb
  namespace: production
spec:
  maxUnavailable: 1        # Only 1 pod can be unavailable
  selector:
    matchLabels:
      app: api-service
---
# Example 4: Critical service: allow no disruptions
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-service-pdb
  namespace: production
spec:
  minAvailable: 100%       # No disruptions allowed (use carefully!)
  selector:
    matchLabels:
      app: payment-service
```

## PDB and HPA Interaction

When using PDBs with HPA, ensure the PDB still allows an eviction when the HPA is at `minReplicas`:

```yaml
# Deployment: currently at 5 replicas
spec:
  replicas: 5

# HPA: min 3, max 20
spec:
  minReplicas: 3
  maxReplicas: 20

# PDB: allow losing up to 1 pod
spec:
  maxUnavailable: 1
# This means: even if HPA scales down to 3, the PDB still allows
# 1 pod eviction during a drain, leaving 2 pods serving traffic
```

## Viewing PDB Status

```bash
# Check PDB status
kubectl get pdb -n production

# Detailed PDB information
kubectl describe pdb web-app-pdb -n production
# Output includes:
# Allowed disruptions: X
# Current healthy: N pods
# Desired healthy: N pods

# Via Portainer API
curl -s \
  -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/endpoints/1/kubernetes/apis/policy/v1/namespaces/production/poddisruptionbudgets" \
  | python3 -c "
import sys, json
pdbs = json.load(sys.stdin)
for p in pdbs['items']:
    name = p['metadata']['name']
    status = p['status']
    current = status.get('currentHealthy', 0)
    desired = status.get('desiredHealthy', 0)
    allowed = status.get('disruptionsAllowed', 0)
    print(f'{name}: {current}/{desired} healthy, {allowed} disruptions allowed')
"
```

## PDB for StatefulSets

```yaml
# StatefulSet PDB: protect Kafka cluster
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: kafka-pdb
  namespace: messaging
spec:
  minAvailable: 2    # Keep at least 2 of 3 Kafka brokers
  selector:
    matchLabels:
      app: kafka
```

## Node Drain Behavior with PDB

```bash
# When draining a node, Kubernetes respects PDBs
kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data

# If PDB prevents drain, you'll see:
# Cannot evict pod as it would violate the pod's disruption budget.

# Check which PDB is blocking
kubectl get pdb -n production
# Look for pdbs with 0 ALLOWED DISRUPTIONS

# Options:
# 1. Wait for HPA to scale up more replicas
# 2. Temporarily adjust the PDB (risky in production)
# 3. Use --disable-eviction with kubectl drain (bypasses PDB checks by deleting pods directly - use only for emergencies)
```

## Best Practices

```yaml
# Bad: PDB that prevents ALL disruptions on a deployment with 2 replicas
spec:
  minAvailable: 100%  # With 2 replicas, this blocks all node drains

# Good: Allow some disruption
spec:
  maxUnavailable: 1   # Allows 1 pod eviction at a time

# Best: Combine with enough replicas for HA
# 3 replicas + maxUnavailable: 1 lets you evict 1 pod while 2 remain serving traffic
```

## Conclusion

Pod Disruption Budgets are essential for running high-availability applications in Kubernetes. They ensure maintenance operations like node drains and cluster upgrades don't cause service disruptions. Deploy PDBs for all production workloads via Portainer's YAML interface, and always ensure that `minAvailable` is achievable given your HPA's minimum replica count.

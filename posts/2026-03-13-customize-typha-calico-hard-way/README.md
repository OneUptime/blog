# How to Customize Typha in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Customization, Hard Way

Description: A guide to customizing Typha's deployment for specific infrastructure requirements including custom ports, node placement, priority classes, and log format.

---

## Introduction

The default Typha deployment works for most clusters, but specific infrastructure requirements may call for customization: running Typha on a non-standard port to avoid conflicts, using a custom log format for integration with a logging platform, placing Typha on dedicated infrastructure nodes, or assigning a PriorityClass to ensure Typha is not evicted under resource pressure. Hard way installations expose all these customization points directly.

## Step 1: Change the Typha Listening Port

The default port is 5473. To change it:

```bash
kubectl set env deployment/calico-typha -n calico-system TYPHA_PORT=5474

# Update the Service
kubectl patch service calico-typha -n calico-system --patch '{
  "spec": {"ports": [{"name": "calico-typha", "port": 5474, "targetPort": 5474}]}
}'

# Update Felix configuration
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"typhak8sServiceName": "calico-typha", "typhak8sNamespace": "calico-system"}}'
```

Note: Felix discovers the port through the Service definition, so updating the Service is sufficient.

## Step 2: Custom Log Format for Logging Platforms

Typha supports JSON logging for integration with log aggregation systems.

```bash
kubectl set env deployment/calico-typha -n calico-system \
  TYPHA_LOGSEVERITYSCREEN=Info \
  TYPHA_LOGFILEPATH=none \
  TYPHA_LOGSEVERITYSYS=none
```

For JSON output, use a logging sidecar or configure the logging platform to parse Typha's structured output.

## Step 3: Dedicated Node Placement

For large clusters, dedicate specific nodes to Typha to prevent resource contention with application workloads.

```bash
# Label dedicated nodes
kubectl label node infrastructure-node-01 calico-typha=true

# Update Typha Deployment with node selector
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "nodeSelector": {
          "calico-typha": "true"
        }
      }
    }
  }
}'
```

## Step 4: Assign a High PriorityClass

Typha is a critical networking component and should not be evicted under resource pressure.

```bash
kubectl apply -f - <<EOF
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: calico-critical
value: 1000000
globalDefault: false
description: "Priority class for Calico networking components"
EOF

kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "priorityClassName": "calico-critical"
      }
    }
  }
}'
```

## Step 5: Configure Pod Disruption Budget

Ensure at least one Typha replica is always running during cluster maintenance.

```bash
kubectl apply -f - <<EOF
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: calico-typha-pdb
  namespace: calico-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: calico-typha
EOF
```

## Step 6: Custom Health Check Parameters

Adjust liveness and readiness probe thresholds for slower startup environments.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "calico-typha",
          "livenessProbe": {
            "httpGet": {"path": "/liveness", "port": 9098},
            "initialDelaySeconds": 30,
            "periodSeconds": 30,
            "failureThreshold": 6
          },
          "readinessProbe": {
            "httpGet": {"path": "/readiness", "port": 9098},
            "initialDelaySeconds": 10,
            "periodSeconds": 10
          }
        }]
      }
    }
  }
}'
```

## Step 7: Topology Spread for Multi-Zone Deployments

For clusters spanning multiple availability zones, spread Typha replicas for redundancy.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "topologySpreadConstraints": [{
          "maxSkew": 1,
          "topologyKey": "topology.kubernetes.io/zone",
          "whenUnsatisfiable": "DoNotSchedule",
          "labelSelector": {
            "matchLabels": {"app": "calico-typha"}
          }
        }]
      }
    }
  }
}'
```

## Conclusion

Customizing Typha for specific infrastructure requirements in a hard way installation involves adjusting the listening port, configuring log format for existing log pipelines, placing Typha on dedicated nodes, assigning a high PriorityClass to prevent eviction, configuring a PodDisruptionBudget for maintenance safety, and distributing replicas across availability zones. Each customization is a direct modification to the Typha Deployment or Service, giving operators full control without operator-mediated abstractions.

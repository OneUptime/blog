# How to Configure Fleet Agent Options

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Agent

Description: Learn how to configure Fleet agent options to customize agent behavior, resource limits, proxy settings, and tolerations for edge and enterprise deployments.

## Introduction

The Fleet agent runs in each managed cluster and is responsible for receiving bundle deployments and applying resources. Properly configuring the agent ensures it can operate correctly in your specific environment - whether that means setting proxy configurations, resource limits, custom tolerations, or connection settings.

In standalone Fleet, you use the `fleet-agent` Helm chart for agent-initiated registration. In Fleet running inside Rancher, downstream agent deployments are created programmatically, and per-cluster agent settings are applied on the Fleet `Cluster` resource.

This guide covers the supported Fleet agent configuration options and how to apply them at installation time or update them for existing agents.

## Prerequisites

- Fleet manager installed (standalone Fleet or Fleet in Rancher)
- `kubectl` access to both Fleet manager and downstream clusters
- Helm v3 installed if you are using agent-initiated registration
- Fleet Helm repository added locally if you are installing with Helm (`helm repo add fleet https://rancher.github.io/fleet-helm-charts/`)

## Fleet Agent Components

The Fleet agent installation includes:
- **fleet-agent**: The main agent deployment that manages bundle deployments
- **fleet-agent-bootstrap**: The bootstrap Secret used during initial registration
- **fleet-agent** ConfigMap: Stores agent configuration such as labels, client ID, and TLS mode

These resources are created in the `cattle-fleet-system` namespace by default.

## Basic Agent Configuration at Installation

When installing the Fleet agent via Helm for agent-initiated registration, you can pass supported chart values alongside the registration `values.yaml` from Fleet:

```bash
# values.yaml comes from the ClusterRegistrationToken secret on the Fleet manager
helm -n cattle-fleet-system install --create-namespace --wait \
  --values values.yaml \
  --set-string labels.environment=production \
  --set-string labels.region=us-west-2 \
  --set proxy="http://proxy.corp.example.com:3128" \
  --set noProxy="127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.cluster.local" \
  --set fleetAgent.nodeSelector.node-role=system \
  fleet-agent fleet/fleet-agent
```

## Configuring Agent Resources

### Setting Resource Limits

```yaml
# fleet-cluster-agent-resources.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: Cluster
metadata:
  name: my-cluster
  namespace: clusters
spec:
  # Resource allocation for the Fleet agent
  agentResources:
    requests:
      # Minimum CPU guaranteed to the agent
      cpu: "100m"
      # Minimum memory guaranteed
      memory: "128Mi"
    limits:
      # Maximum CPU the agent can use
      cpu: "500m"
      # Maximum memory the agent can use
      memory: "512Mi"
```

For edge clusters with limited resources:

```yaml
# fleet-cluster-agent-edge-resources.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: Cluster
metadata:
  name: my-cluster
  namespace: clusters
spec:
  agentResources:
    requests:
      cpu: "50m"
      memory: "64Mi"
    limits:
      cpu: "200m"
      memory: "256Mi"
```

## Configuring Proxy Settings

For clusters behind an HTTP proxy:

```yaml
# fleet-agent-proxy-values.yaml
# The chart uses the same proxy value for both HTTP_PROXY and HTTPS_PROXY
proxy: "http://proxy.corp.example.com:3128"

# Bypass proxy for local traffic
noProxy: "127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.cluster.local"
```

```bash
# Apply proxy settings during installation
helm -n cattle-fleet-system install --create-namespace --wait \
  --values values.yaml \
  -f fleet-agent-proxy-values.yaml \
  fleet-agent fleet/fleet-agent
```

## Configuring Agent Tolerations

For nodes with taints (edge devices, GPU nodes, etc.):

```yaml
# fleet-agent-tolerations.yaml
fleetAgent:
  tolerations:
    # Allow running on nodes with the edge taint
    - key: "node.kubernetes.io/edge"
      operator: "Exists"
      effect: "NoSchedule"
    # Allow running on master/control-plane nodes
    - key: "node-role.kubernetes.io/control-plane"
      operator: "Exists"
      effect: "NoSchedule"
    - key: "node-role.kubernetes.io/master"
      operator: "Exists"
      effect: "NoSchedule"
```

## Configuring Agent Node Selector

Pin the Fleet agent to specific nodes:

```yaml
# fleet-agent-nodeselector.yaml
fleetAgent:
  nodeSelector:
    # Run the agent only on nodes labeled as system nodes
    node-role: system
```

For more complex scheduling rules on an existing or Rancher-managed agent, use `spec.agentAffinity` on the Fleet `Cluster` resource:

```yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: Cluster
metadata:
  name: my-cluster
  namespace: clusters
spec:
  agentAffinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          preference:
            matchExpressions:
              - key: node-role.kubernetes.io/control-plane
                operator: Exists
```

## Configuring TLS and Certificate Authorities

For environments with custom CA certificates:

```yaml
# fleet-agent-tls.yaml
# Strict mode trusts only the configured CA bundle
agentTLSMode: "strict"
```

```bash
# Pass the management cluster API server CA as a PEM file when it is not signed by a well-known CA
helm -n cattle-fleet-system install --create-namespace --wait \
  --values values.yaml \
  --set-file apiServerCA=ca.pem \
  -f fleet-agent-tls.yaml \
  fleet-agent fleet/fleet-agent
```

## Updating Agent Configuration

For existing Fleet agents, update the Fleet `Cluster` resource instead of running `helm upgrade` on the downstream cluster:

```bash
# Update resource limits on existing agent
kubectl patch clusters.fleet.cattle.io my-cluster \
  -n clusters \
  --type merge \
  -p '{"spec":{"agentResources":{"limits":{"memory":"1Gi"}}}}'

# Update proxy settings
kubectl patch clusters.fleet.cattle.io my-cluster \
  -n clusters \
  --type merge \
  -p '{"spec":{"agentEnvVars":[{"name":"HTTP_PROXY","value":"http://proxy.corp.example.com:3128"},{"name":"HTTPS_PROXY","value":"http://proxy.corp.example.com:3128"},{"name":"NO_PROXY","value":"localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.cluster.local"}]}}'
```

## Configuring Cluster Labels at Registration

Set labels during registration; these become labels on the Fleet `Cluster` resource:

```yaml
# fleet-agent-labels.yaml
# These labels are applied when the cluster is first registered
labels:
  environment: production
  region: us-west-2
  team: platform
  managed-by: fleet-agent-helm
```

After registration is completed, the agent cannot change these labels.

## Verifying Agent Configuration

```bash
# Check the Fleet agent is running
kubectl get pods -n cattle-fleet-system -l app=fleet-agent

# View the agent deployment
kubectl get deployment fleet-agent \
  -n cattle-fleet-system \
  -o yaml

# View agent runtime configuration
kubectl get configmap fleet-agent \
  -n cattle-fleet-system \
  -o jsonpath='{.data.config}{"\n"}'

# Check agent resource usage
kubectl top pods -n cattle-fleet-system

# View agent logs
kubectl logs -n cattle-fleet-system \
  -l app=fleet-agent \
  --tail=50

# Verify agent is connected to Fleet manager
kubectl get clusters.fleet.cattle.io -A \
  -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {.status.agent.lastSeen}{"\n"}{end}'
```

## Troubleshooting Agent Issues

```bash
# Agent not starting - check pod events
kubectl describe pods -n cattle-fleet-system \
  -l app=fleet-agent

# Check upstream connection settings
kubectl get secret fleet-agent-bootstrap \
  -n cattle-fleet-system \
  -o yaml

kubectl get configmap fleet-agent \
  -n cattle-fleet-system \
  -o yaml

# Check agent version
kubectl get deployment fleet-agent \
  -n cattle-fleet-system \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="fleet-agent")].image}{"\n"}'
```

## Conclusion

Properly configuring the Fleet agent ensures reliable operation in diverse environments - from resource-constrained edge devices to enterprise clusters behind corporate proxies. By setting appropriate resource limits, configuring proxy settings where needed, and applying the right tolerations and node selectors, you ensure the Fleet agent runs stably and connects reliably to the Fleet manager. Regular verification of agent health and periodic updates keep your management infrastructure current and operational.

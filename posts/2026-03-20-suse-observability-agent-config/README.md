# How to Configure the SUSE Observability Agent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SUSE Observability, Agent Configuration, Kubernetes, Monitoring, Helm, SUSE Rancher, Topology

Description: Learn how to configure the SUSE Observability agent for Kubernetes clusters including collector settings, custom tags, log collection, and integration with specific workload types.

---

The SUSE Observability agent runs on each Kubernetes cluster you want to monitor. Proper configuration ensures all topology data, metrics, logs, and events flow correctly to the SUSE Observability server.

---

## Agent Architecture

```text
┌─────────────────────────────────────────┐
│          Kubernetes Cluster             │
│                                         │
│  ┌─────────────┐   ┌─────────────────┐  │
│  │ Node Agent  │   │  Cluster Agent  │  │
│  │ (DaemonSet) │   │  (Deployment)   │  │
│  └──────┬──────┘   └────────┬────────┘  │
│         │                   │           │
│         └─────────┬─────────┘           │
│                   │                     │
└───────────────────┼─────────────────────┘
                    │
              SUSE Observability
                  Server
```

---

## Step 1: Basic Agent Configuration

```yaml
# agent-values.yaml

stackstate:
  apiKey: "your-api-key"
  cluster:
    name: "production-us-west"    # Unique name for this cluster
    authToken: ""                 # Optional: for secure cluster identification
  url: "https://observability.example.com/receiver/stsAgent"

# Node agent runs on every node
nodeAgent:
  tolerations:
    - key: node-role.kubernetes.io/control-plane
      operator: Exists
      effect: NoSchedule

# Cluster agent collects cluster-level resources
clusterAgent:
  enabled: true
  collection:
    kubernetesTopology: true
    kubernetesMetrics: true
    kubernetesEvents: true
    kubeStateMetrics:
      enabled: true
```

---

## Step 2: Configure Log Collection

```yaml
# Enable log collection from pods
logsAgent:
  enabled: true
  resources:
    requests:
      cpu: 20m
      memory: 100Mi
    limits:
      cpu: 500m
      memory: 192Mi
```

---

## Step 3: Add Custom Tags to Agent Data

Tags help filter and group agent data in the Observability UI:

```yaml
# Apply custom tags to the agent containers
global:
  extraEnv:
    open:
      DD_TAGS: "env:production,team:platform,region:us-west-2"

# Or configure only the node agent container
nodeAgent:
  containers:
    agent:
      env:
        DD_TAGS: "component:node-agent"
```

---

## Step 4: Configure Checks for Specific Integrations

The agent supports built-in checks for common services:

```yaml
# agent-values.yaml
nodeAgent:
  config:
    override:
      - name: auto_conf.yaml
        path: /etc/stackstate-agent/conf.d/nginx.d
        data: |
          ad_identifiers:
            - nginx
          init_config:
          instances:
            - nginx_status_url: http://%%host%%/nginx_status
```

---

## Step 5: Configure Resource Limits

```yaml
# Set resource requests and limits for the agent
nodeAgent:
  containers:
    agent:
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi
    processAgent:
      resources:
        requests:
          cpu: 50m
          memory: 128Mi
        limits:
          cpu: 250m
          memory: 400Mi

clusterAgent:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi
```

---

## Step 6: Apply the Configuration

```bash
# Upgrade the agent deployment with new values
helm upgrade --install suse-observability-agent \
  suse-observability/suse-observability-agent \
  --namespace suse-observability \
  --create-namespace \
  --values agent-values.yaml \
  --wait

# Verify pods restarted with new config
kubectl get pods -n suse-observability

# Check agent logs for configuration errors
kubectl logs -n suse-observability daemonset/suse-observability-agent-node-agent | head -50
```

---

## Step 7: Verify the Agent is Reporting

```bash
# Check if the agent is sending data
kubectl logs -n suse-observability deployment/suse-observability-agent-cluster-agent \
  | grep -i "topology\|metrics\|error"

# Show node-agent status and running checks
kubectl exec -n suse-observability \
  $(kubectl get pod -n suse-observability -l app.kubernetes.io/component=node-agent -o name | head -1) \
  -- stackstate-agent status
```

---

## Troubleshooting Agent Issues

```bash
# Agent not connecting to server
kubectl logs -n suse-observability daemonset/suse-observability-agent-node-agent \
  | grep -i "connection\|refused\|timeout"

# Check the API key is correct
kubectl get secret -n suse-observability suse-observability-agent-secrets \
  -o jsonpath='{.data.STS_API_KEY}' | base64 -d

# Restart the agent
kubectl rollout restart daemonset/suse-observability-agent-node-agent -n suse-observability
```

---

## Best Practices

- Set a meaningful `cluster.name` that identifies the environment and region - this name appears in the topology view and cannot be easily changed.
- Disable `logsAgent.enabled` when pod log shipping is not required, or use a separate log pipeline if you need custom namespace filtering.
- Use `tolerations` on the node agent to ensure it runs on control-plane nodes for complete cluster visibility.

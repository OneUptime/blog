# How to Configure Cluster Agent Customization in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cluster Templates

Description: Learn how to customize Rancher cluster and node agent configurations for resource management, tolerations, and scheduling.

Rancher deploys a cluster agent to managed clusters for communication and management. On older RKE clusters, Rancher also deploys a node agent, while Rancher-provisioned RKE2 and K3s clusters use `rancher-system-agent` for node lifecycle operations. This guide covers the supported cluster agent customization options in Rancher.

## Prerequisites

- Rancher v2.6 or later
- Admin access to Rancher
- A managed Kubernetes cluster
- Familiarity with Kubernetes resource requests, limits, and scheduling concepts

## Understanding Rancher Agents

Rancher uses the following agent components on managed clusters:

- **Cluster Agent**: A Deployment that handles communication between the Rancher server and the downstream cluster. It manages cluster-level operations.
- **Node Agent**: On RKE clusters, `cattle-node-agent` runs as a DaemonSet on every node and handles node-level operations. It is also used as a fallback path to the Kubernetes API when the cluster agent is unavailable.
- **Rancher System Agent**: On Rancher-provisioned RKE2 and K3s clusters, `rancher-system-agent` handles node lifecycle operations such as upgrades and snapshot workflows.

## Step 1: Access Agent Customization

Access the agent settings during cluster creation or editing:

1. Navigate to **Cluster Management**.
2. Click **Create** for a new cluster or select an existing cluster and click **Edit Config**.
3. In **Cluster Configuration**, open the **Cluster Agent** section for resource, toleration, affinity, and scheduling settings.
4. Use **Agent Environment Vars** to set environment variables for the cluster agent and, on RKE2/K3s clusters, the system agent service.

## Step 2: Configure Cluster Agent Resources

Set resource requests and limits for the cluster agent:

```yaml
# Cluster agent resource configuration
spec:
  clusterAgentDeploymentCustomization:
    overrideResourceRequirements:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
```

In the Rancher UI, set these values in the **Cluster Agent** section:

```plaintext
CPU Reservation: 200m
CPU Limit: 500m
Memory Reservation: 256Mi
Memory Limit: 512Mi
```

## Step 3: Configure Node Agent Resources

Node agent resource customization is not exposed through the same Rancher cluster agent customization interface. On older RKE clusters, you may still see the `cattle-node-agent` DaemonSet, but Rancher documents resource, toleration, and affinity customization through `clusterAgentDeploymentCustomization` for `cattle-cluster-agent`. On Rancher-provisioned RKE2 and K3s clusters, node lifecycle operations use `rancher-system-agent` instead of `cattle-node-agent`.

## Step 4: Add Agent Tolerations

Configure additional tolerations so the cluster agent can run on tainted nodes. Rancher already applies the default cluster agent tolerations for control plane scheduling, so use appended tolerations for any extra taints you need to handle:

```yaml
# Cluster agent tolerations
spec:
  clusterAgentDeploymentCustomization:
    appendTolerations:
      - key: dedicated
        operator: Equal
        value: infra
        effect: NoSchedule
```

In the Rancher UI:

1. Under **Cluster Agent Tolerations**, click **Add Toleration**.
2. Enter the additional toleration details you want Rancher to append to the cluster agent.

On older RKE clusters, `cattle-node-agent` already tolerates all node taints by default:

```yaml
# Node agent default toleration on RKE clusters
- operator: Exists
```

## Step 5: Configure Agent Affinity Rules

Set node affinity for the cluster agent to control where it runs. Because custom affinity overrides Rancher's default affinity, include the required Linux scheduling rule when you define your own affinity:

```yaml
# Cluster agent node affinity
spec:
  clusterAgentDeploymentCustomization:
    overrideAffinity:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
            - matchExpressions:
                - key: kubernetes.io/os
                  operator: NotIn
                  values:
                    - windows
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
                - key: node-role.kubernetes.io/controlplane
                  operator: In
                  values:
                    - "true"
          - weight: 100
            preference:
              matchExpressions:
                - key: node-role.kubernetes.io/control-plane
                  operator: In
                  values:
                    - "true"
          - weight: 1
            preference:
              matchExpressions:
                - key: cattle.io/cluster-agent
                  operator: In
                  values:
                    - "true"
```

This configuration prefers scheduling the cluster agent on control plane nodes and, when no control plane nodes are available, on nodes labeled `cattle.io/cluster-agent=true`.

## Step 6: Set Agent Environment Variables

Add custom environment variables to the agents:

1. In the cluster configuration, find **Agent Environment Vars**.
2. Add variables as needed.

```yaml
# Environment variables for agents
spec:
  agentEnvVars:
    - name: HTTP_PROXY
      value: "http://proxy.example.com:8080"
    - name: HTTPS_PROXY
      value: "http://proxy.example.com:8080"
    - name: NO_PROXY
      value: "localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.cluster.local"
```

## Step 7: Configure Agent Image Overrides

Use custom agent images when running in air-gapped environments:

```bash
# Set the default agent image globally
curl -s -k \
  -X PUT \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"agent-image","value":"rancher/rancher-agent:<rancher-version>"}' \
  "https://rancher.example.com/v3/settings/agent-image"
```

Use a tag that exactly matches your Rancher server version. When `system-default-registry` is configured, Rancher prepends the registry automatically for the global `agent-image` setting.

For per-cluster agent image overrides, configure the management `Cluster` object:

```yaml
apiVersion: management.cattle.io/v3
kind: Cluster
spec:
  agentImageOverride: registry.internal.example.com/rancher/rancher-agent:<rancher-version>
```

## Step 8: Configure Agent Priority Classes

Priority Class customization for the cluster agent is controlled by the `cluster-agent-scheduling-customization` feature flag. Enable the feature in **Global Settings** > **Feature Flags** first. When the feature is enabled, Rancher creates and manages the downstream PriorityClass for you:

```yaml
spec:
  clusterAgentDeploymentCustomization:
    schedulingCustomization:
      priorityClass:
        value: 1000000
        preemptionPolicy: PreemptLowerPriority
```

The same feature also manages the cluster agent Pod Disruption Budget.

## Step 9: Troubleshoot Agent Issues

When agents are not functioning correctly, use these diagnostic steps:

```bash
# Check cluster agent status
kubectl get deployment cattle-cluster-agent -n cattle-system

# Check node agent status on RKE clusters
kubectl get daemonset cattle-node-agent -n cattle-system

# View cluster agent logs
kubectl logs -l app=cattle-cluster-agent -n cattle-system --tail=100

# List node agent pods on RKE clusters
kubectl get pods -l app=cattle-agent -n cattle-system -o wide

# View logs for a specific node agent pod on RKE clusters
kubectl logs <cattle-node-agent-pod> -n cattle-system --tail=100

# Check agent resource usage
kubectl top pod -n cattle-system

# Describe the cluster agent deployment
kubectl describe deployment cattle-cluster-agent -n cattle-system
```

Common issues and solutions:

| Issue | Cause | Solution |
|-------|-------|----------|
| Agent OOMKilled | Memory limit too low | Increase memory limit |
| Agent not scheduled | Missing tolerations | Add required tolerations |
| Agent CrashLoopBackOff | Cannot reach Rancher server | Check proxy settings and network connectivity |
| Agent pending | Insufficient resources | Reduce resource requests or add capacity |

## Step 10: Apply Changes to Existing Clusters

Update agent configuration on running clusters:

1. Go to **Cluster Management**.
2. Select the cluster.
3. Click **Edit Config**.
4. Modify the agent customization settings.
5. Click **Save**.

Rancher will reconcile the downstream agent resources and roll the cluster agent Deployment as needed.

You can also modify agents directly with kubectl:

```bash
# Edit the cluster agent deployment
kubectl edit deployment cattle-cluster-agent -n cattle-system

# Edit the node agent daemonset on RKE clusters
kubectl edit daemonset cattle-node-agent -n cattle-system
```

Note that direct kubectl edits may be overwritten by Rancher on the next reconciliation. Always use the Rancher UI or API for persistent changes.

## Best Practices

- **Set appropriate resource limits**: Monitor agent resource usage and set limits that prevent resource starvation without being overly restrictive.
- **Append only the tolerations you need**: Rancher already applies the default cluster agent tolerations for control plane scheduling.
- **Use priority classes through Rancher-managed scheduling customization**: Let Rancher manage the downstream PriorityClass instead of editing `priorityClassName` directly.
- **Configure proxy settings centrally**: If your environment uses proxies, set the proxy environment variables at the agent level.
- **Monitor agent health**: Include agent pods in your monitoring and alerting setup to catch issues early.

## Conclusion

Customizing Rancher cluster agent settings ensures they operate efficiently within your cluster's resource constraints and scheduling requirements. By configuring appropriate resource limits, tolerations, affinity rules, and environment variables, you create a robust management plane that works reliably across diverse infrastructure configurations. Take the time to tune these settings based on your specific environment, and your Rancher-managed clusters will be more stable and responsive.

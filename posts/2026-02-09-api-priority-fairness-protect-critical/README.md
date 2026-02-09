# How to Configure API Priority and Fairness to Protect Critical API Calls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API, Reliability

Description: Master Kubernetes API Priority and Fairness to prevent API server overload and ensure critical control plane operations continue working even under heavy load conditions.

---

Have you ever experienced a situation where your Kubernetes cluster becomes unresponsive because the API server is overwhelmed with requests? This is where API Priority and Fairness (APF) comes to the rescue. APF is a sophisticated request management system that protects the Kubernetes API server from overload while ensuring critical operations always get through.

## Understanding API Priority and Fairness

API Priority and Fairness replaced the old max-inflight request limits in Kubernetes 1.20. Instead of simply rejecting requests when limits are reached, APF uses a fair queuing system that categorizes, prioritizes, and queues requests to prevent API server overload while maintaining fairness across different types of clients.

The system works by assigning incoming requests to priority levels and flow schemas, then managing them through a sophisticated queuing mechanism.

## Core Concepts

APF introduces two main custom resources:

**PriorityLevelConfiguration**: Defines priority levels with concurrency limits and queuing parameters.

**FlowSchema**: Classifies incoming requests and assigns them to priority levels based on the request source and resource.

When a request arrives at the API server, it matches against FlowSchemas (evaluated by matching order). The matched FlowSchema determines which PriorityLevelConfiguration handles the request.

## Viewing Default Configurations

Kubernetes ships with default APF configurations. You can view them:

```bash
# List all priority level configurations
kubectl get prioritylevelconfiguration

# Output shows default levels:
# system - for system-critical components
# leader-election - for leader election operations
# workload-high, workload-low - for regular workloads
# global-default - catch-all for unmatched requests
# exempt - for requests that bypass APF

# View a specific priority level
kubectl get prioritylevelconfiguration system -o yaml
```

The output shows important fields:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: system
spec:
  type: Limited
  limited:
    # Number of concurrent requests allowed
    nominalConcurrencyShares: 30
    # Queue configuration
    lendablePercent: 50
    limitResponse:
      type: Queue
      queuing:
        queues: 64
        queueLengthLimit: 50
        handSize: 6
```

## Creating a Custom Priority Level for Critical Workloads

Suppose you have a critical monitoring application that must never be throttled. You can create a dedicated priority level:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: critical-monitoring
spec:
  type: Limited
  limited:
    # Higher concurrency than default workloads
    nominalConcurrencyShares: 20
    lendablePercent: 0  # Do not lend unused capacity to other levels
    limitResponse:
      type: Queue
      queuing:
        queues: 32
        queueLengthLimit: 100
        handSize: 4
```

Apply this configuration:

```bash
kubectl apply -f critical-monitoring-pl.yaml
```

## Creating a FlowSchema to Route Requests

Now create a FlowSchema that routes requests from your monitoring service account to this priority level:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: FlowSchema
metadata:
  name: monitoring-service-flow
spec:
  # Lower numbers are evaluated first
  matchingPrecedence: 500
  priorityLevelConfiguration:
    name: critical-monitoring
  distinguisherMethod:
    type: ByUser
  rules:
  - subjects:
    - kind: ServiceAccount
      serviceAccount:
        name: monitoring-agent
        namespace: monitoring
    resourceRules:
    - verbs: ["get", "list", "watch"]
      apiGroups: ["*"]
      resources: ["*"]
      namespaces: ["*"]
```

Apply the FlowSchema:

```bash
kubectl apply -f monitoring-flow-schema.yaml
```

Now all API requests from the `monitoring-agent` service account will use the `critical-monitoring` priority level, ensuring they receive preferential treatment.

## Protecting Critical System Operations

You can create priority levels for different categories of operations. Here is an example for protecting deployments during critical maintenance windows:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: deployment-operations
spec:
  type: Limited
  limited:
    nominalConcurrencyShares: 15
    limitResponse:
      type: Queue
      queuing:
        queues: 16
        queueLengthLimit: 50
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: FlowSchema
metadata:
  name: deployment-flow
spec:
  matchingPrecedence: 600
  priorityLevelConfiguration:
    name: deployment-operations
  distinguisherMethod:
    type: ByUser
  rules:
  - subjects:
    - kind: Group
      group:
        name: system:serviceaccounts:production
    resourceRules:
    - verbs: ["create", "update", "patch"]
      apiGroups: ["apps"]
      resources: ["deployments"]
```

## Understanding Concurrency Shares

The `nominalConcurrencyShares` field does not directly specify the number of concurrent requests. Instead, it represents shares in a pool. The actual concurrency limit is calculated based on:

```
actual_concurrency = (nominalConcurrencyShares / total_shares) * server_concurrency_limit
```

For example, if the server concurrency limit is 600 and you have:
- system: 30 shares
- workload-high: 40 shares
- workload-low: 100 shares
- Total: 170 shares

Then system gets: (30/170) * 600 = ~106 concurrent requests.

## Monitoring APF Performance

Check APF metrics to understand how requests are being handled:

```bash
# Query the API server metrics endpoint
kubectl get --raw /metrics | grep apiserver_flowcontrol

# Key metrics:
# apiserver_flowcontrol_request_concurrency_limit - current concurrency limit per priority level
# apiserver_flowcontrol_rejected_requests_total - rejected requests by priority level
# apiserver_flowcontrol_dispatched_requests_total - successfully dispatched requests
# apiserver_flowcontrol_current_inqueue_requests - requests waiting in queue
```

You can also check the status of priority levels:

```bash
kubectl get prioritylevelconfiguration system -o yaml

# Look at the status section
status:
  conditions:
  - lastTransitionTime: "2026-02-09T10:00:00Z"
    message: ""
    reason: ""
    status: "False"
    type: Exempt
```

## Debugging Request Rejections

When requests are rejected due to APF, clients receive HTTP 429 (Too Many Requests) responses. You can debug these issues by examining API server logs:

```bash
# View API server logs
kubectl logs -n kube-system kube-apiserver-control-plane-1

# Look for APF-related messages
# "request rejected by APF" indicates throttling
# Check which FlowSchema and PriorityLevel were involved
```

To temporarily bypass APF for debugging, you can use the exempt priority level, but this should only be done with extreme caution:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: FlowSchema
metadata:
  name: debug-exempt-flow
spec:
  matchingPrecedence: 1  # Highest priority
  priorityLevelConfiguration:
    name: exempt  # Bypass APF entirely
  rules:
  - subjects:
    - kind: User
      user:
        name: debug-user
    nonResourceRules:
    - verbs: ["*"]
      nonResourceURLs: ["*"]
```

## Best Practices

1. **Start with defaults**: The default APF configuration works well for most clusters. Only customize when you have specific requirements.

2. **Use distinguishers wisely**: The `distinguisherMethod` field controls how requests are grouped into flows. `ByUser` creates separate flows for different users, providing better isolation.

3. **Monitor before customizing**: Collect metrics on request patterns before creating custom priority levels.

4. **Avoid the exempt level**: The exempt priority level bypasses APF entirely. Reserve it only for the most critical system components.

5. **Test under load**: After configuring custom APF settings, test your cluster under realistic load conditions to ensure the configuration behaves as expected.

6. **Document your FlowSchemas**: Use annotations to document why each FlowSchema exists and which applications depend on it.

## Common Scenarios

**Protecting control plane operations during batch jobs**: Create a higher priority level for control plane components to ensure they can operate even when batch jobs generate heavy API traffic.

**Isolating tenant traffic in multi-tenant clusters**: Use FlowSchemas with `ByUser` distinguishers to prevent one tenant from consuming all API capacity.

**Prioritizing interactive operations over automation**: Give higher priority to user-initiated operations compared to automated controllers that can tolerate some delay.

## Conclusion

API Priority and Fairness is a powerful mechanism for protecting your Kubernetes API server from overload while ensuring critical operations continue to function. By understanding how to configure priority levels and flow schemas, you can build resilient clusters that maintain responsiveness even under heavy load. Start with the defaults, monitor your cluster's behavior, and customize only when you have clear requirements that the default configuration does not meet.

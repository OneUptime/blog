# How to Use kubectl get --field-selector to Filter Resources by Status and Phase

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, DevOps

Description: Learn how to use kubectl field selectors to efficiently filter Kubernetes resources by status, phase, and metadata fields for faster debugging and resource management.

---

When managing large Kubernetes clusters, you often need to find specific resources based on their current state. Running `kubectl get` and manually scanning through hundreds of pods or services wastes time. Field selectors give you the power to filter resources directly at the API level, returning only what you need.

Field selectors work similarly to label selectors, but instead of filtering by labels, they filter by resource fields like status, phase, and metadata. This makes them perfect for operational tasks like finding failed pods, pending resources, or nodes in specific conditions.

## Understanding Field Selectors

Field selectors let you query Kubernetes resources based on the values of resource fields. The basic syntax looks like this:

```bash
kubectl get <resource> --field-selector <field>=<value>
```

You can combine multiple field selectors using commas, and you can use operators like `=`, `==`, and `!=` to build more complex queries.

Not all fields support field selectors. The available fields vary by resource type. Common fields include `metadata.name`, `metadata.namespace`, `status.phase`, and `spec.nodeName`.

## Filtering Pods by Phase

One of the most common use cases is filtering pods by their current phase. Pods go through several phases: Pending, Running, Succeeded, Failed, and Unknown.

To find all running pods in a namespace:

```bash
kubectl get pods --field-selector status.phase=Running
```

To find pods that have failed:

```bash
kubectl get pods --field-selector status.phase=Failed --all-namespaces
```

This command is invaluable when debugging issues. Instead of scrolling through pages of output, you immediately see which pods need attention.

To find pending pods that might be stuck waiting for resources:

```bash
kubectl get pods --field-selector status.phase=Pending
```

You can combine this with `kubectl describe` to quickly investigate why these pods are pending:

```bash
kubectl get pods --field-selector status.phase=Pending -o name | \
  xargs -I {} kubectl describe {}
```

## Filtering by Metadata Fields

Field selectors work great with metadata fields. You can filter by namespace, name, or other metadata attributes.

To get a specific pod by name:

```bash
kubectl get pods --field-selector metadata.name=nginx-deployment-xyz
```

To find all resources in a specific namespace:

```bash
kubectl get all --field-selector metadata.namespace=production
```

This is useful when writing scripts that need to work across different namespaces without hardcoding namespace names.

## Filtering Nodes by Condition

Nodes have various conditions you can filter on. This helps you identify nodes with problems quickly.

To find nodes that are not ready:

```bash
kubectl get nodes --field-selector spec.unschedulable=true
```

You can also combine field selectors with label selectors to create powerful queries. For example, to find all pods on a specific node:

```bash
kubectl get pods --field-selector spec.nodeName=worker-node-1 --all-namespaces
```

This is helpful when you need to drain a node or investigate why a particular node is experiencing issues.

## Combining Multiple Field Selectors

You can chain multiple field selectors together using commas. This creates an AND condition where all selectors must match.

To find running pods on a specific node:

```bash
kubectl get pods --field-selector status.phase=Running,spec.nodeName=worker-node-1
```

To find all services in a namespace that are not of type ClusterIP:

```bash
kubectl get services --field-selector metadata.namespace=default,spec.type!=ClusterIP
```

The `!=` operator lets you exclude resources that match a certain value, which is useful for finding exceptions or unusual configurations.

## Filtering Events by Involved Object

Events in Kubernetes track what happened to your resources. Field selectors make it easy to find events related to specific objects.

To see events for a specific pod:

```bash
kubectl get events --field-selector involvedObject.name=my-pod
```

To see events for all pods (filtering by kind):

```bash
kubectl get events --field-selector involvedObject.kind=Pod
```

You can also filter by event type to see only warnings:

```bash
kubectl get events --field-selector type=Warning
```

This helps you spot problems quickly without parsing through normal informational events.

## Practical Examples for Daily Operations

Here are some real-world scenarios where field selectors save significant time.

Find all ImagePullBackOff errors by combining events and field selectors:

```bash
kubectl get events --field-selector reason=Failed \
  --all-namespaces -o json | grep -i imagepull
```

Find all pods on nodes that are about to be drained:

```bash
# First mark node as unschedulable
kubectl cordon worker-node-2

# Then find all pods on it
kubectl get pods --field-selector spec.nodeName=worker-node-2 \
  --all-namespaces
```

Find all completed jobs that need cleanup:

```bash
kubectl get pods --field-selector status.phase=Succeeded \
  --all-namespaces
```

## Limitations and Considerations

Field selectors have some limitations you should know about. Not every field supports filtering. Each resource type has a specific set of fields that work with field selectors.

To find out which fields are available, you can check the API documentation or experiment with different fields. If a field is not supported, kubectl will return an error message indicating that the field selector is not valid.

Field selectors also do not support all operators. You can use `=`, `==`, and `!=`, but you cannot use greater than or less than operators. For more complex filtering, you might need to combine field selectors with output formatting and tools like `jq` or `grep`.

Field selectors work at the API server level, which makes them efficient. The filtering happens before results are sent to kubectl, reducing network traffic and improving performance compared to client-side filtering.

## Using Field Selectors in Scripts

Field selectors are perfect for automation scripts. Here is an example script that monitors for failed pods and sends alerts:

```bash
#!/bin/bash
# monitor-failed-pods.sh

while true; do
  FAILED_PODS=$(kubectl get pods --field-selector status.phase=Failed \
    --all-namespaces -o json | jq -r '.items | length')

  if [ "$FAILED_PODS" -gt 0 ]; then
    echo "Alert: $FAILED_PODS failed pods detected"
    kubectl get pods --field-selector status.phase=Failed \
      --all-namespaces -o wide
    # Send notification here
  fi

  sleep 60
done
```

You can also use field selectors with watch to monitor resources in real-time:

```bash
kubectl get pods --field-selector status.phase=Pending --watch
```

This command continuously displays pending pods as they appear, which is useful for debugging scheduling issues.

## Combining with Output Formatting

Field selectors become even more powerful when combined with custom output formats. Use `-o wide` for additional details, `-o json` for programmatic processing, or `-o custom-columns` for specific fields.

```bash
kubectl get pods --field-selector status.phase=Running \
  -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,IP:.status.podIP
```

This gives you exactly the information you need without extra clutter.

For JSON processing with jq:

```bash
kubectl get pods --field-selector status.phase=Failed \
  --all-namespaces -o json | \
  jq '.items[] | {name: .metadata.name, namespace: .metadata.namespace, reason: .status.reason}'
```

## Conclusion

Field selectors are a powerful feature that every Kubernetes administrator should master. They let you filter resources efficiently at the API level, reducing the time spent on common operational tasks.

Start using field selectors in your daily workflow. Filter pods by phase, find resources in specific namespaces, monitor node conditions, and track events for specific objects. Your command-line efficiency will improve dramatically.

Remember that different resource types support different fields. Experiment with field selectors to discover which fields work for your use cases. Combine them with label selectors, output formatting, and shell scripts to build powerful automation tools.

Master field selectors, and you will find that managing Kubernetes clusters becomes faster and more efficient.

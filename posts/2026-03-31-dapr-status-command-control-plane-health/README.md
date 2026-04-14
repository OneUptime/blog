# How to Use the dapr status Command for Control Plane Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Health Check, Kubernetes, Control Plane

Description: Learn how to use the dapr status command to check the health of the Dapr control plane components running on a Kubernetes cluster.

---

## Overview

The `dapr status` command shows the health and version of each Dapr control plane component in a Kubernetes cluster. It reports whether the operator, sentry, placement, sidecar injector, dashboard, and scheduler are running correctly and exposes version information for each.

## Basic Usage

```bash
dapr status --kubernetes
```

Sample output:

```text
  NAME                   NAMESPACE    HEALTHY  STATUS    REPLICAS  VERSION  AGE
  dapr-dashboard         dapr-system  True     Running   1         0.14.0   2h
  dapr-operator          dapr-system  True     Running   1         1.13.0   2h
  dapr-placement-server  dapr-system  True     Running   1         1.13.0   2h
  dapr-sentry            dapr-system  True     Running   1         1.13.0   2h
  dapr-sidecar-injector  dapr-system  True     Running   1         1.13.0   2h
  dapr-scheduler-server  dapr-system  True     Running   1         1.13.0   2h
```

## Checking Across Namespaces

The `dapr status -k` command automatically discovers Dapr control plane components across all namespaces. There is no need to specify a namespace flag — the command detects whichever namespace Dapr is installed in and reports status accordingly.

## Output Format

The `dapr status -k` command outputs a text table. There is no built-in JSON output mode for this command. The table includes columns for NAME, NAMESPACE, HEALTHY, STATUS, REPLICAS, VERSION, and AGE, as shown in the basic usage example above.

## Using in a Deployment Pipeline

Check Dapr control plane health before deploying workloads by parsing the text table output:

```bash
#!/bin/bash
echo "Checking Dapr control plane health..."
STATUS=$(dapr status -k)

UNHEALTHY=$(echo "$STATUS" | tail -n +2 | awk '$3 != "True" { print }')

if [ -n "$UNHEALTHY" ]; then
  echo "ERROR: Dapr control plane component(s) are unhealthy:"
  echo "$UNHEALTHY"
  exit 1
fi

echo "All Dapr control plane components are healthy"
```

## Diagnosing an Unhealthy Component

If a component shows `False` for health:

```bash
# Check pod events
kubectl describe pod -l app=dapr-sentry -n dapr-system

# Check pod logs
kubectl logs -l app=dapr-sentry -n dapr-system
```

## After an Upgrade

Run `dapr status` immediately after `dapr upgrade` to confirm all components updated successfully:

```bash
dapr upgrade --kubernetes --runtime-version 1.14.0
dapr status --kubernetes
```

All components should show the new version and `Running` status.

## Summary

`dapr status` is the go-to command for verifying that the Dapr control plane is healthy after installation, upgrades, or cluster restarts. Its tabular output can be parsed in CI/CD pipelines and monitoring scripts, enabling automated readiness checks before workload deployments proceed.

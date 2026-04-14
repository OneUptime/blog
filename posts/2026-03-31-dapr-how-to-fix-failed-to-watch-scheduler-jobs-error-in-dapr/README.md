# How to Fix 'Failed to Watch Scheduler Jobs' Error in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Troubleshooting, Scheduler, Kubernetes, Workflow

Description: Diagnose and resolve the 'Failed to Watch Scheduler Jobs' error in Dapr by checking scheduler service health and configuration.

---

## Overview

The "Failed to Watch Scheduler Jobs" error appears in Dapr sidecar logs when the Dapr scheduler service is unreachable or misconfigured. This error affects workflow and reminder functionality. This guide walks through how to identify the root cause and apply the correct fix.

## Understanding the Error

The error typically appears in sidecar logs as:

```text
WARN[0010]  Failed to watch scheduler jobs  app_id=myapp error="rpc error: code = Unavailable desc = connection refused"
```

This indicates the sidecar cannot connect to the Dapr Scheduler service, which is responsible for managing cron-based triggers and workflow timers.

## Check Scheduler Service Status

In Kubernetes mode, verify the scheduler is running:

```bash
kubectl get pods -n dapr-system -l app=dapr-scheduler-server
kubectl get svc -n dapr-system | grep scheduler
```

If the scheduler pod is absent, your Dapr installation may be too old or scheduler was not included:

```bash
dapr status -k
```

Check the scheduler pod logs:

```bash
kubectl logs -n dapr-system -l app=dapr-scheduler-server --tail=100
```

## Upgrade Dapr to Include Scheduler

The Dapr Scheduler service was introduced in Dapr 1.14. If you're running an older version, upgrade:

```bash
# Upgrade Dapr in Kubernetes
dapr upgrade -k --runtime-version 1.14.0

# Verify new version
dapr status -k
```

For self-hosted mode, install the new CLI version first, then reinitialize:

```bash
dapr uninstall
# Install the latest Dapr CLI (see https://docs.dapr.io/getting-started/install-dapr-cli/)
dapr init --runtime-version 1.14.0
dapr status
```

## Verify Scheduler Connectivity

Check that the scheduler service address is correct. The sidecar connects to the scheduler via the `--scheduler-host-address` flag or the `dapr.io/scheduler-host-address` pod annotation. The default address is:

```text
dapr-scheduler-server.dapr-system.svc.cluster.local:50006
```

Test connectivity from an application pod:

```bash
kubectl exec -it -n default my-app-pod -- sh
# Inside the pod:
nc -zv dapr-scheduler-server.dapr-system.svc.cluster.local 50006
```

## Fix Network Policy Blocking Scheduler

If your cluster uses NetworkPolicies, ensure the sidecar can reach the scheduler:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dapr-scheduler
  namespace: default
spec:
  podSelector:
    matchLabels:
      dapr.io/enabled: "true"
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: dapr-system
    ports:
    - protocol: TCP
      port: 50006
```

Apply the policy:

```bash
kubectl apply -f allow-dapr-scheduler.yaml
```

## Disable Scheduler if Not Needed

If you are not using Dapr workflows or cron bindings, suppress the warning by disabling the scheduler watch in your application configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: myapp-config
  namespace: default
spec:
  features:
  - name: SchedulerReminders
    enabled: false
```

Apply the configuration:

```bash
kubectl apply -f myapp-config.yaml
```

Then annotate your deployment:

```yaml
annotations:
  dapr.io/config: "myapp-config"
```

## Self-Hosted Mode Fix

In self-hosted mode, the scheduler runs as a separate Docker container. Check if it is running:

```bash
# Check if the scheduler container is running
docker ps | grep dapr-scheduler

# If not running, reinitialize Dapr to ensure all components are started
dapr uninstall
dapr init
```

Verify the scheduler container is now running:

```bash
docker ps | grep scheduler
```

## Validate the Fix

After applying changes, restart your application and monitor logs:

```bash
# Kubernetes
kubectl rollout restart deployment/my-app
kubectl logs -f deployment/my-app -c daprd | grep -i scheduler

# Self-hosted
dapr run --app-id myapp --app-port 3000 -- node app.js
```

You should no longer see the "Failed to Watch Scheduler Jobs" warning. Successful connection logs look like:

```text
INFO[0001]  Scheduler connected  app_id=myapp
```

## Summary

The "Failed to Watch Scheduler Jobs" error is most commonly caused by running a Dapr version older than 1.14 that lacks the scheduler service, network policies blocking sidecar-to-scheduler traffic, or the scheduler pod crashing. Upgrading Dapr, verifying pod status, and allowing the correct network traffic resolves the issue in most cases. If your application does not use workflows or cron triggers, you can safely disable the scheduler feature flag to eliminate the warning.

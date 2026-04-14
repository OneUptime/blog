# How to Debug Dapr Placement Table Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Placement, Debugging, Kubernetes

Description: Debug Dapr Placement table issues including stale entries, missing actor types, and dissemination failures that prevent actors from being invoked correctly.

---

## Common Placement Table Problems

The Dapr Placement service maintains a distributed hash table mapping actor types to host addresses. Placement table issues can cause actors to be unreachable, invocations to fail, or actors to never activate. Common symptoms include:

- `ERR_ACTOR_RUNTIME_NOT_FOUND` errors
- Actors stuck in "pending" state
- Actor invocations timing out consistently

## Checking Placement Service Logs

Start debugging by examining placement service logs:

```bash
kubectl logs -n dapr-system -l app=dapr-placement --tail=100

# Filter for errors specifically
kubectl logs -n dapr-system -l app=dapr-placement | grep -iE "error|warn|fail"
```

## Verifying Actor Registration

Check if your actor type is registered in the placement table by inspecting sidecar logs at startup:

```bash
# Get sidecar logs for your app
kubectl logs <pod-name> -c daprd --tail=200 | grep -i "actor\|placement"
```

Expected output when registration succeeds:

```bash
time="2026-03-31T10:00:00Z" level=info msg="actor runtime started. actor idle timeout: 1h0m0s" app_id=order-service
time="2026-03-31T10:00:01Z" level=info msg="placement tables updated, version: 42" app_id=order-service
```

## Checking Actor Configuration in Your App

Your application must return the correct actor configuration. Verify the actors endpoint:

```bash
curl http://<app-host>:<app-port>/dapr/config
```

Expected response:

```json
{
  "entities": ["OrderActor", "InventoryActor"],
  "actorIdleTimeout": "1h",
  "actorScanInterval": "30s",
  "drainOngoingCallTimeout": "10s",
  "drainRebalancedActors": true
}
```

## Diagnosing Dissemination Failures

If the placement table is not being pushed to sidecars, check network connectivity between the sidecar and placement service:

```bash
# Exec into app pod and test connectivity
kubectl exec -it <pod-name> -c daprd -- sh

# Test placement port
nc -zv dapr-placement-server.dapr-system.svc.cluster.local 50005
```

## Forcing a Placement Table Refresh

You can force a refresh by restarting the Dapr sidecar or the Placement service pod:

```bash
# Restart placement service (causes brief actor unavailability)
kubectl rollout restart deployment/dapr-placement-server -n dapr-system

# Or restart just the affected app pod to re-register actors
kubectl delete pod <pod-name> -n <namespace>
```

## Debugging with Dapr CLI

Use the Dapr CLI to check actor registration state on self-hosted environments:

```bash
dapr list
dapr logs --app-id order-service | grep -i placement
```

## Summary

Debugging Dapr Placement table issues requires checking placement service logs, verifying actor registration responses from your app, and testing network connectivity between sidecars and the placement service. Most issues stem from misconfigured actor config endpoints or network policies blocking port 50005.

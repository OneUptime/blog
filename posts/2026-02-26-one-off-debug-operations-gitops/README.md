# How to Handle One-Off Debug Operations with GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Debugging, Operations

Description: Learn how to perform one-off debugging operations in a GitOps-managed Kubernetes environment without breaking declarative state or creating drift in ArgoCD.

---

You are on call. An alert fires at 2 AM. The application is returning 500 errors. You need to debug the issue - check logs, inspect environment variables, test network connectivity, maybe run a diagnostic query against the database. All of these are imperative, one-off operations that do not fit into a declarative GitOps workflow.

This is where theory meets reality. GitOps purists will tell you that everything should be in Git. Practical operators know that debugging requires flexibility. The challenge is performing debug operations without undermining your GitOps setup or creating hidden drift.

## Read-Only Operations Are Always Safe

The first thing to understand is that read-only operations never conflict with GitOps. ArgoCD does not care if you read pod logs, describe resources, or port-forward to services:

```bash
# All of these are safe and do not create drift
kubectl logs deployment/my-app -n production --tail=100
kubectl describe pod my-app-xyz -n production
kubectl get events -n production --sort-by='.lastTimestamp'
kubectl port-forward svc/my-app 8080:80 -n production
kubectl top pods -n production
```

These commands read cluster state without modifying it. Use them freely during debugging sessions.

## Exec into Running Pods

Executing into a running pod for debugging is safe from a GitOps perspective because it does not change the pod spec or any Kubernetes resource state:

```bash
# Exec into a running container
kubectl exec -it deployment/my-app -n production -- /bin/sh

# Inside the container, check various things:
# Network connectivity
curl -v http://database-service:5432
ping redis-service

# Environment variables
env | grep DATABASE

# DNS resolution
nslookup database-service.production.svc.cluster.local

# File system inspection
ls -la /app/config/
cat /app/config/application.yaml

# Process inspection
ps aux
```

The container's filesystem and process state are ephemeral. When the pod restarts, everything resets to the state defined by the container image.

## Deploying Debug Containers

Sometimes you need tools that are not in the production container. Kubernetes ephemeral containers let you attach a debug container to a running pod without modifying the pod spec:

```bash
# Attach a debug container with networking tools
kubectl debug -it my-app-xyz -n production \
  --image=nicolaka/netshoot \
  --target=my-app

# Inside the debug container:
tcpdump -i eth0 port 5432
netstat -tlnp
dig database-service.production.svc.cluster.local
```

Ephemeral containers are temporary and do not appear in the pod spec stored in Git. They are automatically removed when the debug session ends or the pod restarts.

For older Kubernetes versions that do not support ephemeral containers, deploy a temporary debug pod:

```yaml
# debug-pod.yaml - deploy temporarily, delete when done
apiVersion: v1
kind: Pod
metadata:
  name: debug-session-20260226
  namespace: production
  labels:
    purpose: debugging
    ttl: "4h"
spec:
  containers:
  - name: debug
    image: nicolaka/netshoot
    command: ["sleep", "14400"]  # 4 hours then exits
  restartPolicy: Never
  # Run on the same node as the target pod for network debugging
  nodeName: node-xyz
```

```bash
# Deploy the debug pod
kubectl apply -f debug-pod.yaml

# Use it for debugging
kubectl exec -it debug-session-20260226 -n production -- /bin/bash

# Clean up when done
kubectl delete pod debug-session-20260226 -n production
```

If ArgoCD detects this pod as a drift (it will if it is in a namespace managed by an ArgoCD application), the pod will be pruned on the next sync. This is actually desirable - it ensures debug pods do not linger.

## Temporary ConfigMap or Secret Changes

Sometimes you need to enable debug logging by changing a ConfigMap or add a temporary feature flag. Doing this through kubectl creates drift that ArgoCD will revert.

**The GitOps way to debug with configuration changes**:

```bash
# Create a debug branch
git checkout -b debug/investigate-500-errors

# Enable debug logging
yq e '.data.LOG_LEVEL = "debug"' -i apps/my-app/configmap.yaml

# Commit and push
git add . && git commit -m "Enable debug logging for incident investigation"
git push origin debug/investigate-500-errors

# Tell ArgoCD to sync from the debug branch
argocd app set my-app --revision debug/investigate-500-errors
argocd app sync my-app
```

After debugging is complete, switch back to the main branch:

```bash
# Revert to main branch
argocd app set my-app --revision HEAD
argocd app sync my-app

# Delete the debug branch
git push origin --delete debug/investigate-500-errors
```

This approach gives you full flexibility to make temporary configuration changes while maintaining an audit trail and ensuring automatic cleanup.

## Using ArgoCD Overrides for Debugging

ArgoCD allows parameter overrides that are not stored in Git. Use these for temporary debug configurations:

```bash
# Override a Helm value temporarily
argocd app set my-app \
  --helm-set debug.enabled=true \
  --helm-set debug.logLevel=trace

# Sync with the override
argocd app sync my-app
```

The ArgoCD UI will show that the application has overrides, making it visible to the team. To remove the override:

```bash
# Remove the override
argocd app unset my-app --helm-set debug.enabled
argocd app unset my-app --helm-set debug.logLevel
argocd app sync my-app
```

Be careful with this approach. Overrides that persist beyond the debug session create invisible configuration that is not tracked in Git.

## Creating Debug Dashboards

For recurring debug scenarios, create pre-built debug tools managed through GitOps:

```yaml
# A debug namespace with common tools, managed by ArgoCD
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: debug-tools
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/org/gitops-repo
    path: debug-tools
  destination:
    server: https://kubernetes.default.svc
    namespace: debug-tools
  syncPolicy:
    automated:
      prune: true
```

The debug-tools directory contains pre-configured debugging resources:

```yaml
# debug-tools/network-tester.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: network-tester
  namespace: debug-tools
spec:
  replicas: 1
  selector:
    matchLabels:
      app: network-tester
  template:
    metadata:
      labels:
        app: network-tester
    spec:
      containers:
      - name: netshoot
        image: nicolaka/netshoot
        command: ["sleep", "infinity"]
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "256Mi"
```

This gives you a persistent debugging pod that is managed by GitOps. It is always available, always up to date, and does not create drift.

## Database Debugging

Connecting to a database for debugging is a common need. Instead of exposing database credentials through kubectl, use a port-forward:

```bash
# Port-forward to the database service
kubectl port-forward svc/postgres 5432:5432 -n production

# Connect from your local machine
psql -h localhost -p 5432 -U readonly_user -d production
```

For more complex database debugging, deploy a temporary pod with database tools:

```bash
# One-liner debug pod for database investigation
kubectl run db-debug --rm -it \
  --image=postgres:16 \
  --namespace=production \
  --env="PGPASSWORD=$(kubectl get secret db-creds -n production -o jsonpath='{.data.password}' | base64 -d)" \
  -- psql -h postgres-service -U app_user -d production
```

The `--rm` flag ensures the pod is deleted when the session ends.

## Logging and Tracing for Debug

Instead of modifying application configuration for debugging, use external tools that do not require application changes:

```bash
# Stream logs from all pods of a deployment
kubectl logs -l app=my-app -n production --all-containers -f

# If using a service mesh, check proxy logs
kubectl logs my-app-xyz -n production -c istio-proxy --tail=50

# Check recent events for the namespace
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20
```

For deeper investigation, integrate with centralized logging and tracing. If your applications export metrics and traces, use your observability stack to investigate without touching the cluster.

For setting up comprehensive monitoring that reduces the need for ad-hoc debugging sessions, check out how to configure [ArgoCD health monitoring](https://oneuptime.com/blog/post/2026-02-26-argocd-alerts-degraded-applications/view) with OneUptime.

## Best Practices for Debug Operations

1. **Always use read-only operations first**: Logs, describe, events, and metrics answer most questions.
2. **Use ephemeral containers over temporary pods**: They leave no trace and cannot create drift.
3. **Use debug branches for configuration changes**: This maintains the audit trail.
4. **Clean up after debugging**: Delete debug pods, revert branches, remove overrides.
5. **Document what you found**: Create an incident post-mortem that includes the debugging steps.
6. **Build permanent debug tooling**: If you debug the same thing repeatedly, add it to your GitOps-managed debug tools.

## Summary

One-off debugging in a GitOps environment is about choosing the right tool for each situation. Read-only operations are always safe. Ephemeral containers provide debugging tools without creating drift. Debug branches with ArgoCD revision switching allow temporary configuration changes with full audit trails. Pre-built debug tooling managed by GitOps eliminates the need for ad-hoc pod creation. The goal is not to prevent debugging but to make GitOps-compatible debugging the path of least resistance.

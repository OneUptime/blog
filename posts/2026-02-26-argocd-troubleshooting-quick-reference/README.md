# ArgoCD Troubleshooting Quick Reference

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, DevOps

Description: A quick reference guide for troubleshooting the most common ArgoCD issues including sync failures, OutOfSync loops, authentication errors, and performance problems.

---

When ArgoCD breaks, you need answers fast. This quick reference covers the most common issues, their symptoms, and the exact commands to diagnose and fix them. Keep this bookmarked for when things go wrong at 2 AM.

## Diagnostic Commands

Before diving into specific issues, here are the commands you will reach for most often:

```bash
# Check overall ArgoCD component health
kubectl get pods -n argocd

# View application status
argocd app get <app-name>

# View application sync details
argocd app get <app-name> --show-operation

# Check component logs
kubectl logs -n argocd deployment/argocd-server --tail=200
kubectl logs -n argocd deployment/argocd-application-controller --tail=200
kubectl logs -n argocd deployment/argocd-repo-server --tail=200

# Check events in the argocd namespace
kubectl get events -n argocd --sort-by='.lastTimestamp'

# View Redis status
kubectl exec -n argocd deployment/argocd-redis -- redis-cli ping
```

## Sync Failures

### Symptom: Application Stuck in "Syncing"

The application shows Syncing status but never completes.

```bash
# Check the operation details
argocd app get <app-name> --show-operation

# Look for resource-level errors
argocd app resources <app-name>

# Check controller logs for this specific app
kubectl logs -n argocd deployment/argocd-application-controller | grep "<app-name>"
```

Common causes:
- A PreSync or PostSync hook is stuck or failing
- A resource is waiting for dependencies that will never be met
- Sync timeout has been reached

Fix:

```bash
# Terminate the stuck operation
argocd app terminate-op <app-name>

# Force a fresh sync
argocd app sync <app-name> --force

# If hooks are stuck, skip them
argocd app sync <app-name> --prune --force
```

### Symptom: "ComparisonError" on Application

```bash
# Get detailed error message
argocd app get <app-name> -o json | jq '.status.conditions'

# Common fix: repo server cannot generate manifests
kubectl logs -n argocd deployment/argocd-repo-server | grep "error"
```

Common causes:
- Invalid YAML in your Git repository
- Helm chart rendering failure
- Kustomize build errors
- Repo server out of memory

Fix:

```bash
# Test manifest generation locally
helm template my-chart ./chart --values values.yaml

# Or for Kustomize
kustomize build overlays/production

# If repo server is OOM, increase memory
kubectl patch deployment argocd-repo-server -n argocd -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"argocd-repo-server","resources":{"limits":{"memory":"1Gi"}}}]}}}}'
```

### Symptom: "Permission Denied" During Sync

```bash
# Check RBAC configuration
kubectl get configmap argocd-rbac-cm -n argocd -o yaml

# Check the AppProject restrictions
argocd proj get <project-name>

# Verify cluster credentials
argocd cluster list
```

Common causes:
- AppProject does not allow the target namespace or cluster
- RBAC policy does not grant sync permission to the user or role
- Cluster credentials have expired

## OutOfSync Issues

### Symptom: Application Keeps Showing OutOfSync

```bash
# See what is different
argocd app diff <app-name>

# Check specific resource diffs
argocd app diff <app-name> --resource <group>:<kind>:<name>

# Check if ignore differences is configured
argocd app get <app-name> -o json | jq '.spec.ignoreDifferences'
```

Common causes:
- HPA modifying replica count
- Admission webhooks injecting sidecars or annotations
- Controllers adding default values
- Timestamp or generation fields changing

Fix: Add ignore differences to your Application:

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
    - group: apps
      kind: Deployment
      jqPathExpressions:
        - .spec.template.metadata.annotations
```

### Symptom: Self-Heal Keeps Reverting Changes

If self-heal is causing unwanted syncs:

```bash
# Check if self-heal is enabled
argocd app get <app-name> -o json | jq '.spec.syncPolicy'

# Temporarily disable self-heal
argocd app set <app-name> --self-heal=false
```

## Authentication and Authorization

### Symptom: "Failed to Generate Token" or Login Failures

```bash
# Check Dex server logs
kubectl logs -n argocd deployment/argocd-dex-server --tail=100

# Verify OIDC configuration
kubectl get configmap argocd-cm -n argocd -o yaml | grep -A 20 "oidc.config"

# Reset the admin password
kubectl patch secret argocd-secret -n argocd -p \
  '{"stringData": {"admin.password": "'$(htpasswd -bnBC 10 "" "newpassword" | tr -d ':\n')'"}}'
```

### Symptom: "Permission Denied" in UI or CLI

```bash
# Check what groups the user belongs to
argocd account get --account <username>

# Review RBAC policies
kubectl get configmap argocd-rbac-cm -n argocd -o yaml

# Test RBAC policy
argocd admin settings rbac can <role> get applications '*/*'
argocd admin settings rbac can <role> sync applications 'default/*'
```

### Symptom: SSO Redirect Loop

```bash
# Check Dex logs for errors
kubectl logs -n argocd deployment/argocd-dex-server | grep -i error

# Verify callback URL matches your configuration
kubectl get configmap argocd-cm -n argocd -o yaml | grep url

# Common fix: ensure the callback URL matches exactly
# The URL should be: https://<argocd-url>/api/dex/callback
```

## Repository Connection Issues

### Symptom: "Repository Not Accessible"

```bash
# List configured repositories
argocd repo list

# Test repository connectivity
argocd repo get <repo-url>

# Check repo server logs for connection errors
kubectl logs -n argocd deployment/argocd-repo-server | grep "error" | grep "<repo-url>"
```

Common fixes:

```bash
# Re-add the repository with fresh credentials
argocd repo rm <repo-url>
argocd repo add <repo-url> --ssh-private-key-path ~/.ssh/id_rsa

# For HTTPS repos with self-signed certs
argocd repo add <repo-url> --username <user> --password <pass> --insecure-skip-server-verification

# Check known hosts
argocd cert list --cert-type ssh
```

### Symptom: "rpc error: code = Unknown desc = error creating SSH agent"

```bash
# Check the repo server SSH configuration
kubectl get secret argocd-repo-creds -n argocd -o yaml

# Verify the SSH key format (must be PEM format)
# If using ed25519 key, make sure ArgoCD version supports it
```

## Performance Issues

### Symptom: ArgoCD UI is Slow or Unresponsive

```bash
# Check resource usage
kubectl top pods -n argocd

# Check Redis connectivity
kubectl exec -n argocd deployment/argocd-redis -- redis-cli info | grep "connected_clients"

# Check number of applications
argocd app list | wc -l

# Check controller processing queue
kubectl logs -n argocd deployment/argocd-application-controller | grep "queue"
```

Fixes for performance:

```yaml
# Increase controller workers
controller:
  env:
    - name: ARGOCD_CONTROLLER_STATUS_PROCESSORS
      value: "50"
    - name: ARGOCD_CONTROLLER_OPERATION_PROCESSORS
      value: "25"

# Increase repo server resources
repoServer:
  resources:
    limits:
      cpu: "2"
      memory: "2Gi"
    requests:
      cpu: "500m"
      memory: "512Mi"
```

### Symptom: Repo Server OOMKilled

```bash
# Check if repo server has been killed
kubectl describe pod -n argocd -l app.kubernetes.io/name=argocd-repo-server | grep -A 5 "Last State"

# Increase memory limits
kubectl patch deployment argocd-repo-server -n argocd --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "2Gi"}
]'

# Limit parallelism to reduce memory usage
kubectl set env deployment/argocd-repo-server -n argocd ARGOCD_REPO_SERVER_PARALLELISM_LIMIT=5
```

## Cluster Connection Issues

### Symptom: "Cluster Connection Failed"

```bash
# List clusters and their status
argocd cluster list

# Get cluster details
argocd cluster get <cluster-url>

# Re-register the cluster
argocd cluster rm <cluster-url>
argocd cluster add <context-name>
```

### Symptom: "Forbidden" Errors for Cluster Resources

```bash
# Check the service account permissions
kubectl auth can-i --list --as=system:serviceaccount:argocd:argocd-application-controller -n <namespace>

# Verify the cluster role binding
kubectl get clusterrolebinding | grep argocd
```

## Webhook Issues

### Symptom: Webhooks Not Triggering Sync

```bash
# Check the API server logs for webhook requests
kubectl logs -n argocd deployment/argocd-server | grep "webhook"

# Verify webhook secret
kubectl get secret argocd-secret -n argocd -o jsonpath='{.data.webhook\.github\.secret}' | base64 -d

# Test webhook manually
curl -X POST https://<argocd-url>/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"ref": "refs/heads/main"}'
```

## Quick Fix Commands

When you need to unblock fast:

```bash
# Nuclear option: hard refresh application state
argocd app get <app-name> --hard-refresh

# Force sync and prune orphaned resources
argocd app sync <app-name> --force --prune

# Restart ArgoCD components
kubectl rollout restart deployment -n argocd argocd-server
kubectl rollout restart deployment -n argocd argocd-application-controller
kubectl rollout restart deployment -n argocd argocd-repo-server

# Clear Redis cache
kubectl exec -n argocd deployment/argocd-redis -- redis-cli FLUSHALL

# Delete and recreate an application
argocd app delete <app-name> --cascade=false
argocd app create <app-name> --repo <repo> --path <path> --dest-server <server> --dest-namespace <ns>
```

For more in-depth debugging guides, check out our posts on [ArgoCD debugging](https://oneuptime.com/blog/post/2026-02-02-argocd-debugging/view) and [ArgoCD sync policies](https://oneuptime.com/blog/post/2026-02-09-argocd-sync-policies-pruning/view).

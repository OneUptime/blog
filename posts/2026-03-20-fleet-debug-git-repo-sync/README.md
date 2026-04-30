# How to Debug Fleet Git Repository Sync Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Troubleshooting

Description: A comprehensive guide to diagnosing and resolving Fleet Git repository synchronization failures, including authentication errors, network issues, and parsing problems.

## Introduction

Git repository sync issues are among the most common problems encountered with Fleet. When a GitRepo resource fails to sync, applications stop getting updates and your clusters can fall out of sync with your desired state. Quickly identifying the root cause - whether it's authentication, network connectivity, YAML syntax, or Fleet configuration - is essential for maintaining reliable GitOps pipelines.

This guide provides a systematic debugging approach for Fleet Git sync issues.

## Prerequisites

- `kubectl` access to Fleet manager cluster
- Access to the problematic Git repository
- Basic understanding of Fleet architecture

## Quick Diagnosis Checklist

```bash
# 1. Check GitRepo conditions

kubectl get gitrepo my-app -n fleet-default -o jsonpath-as-json='{.status.conditions}' | python3 -m json.tool

# 2. Check for sync errors
kubectl describe gitrepo my-app -n fleet-default | grep -A 5 "Conditions:"

# 3. Check gitjob logs
kubectl logs -n cattle-fleet-system -l app=gitjob --tail=50

# 4. Check fleet-controller logs
kubectl logs -n cattle-fleet-system -l app=fleet-controller --tail=50
```

## Understanding GitRepo Status Conditions

Fleet uses status conditions to communicate sync state:

```bash
# Get all conditions
kubectl get gitrepo my-app -n fleet-default \
  -o jsonpath='{range .status.conditions[*]}{.type}: {.status} - {.message}{"\n"}{end}'
```

Possible conditions:
- `Ready: True` - Bundles are deployed and ready
- `Ready: False` - Sync, templating, or downstream deployment needs attention
- `GitPolling: True` - Polling succeeded or polling is disabled
- `Reconciling: True` - Fleet is currently reconciling changes
- `Stalled: True` - The controller encountered an error or failed to make progress
- `Accepted: True` - GitRepo restrictions were applied and external Helm secrets exist

## Debugging Authentication Failures

### Symptoms
- GitRepo shows `Ready: False`
- Error message contains: `authentication required`, `401`, `403`, or `permission denied`

### Diagnosis

```bash
# Check if the credentials secret exists
kubectl get secret my-git-secret -n fleet-default

# Verify the secret has the required keys
kubectl get secret my-git-secret -n fleet-default \
  -o jsonpath-as-json='{.data}' | python3 -m json.tool

# Fleet expects clientSecretName secrets to use type kubernetes.io/ssh-auth or kubernetes.io/basic-auth
# For SSH secrets, expected key: ssh-privatekey
# For HTTP secrets, expected keys: username, password
```

### Testing HTTP Credentials

```bash
# Test the credentials manually
GITHUB_USER=$(kubectl get secret my-git-secret -n fleet-default \
  -o jsonpath='{.data.username}' | base64 -d)
GITHUB_TOKEN=$(kubectl get secret my-git-secret -n fleet-default \
  -o jsonpath='{.data.password}' | base64 -d)

# Test access to the repository over HTTPS
git ls-remote "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/my-org/my-repo.git"
```

### Testing SSH Credentials

```bash
# Extract the private key
kubectl get secret my-ssh-secret -n fleet-default \
  -o jsonpath='{.data.ssh-privatekey}' | base64 -d > /tmp/test_key

chmod 600 /tmp/test_key

# Test access to the repository over SSH
GIT_SSH_COMMAND='ssh -i /tmp/test_key -o StrictHostKeyChecking=accept-new' \
  git ls-remote git@github.com:my-org/my-repo.git

# Clean up
rm /tmp/test_key
```

### Resolution

```bash
# Update the credentials secret
kubectl create secret generic my-git-secret \
  --type=kubernetes.io/basic-auth \
  --from-literal=username=new-username \
  --from-literal=password=new-token \
  -n fleet-default \
  --dry-run=client -o yaml | kubectl apply -f -

# Force a re-sync by incrementing forceSyncGeneration
kubectl patch gitrepo my-app \
  -n fleet-default \
  --type=merge \
  -p '{"spec":{"forceSyncGeneration":1}}'
```

## Debugging Network Connectivity Issues

### Symptoms
- Error: `failed to clone`, `connection refused`, `i/o timeout`
- GitRepo stuck in `GitUpdating` state

### Diagnosis

```bash
# Check if the gitjob pod can reach the Git server
kubectl exec -n cattle-fleet-system \
  $(kubectl get pods -n cattle-fleet-system -l app=gitjob -o jsonpath='{.items[0].metadata.name}') \
  -- wget -S --spider https://github.com

# Check DNS resolution
kubectl exec -n cattle-fleet-system \
  $(kubectl get pods -n cattle-fleet-system -l app=gitjob -o jsonpath='{.items[0].metadata.name}') \
  -- nslookup github.com

# Check network policies blocking outbound
kubectl get networkpolicies -n cattle-fleet-system
```

### Resolution for Proxy Environments

```bash
# Add proxy environment variables to gitjob deployment
kubectl set env deployment/gitjob \
  -n cattle-fleet-system \
  HTTP_PROXY=http://proxy.example.com:3128 \
  HTTPS_PROXY=http://proxy.example.com:3128 \
  NO_PROXY="localhost,127.0.0.1,10.0.0.0/8"
```

## Debugging YAML Parsing Errors

### Symptoms
- Error: `failed to parse`, `invalid manifest`, `yaml: unmarshal errors`

### Diagnosis

```bash
# Validate your YAML files locally
kubectl apply --dry-run=server -f ./my-manifest.yaml

# Use yamllint for syntax checking
yamllint -d relaxed ./

# Check specific bundle parsing errors
kubectl describe bundle my-app -n fleet-default | grep -A 10 "Error"
```

### Common YAML Issues

```bash
# Test Helm chart rendering
helm template my-release ./chart \
  --debug \
  --dry-run

# Test Kustomize build
kustomize build ./overlays/production

# Validate with kubeval
find . -name "*.yaml" -exec kubeval {} \;
```

## Debugging Branch/Tag Issues

### Symptoms
- Error: `reference not found`, `branch does not exist`

```bash
# Verify the branch exists in the remote repository
git ls-remote --exit-code https://github.com/my-org/my-repo.git refs/heads/main

# Check if it's a tag issue
git ls-remote --exit-code https://github.com/my-org/my-repo.git refs/tags/v1.0.0

# Check current GitRepo spec
kubectl get gitrepo my-app -n fleet-default \
  -o jsonpath='{.spec.branch}'
```

## Debugging gitjob Pod Issues

```bash
# Check if gitjob pods are running
kubectl get pods -n cattle-fleet-system -l app=gitjob

# Check for pod failures
kubectl describe pod -n cattle-fleet-system \
  -l app=gitjob

# Get recent gitjob logs with timestamps
kubectl logs -n cattle-fleet-system \
  -l app=gitjob \
  --timestamps=true \
  --tail=100

# Check gitjob memory usage (OOM kills can cause sync failures)
kubectl top pod -n cattle-fleet-system -l app=gitjob
```

## Checking for Rate Limiting

Hosted Git providers can apply HTTP rate limits. Excessive polling can trigger these:

```bash
# Check for rate limit errors in logs
kubectl logs -n cattle-fleet-system \
  -l app=gitjob \
  | grep -i "rate limit\|429\|too many"

# Resolution: increase polling interval
kubectl patch gitrepo my-app -n fleet-default \
  --type=merge \
  -p '{"spec":{"pollingInterval":"5m"}}'
```

## Forcing a Fresh Clone

If you need Fleet to recreate the Git job from scratch:

```bash
# GitJobs are created in the GitRepo namespace, not cattle-fleet-system
kubectl get jobs -n fleet-default | grep '^my-app-'

# Delete the GitJob so Fleet recreates it and performs a fresh clone
kubectl delete job -n fleet-default \
  $(kubectl get jobs -n fleet-default -o name | grep '^job.batch/my-app-' | head -n 1 | cut -d/ -f2)
```

## Conclusion

Debugging Fleet Git sync issues requires a methodical approach that starts with the GitRepo status conditions and works down through the gitjob logs to specific error messages. Authentication failures are the most common issue and are easily resolved by verifying credentials and updating secrets. Network issues require verifying connectivity from within the Fleet namespace, while YAML parsing errors are best caught by validating manifests locally before pushing to Git. By following this systematic debugging guide, you can quickly identify and resolve the root cause of any Git sync failure.

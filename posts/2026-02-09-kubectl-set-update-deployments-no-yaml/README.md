# How to Use kubectl set Commands to Update Deployments Without Editing YAML

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Deployment Management

Description: Learn how to use kubectl set commands to update container images, environment variables, resource limits, and other deployment settings without editing YAML files directly.

---

Editing YAML files works for planned changes, but quick updates benefit from imperative commands. kubectl set provides targeted modification of deployment fields without opening editors or managing full manifests.

## Understanding kubectl set

The set command updates specific fields on resources:

```bash
# General syntax
kubectl set <subcommand> <resource> <arguments>

# Common subcommands
kubectl set image          # Update container images
kubectl set resources      # Update resource requests/limits
kubectl set env            # Update environment variables
kubectl set serviceaccount # Update service account
kubectl set selector       # Update selector
kubectl set subject        # Update RBAC subjects
```

Each subcommand targets a specific field type.

## Updating Container Images

The most common use case updates deployment images:

```bash
# Update single container image
kubectl set image deployment/webapp webapp=webapp:v2.0

# Update multiple containers
kubectl set image deployment/webapp \
  webapp=webapp:v2.0 \
  nginx=nginx:1.21

# Update with specific namespace
kubectl set image deployment/webapp webapp=webapp:v2.0 -n production

# Update all deployments with label
kubectl set image deployment -l app=backend backend=backend:v1.5
```

The format is `container-name=image:tag`. Container names come from the deployment spec.

## Recording Change Cause

Track why changes were made:

```bash
# Update with change-cause annotation
kubectl set image deployment/webapp webapp=webapp:v2.0 \
  --record

# Check rollout history to see recorded changes
kubectl rollout history deployment/webapp

# View specific revision
kubectl rollout history deployment/webapp --revision=2
```

The `--record` flag adds change information to rollout history.

## Updating Environment Variables

Add, update, or remove environment variables:

```bash
# Set environment variable
kubectl set env deployment/webapp DATABASE_URL=postgresql://db:5432

# Set multiple environment variables
kubectl set env deployment/webapp \
  DATABASE_URL=postgresql://db:5432 \
  CACHE_URL=redis://cache:6379

# Remove environment variable
kubectl set env deployment/webapp DATABASE_URL-

# Set from literal value
kubectl set env deployment/webapp DEBUG=true

# Set from ConfigMap
kubectl set env deployment/webapp --from=configmap/app-config

# Set from Secret
kubectl set env deployment/webapp --from=secret/db-credentials
```

Environment variable updates trigger rolling updates.

## Setting Resource Limits and Requests

Update CPU and memory allocation:

```bash
# Set resource requests
kubectl set resources deployment/webapp \
  --requests=cpu=100m,memory=256Mi

# Set resource limits
kubectl set resources deployment/webapp \
  --limits=cpu=500m,memory=512Mi

# Set both requests and limits
kubectl set resources deployment/webapp \
  --requests=cpu=100m,memory=256Mi \
  --limits=cpu=500m,memory=512Mi

# Update specific container in multi-container pod
kubectl set resources deployment/webapp \
  -c=webapp \
  --requests=cpu=200m,memory=512Mi
```

Resource updates restart pods through rolling updates.

## Setting Multiple Resource Types

Apply changes to multiple resource types:

```bash
# Update images in deployments and daemonsets
kubectl set image deployment,daemonset -l app=logging logger=logger:v2

# Update environment for deployments and statefulsets
kubectl set env deployment,statefulset -l tier=backend API_KEY=new-key

# Update resources for multiple resource types
kubectl set resources deployment,statefulset -l app=database \
  --limits=memory=1Gi
```

This applies consistent changes across resource types.

## Dry Run for Testing

Preview changes before applying:

```bash
# Dry run with server-side validation
kubectl set image deployment/webapp webapp=webapp:v2.0 \
  --dry-run=server

# Dry run with client-side validation
kubectl set image deployment/webapp webapp=webapp:v2.0 \
  --dry-run=client

# Output to YAML to see exact changes
kubectl set image deployment/webapp webapp=webapp:v2.0 \
  --dry-run=client -o yaml
```

Dry runs prevent accidental changes in production.

## Updating Service Accounts

Change the service account used by pods:

```bash
# Set service account for deployment
kubectl set serviceaccount deployment/webapp webapp-sa

# Update with namespace
kubectl set serviceaccount deployment/webapp webapp-sa -n production

# Update multiple deployments
kubectl set serviceaccount deployment -l app=backend backend-sa
```

Service account changes restart pods to apply new credentials.

## Setting Selector Labels

Update label selectors on services:

```bash
# Set selector on service
kubectl set selector service/webapp app=webapp,version=v2

# This changes which pods the service routes to
# Use with caution as it affects traffic routing

# Preview selector change
kubectl set selector service/webapp app=webapp,version=v2 --dry-run=client -o yaml
```

Selector changes take effect immediately and can disrupt traffic.

## Updating RBAC Subjects

Modify role bindings:

```bash
# Add user to role binding
kubectl set subject rolebinding/developers \
  --user=newuser@example.com

# Add service account to cluster role binding
kubectl set subject clusterrolebinding/admin \
  --serviceaccount=kube-system:admin-sa

# Add group
kubectl set subject rolebinding/viewers \
  --group=engineering
```

This modifies RBAC permissions without editing YAML.

## Combining Multiple set Operations

Chain multiple set commands for complex updates:

```bash
#!/bin/bash
# update-deployment.sh

DEPLOYMENT="webapp"
NAMESPACE="production"

# Update image
kubectl set image deployment/$DEPLOYMENT webapp=webapp:v2.0 -n $NAMESPACE

# Update environment
kubectl set env deployment/$DEPLOYMENT \
  VERSION=v2.0 \
  RELEASE_DATE=$(date +%Y-%m-%d) \
  -n $NAMESPACE

# Update resources
kubectl set resources deployment/$DEPLOYMENT \
  --limits=cpu=500m,memory=512Mi \
  -n $NAMESPACE

# Wait for rollout
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE

echo "Deployment updated successfully"
```

Scripts combine multiple updates into atomic operations.

## Setting Environment from ConfigMaps

Load all keys from ConfigMaps as environment variables:

```bash
# Create ConfigMap
kubectl create configmap app-config \
  --from-literal=DATABASE_HOST=postgres \
  --from-literal=CACHE_HOST=redis

# Set all ConfigMap keys as env vars
kubectl set env deployment/webapp --from=configmap/app-config

# Set with prefix
kubectl set env deployment/webapp \
  --from=configmap/app-config \
  --prefix=APP_

# Results in APP_DATABASE_HOST and APP_CACHE_HOST
```

This loads multiple environment variables in one command.

## Setting Environment from Secrets

Load sensitive data from Secrets:

```bash
# Create Secret
kubectl create secret generic db-creds \
  --from-literal=username=admin \
  --from-literal=password=secret123

# Set all Secret keys as env vars
kubectl set env deployment/webapp --from=secret/db-creds

# Set specific keys from Secret
kubectl set env deployment/webapp \
  DB_USER --from=secret/db-creds:username \
  DB_PASS --from=secret/db-creds:password
```

This injects secret data without exposing it in command history.

## Removing Environment Variables

Delete environment variables from deployments:

```bash
# Remove single variable
kubectl set env deployment/webapp OLD_VAR-

# Remove multiple variables
kubectl set env deployment/webapp VAR1- VAR2- VAR3-

# Verify removal
kubectl describe deployment webapp | grep -A 20 "Environment:"
```

The trailing hyphen indicates deletion.

## Setting Specific Container Resources

Target specific containers in multi-container pods:

```bash
# List containers in deployment
kubectl get deployment webapp -o jsonpath='{.spec.template.spec.containers[*].name}'

# Set resources for specific container
kubectl set resources deployment/webapp \
  -c=nginx \
  --limits=cpu=100m,memory=128Mi

# Set resources for multiple containers
kubectl set resources deployment/webapp \
  -c=webapp --limits=cpu=500m,memory=512Mi \
  -c=nginx --limits=cpu=100m,memory=128Mi
```

This provides granular control in multi-container scenarios.

## Updating Image Pull Policy

Change how images are pulled:

```bash
# Note: kubectl set doesn't have direct image pull policy command
# Use patch instead
kubectl patch deployment webapp \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"webapp","imagePullPolicy":"Always"}]}}}}'

# Or edit directly for this field
kubectl edit deployment webapp
# Change imagePullPolicy field manually
```

Some fields require patch or edit rather than set commands.

## Rolling Back set Changes

Undo set command changes:

```bash
# Check rollout history
kubectl rollout history deployment/webapp

# Rollback to previous version
kubectl rollout undo deployment/webapp

# Rollback to specific revision
kubectl rollout undo deployment/webapp --to-revision=3

# Verify rollback
kubectl rollout status deployment/webapp
```

Rollback works for all changes including those made with set.

## Validating Changes

Verify set commands applied correctly:

```bash
# After setting image
kubectl get deployment webapp -o jsonpath='{.spec.template.spec.containers[0].image}'

# After setting environment
kubectl describe deployment webapp | grep -A 10 "Environment:"

# After setting resources
kubectl describe deployment webapp | grep -A 10 "Limits:"

# Get full YAML to review all changes
kubectl get deployment webapp -o yaml
```

Always verify changes after applying them.

## Setting in Scripts with Error Handling

Production scripts should handle failures:

```bash
#!/bin/bash
# safe-update.sh

set -e

DEPLOYMENT="webapp"
NEW_IMAGE="webapp:v2.0"

echo "Updating deployment $DEPLOYMENT to $NEW_IMAGE"

# Update image
if kubectl set image deployment/$DEPLOYMENT webapp=$NEW_IMAGE; then
    echo "Image updated successfully"
else
    echo "Failed to update image"
    exit 1
fi

# Wait for rollout with timeout
if kubectl rollout status deployment/$DEPLOYMENT --timeout=5m; then
    echo "Rollout completed successfully"
else
    echo "Rollout failed, rolling back"
    kubectl rollout undo deployment/$DEPLOYMENT
    exit 1
fi

echo "Deployment update complete"
```

Error handling prevents partial updates.

## Performance Considerations

set commands trigger rolling updates:

```bash
# Each set command triggers a rollout
kubectl set image deployment/webapp webapp=webapp:v2.0
# Rollout starts

kubectl set env deployment/webapp DEBUG=true
# Triggers another rollout

# Better: Combine changes when possible
# Update image, then quickly add env before rollout completes
kubectl set image deployment/webapp webapp=webapp:v2.0
kubectl set env deployment/webapp DEBUG=true

# Or use patch for atomic updates
kubectl patch deployment webapp --type='json' -p='[
  {"op":"replace","path":"/spec/template/spec/containers/0/image","value":"webapp:v2.0"},
  {"op":"add","path":"/spec/template/spec/containers/0/env/-","value":{"name":"DEBUG","value":"true"}}
]'
```

Minimize separate set commands to reduce rollout overhead.

kubectl set commands provide quick, targeted updates without YAML wrangling. Use them for image updates, environment changes, and resource adjustments in development and emergency production scenarios. For complex changes, prefer declarative YAML management, but keep set in your toolkit for rapid modifications. Learn more about deployment management at https://oneuptime.com/blog/post/kubectl-rollout-deployment-management/view.

# How to Pause and Resume Kubernetes Deployments for Multi-Step Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployments, DevOps

Description: Learn how to pause and resume Kubernetes deployments to perform multi-step updates safely, preventing automatic rollout progression during complex configuration changes.

---

When you need to make multiple related changes to a Kubernetes deployment, you don't want each change triggering a separate rollout. Pausing deployments gives you control over when rollouts happen, letting you batch changes together and roll them out as a single atomic operation.

## Why Pause Deployments

Kubernetes deployments automatically trigger rollouts whenever you modify the pod template. This works great for simple updates, but creates problems when you need to make several related changes:

- Updating both the container image and environment variables
- Changing resource limits and adding new volumes
- Modifying multiple containers in a multi-container pod
- Making configuration changes that depend on each other

Without pausing, each change triggers its own rollout. Your deployment goes through multiple iterations, pods restart repeatedly, and you risk having inconsistent configurations running simultaneously.

## How Deployment Pausing Works

When you pause a deployment, Kubernetes stops creating new ReplicaSets and stops scaling existing ones. Any changes you make to the deployment spec are recorded but not acted upon. When you resume, all accumulated changes trigger a single rollout.

The key point is that pausing prevents new rollouts but doesn't affect running pods. Your application keeps running with the current configuration while you prepare changes.

## Pausing a Deployment

Use kubectl to pause a deployment:

```bash
# Pause a deployment
kubectl rollout pause deployment/my-app

# Verify it's paused
kubectl get deployment my-app -o yaml | grep -A 5 "conditions:"
```

You'll see a condition showing the deployment is paused:

```yaml
conditions:
- lastUpdateTime: "2026-02-09T10:00:00Z"
  message: Deployment is paused
  reason: DeploymentPaused
  status: "True"
  type: Progressing
```

## Making Multiple Changes

With the deployment paused, make all your changes. Each kubectl command updates the deployment spec without triggering a rollout:

```bash
# Update the image
kubectl set image deployment/my-app \
  app=myregistry.io/my-app:v2.0.0

# Add an environment variable
kubectl set env deployment/my-app \
  NEW_FEATURE_ENABLED=true

# Update resource limits
kubectl set resources deployment/my-app \
  -c=app \
  --limits=cpu=500m,memory=512Mi \
  --requests=cpu=200m,memory=256Mi

# Add a volume mount (requires editing the deployment)
kubectl edit deployment my-app
```

You can verify the changes are staged but not applied:

```bash
# Check the deployment
kubectl get deployment my-app -o yaml

# Notice no new ReplicaSet was created
kubectl get replicasets -l app=my-app
```

## Resuming the Deployment

Once all changes are ready, resume the deployment to trigger a single rollout:

```bash
# Resume the deployment
kubectl rollout resume deployment/my-app

# Watch the rollout progress
kubectl rollout status deployment/my-app
```

Now Kubernetes creates a new ReplicaSet with all your changes and performs a single controlled rollout:

```bash
# See the new ReplicaSet
kubectl get replicasets -l app=my-app

# Output shows old and new ReplicaSets
NAME                  DESIRED   CURRENT   READY   AGE
my-app-7d8f9c5b4d    0         0         0       10m
my-app-9f6e8d3c2a    3         3         3       1m
```

## Practical Example with Database Migration

A common use case is coordinating application updates with database migrations. You need to update the app image, set new database connection parameters, and adjust resource limits:

```bash
# Start by pausing
kubectl rollout pause deployment/api-server

# Update to new version that supports the new schema
kubectl set image deployment/api-server \
  api=myregistry.io/api-server:v3.0.0

# Update database connection string
kubectl set env deployment/api-server \
  DB_SCHEMA_VERSION=v3

# Add new config for migration
kubectl create configmap migration-config \
  --from-literal=migration_mode=auto \
  --dry-run=client -o yaml | kubectl apply -f -

# Update deployment to use the config
kubectl patch deployment api-server -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "api",
          "envFrom": [{
            "configMapRef": {
              "name": "migration-config"
            }
          }]
        }]
      }
    }
  }
}'

# Resume when ready
kubectl rollout resume deployment/api-server
```

This ensures all changes deploy together. The new pods start with the correct image, environment variables, and configuration.

## Automation with Scripts

You can script pause-update-resume workflows for repeatable deployments:

```bash
#!/bin/bash
# deploy-with-pause.sh

DEPLOYMENT=$1
IMAGE=$2
ENV_VARS=$3

echo "Pausing deployment..."
kubectl rollout pause deployment/$DEPLOYMENT

echo "Updating image to $IMAGE..."
kubectl set image deployment/$DEPLOYMENT \
  app=$IMAGE

echo "Applying environment variables..."
for var in $ENV_VARS; do
  kubectl set env deployment/$DEPLOYMENT $var
done

echo "Resuming deployment..."
kubectl rollout resume deployment/$DEPLOYMENT

echo "Waiting for rollout to complete..."
kubectl rollout status deployment/$DEPLOYMENT

echo "Deployment complete!"
```

Use it like this:

```bash
./deploy-with-pause.sh my-app \
  myregistry.io/my-app:v2.1.0 \
  "LOG_LEVEL=debug CACHE_TTL=3600"
```

## Handling Pause States in CI/CD

Your CI/CD pipeline should check if a deployment is paused before attempting updates:

```bash
#!/bin/bash
# Check if deployment is paused

DEPLOYMENT=$1
PAUSED=$(kubectl get deployment $DEPLOYMENT -o jsonpath='{.spec.paused}')

if [ "$PAUSED" == "true" ]; then
  echo "Error: Deployment $DEPLOYMENT is paused"
  echo "Resume with: kubectl rollout resume deployment/$DEPLOYMENT"
  exit 1
fi

# Proceed with deployment
echo "Deployment is not paused, proceeding..."
```

This prevents your pipeline from making changes that won't take effect, which could cause confusion.

## Combining Pause with Revision History

When you pause, make changes, and resume, the entire batch of changes becomes one revision in the rollout history:

```bash
# After resuming
kubectl rollout history deployment/my-app

# Output shows single revision for all changes
REVISION  CHANGE-CAUSE
1         Initial deployment
2         <none>
3         Batched update: image, env, resources
```

You can annotate the change for better tracking:

```bash
# Before resuming, add annotation
kubectl annotate deployment/my-app \
  kubernetes.io/change-cause="Update to v2.0.0 with new config"

# Then resume
kubectl rollout resume deployment/my-app
```

## Pausing During Rollouts

You can pause a deployment even while a rollout is in progress. This freezes the rollout at its current state:

```bash
# Start a rollout
kubectl set image deployment/my-app app=myregistry.io/my-app:v2.0.0

# Pause mid-rollout
kubectl rollout pause deployment/my-app
```

The deployment stops scaling new pods. Some pods run the new version, others run the old version. This is useful if you detect issues during a rollout and need time to investigate before proceeding or rolling back.

Resume when ready to continue:

```bash
kubectl rollout resume deployment/my-app
```

## Best Practices

Keep these guidelines in mind when using pause and resume:

**Test your changes before resuming**. Just because they're staged doesn't mean they're correct. Review the deployment spec carefully.

**Don't leave deployments paused indefinitely**. Paused deployments can confuse team members and prevent urgent updates. Resume or rollback within a reasonable timeframe.

**Use annotations to document why you paused**. Future you (or your teammates) will appreciate knowing the context:

```bash
kubectl annotate deployment/my-app \
  pause-reason="Staging multi-step update for v2.0.0 release"
```

**Combine with proper testing**. Pause-resume doesn't replace proper staging environments. Test your changes in a non-production environment first.

## Monitoring Paused Deployments

Create alerts for deployments that remain paused too long:

```yaml
# Prometheus alert rule
- alert: DeploymentPausedTooLong
  expr: |
    kube_deployment_spec_paused == 1
    and
    time() - kube_deployment_status_condition_last_transition_time{condition="Progressing",reason="DeploymentPaused"} > 3600
  for: 5m
  annotations:
    summary: "Deployment {{ $labels.deployment }} paused for over 1 hour"
```

This catches deployments that were paused and forgotten.

## Conclusion

Pausing and resuming deployments gives you fine-grained control over when changes roll out. Use it when you need to coordinate multiple updates, when you want to review changes before they take effect, or when you need to freeze a rollout in progress.

The pattern is simple: pause, make all your changes, verify they look correct, and resume. All your changes deploy as one atomic operation, giving you cleaner rollout history and more predictable behavior.

# How to Execute Resource Actions from the ArgoCD CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI

Description: Learn how to list and execute ArgoCD resource actions from the command line, including targeting specific resources, automating actions in scripts, and integrating with CI/CD pipelines.

---

While the ArgoCD UI provides a convenient way to execute resource actions, the CLI is essential for automation. You can script restarts, scaling operations, rollout promotions, and custom actions into CI/CD pipelines, cron jobs, runbooks, and incident response scripts. The ArgoCD CLI gives you full control over resource actions with precise targeting.

This guide covers every aspect of using resource actions from the ArgoCD CLI, from basic commands to advanced automation patterns.

## Prerequisites

Make sure you have the ArgoCD CLI installed and authenticated:

```bash
# Install ArgoCD CLI
brew install argocd  # macOS
# or
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd
sudo mv argocd /usr/local/bin/

# Login to your ArgoCD instance
argocd login argocd.example.com --username admin --password <password>

# Or use port-forward for local access
kubectl port-forward svc/argocd-server -n argocd 8080:443 &
argocd login localhost:8080 --insecure --username admin --password <password>
```

## Listing Available Actions

Before executing an action, list what actions are available for a specific resource:

```bash
# List actions for all resources of a kind in an application
argocd app actions list <app-name> --kind <Kind>

# Example: List actions for Deployments in my-app
argocd app actions list my-app --kind Deployment

# List actions for a specific resource
argocd app actions list my-app --kind Deployment --resource-name my-deployment

# List actions for a resource in a specific namespace
argocd app actions list my-app --kind Deployment --resource-name my-deployment --namespace production

# List actions for a specific API group
argocd app actions list my-app --kind Rollout --group argoproj.io
```

Example output:

```
NAME          DISABLED
restart       false
scale-up      false
scale-down    false
```

## Executing Actions

The basic syntax for running an action is:

```bash
argocd app actions run <app-name> <action-name> --kind <Kind> --resource-name <name>
```

### Basic Examples

```bash
# Restart a Deployment
argocd app actions run my-app restart --kind Deployment --resource-name my-deployment

# Scale up a Deployment
argocd app actions run my-app scale-up --kind Deployment --resource-name my-deployment

# Promote an Argo Rollout
argocd app actions run my-app resume --kind Rollout --resource-name my-rollout --group argoproj.io

# Abort an Argo Rollout
argocd app actions run my-app abort --kind Rollout --resource-name my-rollout --group argoproj.io
```

### Specifying Namespace

When an application manages resources across multiple namespaces, specify the namespace:

```bash
argocd app actions run my-app restart \
  --kind Deployment \
  --resource-name api-server \
  --namespace production
```

### Specifying API Group

For CRDs that are not in the default API groups, specify the group:

```bash
# For Argo Rollouts (argoproj.io group)
argocd app actions run my-app promote-full \
  --kind Rollout \
  --group argoproj.io \
  --resource-name my-rollout

# For a custom CRD
argocd app actions run my-app create-backup \
  --kind PostgreSQL \
  --group databases.example.com \
  --resource-name main-db
```

## Scripting with Actions

### Restart All Deployments in an Application

```bash
#!/bin/bash
# restart-all-deployments.sh
APP_NAME=$1

if [ -z "$APP_NAME" ]; then
  echo "Usage: $0 <app-name>"
  exit 1
fi

# Get all Deployment resources
DEPLOYMENTS=$(argocd app resources "$APP_NAME" -o json | \
  jq -r '.[] | select(.kind == "Deployment") | .name')

for dep in $DEPLOYMENTS; do
  echo "Restarting deployment: $dep"
  argocd app actions run "$APP_NAME" restart \
    --kind Deployment \
    --resource-name "$dep"
  echo "  Done"
done

echo "All deployments restarted"
```

### Conditional Action Based on Health

```bash
#!/bin/bash
# auto-restart-degraded.sh
# Restart deployments that are in Degraded health

APP_NAME=$1

DEGRADED=$(argocd app resources "$APP_NAME" -o json | \
  jq -r '.[] | select(.kind == "Deployment" and .health.status == "Degraded") | .name')

if [ -z "$DEGRADED" ]; then
  echo "No degraded deployments found"
  exit 0
fi

for dep in $DEGRADED; do
  echo "Restarting degraded deployment: $dep"
  argocd app actions run "$APP_NAME" restart \
    --kind Deployment \
    --resource-name "$dep"
done
```

### Scale Based on Time of Day

```bash
#!/bin/bash
# time-based-scaling.sh
APP_NAME=$1
DEPLOYMENT_NAME=$2

HOUR=$(date +%H)

if [ "$HOUR" -ge 8 ] && [ "$HOUR" -lt 20 ]; then
  echo "Business hours - scaling to 5 replicas"
  ACTION="scale-to-5"
else
  echo "Off hours - scaling to 2 replicas"
  ACTION="scale-to-2"
fi

argocd app actions run "$APP_NAME" "$ACTION" \
  --kind Deployment \
  --resource-name "$DEPLOYMENT_NAME"
```

## Integration with CI/CD Pipelines

### GitHub Actions Example

```yaml
# .github/workflows/promote-rollout.yml
name: Promote Rollout
on:
  workflow_dispatch:
    inputs:
      app_name:
        description: 'ArgoCD Application name'
        required: true
      rollout_name:
        description: 'Rollout resource name'
        required: true

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - name: Install ArgoCD CLI
        run: |
          curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x argocd
          sudo mv argocd /usr/local/bin/

      - name: Login to ArgoCD
        run: |
          argocd login ${{ secrets.ARGOCD_SERVER }} \
            --username ${{ secrets.ARGOCD_USER }} \
            --password ${{ secrets.ARGOCD_PASSWORD }} \
            --insecure

      - name: Promote Rollout
        run: |
          argocd app actions run ${{ github.event.inputs.app_name }} resume \
            --kind Rollout \
            --group argoproj.io \
            --resource-name ${{ github.event.inputs.rollout_name }}

      - name: Wait for Healthy
        run: |
          argocd app wait ${{ github.event.inputs.app_name }} \
            --health \
            --timeout 300
```

### GitLab CI Example

```yaml
# .gitlab-ci.yml
promote-canary:
  stage: deploy
  image: argoproj/argocd:latest
  script:
    - argocd login $ARGOCD_SERVER --username $ARGOCD_USER --password $ARGOCD_PASSWORD --insecure
    - argocd app actions run $APP_NAME resume --kind Rollout --group argoproj.io --resource-name $ROLLOUT_NAME
    - argocd app wait $APP_NAME --health --timeout 300
  when: manual
  only:
    - main
```

## Using the ArgoCD API Directly

For more advanced automation, you can use the ArgoCD REST API instead of the CLI:

```bash
# Get an auth token
TOKEN=$(curl -s "https://argocd.example.com/api/v1/session" \
  -d '{"username":"admin","password":"'$ARGOCD_PASSWORD'"}' | jq -r '.token')

# List actions
curl -s "https://argocd.example.com/api/v1/applications/my-app/resource/actions?namespace=production&resourceName=my-deployment&kind=Deployment&group=apps" \
  -H "Authorization: Bearer $TOKEN" | jq

# Execute an action
curl -X POST "https://argocd.example.com/api/v1/applications/my-app/resource/actions?namespace=production&resourceName=my-deployment&kind=Deployment&group=apps&action=restart" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

## Error Handling in Scripts

Always handle errors when scripting with actions:

```bash
#!/bin/bash
set -e

APP_NAME=$1
ACTION=$2
RESOURCE=$3

# Verify the action exists
ACTIONS=$(argocd app actions list "$APP_NAME" --kind Deployment --resource-name "$RESOURCE" -o json 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to list actions for $RESOURCE in $APP_NAME"
  exit 1
fi

ACTION_EXISTS=$(echo "$ACTIONS" | jq -r ".[] | select(.name == \"$ACTION\") | .name")
if [ -z "$ACTION_EXISTS" ]; then
  echo "ERROR: Action '$ACTION' not found for $RESOURCE"
  exit 1
fi

DISABLED=$(echo "$ACTIONS" | jq -r ".[] | select(.name == \"$ACTION\") | .disabled")
if [ "$DISABLED" = "true" ]; then
  echo "ERROR: Action '$ACTION' is disabled for $RESOURCE"
  exit 1
fi

# Execute the action
echo "Executing $ACTION on $RESOURCE in $APP_NAME..."
if argocd app actions run "$APP_NAME" "$ACTION" --kind Deployment --resource-name "$RESOURCE"; then
  echo "Action executed successfully"
else
  echo "ERROR: Action execution failed"
  exit 1
fi

# Wait for the resource to be healthy
echo "Waiting for resource to become healthy..."
argocd app wait "$APP_NAME" --health --timeout 120
```

## Combining Actions with Wait

After executing an action, you often want to wait for the result:

```bash
# Restart and wait for healthy
argocd app actions run my-app restart \
  --kind Deployment \
  --resource-name my-deployment

argocd app wait my-app --health --timeout 120
echo "Deployment is healthy after restart"
```

The CLI gives you full programmatic control over resource actions. This makes it ideal for runbooks, incident response scripts, and CI/CD integrations where manual UI interaction is not practical. For the UI workflow, see [how to execute resource actions from the ArgoCD UI](https://oneuptime.com/blog/post/2026-02-26-argocd-resource-actions-ui/view). For writing the actions themselves, check out [how to configure custom resource actions in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-custom-resource-actions/view).

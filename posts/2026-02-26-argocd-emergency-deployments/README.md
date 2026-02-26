# How to Handle Emergency Deployments Bypassing Normal Flow

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Emergency Deployment, Incident Response

Description: Learn how to handle emergency deployments with ArgoCD that bypass normal GitOps flow while maintaining auditability and control during production incidents.

---

When production is on fire, you do not have time for code reviews and CI pipelines. You need to deploy a fix immediately. But ArgoCD's GitOps model requires changes to go through Git first. This creates tension between speed and process. The good news is that ArgoCD provides several mechanisms for emergency deployments that maintain auditability while getting fixes out fast.

This guide covers strategies for handling emergency deployments with ArgoCD during production incidents.

## The Emergency Deployment Challenge

In a standard GitOps workflow, a deployment follows this path:

1. Developer pushes code
2. CI builds and tests
3. PR review and approval
4. Merge to main
5. ArgoCD syncs the change

This process typically takes 30 minutes to 2 hours. During an active incident, every minute counts. You need a way to deploy in under 5 minutes while still maintaining a record of what changed and why.

## Strategy 1: Fast-Track Git Workflow

The simplest approach is to streamline your Git workflow for emergencies:

```bash
#!/bin/bash
# emergency-deploy.sh
# Usage: ./emergency-deploy.sh <service-name> <image-tag> <jira-ticket>

SERVICE=$1
IMAGE_TAG=$2
TICKET=$3

echo "EMERGENCY DEPLOYMENT: $SERVICE to $IMAGE_TAG"
echo "Ticket: $TICKET"

# Clone the deployment repo
git clone --depth 1 https://github.com/myorg/deployments.git /tmp/emergency-deploy
cd /tmp/emergency-deploy

# Create an emergency branch
git checkout -b "emergency/$SERVICE-$TICKET"

# Update the image tag
yq eval ".spec.template.spec.containers[0].image = \"myregistry/$SERVICE:$IMAGE_TAG\"" \
  -i "apps/$SERVICE/deployment.yaml"

# Commit with emergency marker
git add .
git commit -m "EMERGENCY: Update $SERVICE to $IMAGE_TAG

Ticket: $TICKET
Approved by: oncall engineer
Reason: Production incident - see incident channel"

# Push and create PR (auto-merge)
git push origin "emergency/$SERVICE-$TICKET"
gh pr create --title "EMERGENCY: $SERVICE to $IMAGE_TAG ($TICKET)" \
  --body "Emergency deployment during active incident. Post-incident review required." \
  --label emergency

# Auto-merge the PR (requires repo settings to allow)
gh pr merge --auto --squash

echo "Emergency PR created. ArgoCD will sync within $(argocd app get $SERVICE --output json | jq -r '.spec.source.targetRevision') seconds"
```

## Strategy 2: Direct Sync to a Specific Image

ArgoCD allows parameter overrides during sync without modifying Git:

```bash
# Override the image tag for an immediate deployment
argocd app set api-server \
  --kustomize-image myregistry/api=myregistry/api:hotfix-v1.2.3

# Trigger immediate sync
argocd app sync api-server

# Verify the deployment
argocd app wait api-server --health
```

This deploys the fix immediately. The application will show as "OutOfSync" because Git does not match the live state. After the incident, you update Git to match:

```bash
# Post-incident: update Git to match the live state
cd deployments
# Update the image tag in the deployment manifest
git add . && git commit -m "Post-incident: match emergency deployment of api-server hotfix-v1.2.3"
git push origin main
```

## Strategy 3: Emergency ArgoCD Project

Create a dedicated project that bypasses sync windows and approval gates:

```yaml
# emergency-project.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: emergency
  namespace: argocd
spec:
  description: Emergency deployments - bypasses all sync windows
  sourceRepos:
    - '*'
  destinations:
    - namespace: '*'
      server: '*'
  # No sync windows
  # Strict RBAC - only oncall team
  roles:
    - name: incident-commander
      description: Can perform emergency deployments
      policies:
        - p, proj:emergency:incident-commander, applications, *, emergency/*, allow
      groups:
        - oncall-team
        - sre-leads
```

During an incident, temporarily reassign the application:

```bash
# Move to emergency project
argocd app set api-server --project emergency

# Deploy the fix
argocd app sync api-server --force

# After incident, move back
argocd app set api-server --project production
```

## Strategy 4: Kubectl Apply with ArgoCD Reconciliation

For the fastest possible fix, apply directly with kubectl and let ArgoCD reconcile later:

```bash
# Directly update the deployment image
kubectl set image deployment/api-server \
  api=myregistry/api:hotfix-v1.2.3 \
  -n production

# Verify pods are rolling out
kubectl rollout status deployment/api-server -n production
```

ArgoCD will detect the drift and mark the application as "OutOfSync". With `selfHeal: true`, it would revert your change, so you need to either:

1. Temporarily disable self-heal:
```bash
argocd app set api-server --self-heal=false
```

2. Or update Git quickly to match:
```bash
# Update Git to prevent ArgoCD from reverting
cd deployments
# ... update manifest ...
git push origin main
```

## Strategy 5: Pre-Built Emergency Rollback

Maintain a known-good version you can quickly roll back to:

```yaml
# emergency-rollback-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-server-rollback
  namespace: argocd
  annotations:
    description: "Emergency rollback - syncs to last known good version"
spec:
  project: emergency
  source:
    repoURL: https://github.com/myorg/deployments.git
    targetRevision: last-known-good  # Tag updated after each successful deployment
    path: apps/api-server
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated: false  # Manual trigger only
```

To roll back during an incident:

```bash
# One-command rollback to last known good version
argocd app sync api-server-rollback
```

## Setting Up the Emergency Tooling

Create a comprehensive emergency deployment toolkit:

```yaml
# emergency-toolkit configmap
apiVersion: v1
kind: ConfigMap
metadata:
  name: emergency-procedures
  namespace: argocd
data:
  rollback.sh: |
    #!/bin/bash
    APP=$1
    # Roll back to previous revision
    PREV_REV=$(argocd app history $APP --output json | jq -r '.[1].revision')
    argocd app sync $APP --revision $PREV_REV
    echo "Rolled back $APP to revision $PREV_REV"

  scale-up.sh: |
    #!/bin/bash
    APP=$1
    REPLICAS=$2
    kubectl scale deployment/$APP --replicas=$REPLICAS -n production
    echo "Scaled $APP to $REPLICAS replicas"

  disable-autosync.sh: |
    #!/bin/bash
    APP=$1
    argocd app set $APP --sync-policy none
    echo "Disabled auto-sync for $APP"
```

## Post-Incident Reconciliation

After every emergency deployment, you need to reconcile Git with the live state:

```bash
#!/bin/bash
# post-incident-reconcile.sh

# 1. Check what is out of sync
argocd app list --output json | \
  jq -r '.[] | select(.status.sync.status == "OutOfSync") | .metadata.name'

# 2. For each out-of-sync app, update Git to match live
for app in $(argocd app list --output json | jq -r '.[] | select(.status.sync.status == "OutOfSync") | .metadata.name'); do
  echo "Reconciling: $app"

  # Get the live manifests
  argocd app manifests $app --source live > "/tmp/$app-live.yaml"

  # Compare with desired
  argocd app diff $app

  # Prompt for action
  read -p "Update Git for $app? (y/n): " confirm
  if [ "$confirm" = "y" ]; then
    # Update Git repository
    echo "Update the Git repository for $app"
  fi
done

# 3. Re-enable auto-sync if it was disabled
for app in $(argocd app list --output json | jq -r '.[].metadata.name'); do
  argocd app set $app --sync-policy automated
done

# 4. Re-enable self-heal
for app in $(argocd app list --output json | jq -r '.[].metadata.name'); do
  argocd app set $app --self-heal
done
```

## RBAC for Emergency Access

Lock down emergency capabilities with proper RBAC:

```yaml
# argocd-rbac-cm
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Regular developers can sync their own apps
    p, role:developer, applications, sync, production/*, allow

    # SREs can override and force sync
    p, role:sre, applications, sync, */*, allow
    p, role:sre, applications, override, */*, allow

    # Only oncall can use emergency project
    p, role:oncall, applications, *, emergency/*, allow
    p, role:oncall, applications, update, production/*, allow

    # Bind roles to groups
    g, developers, role:developer
    g, sre-team, role:sre
    g, oncall-rotation, role:oncall
```

## Audit Trail

Every emergency deployment should leave a clear audit trail:

```bash
# Log the emergency deployment
cat >> /tmp/incident-log.md << EOF
## Emergency Deployment
- Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- Service: api-server
- Previous version: v1.2.2
- New version: hotfix-v1.2.3
- Deployed by: $(whoami)
- Incident ticket: INC-12345
- Method: ArgoCD parameter override
- Git reconciled: pending
EOF
```

## Best Practices

1. **Document your emergency process** - Write it down before you need it. During an incident is not the time to figure out the process.

2. **Practice emergency deployments** - Run game days where you simulate incidents and practice the emergency deployment flow.

3. **Always reconcile Git after** - Emergency deployments that are not reflected in Git will cause confusion and potential reverts.

4. **Use RBAC to control access** - Not everyone should be able to perform emergency deployments. Limit it to oncall and SRE teams.

5. **Automate the common cases** - Pre-built rollback scripts and emergency deployment scripts save critical minutes during incidents.

6. **Review every emergency deployment** - In the post-incident review, examine whether the emergency process worked and how it can be improved.

Emergency deployments with ArgoCD require balancing speed with control. The strategies in this guide give you options ranging from fast-tracked Git workflows to direct overrides, each with appropriate audit trails. The key is having these processes documented and practiced before you need them.

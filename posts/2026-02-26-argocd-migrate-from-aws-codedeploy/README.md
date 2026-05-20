# How to Migrate from AWS CodeDeploy to ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, AWS, Migration

Description: A complete guide to migrating your Kubernetes deployments from AWS CodeDeploy to ArgoCD, including appspec conversion, deployment strategy mapping, and CI/CD integration.

---

AWS CodeDeploy is Amazon's deployment service that works across EC2, Lambda, and ECS. If your team has moved to Kubernetes and is still using CodeDeploy through EC2 scripts, ECS services, or a CodePipeline stage, switching to ArgoCD gives you a Kubernetes-native GitOps workflow that is simpler, more transparent, and not locked to AWS.

This guide walks you through replacing CodeDeploy with ArgoCD for Kubernetes workloads.

## Why Move from CodeDeploy to ArgoCD

CodeDeploy does not natively deploy Kubernetes resources. Even with ECS support, it adds complexity when you are moving workloads to EKS:

- CodeDeploy requires an agent on EC2 or tight ECS integration - neither is natural for Kubernetes
- AppSpec files are CodeDeploy-specific and do not translate to other platforms
- Deployment visibility is centered around AWS deployment records rather than live Kubernetes resources
- No continuous drift detection - CodeDeploy does not reconcile the cluster if someone changes it manually
- ArgoCD is Kubernetes-native - it understands Deployments, StatefulSets, CRDs, and everything else natively

## Architecture Comparison

```mermaid
graph TB
    subgraph CodeDeploy Flow
        A[Git Push] --> B[CodePipeline]
        B --> C[CodeBuild]
        C --> D[CodeDeploy]
        D --> E[EC2 or ECS targets]
    end
    subgraph ArgoCD Flow
        F[Git Push] --> G[ArgoCD detects change]
        G --> H[ArgoCD syncs to EKS cluster]
    end
```

The ArgoCD flow is simpler because it cuts CodeDeploy out of the deployment path. Your Git repository becomes the desired state, while CI still builds artifacts and updates manifests.

## Step 1: Understand What CodeDeploy Is Doing

Examine your CodeDeploy setup:

```bash
# List CodeDeploy applications

aws deploy list-applications

# Get deployment group details
aws deploy get-deployment-group \
  --application-name my-app \
  --deployment-group-name my-deployment-group

# Check recent deployments
aws deploy list-deployments \
  --application-name my-app \
  --deployment-group-name my-deployment-group \
  --max-items 10
```

Look at your `appspec.yml`:

```yaml
# Typical CodeDeploy appspec.yml for ECS
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: "arn:aws:ecs:us-east-1:123456789:task-definition/my-app:5"
        LoadBalancerInfo:
          ContainerName: "my-app"
          ContainerPort: 8080
Hooks:
  - BeforeInstall: "BeforeInstallHookFunctionName"
  - AfterInstall: "AfterInstallHookFunctionName"
  - AfterAllowTestTraffic: "AfterAllowTestTrafficHookFunctionName"
  - BeforeAllowTraffic: "BeforeAllowTrafficHookFunctionName"
  - AfterAllowTraffic: "AfterAllowTrafficHookFunctionName"
```

## Step 2: Convert Your Manifests to Kubernetes-Native Format

If you are on ECS, you need to convert task definitions to Kubernetes manifests. If you are already on EKS and CodeDeploy or CodeBuild is running scripts that apply manifests, your manifests may already exist.

```yaml
# Kubernetes Deployment equivalent
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: 123456789.dkr.ecr.us-east-1.amazonaws.com/my-app:v1.5.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: production
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

## Step 3: Set Up Your Git Repository Structure

Organize manifests for ArgoCD:

```text
my-app-k8s/
  base/
    deployment.yaml
    service.yaml
    configmap.yaml
    kustomization.yaml
  overlays/
    dev/
      kustomization.yaml
      patches/
        replicas.yaml
    staging/
      kustomization.yaml
    production/
      kustomization.yaml
      patches/
        replicas.yaml
        resources.yaml
```

The base `kustomization.yaml`:

```yaml
apiVersion: kustomize.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
```

Production overlay:

```yaml
apiVersion: kustomize.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - path: patches/replicas.yaml
  - path: patches/resources.yaml
namespace: production
```

## Step 4: Install ArgoCD on EKS

```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Expose via LoadBalancer (for initial setup)
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'

# Get the initial password
argocd admin initial-password -n argocd
```

For production, use an Ingress with TLS instead of a LoadBalancer. See our post on [ArgoCD with AWS EKS best practices](https://oneuptime.com/blog/post/2026-02-26-argocd-aws-eks-best-practices/view) for more details.

## Step 5: Map CodeDeploy Hooks to ArgoCD Hooks

CodeDeploy hooks translate approximately to ArgoCD sync phases and, for progressive delivery, Argo Rollouts analysis:

| CodeDeploy Hook | ArgoCD Equivalent |
|---|---|
| BeforeInstall | PreSync hook |
| AfterInstall | Sync hook or sync wave |
| AfterAllowTestTraffic | AnalysisRun or PostSync hook |
| BeforeAllowTraffic | Argo Rollouts pre-promotion analysis or manual promotion gate |
| AfterAllowTraffic | Argo Rollouts post-promotion analysis or PostSync hook |

Convert your CodeDeploy Lambda hook logic or EC2 hook scripts to Kubernetes Jobs:

```yaml
# Before-install script becomes a PreSync Job
apiVersion: batch/v1
kind: Job
metadata:
  name: pre-deploy-check
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: check
          image: 123456789.dkr.ecr.us-east-1.amazonaws.com/deploy-tools:latest
          command:
            - /bin/sh
            - -c
            - |
              echo "Running pre-deployment checks..."
              # Your before_install.sh logic here
              ./scripts/check-dependencies.sh
              ./scripts/validate-config.sh
      restartPolicy: Never
  backoffLimit: 1

---
# After-deploy smoke test becomes a PostSync Job
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: test
          image: 123456789.dkr.ecr.us-east-1.amazonaws.com/smoke-tests:latest
          command:
            - /bin/sh
            - -c
            - |
              echo "Running smoke tests..."
              curl -f http://my-app.production.svc.cluster.local/health
              ./scripts/run-smoke-tests.sh
      restartPolicy: Never
  backoffLimit: 1
```

## Step 6: Map Deployment Strategies

CodeDeploy supports in-place deployments for EC2/on-premises and blue-green deployments with all-at-once, linear, or canary traffic shifting for ECS and Lambda. Here is how each pattern maps:

**Rolling (In-Place)** - Use a standard Kubernetes Deployment:

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
```

**Blue-Green** - Use Argo Rollouts after installing the Rollouts controller and CRDs:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
spec:
  replicas: 3
  strategy:
    blueGreen:
      activeService: my-app-active
      previewService: my-app-preview
      autoPromotionEnabled: false
      prePromotionAnalysis:
        templates:
          - templateName: smoke-test
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: 123456789.dkr.ecr.us-east-1.amazonaws.com/my-app:v1.5.0
```

**Canary** - Also use Argo Rollouts after installing the Rollouts controller and CRDs:

```yaml
spec:
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: {duration: 5m}
        - setWeight: 30
        - pause: {duration: 5m}
        - setWeight: 60
        - pause: {duration: 5m}
```

## Step 7: Create the ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/my-app-k8s.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Step 8: Update Your CI Pipeline

Your CI pipeline (CodeBuild, GitHub Actions, etc.) no longer needs to call CodeDeploy. Instead, it updates the Git repository:

```yaml
# GitHub Actions example - CI only, no CD
name: Build and Update Manifest
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and push image
        run: |
          docker build -t $ECR_REPO:${{ github.sha }} .
          docker push $ECR_REPO:${{ github.sha }}
      - name: Update Kubernetes manifest
        run: |
          # Update image tag in the config repo
          cd my-app-k8s
          kustomize edit set image my-app=$ECR_REPO:${{ github.sha }}
          git add .
          git commit -m "Update image to ${{ github.sha }}"
          git push
```

ArgoCD detects the Git change and deploys automatically.

## Step 9: Decommission CodeDeploy

Once all services are migrated:

```bash
# Delete CodeDeploy deployment groups
aws deploy delete-deployment-group \
  --application-name my-app \
  --deployment-group-name my-deployment-group

# Delete the CodeDeploy application
aws deploy delete-application --application-name my-app

# Remove CodeDeploy IAM roles if no longer needed
aws iam delete-role --role-name CodeDeployServiceRole
```

Also clean up any CodePipeline stages that referenced CodeDeploy.

## Conclusion

Moving from AWS CodeDeploy to ArgoCD simplifies your deployment pipeline significantly. Instead of a chain of AWS services (CodePipeline to CodeBuild to CodeDeploy), you get a single GitOps controller that watches your repository and keeps your cluster in sync. The migration is straightforward - convert your manifests, map your hooks, and let ArgoCD take over one service at a time.

For end-to-end monitoring of your Kubernetes deployments after migration, check out [OneUptime](https://oneuptime.com) for unified observability and alerting.

# How to Migrate from Jenkins CD to Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Jenkins, Migration, Continuous Deployment, GitOps, Kubernetes

Description: A practical guide to migrating your continuous deployment pipelines from Jenkins to Flux CD using GitOps principles.

---

Moving from Jenkins CD to Flux CD means shifting from an imperative, push-based deployment model to a declarative, pull-based GitOps workflow. This guide walks through the migration step by step, covering how to translate Jenkins pipelines into Flux CD resources while maintaining deployment continuity.

## Why Migrate from Jenkins to Flux CD

Jenkins has served teams well for years, but its CD capabilities for Kubernetes have limitations. Jenkins pipelines require explicit kubectl or helm commands, credentials management, and custom scripts. Flux CD, on the other hand, continuously reconciles the desired state from Git with the actual cluster state, eliminating the need for imperative deployment scripts.

Key benefits of moving to Flux CD include:

- No need to manage kubeconfig credentials in a CI system
- Automatic drift detection and correction
- Native Kubernetes integration with custom resources
- Reduced pipeline complexity since deployment logic lives in Git

## Understanding the Mapping

Before migrating, understand how Jenkins concepts map to Flux CD.

| Jenkins Concept | Flux CD Equivalent |
|---|---|
| Jenkinsfile pipeline | GitRepository + Kustomization |
| Helm deploy step | HelmRelease + HelmRepository |
| kubectl apply step | Kustomization pointing to manifests |
| Environment branches | Kustomization per environment |
| Jenkins credentials | Kubernetes Secrets + SOPS |
| Build triggers | GitRepository polling interval |

## Step 1: Install Flux CD in Your Cluster

Start by installing Flux CD alongside your existing Jenkins-managed deployments.

```bash
# Install the Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Bootstrap Flux into your cluster with your Git repository
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal
```

This creates the Flux controllers in the `flux-system` namespace and sets up the Git repository connection.

## Step 2: Translate Jenkins Helm Deployments

A typical Jenkins pipeline for Helm deployments looks like this:

```groovy
// Jenkinsfile - existing Helm deployment
pipeline {
    agent any
    stages {
        stage('Deploy') {
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
                    sh '''
                        helm repo add myrepo https://charts.example.com
                        helm upgrade --install my-app myrepo/my-app \
                            --namespace production \
                            --set image.tag=${BUILD_NUMBER} \
                            --values values-production.yaml
                    '''
                }
            }
        }
    }
}
```

Convert this to Flux CD resources:

```yaml
# clusters/production/sources/helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: myrepo
  namespace: flux-system
spec:
  # URL matching the helm repo add command from Jenkins
  url: https://charts.example.com
  interval: 10m
```

```yaml
# clusters/production/releases/my-app.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Target namespace for the release
  targetNamespace: production
  chart:
    spec:
      chart: my-app
      # Pin to a specific version or use semver range
      version: ">=1.0.0"
      sourceRef:
        kind: HelmRepository
        name: myrepo
  values:
    # Values that were previously in values-production.yaml
    replicaCount: 3
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
  # Equivalent to helm upgrade --install behavior
  install:
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
```

## Step 3: Translate Jenkins kubectl Deployments

If your Jenkins pipeline uses raw kubectl commands:

```groovy
// Jenkinsfile - existing kubectl deployment
pipeline {
    agent any
    stages {
        stage('Deploy') {
            steps {
                sh 'kubectl apply -f k8s/production/ --namespace production'
            }
        }
    }
}
```

Convert this to a Flux Kustomization:

```yaml
# clusters/production/apps/my-service.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-service
  namespace: flux-system
spec:
  interval: 5m
  # Path to the manifests in your Git repository
  path: ./k8s/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Target namespace if not specified in manifests
  targetNamespace: production
  # Wait for resources to be ready before marking as reconciled
  wait: true
  timeout: 5m
```

## Step 4: Handle Image Updates

Jenkins typically builds images and updates tags inline. With Flux CD, use Image Automation to achieve the same result.

```yaml
# clusters/production/image-automation/my-app-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # Container registry where Jenkins pushes images
  image: registry.example.com/my-app
  interval: 1m
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  # Select the latest image by build number, similar to Jenkins BUILD_NUMBER
  policy:
    numerical:
      order: asc
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxcdbot
        email: flux@example.com
      messageTemplate: "Update image to {{range .Changed.Changes}}{{.NewValue}}{{end}}"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

Then add markers in your deployment manifests:

```yaml
# k8s/production/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          # {"$imagepolicy": "flux-system:my-app"}
          image: registry.example.com/my-app:1.0.0
```

## Step 5: Migrate Secrets Management

Jenkins stores credentials in its credential store. Flux CD uses Kubernetes Secrets, optionally encrypted with SOPS or Sealed Secrets.

```bash
# Install SOPS and age for secret encryption
brew install sops age

# Generate an age key
age-keygen -o age.agekey

# Create the SOPS secret in the cluster
cat age.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin
```

Create a `.sops.yaml` configuration:

```yaml
# .sops.yaml at repository root
creation_rules:
  - path_regex: .*\.encrypted\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Encrypt your secrets:

```bash
# Encrypt a secret file
sops --encrypt --in-place clusters/production/secrets/db-credentials.encrypted.yaml
```

Configure Flux to decrypt secrets:

```yaml
# clusters/production/apps/my-service.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-service
  namespace: flux-system
spec:
  interval: 5m
  path: ./k8s/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Enable SOPS decryption
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Step 6: Parallel Running Period

Run Jenkins and Flux CD side by side during migration. Migrate one application at a time.

```yaml
# clusters/production/kustomization.yaml
# Gradually add applications as you migrate them from Jenkins
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  # Already migrated
  - apps/service-a.yaml
  - apps/service-b.yaml
  # Still managed by Jenkins:
  # - apps/service-c.yaml  (uncomment when ready)
  # - apps/service-d.yaml  (uncomment when ready)
```

## Step 7: Disable Jenkins Jobs After Verification

After confirming Flux CD is reconciling correctly, disable the corresponding Jenkins jobs.

```bash
# Verify Flux reconciliation status
flux get kustomizations
flux get helmreleases -A

# Check that resources are healthy
flux get kustomizations --status-selector ready=true
```

Once all applications are migrated and verified, you can decommission the Jenkins CD pipelines. Keep Jenkins for CI (building and testing) and let Flux CD handle the deployment side.

## Handling Rollbacks

In Jenkins, rollbacks meant re-running an older build. With Flux CD, rollbacks are Git reverts:

```bash
# Revert the last commit that changed a deployment
git revert HEAD
git push origin main

# Flux automatically reconciles to the previous state
# Monitor the rollback
flux get kustomizations --watch
```

## Monitoring the Migration

Set up alerts to monitor Flux CD during and after migration:

```yaml
# clusters/production/notifications/alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: deployment-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: deployments
  secretRef:
    name: slack-webhook-url
```

## Summary

Migrating from Jenkins CD to Flux CD involves translating imperative pipeline steps into declarative Flux resources. The key steps are: install Flux alongside Jenkins, convert Helm and kubectl deployments to HelmRelease and Kustomization resources, set up image automation to replace Jenkins build triggers, migrate secrets to SOPS or Sealed Secrets, run both systems in parallel, and gradually disable Jenkins jobs as each application is verified under Flux management.

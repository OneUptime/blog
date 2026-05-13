# How to Deploy Jenkins Controller with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Jenkins, CI/CD, Automation

Description: Deploy the Jenkins CI/CD controller on Kubernetes using Flux CD HelmRelease with pre-configured plugins and agents managed through Git.

---

## Introduction

Jenkins remains one of the most widely adopted CI/CD platforms in the world, with a rich plugin ecosystem that integrates with virtually every tool in the DevOps landscape. Running Jenkins on Kubernetes-using ephemeral pod-based agents-eliminates static build servers, reduces cost, and scales build capacity on demand.

Flux CD turns the Jenkins deployment itself into a GitOps workflow. The Jenkins Configuration as Code (JCasC) plugin lets you declare Jenkins settings-credentials, agent templates, job DSL-in YAML files stored in Git. Flux watches for changes and keeps the cluster in sync, meaning Jenkins configuration declared in JCasC is reapplied automatically.

This guide uses the official `jenkins` Helm chart, configures JCasC through Helm values, and wires everything through Flux CD.

## Prerequisites

- Kubernetes cluster (v1.26+) with Flux CD bootstrapped
- Persistent storage available (ReadWriteOnce)
- An Ingress controller installed
- `flux` and `kubectl` CLIs configured

## Step 1: Create Namespace and Secrets

```bash
kubectl create namespace jenkins

# Admin credentials (use Sealed Secrets in production)

kubectl create secret generic jenkins-admin-secret \
  --namespace jenkins \
  --from-literal=jenkins-admin-user=admin \
  --from-literal=jenkins-admin-password=changeme123
```

## Step 2: Register the Jenkins Helm Repository

```yaml
# clusters/my-cluster/jenkins/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jenkins
  namespace: flux-system
spec:
  url: https://charts.jenkins.io
  interval: 12h
```

## Step 3: Create the HelmRelease

```yaml
# clusters/my-cluster/jenkins/jenkins-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: jenkins
  namespace: jenkins
spec:
  interval: 10m
  chart:
    spec:
      chart: jenkins
      version: ">=5.0.0 <6.0.0"
      sourceRef:
        kind: HelmRepository
        name: jenkins
        namespace: flux-system
  values:
    controller:
      # Use the LTS Jenkins image
      image:
        repository: jenkins/jenkins
        tag: lts-jdk17

      # Reference the pre-created admin secret
      admin:
        createSecret: true
        existingSecret: jenkins-admin-secret
        userKey: jenkins-admin-user
        passwordKey: jenkins-admin-password

      # Run builds on Kubernetes agents, not the controller
      numExecutors: 0

      # Pre-install plugins declaratively
      installPlugins:
        - kubernetes:latest
        - workflow-aggregator:latest
        - git:latest
        - configuration-as-code:latest
        - job-dsl:latest
        - blueocean:latest

      # Jenkins Configuration as Code (JCasC)
      JCasC:
        defaultConfig: true

      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: "2"
          memory: 3Gi

      ingress:
        enabled: true
        ingressClassName: nginx
        hostName: jenkins.example.com
        annotations:
          nginx.ingress.kubernetes.io/proxy-body-size: "50m"

    persistence:
      enabled: true
      size: 30Gi

    agent:
      # Add a static pod template to the chart-generated Kubernetes cloud
      podTemplates:
        default: |
          - name: "default"
            label: "k8s-agent"
            containers:
              - name: "jnlp"
                image: "jenkins/inbound-agent:latest"
                resourceRequestCpu: "100m"
                resourceRequestMemory: "256Mi"
                resourceLimitCpu: "500m"
                resourceLimitMemory: "512Mi"

    # RBAC for the Kubernetes plugin to spawn agent pods
    rbac:
      create: true

    serviceAccount:
      create: true
      name: jenkins
```

## Step 4: Create the Kustomization

```yaml
# clusters/my-cluster/jenkins/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: jenkins
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/jenkins
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: jenkins
      namespace: jenkins
```

## Step 5: Verify and Access Jenkins

```bash
# Watch Flux reconcile
flux get helmreleases -n jenkins --watch

# Wait for Jenkins to be ready
kubectl rollout status statefulset/jenkins -n jenkins

# Check Jenkins logs for startup progress
kubectl logs -n jenkins -l app.kubernetes.io/name=jenkins -c jenkins -f
```

Navigate to `https://jenkins.example.com`. Jenkins should load with the JCasC configuration already applied-no manual plugin installation or cloud configuration required.

## Step 6: Run a Test Pipeline

Create a `Jenkinsfile` in any repository:

```groovy
pipeline {
  agent { label 'k8s-agent' }
  stages {
    stage('Build') {
      steps {
        sh 'echo "Building on Kubernetes agent via Flux CD!"'
      }
    }
  }
}
```

Trigger the pipeline and watch an agent pod spin up in the `jenkins` namespace.

## Best Practices

- Use JCasC for all Jenkins configuration; avoid clicking through the UI for settings that should be reproducible.
- Store Jenkins credentials (GitHub tokens, Docker Hub passwords) as Kubernetes secrets mounted through `controller.existingSecret` or `controller.additionalExistingSecrets`, then reference the mounted keys in JCasC with `${KEY_NAME}` or `${SECRET_NAME-KEY_NAME}` syntax.
- Pin plugin versions in `installPlugins` using explicit version numbers instead of `latest` to ensure repeatable builds.
- Configure `controller.numExecutors: 0` so the controller never runs builds directly-use pod agents exclusively.
- Enable `controller.prometheus.enabled: true` and scrape Jenkins metrics with your existing Prometheus stack.

## Conclusion

Jenkins is now deployed on Kubernetes and fully managed by Flux CD. JCasC ensures that Jenkins configuration is declarative and version-controlled alongside your fleet manifests. When you need to add a plugin, change an agent template, or update the chart version, open a pull request and let Flux handle the rest.

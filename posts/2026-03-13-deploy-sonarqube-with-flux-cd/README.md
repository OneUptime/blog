# How to Deploy SonarQube with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, SonarQube, Code Quality, DevOps

Description: Deploy SonarQube code quality analysis server to Kubernetes using Flux CD HelmRelease for automated, GitOps-driven continuous inspection.

---

## Introduction

SonarQube is the leading open-source platform for continuous inspection of code quality. It performs static analysis across 30+ programming languages, detecting bugs, vulnerabilities, and code smells before they reach production. Running SonarQube on Kubernetes gives your engineering team a scalable, always-available code quality gate.

Flux CD brings GitOps principles to Kubernetes, meaning your entire SonarQube deployment—from Helm values to configuration—lives in Git. Every change is auditable, rollbacks are trivial, and drift between your declared state and the running cluster is automatically corrected.

In this guide you will use Flux CD's `HelmRelease` and `HelmRepository` custom resources to deploy SonarQube Community Edition from the official Helm chart, wire it to a dedicated PostgreSQL instance, and configure a persistent volume for analysis data.

## Prerequisites

- A running Kubernetes cluster (v1.26+)
- Flux CD bootstrapped in the cluster (`flux bootstrap`)
- `kubectl` configured to target the cluster
- A Git repository Flux is watching (your "fleet" repo)
- At least 4 GB of RAM available for SonarQube pods

## Step 1: Create the Namespace and Secret

SonarQube needs a dedicated namespace and a secret containing the PostgreSQL credentials.

```yaml
# clusters/my-cluster/sonarqube/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: sonarqube
```

```bash
# Create the database credentials secret (keep this out of Git)
kubectl create secret generic sonarqube-db-secret \
  --namespace sonarqube \
  --from-literal=postgres-password=supersecret \
  --from-literal=sonarqube-password=sonarsecret
```

## Step 2: Add the SonarQube Helm Repository

Create a `HelmRepository` resource so Flux knows where to pull the chart.

```yaml
# clusters/my-cluster/sonarqube/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: sonarqube
  namespace: flux-system
spec:
  # Official SonarQube Helm chart repository
  url: https://SonarSource.github.io/helm-chart-sonarqube
  interval: 12h
```

Commit this file and push. Flux will reconcile and register the repository.

## Step 3: Deploy PostgreSQL via HelmRelease

SonarQube requires a PostgreSQL database. Deploy Bitnami's PostgreSQL chart first.

```yaml
# clusters/my-cluster/sonarqube/postgresql-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: sonarqube-postgresql
  namespace: sonarqube
spec:
  interval: 10m
  chart:
    spec:
      chart: postgresql
      version: ">=13.0.0 <14.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    auth:
      database: sonarqube
      username: sonarqube
      existingSecret: sonarqube-db-secret
      secretKeys:
        adminPasswordKey: postgres-password
        userPasswordKey: sonarqube-password
    primary:
      persistence:
        size: 20Gi
```

## Step 4: Deploy SonarQube via HelmRelease

```yaml
# clusters/my-cluster/sonarqube/sonarqube-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: sonarqube
  namespace: sonarqube
spec:
  interval: 10m
  # Wait for PostgreSQL to be ready before deploying SonarQube
  dependsOn:
    - name: sonarqube-postgresql
  chart:
    spec:
      chart: sonarqube
      version: ">=10.0.0 <11.0.0"
      sourceRef:
        kind: HelmRepository
        name: sonarqube
        namespace: flux-system
  values:
    # Use external PostgreSQL instead of bundled
    postgresql:
      enabled: false
    jdbcOverwrite:
      enable: true
      jdbcUrl: "jdbc:postgresql://sonarqube-postgresql:5432/sonarqube"
      jdbcUsername: sonarqube
      jdbcSecretName: sonarqube-db-secret
      jdbcSecretPasswordKey: sonarqube-password
    persistence:
      enabled: true
      size: 10Gi
    resources:
      requests:
        cpu: 400m
        memory: 2Gi
      limits:
        cpu: 800m
        memory: 4Gi
    ingress:
      enabled: true
      hosts:
        - name: sonarqube.example.com
          path: /
      annotations:
        nginx.ingress.kubernetes.io/proxy-body-size: "64m"
```

## Step 5: Add a Kustomization to Wire Everything Together

```yaml
# clusters/my-cluster/sonarqube/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: sonarqube
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/sonarqube
  prune: true          # Remove resources deleted from Git
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: sonarqube
      namespace: sonarqube
```

## Step 6: Verify the Deployment

```bash
# Watch Flux reconcile the Kustomization
flux get kustomizations sonarqube --watch

# Check HelmRelease status
flux get helmreleases -n sonarqube

# Tail SonarQube logs
kubectl logs -n sonarqube -l app=sonarqube -f
```

Once the pod reports `SonarQube is operational`, open `https://sonarqube.example.com` and log in with the default credentials (`admin`/`admin`), then immediately change the password.

## Best Practices

- Store secrets using Sealed Secrets or External Secrets Operator—never commit plaintext credentials to Git.
- Set `sonarqube.properties` overrides via `sonarProperties` in the Helm values to tune ES heap and web settings.
- Enable `podDisruptionBudget` in the Helm values to protect SonarQube during node maintenance.
- Use a `StorageClass` that supports `ReadWriteOnce` with high IOPS for the SonarQube data volume.
- Pin chart versions in `HelmRelease` to avoid unexpected upgrades; update deliberately via PRs.

## Conclusion

You now have a fully GitOps-managed SonarQube deployment on Kubernetes. Every configuration change—whether a new Helm value, a resource limit adjustment, or a version bump—flows through a Git pull request, giving your team full auditability and one-command rollback capabilities via `flux reconcile`. Pair SonarQube's quality gates with your CI pipelines to enforce code standards automatically on every commit.

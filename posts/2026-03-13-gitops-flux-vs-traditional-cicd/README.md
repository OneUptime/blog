# GitOps with Flux CD vs Traditional CI/CD: When to Choose What

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, CI/CD, Traditional CD, Push-Based, Pull-Based, Kubernetes, DevOps

Description: Compare GitOps with Flux CD against traditional push-based CI/CD pipelines, with guidance on when each approach is the right choice for Kubernetes deployments.

---

## Introduction

GitOps and traditional CI/CD are not mutually exclusive; they are complementary approaches that solve different parts of the software delivery problem. Traditional CI/CD—push-based pipelines using Jenkins, GitHub Actions, or similar—excels at building, testing, and publishing artifacts. GitOps with Flux CD excels at reconciling cluster state with declared configuration in Git.

The key distinction is who initiates the deployment: in push-based CD, the CI system pushes changes to the cluster; in GitOps with Flux CD, the cluster pulls from Git. This seemingly simple difference has significant operational implications.

## Prerequisites

- Understanding of CI/CD pipeline concepts
- Basic Kubernetes knowledge
- Interest in evaluating GitOps adoption

## Step 1: Traditional Push-Based CD Model

```mermaid
graph LR
    D[Developer Push] --> CI[CI Pipeline]
    CI --> B[Build Image]
    B --> T[Test]
    T --> P[Push Image]
    P --> DEPLOY[kubectl apply / Helm upgrade]
    DEPLOY --> K[Kubernetes Cluster]
```

A traditional Jenkins deployment stage:

```groovy
stage('Deploy to Production') {
    steps {
        withKubeConfig([credentialsId: 'k8s-prod-kubeconfig']) {
            sh """
                kubectl set image deployment/myapp \
                  myapp=your-registry/myapp:${BUILD_NUMBER} \
                  -n production
                kubectl rollout status deployment/myapp -n production
            """
        }
    }
}
```

## Step 2: GitOps with Flux CD Model

```mermaid
graph LR
    D[Developer Push] --> CI[CI Pipeline]
    CI --> B[Build Image]
    B --> P[Push Image to Registry]
    P --> GIT[Update Fleet Repo]
    GIT -.->|Flux polls| FLUX[Flux CD]
    FLUX --> K[Kubernetes Cluster]
```

The CI pipeline never touches the cluster; Flux CD does:

```yaml
# CI updates the fleet repo
# Flux reconciles the cluster
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  prune: true
  path: ./apps/myapp
  sourceRef:
    kind: GitRepository
    name: fleet-repo
```

## Step 3: When to Use GitOps with Flux CD

GitOps excels when:

- **Auditability matters**: Every change to the cluster is a Git commit with author, timestamp, and diff
- **Self-healing is required**: Flux automatically corrects manual changes or drift
- **Multiple environments**: The same Git-based workflow applies from staging to production
- **Security is paramount**: CI systems need no cluster credentials; the cluster pulls from Git
- **Disaster recovery**: Recreate the cluster by pointing Flux at the same Git repository

```bash
# Disaster recovery: restore entire cluster from Git
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-repo \
  --branch=main \
  --path=clusters/production \
  --personal
# Flux reconciles the entire cluster state from Git
```

## Step 4: When to Use Traditional Push-Based CD

Traditional CI/CD excels when:

- **Speed of iteration**: Push-based deployments can be faster for small teams with a single environment
- **Complex deployment logic**: Multi-step deployments with conditional logic that is hard to express in GitOps
- **Non-Kubernetes targets**: Deploying to VMs, bare metal, or cloud functions where GitOps tools don't apply
- **Legacy systems**: Integrating with existing Jenkins pipelines where migration cost outweighs GitOps benefits
- **Short-lived environments**: Ephemeral preview environments that are created and destroyed per PR

## Step 5: Hybrid Architecture

Most mature organizations use both:

```yaml
# CI handles build, test, and artifact publishing
# Flux CD handles all Kubernetes deployments

# CI pipeline (GitHub Actions)
jobs:
  build:
    steps:
      - Build and test application
      - Push Docker image to registry
      - Update image tag in fleet repository (GitOps handoff)

# Flux CD handles everything from here
# The fleet repository is the source of truth for cluster state
```

## Comparison Table

| Dimension | GitOps (Flux CD) | Traditional Push CD |
|---|---|---|
| Cluster credentials in CI | No | Yes (security risk) |
| Audit trail | Git history | CI build logs |
| Drift self-healing | Yes, automatic | No |
| Rollback mechanism | git revert | Re-run pipeline or manual kubectl |
| Multi-cluster deployment | Via Git branches/paths | Requires N cluster credential sets |
| Disaster recovery | Re-bootstrap from Git | Recreate CI pipeline config |
| Complex deployment logic | Limited | Rich (if/else, parallel, etc.) |
| Non-Kubernetes targets | No | Yes |

## Best Practices

- Adopt GitOps for Kubernetes workloads in any environment with more than one cluster or operator.
- Keep traditional CI for the build-test-publish phase; only the deployment phase should shift to GitOps.
- Use Git branch strategies to model environments: `main` for production, `staging` for staging.
- Educate teams that GitOps shifts responsibility: instead of running a pipeline to deploy, you commit to Git.
- Measure the DORA metrics (deployment frequency, lead time, change failure rate, MTTR) before and after adopting GitOps to quantify the impact.

## Conclusion

GitOps with Flux CD is the superior model for Kubernetes deployments in organizations that value auditability, security, and self-healing cluster state. Traditional push-based CD remains valuable for the build and test phases and for non-Kubernetes deployment targets. The most effective pattern is a hybrid: CI builds and publishes, while Flux CD owns all Kubernetes deployment decisions.

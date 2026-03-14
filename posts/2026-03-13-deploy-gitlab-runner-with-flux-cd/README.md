# How to Deploy GitLab Runner with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, GitLab, CI/CD, GitLab Runner

Description: Deploy GitLab Runner on Kubernetes using Flux CD so your CI/CD jobs run in autoscaling pods managed entirely through Git.

---

## Introduction

GitLab Runner is the open-source agent that picks up CI/CD jobs from a GitLab instance and executes them. Running runners inside Kubernetes is the modern approach: each job gets its own ephemeral pod, resources scale automatically, and there is no persistent runner host to maintain. Combined with Flux CD, the runner deployment itself becomes a GitOps artifact—every configuration change is a Git commit.

Flux CD watches your fleet repository and reconciles the Kubernetes cluster to match. When you update the runner registration token (via a secret reference), change executor settings, or bump the chart version, Flux applies the change without manual `helm upgrade` commands. This makes GitLab Runner infrastructure as auditable and reproducible as the application code it builds.

This guide deploys the official GitLab Runner Helm chart using Flux CD's `HelmRelease`, registers it with a GitLab instance, and configures the Kubernetes executor for dynamic job pods.

## Prerequisites

- Kubernetes cluster (v1.26+) with Flux CD bootstrapped
- A GitLab instance (GitLab.com or self-hosted) with a project or group runner registration token
- `flux` and `kubectl` CLIs installed locally
- Sealed Secrets or External Secrets Operator for secret management

## Step 1: Store the Runner Registration Token Securely

Never commit the runner token to Git. Create the secret imperatively, or use Sealed Secrets.

```bash
# Create the secret imperatively
kubectl create namespace gitlab-runner

kubectl create secret generic gitlab-runner-secret \
  --namespace gitlab-runner \
  --from-literal=runner-registration-token="" \
  --from-literal=runner-token=""
```

If you use Sealed Secrets, seal the secret and commit the `SealedSecret` manifest instead.

## Step 2: Add the GitLab Helm Repository

```yaml
# clusters/my-cluster/gitlab-runner/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: gitlab
  namespace: flux-system
spec:
  url: https://charts.gitlab.io
  interval: 12h
```

## Step 3: Create the HelmRelease

```yaml
# clusters/my-cluster/gitlab-runner/runner-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: gitlab-runner
  namespace: gitlab-runner
spec:
  interval: 10m
  chart:
    spec:
      chart: gitlab-runner
      version: ">=0.63.0 <0.64.0"
      sourceRef:
        kind: HelmRepository
        name: gitlab
        namespace: flux-system
  values:
    # Point to your GitLab instance
    gitlabUrl: https://gitlab.example.com

    # Reference the pre-created secret
    runnerRegistrationToken: ""
    existingSecret: gitlab-runner-secret

    # Use Kubernetes executor (recommended for scalability)
    runners:
      executor: kubernetes
      config: |
        [[runners]]
          [runners.kubernetes]
            namespace = "gitlab-runner"
            image = "ubuntu:22.04"
            # Each job gets its own CPU/memory slice
            cpu_request = "100m"
            cpu_limit = "1"
            memory_request = "128Mi"
            memory_limit = "1Gi"
            # Pull Docker images from private registries
            pull_policy = ["if-not-present"]

    # Allow runner to spawn job pods
    rbac:
      create: true

    # Runner pod resources
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi

    # Number of concurrent jobs
    concurrent: 10

    # Metrics endpoint for Prometheus scraping
    metrics:
      enabled: true
      portName: metrics
      port: 9252
      serviceMonitor:
        enabled: false   # Set true if Prometheus Operator is installed
```

## Step 4: Add the Kustomization

```yaml
# clusters/my-cluster/gitlab-runner/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gitlab-runner
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/gitlab-runner
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: gitlab-runner
      namespace: gitlab-runner
```

## Step 5: Verify Runner Registration

```bash
# Watch Flux apply the release
flux get helmreleases -n gitlab-runner --watch

# Confirm the runner pod is running
kubectl get pods -n gitlab-runner

# Check runner logs for successful registration
kubectl logs -n gitlab-runner -l app=gitlab-runner -f
```

In the GitLab UI navigate to **Settings > CI/CD > Runners**. Your new runner should appear with a green indicator within a minute of the pod starting.

## Step 6: Trigger a Test Pipeline

Create a minimal `.gitlab-ci.yml` in any project assigned to the runner:

```yaml
# .gitlab-ci.yml
test-job:
  stage: test
  image: alpine:3.19
  script:
    - echo "Running on Kubernetes via Flux CD!"
    - uname -a
```

Push the file and watch a pod appear in the `gitlab-runner` namespace while the job runs.

## Best Practices

- Use `runners.tags` in the Helm values to tag the runner (e.g., `kubernetes`, `production`) and target it explicitly in pipelines.
- Enable `runners.cache` with an S3-compatible backend to speed up repeated jobs.
- Set `terminationGracePeriodSeconds` high enough (300+) so in-flight jobs finish before a runner pod is evicted.
- Rotate registration tokens periodically; the secret update propagates automatically via Flux.
- Use `podAnnotations` to add Vault or IRSA annotations for jobs that need cloud credentials.

## Conclusion

GitLab Runner is now deployed and managed entirely through Flux CD. Adding more runners, changing executor settings, or upgrading the chart version are all pull-request workflows. The Kubernetes executor ensures each CI job runs in an isolated, ephemeral pod, giving you clean builds and automatic resource cleanup with zero manual intervention.

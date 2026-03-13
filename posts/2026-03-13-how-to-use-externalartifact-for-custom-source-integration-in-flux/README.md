# How to Use ExternalArtifact for Custom Source Integration in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, kubernetes, gitops, externalartifact, custom-sources, integration

Description: Learn how to use the Flux ExternalArtifact resource to integrate custom artifact sources that are not natively supported by Flux source controllers.

---

## Introduction

Flux natively supports Git repositories, OCI artifacts, Helm charts, and S3-compatible buckets as sources. However, some organizations need to pull manifests from custom systems such as internal artifact stores, CI/CD pipeline outputs, or proprietary configuration management tools. The ExternalArtifact resource provides a way to bring externally-produced artifacts into the Flux ecosystem, allowing any system to push artifacts that Flux can consume.

This guide explains how to create and manage ExternalArtifact resources, push artifacts from external systems, and integrate them into your Flux deployment pipelines.

## Prerequisites

- A Kubernetes cluster running Flux v2.4 or later
- The Flux Operator with ExternalArtifact CRD support
- `kubectl` and `flux` CLI tools
- An external system that produces Kubernetes manifests (CI/CD pipeline, custom tool, etc.)

## Understanding ExternalArtifact

The ExternalArtifact resource represents an artifact whose content is managed externally rather than by a Flux source controller. Instead of Flux fetching content from a repository, an external process pushes artifact metadata to the ExternalArtifact status, and Flux consumes it like any other source.

This decouples artifact production from Flux's reconciliation loop, giving external systems full control over when and how artifacts are produced.

## Step 1: Create an ExternalArtifact Resource

Define the ExternalArtifact in your cluster:

```yaml
# external-artifact.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: ExternalArtifact
metadata:
  name: ci-output
  namespace: flux-system
spec:
  interval: 5m
  artifact:
    url: ""
    revision: ""
    digest: ""
```

Apply it:

```bash
kubectl apply -f external-artifact.yaml
```

The ExternalArtifact starts with an empty artifact reference. An external process will update it with the actual artifact location.

## Step 2: Push Artifacts from a CI/CD Pipeline

Your CI/CD pipeline produces Kubernetes manifests and pushes them to an OCI registry or storage backend. After pushing, it updates the ExternalArtifact status with the artifact location.

Here is an example CI/CD step that pushes an artifact and updates the ExternalArtifact:

```bash
# In your CI/CD pipeline (e.g., GitHub Actions)

# Step 1: Push the manifests as an OCI artifact
flux push artifact oci://ghcr.io/your-org/ci-output:${GIT_SHA} \
  --path=./rendered-manifests \
  --source="${GITHUB_REPOSITORY}" \
  --revision="${GIT_BRANCH}/${GIT_SHA}"

# Step 2: Update the ExternalArtifact with the new artifact reference
kubectl patch externalartifact ci-output -n flux-system \
  --type=merge \
  -p "{
    \"spec\": {
      \"artifact\": {
        \"url\": \"oci://ghcr.io/your-org/ci-output:${GIT_SHA}\",
        \"revision\": \"${GIT_BRANCH}/${GIT_SHA}\",
        \"digest\": \"sha256:$(flux push artifact oci://ghcr.io/your-org/ci-output:${GIT_SHA} --path=./rendered-manifests --json | jq -r '.digest')\"
      }
    }
  }"
```

## Step 3: Consume the ExternalArtifact in a Kustomization

Reference the ExternalArtifact in a Kustomization just like any other source:

```yaml
# ci-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ci-deployed-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: ExternalArtifact
    name: ci-output
  path: "./"
  prune: true
  targetNamespace: production
  wait: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: production
```

```bash
kubectl apply -f ci-kustomization.yaml
```

## Step 4: Automate Updates with a Kubernetes Job

For systems that cannot directly access the Kubernetes API, create a Job or CronJob that polls an external source and updates the ExternalArtifact:

```yaml
# artifact-updater.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: artifact-updater
  namespace: flux-system
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: artifact-updater
          containers:
            - name: updater
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Fetch latest artifact info from external system
                  ARTIFACT_URL=$(curl -s https://artifacts.internal.example.com/api/latest | jq -r '.url')
                  ARTIFACT_REV=$(curl -s https://artifacts.internal.example.com/api/latest | jq -r '.revision')
                  ARTIFACT_DIGEST=$(curl -s https://artifacts.internal.example.com/api/latest | jq -r '.digest')

                  # Update the ExternalArtifact
                  kubectl patch externalartifact ci-output -n flux-system \
                    --type=merge \
                    -p "{\"spec\":{\"artifact\":{\"url\":\"${ARTIFACT_URL}\",\"revision\":\"${ARTIFACT_REV}\",\"digest\":\"${ARTIFACT_DIGEST}\"}}}"
          restartPolicy: OnFailure
```

Create the necessary RBAC:

```yaml
# artifact-updater-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: artifact-updater
  namespace: flux-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: artifact-updater
  namespace: flux-system
rules:
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["externalartifacts"]
    verbs: ["get", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: artifact-updater
  namespace: flux-system
subjects:
  - kind: ServiceAccount
    name: artifact-updater
roleRef:
  kind: Role
  name: artifact-updater
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f artifact-updater-rbac.yaml
kubectl apply -f artifact-updater.yaml
```

## Step 5: Use with ArtifactGenerator

ExternalArtifacts can also be used as inputs to ArtifactGenerators, combining externally-produced artifacts with other Flux sources:

```yaml
# combined-external.yaml
apiVersion: generators.fluxcd.io/v1
kind: ArtifactGenerator
metadata:
  name: combined-deploy
  namespace: flux-system
spec:
  interval: 10m
  inputs:
    - name: ci-artifacts
      sourceRef:
        kind: ExternalArtifact
        name: ci-output
      path: "./"
      targetPath: "./app"
    - name: platform-config
      sourceRef:
        kind: GitRepository
        name: platform-config
      path: "./production"
      targetPath: "./platform"
  output:
    artifact:
      path: "./"
```

## Monitoring ExternalArtifact Health

Check the status of your ExternalArtifacts:

```bash
kubectl get externalartifacts -n flux-system
kubectl describe externalartifact ci-output -n flux-system
```

Set up alerts for stale artifacts:

```yaml
# stale-artifact-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: external-artifact-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: ExternalArtifact
      name: ci-output
```

## Conclusion

The ExternalArtifact resource extends Flux's source model to accommodate any artifact production system. Whether you are integrating CI/CD pipeline outputs, internal build systems, or proprietary configuration tools, ExternalArtifact provides a clean interface between external producers and Flux consumers. By combining ExternalArtifacts with ArtifactGenerators, you can build hybrid deployment pipelines that mix externally-produced artifacts with standard Flux sources, giving you maximum flexibility in how artifacts are created while keeping Flux as the single deployment mechanism.

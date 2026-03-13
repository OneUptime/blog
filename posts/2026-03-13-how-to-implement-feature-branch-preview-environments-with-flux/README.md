# How to Implement Feature Branch Preview Environments with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Preview Environments, Feature Branches, CI/CD

Description: Learn how to automatically create and destroy preview environments for feature branches using Flux, enabling developers to test changes in isolated Kubernetes namespaces.

---

## What Are Preview Environments

Preview environments are temporary, isolated deployments created for each feature branch or pull request. They allow developers and reviewers to test changes in a real Kubernetes environment before merging. When the branch is merged or closed, the preview environment is automatically cleaned up.

## Architecture Overview

The approach uses a CI pipeline to generate Flux Kustomization manifests for each feature branch, deploying the application into a branch-specific namespace. Flux watches a dedicated directory for these manifests and reconciles them automatically.

## Repository Structure

```
flux-repo/
├── clusters/
│   └── preview/
│       └── flux-system/
│           └── gotk-sync.yaml
├── preview/
│   ├── kustomization.yaml
│   └── branches/
│       └── .gitkeep
├── base/
│   └── app/
│       ├── kustomization.yaml
│       ├── deployment.yaml
│       ├── service.yaml
│       └── ingress.yaml
└── templates/
    └── preview-kustomization.yaml
```

## Flux Configuration for Preview Cluster

Configure Flux to watch the preview directory:

```yaml
# clusters/preview/flux-system/gotk-sync.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m
  ref:
    branch: main
  url: ssh://git@github.com/myorg/flux-repo.git
  secretRef:
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: preview-envs
  namespace: flux-system
spec:
  interval: 1m
  path: ./preview
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

The `prune: true` setting is essential because it ensures that when a preview Kustomization manifest is removed from the repository, Flux will automatically delete all the associated resources from the cluster.

## Preview Kustomization Template

Define a template that CI will use to generate per-branch Kustomizations:

```yaml
# templates/preview-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: preview-BRANCH_SLUG
  namespace: flux-system
spec:
  interval: 5m
  retryInterval: 30s
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: app-repo-BRANCH_SLUG
  path: ./k8s/overlays/preview
  prune: true
  targetNamespace: preview-BRANCH_SLUG
  postBuild:
    substitute:
      BRANCH_NAME: BRANCH_SLUG
      IMAGE_TAG: IMAGE_TAG_VALUE
      PREVIEW_HOST: BRANCH_SLUG.preview.example.com
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-repo-BRANCH_SLUG
  namespace: flux-system
spec:
  interval: 1m
  ref:
    branch: BRANCH_NAME_FULL
  url: ssh://git@github.com/myorg/my-app.git
  secretRef:
    name: flux-system
```

## CI Pipeline for Creating Preview Environments

```yaml
# .github/workflows/preview-create.yaml
name: Create Preview Environment
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  create-preview:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout flux repo
        uses: actions/checkout@v4
        with:
          repository: myorg/flux-repo
          token: ${{ secrets.FLUX_REPO_TOKEN }}

      - name: Generate branch slug
        id: slug
        run: |
          BRANCH="${{ github.head_ref }}"
          SLUG=$(echo "$BRANCH" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | head -c 63)
          echo "slug=$SLUG" >> "$GITHUB_OUTPUT"
          echo "branch=$BRANCH" >> "$GITHUB_OUTPUT"

      - name: Generate preview manifests
        run: |
          SLUG="${{ steps.slug.outputs.slug }}"
          BRANCH="${{ steps.slug.outputs.branch }}"
          IMAGE_TAG="${{ github.event.pull_request.head.sha }}"

          # Create namespace manifest
          cat > preview/branches/${SLUG}-namespace.yaml << EOF
          apiVersion: v1
          kind: Namespace
          metadata:
            name: preview-${SLUG}
            labels:
              preview: "true"
              branch: "${SLUG}"
          EOF

          # Create Flux kustomization from template
          sed \
            -e "s/BRANCH_SLUG/${SLUG}/g" \
            -e "s/BRANCH_NAME_FULL/${BRANCH}/g" \
            -e "s/IMAGE_TAG_VALUE/${IMAGE_TAG}/g" \
            templates/preview-kustomization.yaml \
            > preview/branches/${SLUG}-kustomization.yaml

      - name: Update preview kustomization
        run: |
          cd preview
          cat > kustomization.yaml << 'EOF'
          apiVersion: kustomize.config.k8s.io/v1beta1
          kind: Kustomization
          resources:
          EOF
          for f in branches/*.yaml; do
            echo "  - $f" >> kustomization.yaml
          done

      - name: Commit and push
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add preview/
          git commit -m "Create preview environment for ${{ steps.slug.outputs.slug }}"
          git push

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const slug = '${{ steps.slug.outputs.slug }}';
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `Preview environment deploying at: https://${slug}.preview.example.com`
            });
```

## CI Pipeline for Destroying Preview Environments

```yaml
# .github/workflows/preview-destroy.yaml
name: Destroy Preview Environment
on:
  pull_request:
    types: [closed]

jobs:
  destroy-preview:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout flux repo
        uses: actions/checkout@v4
        with:
          repository: myorg/flux-repo
          token: ${{ secrets.FLUX_REPO_TOKEN }}

      - name: Generate branch slug
        id: slug
        run: |
          BRANCH="${{ github.head_ref }}"
          SLUG=$(echo "$BRANCH" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | head -c 63)
          echo "slug=$SLUG" >> "$GITHUB_OUTPUT"

      - name: Remove preview manifests
        run: |
          SLUG="${{ steps.slug.outputs.slug }}"
          rm -f preview/branches/${SLUG}-*.yaml

          # Regenerate kustomization
          cd preview
          cat > kustomization.yaml << 'EOF'
          apiVersion: kustomize.config.k8s.io/v1beta1
          kind: Kustomization
          resources:
          EOF
          for f in branches/*.yaml; do
            [ -f "$f" ] && echo "  - $f" >> kustomization.yaml
          done

      - name: Commit and push
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add preview/
          git commit -m "Destroy preview environment for ${{ steps.slug.outputs.slug }}" || true
          git push
```

## Application Overlay for Preview

The application repository needs a preview overlay that uses Flux variable substitution:

```yaml
# k8s/overlays/preview/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - target:
      kind: Ingress
    patch: |
      apiVersion: networking.k8s.io/v1
      kind: Ingress
      metadata:
        name: app
      spec:
        rules:
          - host: ${PREVIEW_HOST}
            http:
              paths:
                - path: /
                  pathType: Prefix
                  backend:
                    service:
                      name: app
                      port:
                        number: 80
images:
  - name: myregistry/my-app
    newTag: ${IMAGE_TAG}
```

## Resource Limits for Preview Environments

Apply resource quotas to prevent preview environments from consuming too many cluster resources:

```yaml
# templates/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: preview-quota
  namespace: preview-BRANCH_SLUG
spec:
  hard:
    requests.cpu: "1"
    requests.memory: 1Gi
    limits.cpu: "2"
    limits.memory: 2Gi
    pods: "10"
```

## Automatic Cleanup with TTL

Add a CronJob to clean up stale preview environments:

```yaml
# preview/cleanup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: preview-cleanup
  namespace: flux-system
spec:
  schedule: "0 0 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: preview-cleanup
          containers:
            - name: cleanup
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Delete preview namespaces older than 7 days
                  kubectl get namespaces -l preview=true -o json | \
                  jq -r '.items[] | select(
                    (now - (.metadata.creationTimestamp | fromdateiso8601)) > 604800
                  ) | .metadata.name' | \
                  xargs -r kubectl delete namespace
          restartPolicy: OnFailure
```

## Conclusion

Feature branch preview environments with Flux provide developers with isolated testing environments that are automatically created and destroyed alongside pull requests. By combining CI pipelines for manifest generation with Flux's reconciliation and pruning capabilities, you get a fully automated preview environment lifecycle. The key elements are using `prune: true` for automatic cleanup, per-branch namespaces for isolation, and CI integration for lifecycle management.

# How to Build a Complete CI/CD Pipeline with CircleCI and Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, CircleCI, CI/CD, GitOps, Kubernetes, DevOps

Description: Learn how to use CircleCI for continuous integration and Flux CD for GitOps deployment to create a complete Kubernetes CD pipeline.

---

## Introduction

CircleCI is known for its fast pipelines and Docker-native build environment, making it an excellent partner for container-based workflows. When combined with Flux CD, you get a system where CircleCI handles compilation, testing, and image publishing, while Flux CD manages the cluster reconciliation loop entirely through Git.

The handoff point between CircleCI and Flux CD is the fleet repository. CircleCI writes a new image tag to a manifest or Kustomize patch file in the fleet repository after a successful build. Flux CD detects this commit, validates the change, and applies it to the cluster. This design eliminates direct cluster access from CI while preserving full traceability.

This guide shows how to configure a CircleCI config alongside Flux CD resources to build a production-ready GitOps pipeline.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- A CircleCI account connected to your GitHub or Bitbucket repository
- A container registry (Docker Hub, ECR, or GHCR)
- A fleet repository for Kubernetes manifests
- CircleCI context configured with registry and Git credentials

## Step 1: Bootstrap Flux CD

```bash
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-repo \
  --branch=main \
  --path=clusters/production \
  --personal
```

## Step 2: Set Up the Flux Application Resources

```yaml
# clusters/production/apps/myapp.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/fleet-repo
  ref:
    branch: main
  secretRef:
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: myapp
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: myapp
  timeout: 3m
```

## Step 3: Create a Kustomize Patch File for Image Updates

Instead of editing the base deployment directly, use a Kustomize patch to isolate image changes:

```yaml
# apps/myapp/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
images:
  - name: docker.io/your-org/myapp
    newTag: "1.0.0" # {"$imagepolicy": "flux-system:myapp:tag"}
```

## Step 4: Write the CircleCI Configuration

```yaml
# .circleci/config.yml
version: 2.1

orbs:
  docker: circleci/docker@2.4.0

executors:
  docker-executor:
    docker:
      - image: cimg/base:current
    resource_class: medium

jobs:
  test:
    executor: docker-executor
    steps:
      - checkout
      - setup_remote_docker:
          version: docker24
      - run:
          name: Run tests
          command: make test

  build-push:
    executor: docker-executor
    steps:
      - checkout
      - setup_remote_docker:
          version: docker24
      - run:
          name: Build and push image
          command: |
            echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
            IMAGE_TAG="docker.io/$DOCKER_ORG/myapp:$CIRCLE_TAG"
            docker build -t "$IMAGE_TAG" .
            docker push "$IMAGE_TAG"
            # Also push a semver-clean tag for Flux ImagePolicy
            echo "IMAGE_TAG=$IMAGE_TAG" >> $BASH_ENV
      - run:
          name: Update fleet repository
          command: |
            git clone https://$GIT_TOKEN@github.com/your-org/fleet-repo.git
            cd fleet-repo
            git config user.email "circleci@your-org.com"
            git config user.name "CircleCI"
            # Update the newTag in kustomization.yaml
            sed -i "s/newTag: .*/newTag: \"$CIRCLE_TAG\"/" apps/myapp/kustomization.yaml
            git add apps/myapp/kustomization.yaml
            git commit -m "chore: update myapp to $CIRCLE_TAG [ci skip]"
            git push origin main

workflows:
  ci:
    jobs:
      - test:
          filters:
            tags:
              only: /^v.*/
            branches:
              only: /.*/

      - build-push:
          requires:
            - test
          context:
            - docker-registry
            - fleet-repo-access
          filters:
            tags:
              only: /^v.*/
            branches:
              ignore: /.*/
```

## Step 5: Configure CircleCI Contexts

In the CircleCI dashboard, create two contexts:

- `docker-registry`: set `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `DOCKER_ORG`
- `fleet-repo-access`: set `GIT_TOKEN` with a fine-grained PAT scoped to the fleet repository

This scopes secrets to only the jobs that need them.

## Step 6: Configure the Flux Image Policy

```yaml
# clusters/production/apps/myapp-image.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  image: docker.io/your-org/myapp
  interval: 1m
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: myapp
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp
  policy:
    semver:
      range: ">=1.0.0"
```

## Best Practices

- Use `[ci skip]` in fleet repository commit messages to prevent CircleCI from triggering on Flux Bot commits if the fleet repo also has CI configured.
- Use CircleCI's filter syntax to run the build-push job only on version tags, not every branch push.
- Store all secrets in CircleCI Contexts rather than project-level environment variables for better access control.
- Add a workspace persist step to share build outputs between CircleCI jobs without re-running builds.
- Use CircleCI's `resource_class` to right-size build machines and reduce costs.
- Consider using CircleCI's approval job step to gate production fleet repo updates behind a manual review.

## Conclusion

CircleCI's fast, container-native pipelines pair naturally with Flux CD's pull-based GitOps model. The clean boundary at the fleet repository keeps your CI system from needing Kubernetes credentials, while Flux CD provides the self-healing reconciliation that makes cluster state reliable and auditable.

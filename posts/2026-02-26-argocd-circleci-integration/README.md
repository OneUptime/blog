# How to Integrate ArgoCD with CircleCI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CircleCI, CI/CD

Description: Learn how to integrate ArgoCD with CircleCI for automated GitOps deployments, including image tag updates, sync verification, and reusable orb configurations for Kubernetes environments.

---

CircleCI is a popular cloud-native CI/CD platform that pairs well with ArgoCD for GitOps workflows. CircleCI handles building, testing, and publishing artifacts, while ArgoCD manages the deployment to Kubernetes. This guide covers how to set up the integration, from basic image tag updates to advanced patterns using CircleCI orbs and approval workflows.

## CircleCI and ArgoCD Architecture

The integration follows standard GitOps principles:

```mermaid
flowchart LR
    A[Git Push] --> B[CircleCI Pipeline]
    B --> C[Build Docker Image]
    C --> D[Push to Registry]
    D --> E[Update Deployment Repo]
    E --> F[ArgoCD Syncs]
    F --> G[Kubernetes Updated]
```

CircleCI never talks directly to the Kubernetes cluster. It updates Git, and ArgoCD reconciles the desired state.

## Setting Up CircleCI Environment Variables

Before creating the pipeline, configure these environment variables in CircleCI project settings (Settings > Environment Variables):

| Variable | Purpose |
|----------|---------|
| `ARGOCD_SERVER` | ArgoCD server address (e.g., argocd.example.com) |
| `ARGOCD_TOKEN` | ArgoCD API token for CI account |
| `DEPLOY_TOKEN` | Git token for the deployment repository |
| `DOCKER_REGISTRY` | Docker registry URL |
| `DOCKER_USER` | Registry username |
| `DOCKER_PASS` | Registry password |

## Pattern 1: Basic Image Tag Update

The simplest integration pattern where CircleCI updates the deployment manifest:

```yaml
# .circleci/config.yml
version: 2.1

executors:
  default:
    docker:
      - image: cimg/base:2024.01

jobs:
  build-and-push:
    executor: default
    steps:
      - checkout
      - setup_remote_docker:
          version: 24.0.7

      - run:
          name: Build Docker image
          command: |
            IMAGE_TAG="${CIRCLE_SHA1:0:7}"
            docker build -t ${DOCKER_REGISTRY}/my-app:${IMAGE_TAG} .

      - run:
          name: Push Docker image
          command: |
            IMAGE_TAG="${CIRCLE_SHA1:0:7}"
            echo ${DOCKER_PASS} | docker login ${DOCKER_REGISTRY} -u ${DOCKER_USER} --password-stdin
            docker push ${DOCKER_REGISTRY}/my-app:${IMAGE_TAG}

      - run:
          name: Update deployment manifests
          command: |
            IMAGE_TAG="${CIRCLE_SHA1:0:7}"

            # Install tools
            curl -sL https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz | tar xz -C /usr/local/bin

            # Clone deployment repo
            git clone https://deploy-bot:${DEPLOY_TOKEN}@github.com/myorg/k8s-manifests.git
            cd k8s-manifests/apps/my-app/production

            # Update image tag
            kustomize edit set image ${DOCKER_REGISTRY}/my-app=${DOCKER_REGISTRY}/my-app:${IMAGE_TAG}

            # Commit and push
            git config user.name "CircleCI"
            git config user.email "ci@circleci.com"
            git add .
            git commit -m "Deploy my-app:${IMAGE_TAG} from CircleCI build ${CIRCLE_BUILD_NUM}"
            git push

workflows:
  deploy:
    jobs:
      - build-and-push:
          filters:
            branches:
              only: main
```

## Pattern 2: Sync and Verify Workflow

Add sync triggering and deployment verification:

```yaml
# .circleci/config.yml
version: 2.1

executors:
  default:
    docker:
      - image: cimg/base:2024.01

commands:
  install-argocd-cli:
    description: Install ArgoCD CLI
    steps:
      - run:
          name: Install ArgoCD CLI
          command: |
            curl -sSL -o /usr/local/bin/argocd \
              https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
            chmod +x /usr/local/bin/argocd

  argocd-login:
    description: Login to ArgoCD
    steps:
      - run:
          name: Login to ArgoCD
          command: |
            argocd login ${ARGOCD_SERVER} \
              --auth-token ${ARGOCD_TOKEN} \
              --grpc-web

jobs:
  build:
    executor: default
    steps:
      - checkout
      - setup_remote_docker:
          version: 24.0.7
      - run:
          name: Build and push image
          command: |
            IMAGE_TAG="${CIRCLE_SHA1:0:7}"
            docker build -t ${DOCKER_REGISTRY}/my-app:${IMAGE_TAG} .
            echo ${DOCKER_PASS} | docker login ${DOCKER_REGISTRY} -u ${DOCKER_USER} --password-stdin
            docker push ${DOCKER_REGISTRY}/my-app:${IMAGE_TAG}

  update-manifests:
    executor: default
    steps:
      - run:
          name: Update deployment manifests
          command: |
            IMAGE_TAG="${CIRCLE_SHA1:0:7}"
            curl -sL https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz | tar xz -C /usr/local/bin
            git clone https://deploy-bot:${DEPLOY_TOKEN}@github.com/myorg/k8s-manifests.git
            cd k8s-manifests/apps/my-app/production
            kustomize edit set image ${DOCKER_REGISTRY}/my-app=${DOCKER_REGISTRY}/my-app:${IMAGE_TAG}
            git config user.name "CircleCI"
            git config user.email "ci@circleci.com"
            git add .
            git commit -m "Deploy my-app:${IMAGE_TAG} [ci skip]"
            git push

  sync-argocd:
    executor: default
    steps:
      - install-argocd-cli
      - argocd-login
      - run:
          name: Sync application
          command: |
            argocd app sync my-app --grpc-web
            argocd app wait my-app --sync --health --timeout 300 --grpc-web

  verify-deployment:
    executor: default
    steps:
      - install-argocd-cli
      - argocd-login
      - run:
          name: Verify deployment health
          command: |
            HEALTH=$(argocd app get my-app -o json --grpc-web | jq -r '.status.health.status')
            SYNC=$(argocd app get my-app -o json --grpc-web | jq -r '.status.sync.status')

            echo "Health: ${HEALTH}"
            echo "Sync: ${SYNC}"

            if [ "${HEALTH}" != "Healthy" ] || [ "${SYNC}" != "Synced" ]; then
              echo "Deployment verification failed!"
              exit 1
            fi
            echo "Deployment verified successfully!"

workflows:
  build-deploy-verify:
    jobs:
      - build:
          filters:
            branches:
              only: main
      - update-manifests:
          requires:
            - build
      - sync-argocd:
          requires:
            - update-manifests
      - verify-deployment:
          requires:
            - sync-argocd
```

## Pattern 3: Multi-Environment with Approval Gates

CircleCI supports approval gates in workflows, which work well for staging to production promotions:

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  build:
    # ... build job as before ...

  deploy-staging:
    executor: default
    steps:
      - install-argocd-cli
      - argocd-login
      - run:
          name: Deploy to staging
          command: |
            IMAGE_TAG="${CIRCLE_SHA1:0:7}"
            # Update staging manifests
            git clone https://deploy-bot:${DEPLOY_TOKEN}@github.com/myorg/k8s-manifests.git
            cd k8s-manifests/apps/my-app/staging
            curl -sL https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz | tar xz
            ./kustomize edit set image ${DOCKER_REGISTRY}/my-app=${DOCKER_REGISTRY}/my-app:${IMAGE_TAG}
            git config user.name "CircleCI"
            git config user.email "ci@circleci.com"
            git add .
            git commit -m "Deploy my-app:${IMAGE_TAG} to staging"
            git push

            # Sync and verify
            argocd app sync my-app-staging --grpc-web
            argocd app wait my-app-staging --sync --health --timeout 300 --grpc-web

  deploy-production:
    executor: default
    steps:
      - install-argocd-cli
      - argocd-login
      - run:
          name: Deploy to production
          command: |
            IMAGE_TAG="${CIRCLE_SHA1:0:7}"
            git clone https://deploy-bot:${DEPLOY_TOKEN}@github.com/myorg/k8s-manifests.git
            cd k8s-manifests/apps/my-app/production
            curl -sL https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz | tar xz
            ./kustomize edit set image ${DOCKER_REGISTRY}/my-app=${DOCKER_REGISTRY}/my-app:${IMAGE_TAG}
            git config user.name "CircleCI"
            git config user.email "ci@circleci.com"
            git add .
            git commit -m "Deploy my-app:${IMAGE_TAG} to production"
            git push

            argocd app sync my-app-production --grpc-web
            argocd app wait my-app-production --sync --health --timeout 300 --grpc-web

workflows:
  deploy-pipeline:
    jobs:
      - build:
          filters:
            branches:
              only: main
      - deploy-staging:
          requires:
            - build
      # Manual approval required before production
      - hold-for-production:
          type: approval
          requires:
            - deploy-staging
      - deploy-production:
          requires:
            - hold-for-production
```

The `hold-for-production` job of type `approval` creates a manual gate in CircleCI's UI. A team member must click "Approve" before the production deployment proceeds.

## Pattern 4: Using CircleCI Context for Secrets

CircleCI Contexts provide a secure way to manage secrets across projects:

```yaml
workflows:
  deploy:
    jobs:
      - build
      - deploy-staging:
          requires: [build]
          context:
            - argocd-credentials
            - docker-registry
      - deploy-production:
          requires: [deploy-staging]
          context:
            - argocd-credentials
            - docker-registry
            - production-secrets
```

Create contexts in CircleCI Organization Settings:

1. **argocd-credentials**: `ARGOCD_SERVER`, `ARGOCD_TOKEN`
2. **docker-registry**: `DOCKER_REGISTRY`, `DOCKER_USER`, `DOCKER_PASS`
3. **production-secrets**: Any production-specific variables

## Pattern 5: Reusable CircleCI Commands

Define reusable commands to keep your config DRY:

```yaml
version: 2.1

commands:
  install-argocd-cli:
    steps:
      - run:
          name: Install ArgoCD CLI
          command: |
            curl -sSL -o /usr/local/bin/argocd \
              https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
            chmod +x /usr/local/bin/argocd

  argocd-login:
    steps:
      - run:
          name: Login to ArgoCD
          command: |
            argocd login ${ARGOCD_SERVER} \
              --auth-token ${ARGOCD_TOKEN} \
              --grpc-web

  argocd-sync-and-wait:
    parameters:
      app-name:
        type: string
      timeout:
        type: integer
        default: 300
    steps:
      - run:
          name: Sync << parameters.app-name >>
          command: |
            argocd app sync << parameters.app-name >> --grpc-web
            argocd app wait << parameters.app-name >> \
              --sync --health \
              --timeout << parameters.timeout >> \
              --grpc-web

  update-image-tag:
    parameters:
      deploy-path:
        type: string
      image-name:
        type: string
      image-tag:
        type: string
    steps:
      - run:
          name: Update image tag
          command: |
            git clone https://deploy-bot:${DEPLOY_TOKEN}@github.com/myorg/k8s-manifests.git /tmp/deploy
            cd /tmp/deploy/<< parameters.deploy-path >>
            curl -sL https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz | tar xz
            ./kustomize edit set image << parameters.image-name >>=<< parameters.image-name >>:<< parameters.image-tag >>
            git config user.name "CircleCI"
            git config user.email "ci@circleci.com"
            git add .
            git commit -m "Deploy << parameters.image-name >>:<< parameters.image-tag >>"
            git push
```

Use these commands across jobs:

```yaml
jobs:
  deploy-to-staging:
    executor: default
    steps:
      - install-argocd-cli
      - argocd-login
      - update-image-tag:
          deploy-path: apps/my-app/staging
          image-name: registry.example.com/my-app
          image-tag: ${CIRCLE_SHA1:0:7}
      - argocd-sync-and-wait:
          app-name: my-app-staging
          timeout: 300
```

## Caching the ArgoCD CLI

Speed up pipelines by caching the ArgoCD CLI download:

```yaml
commands:
  install-argocd-cli:
    steps:
      - restore_cache:
          keys:
            - argocd-cli-v2.10
      - run:
          name: Install ArgoCD CLI (if not cached)
          command: |
            if [ ! -f /usr/local/bin/argocd ]; then
              curl -sSL -o /usr/local/bin/argocd \
                https://github.com/argoproj/argo-cd/releases/download/v2.10.0/argocd-linux-amd64
              chmod +x /usr/local/bin/argocd
            fi
      - save_cache:
          key: argocd-cli-v2.10
          paths:
            - /usr/local/bin/argocd
```

## Troubleshooting

**gRPC connection failures**: Always use `--grpc-web` flag with the ArgoCD CLI when calling from CircleCI, as the environment may not support native gRPC.

**Git push failures on manifest update**: Ensure the `DEPLOY_TOKEN` has write access to the deployment repository and the `[ci skip]` tag prevents infinite pipeline loops.

**Timeout on sync wait**: Increase the timeout parameter or check ArgoCD for stuck health checks. Some resources take longer to become healthy.

**Rate limiting**: If you run many pipelines, you may hit ArgoCD API rate limits. Consider using webhook-based sync detection instead of polling.

## Conclusion

CircleCI and ArgoCD integrate naturally through the GitOps pattern. The manifest update approach is the purest GitOps implementation, while the ArgoCD CLI integration provides more control when you need sync verification and deployment health checks. Use CircleCI approval workflows for production gates and contexts for secure credential management. For other CI platform integrations, see our guides on [GitHub Actions](https://oneuptime.com/blog/post/2026-02-26-argocd-github-actions-integration/view) and [Azure DevOps Pipelines](https://oneuptime.com/blog/post/2026-02-26-argocd-azure-devops-pipelines-integration/view).

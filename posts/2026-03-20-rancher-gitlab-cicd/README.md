# How to Integrate GitLab CI/CD with Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, GitLab, CI/CD

Description: Integrate GitLab CI/CD with Rancher to build container images, run tests on Kubernetes runners, and deploy applications to Rancher-managed clusters.

## Introduction

GitLab CI/CD and Rancher complement each other naturally: GitLab manages source code and pipelines, while Rancher manages Kubernetes clusters. This integration enables pipelines that build Docker images, run tests using Kubernetes-based GitLab Runners, and deploy directly to Rancher-managed clusters using kubeconfig-based authentication.

## Prerequisites

- GitLab instance (self-hosted or GitLab.com)
- Rancher with at least one downstream cluster
- Docker registry (GitLab Container Registry or external)

## Step 1: Install GitLab Runner on a Rancher Cluster

```bash
# Add the GitLab Helm repository

helm repo add gitlab https://charts.gitlab.io
helm repo update

# Create a runner in GitLab, enable Run untagged, and copy its runner authentication token
# GitLab UI: Project → Settings → CI/CD → Runners → Create project runner

# Install GitLab Runner
helm install gitlab-runner gitlab/gitlab-runner \
  --namespace gitlab-runner \
  --create-namespace \
  --set gitlabUrl=https://gitlab.example.com \
  --set runnerToken=<runner-authentication-token> \
  --set rbac.create=true \
  --set runners.privileged=true    # Required for Docker-in-Docker builds
```

## Step 2: Configure CI/CD Variables in GitLab

Store the Rancher kubeconfig as a CI/CD variable:

1. In Rancher UI, go to **Cluster Management**, open the cluster menu (**⋮**), and select **Download KubeConfig**.

```bash
# Base64-encode the downloaded kubeconfig for GitLab
base64 < ./rancher-kubeconfig.yaml | tr -d '\n'
# → Copy the base64 output
```

In GitLab UI:
1. **Project → Settings → CI/CD → Variables**.
2. Add variable:
   - **Key**: `KUBECONFIG_B64`
   - **Value**: (paste base64 kubeconfig)
   - **Type**: Variable
   - Check **Mask variable**

## Step 3: Basic CI/CD Pipeline (.gitlab-ci.yml)

```yaml
# .gitlab-ci.yml

stages:
  - build
  - test
  - deploy

variables:
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  KUBECTL_VERSION: "1.34"   # Match your cluster minor version

workflow:
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

# Build the Docker image
build:
  stage: build
  image: docker:24.0.5-cli
  services:
    - name: docker:24.0.5-dind
      variables:
        HEALTHCHECK_TCP_PORT: "2375"
  variables:
    DOCKER_HOST: tcp://docker:2375
    DOCKER_TLS_CERTDIR: ""
  script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login $CI_REGISTRY --username $CI_REGISTRY_USER --password-stdin
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG

# Run unit tests
test:
  stage: test
  image: maven:3.9-jdk-17
  script:
    - mvn test
  artifacts:
    reports:
      junit: target/surefire-reports/*.xml

# Deploy to Rancher-managed cluster
deploy-staging:
  stage: deploy
  image: bitnami/kubectl:${KUBECTL_VERSION}
  script:
    # Decode the kubeconfig
    - printf '%s' "$KUBECONFIG_B64" | base64 -d > /tmp/kubeconfig
    - export KUBECONFIG=/tmp/kubeconfig

    # Update the deployment
    - kubectl set image deployment/myapp myapp=$IMAGE_TAG -n staging
    - kubectl rollout status deployment/myapp -n staging --timeout=5m
  environment:
    name: staging
    url: https://staging.example.com
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

# Deploy to production (manual gate)
deploy-production:
  stage: deploy
  image: bitnami/kubectl:${KUBECTL_VERSION}
  script:
    - printf '%s' "$KUBECONFIG_PROD_B64" | base64 -d > /tmp/kubeconfig
    - export KUBECONFIG=/tmp/kubeconfig
    - kubectl set image deployment/myapp myapp=$IMAGE_TAG -n production
    - kubectl rollout status deployment/myapp -n production --timeout=5m
  environment:
    name: production
    url: https://myapp.example.com
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      when: manual
```

## Step 4: Use Helm for Deployments

```yaml
# Deploy with Helm in CI/CD
deploy-helm:
  stage: deploy
  image:
    name: alpine/helm:3.14
    entrypoint: [""]
  script:
    - printf '%s' "$KUBECONFIG_B64" | base64 -d > /tmp/kubeconfig
    - export KUBECONFIG=/tmp/kubeconfig

    # Upgrade or install the Helm release
    - helm upgrade --install myapp ./charts/myapp \
        --namespace production \
        --create-namespace \
        --set image.tag=$CI_COMMIT_SHORT_SHA \
        --set image.repository=$CI_REGISTRY_IMAGE \
        --atomic \
        --timeout 5m
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
```

## Step 5: Multi-Cluster Deployment

```yaml
# Deploy to multiple Rancher clusters with a reusable job template
.deploy-template: &deploy-template
  stage: deploy
  image: bitnami/kubectl:${KUBECTL_VERSION}
  script:
    - printf '%s' "$KUBECONFIG" | base64 -d > /tmp/kubeconfig
    - kubectl set image deployment/myapp myapp=$IMAGE_TAG -n production --kubeconfig=/tmp/kubeconfig
    - kubectl rollout status deployment/myapp -n production --kubeconfig=/tmp/kubeconfig
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

deploy-us:
  <<: *deploy-template
  variables:
    KUBECONFIG: $KUBECONFIG_US_B64
  environment:
    name: production-us

deploy-eu:
  <<: *deploy-template
  variables:
    KUBECONFIG: $KUBECONFIG_EU_B64
  environment:
    name: production-eu
```

## Step 6: Add Deployment Metadata Visible in Rancher

```yaml
# Annotate the deployment so the metadata is visible in Rancher
annotate-deployment:
  stage: deploy
  image: bitnami/kubectl:${KUBECTL_VERSION}
  needs:
    - deploy-production
  script:
    - printf '%s' "$KUBECONFIG_PROD_B64" | base64 -d > /tmp/kubeconfig
    - export KUBECONFIG=/tmp/kubeconfig
    - kubectl annotate --overwrite deployment/myapp -n production \
        gitlab.com/pipeline-url="$CI_PIPELINE_URL" \
        gitlab.com/commit-sha="$CI_COMMIT_SHA" \
        gitlab.com/user-login="$GITLAB_USER_LOGIN"
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
```

## Conclusion

GitLab CI/CD with Rancher provides a complete DevSecOps pipeline: code committed to GitLab triggers automated builds, tests, and deployments to Rancher-managed clusters. Kubernetes-native GitLab Runners eliminate the need for static build infrastructure, and manual gates for production deployments provide a safety checkpoint. This integration supports multi-cluster deployments, with GitLab providing pipeline history and Rancher reflecting the resulting workload state in the managed clusters.

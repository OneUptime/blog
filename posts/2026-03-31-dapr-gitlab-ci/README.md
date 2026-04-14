# How to Use GitLab CI with Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GitLab CI, CI/CD, DevOps, Pipeline

Description: Learn how to configure GitLab CI pipelines for Dapr applications including local testing with Dapr CLI, component validation, and Kubernetes deployment stages.

---

GitLab CI provides a rich pipeline environment for Dapr applications. This guide covers setting up stages for testing with the Dapr CLI, building and scanning Docker images, and deploying Dapr components and applications to Kubernetes.

## GitLab CI Configuration File

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - scan
  - deploy-staging
  - integration-test
  - deploy-production

variables:
  DAPR_VERSION: "1.13.0"
  IMAGE_NAME: $CI_REGISTRY_IMAGE/order-service
  IMAGE_TAG: $CI_COMMIT_SHA

default:
  image: python:3.11-slim
```

## Test Stage with Dapr CLI

```yaml
unit-test:
  stage: test
  script:
    - pip install -r requirements.txt -r requirements-dev.txt
    - pytest tests/unit/ -v --junitxml=report.xml
  artifacts:
    reports:
      junit: report.xml

dapr-integration-test:
  stage: test
  image: ubuntu:22.04
  services:
    - redis:7-alpine
  before_script:
    - apt-get update && apt-get install -y wget curl python3 python3-pip
    - wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | bash
    - dapr init --slim --runtime-version $DAPR_VERSION
    - pip3 install -r requirements.txt -r requirements-dev.txt
  script:
    - |
      # Start subscriber in background
      dapr run --app-id subscriber --app-port 5001 \
        --resources-path ./components/local \
        -- python3 subscriber.py &
      SUBSCRIBER_PID=$!
      sleep 3
      # Run tests
      pytest tests/integration/ -v --junitxml=integration-report.xml
      # Cleanup
      kill $SUBSCRIBER_PID 2>/dev/null || true
  artifacts:
    reports:
      junit: integration-report.xml
```

## Build Stage

```yaml
build-image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $IMAGE_NAME:$IMAGE_TAG .
    - docker push $IMAGE_NAME:$IMAGE_TAG
    - docker tag $IMAGE_NAME:$IMAGE_TAG $IMAGE_NAME:latest
    - docker push $IMAGE_NAME:latest
```

## Security Scan Stage

```yaml
container-scan:
  stage: scan
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  script:
    - trivy image --exit-code 1 --severity HIGH,CRITICAL $IMAGE_NAME:$IMAGE_TAG
  allow_failure: false

manifest-scan:
  stage: scan
  image:
    name: bridgecrew/checkov:latest
    entrypoint: [""]
  script:
    - checkov -d k8s/ --framework kubernetes --output cli
  allow_failure: false
```

## Deploy Dapr Components to Staging

```yaml
deploy-staging-components:
  stage: deploy-staging
  image: bitnami/kubectl:latest
  environment:
    name: staging
    url: https://api-staging.example.com
  before_script:
    - echo $STAGING_KUBECONFIG | base64 -d > /tmp/kubeconfig
    - export KUBECONFIG=/tmp/kubeconfig
  script:
    - kubectl apply -f k8s/components/ -n staging
    - kubectl apply -f k8s/config/ -n staging
    - kubectl set image deployment/order-service order-service=$IMAGE_NAME:$IMAGE_TAG -n staging
    - kubectl rollout status deployment/order-service -n staging --timeout=5m
  only:
    - main
    - develop
```

## Production Deployment with Manual Gate

```yaml
deploy-production:
  stage: deploy-production
  image: bitnami/kubectl:latest
  environment:
    name: production
    url: https://api.example.com
  when: manual
  only:
    - main
  before_script:
    - echo $PROD_KUBECONFIG | base64 -d > /tmp/kubeconfig
    - export KUBECONFIG=/tmp/kubeconfig
  script:
    - kubectl apply -f k8s/components/ -n production
    - kubectl set image deployment/order-service order-service=$IMAGE_NAME:$IMAGE_TAG -n production
    - kubectl rollout status deployment/order-service -n production --timeout=10m
```

## Summary

GitLab CI supports Dapr application pipelines through multi-stage workflows that install the Dapr CLI for local testing, build and scan container images, and use kubectl to deploy both Dapr components and application deployments. Use the `when: manual` gate for production deployments and always deploy Dapr components before updating the application image.

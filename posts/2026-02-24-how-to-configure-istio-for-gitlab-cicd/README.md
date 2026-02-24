# How to Configure Istio for GitLab CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, GitLab, CI/CD, Kubernetes, DevOps

Description: Step-by-step guide to deploying and managing Istio service mesh resources through GitLab CI/CD pipelines with canary releases and validation.

---

GitLab CI/CD has some really nice features for Kubernetes deployments, and when you pair it with Istio, you get a solid pipeline for progressive delivery. GitLab's built-in environments, review apps, and deployment tracking work well alongside Istio's traffic management.

This guide covers setting up a GitLab CI/CD pipeline that handles Istio deployments, traffic shifting, and automated validation.

## Setting Up the GitLab Runner

Your GitLab Runner needs access to your Kubernetes cluster. The easiest approach is to use the Kubernetes executor for GitLab Runner, which runs pipeline jobs as pods inside the cluster. But if you are using shared runners, you will need to provide cluster credentials.

Add your kubeconfig as a CI/CD variable:

1. Go to Settings > CI/CD > Variables
2. Add `KUBE_CONFIG` with your base64-encoded kubeconfig
3. Mark it as protected and masked

You will also want these variables:
- `REGISTRY_USER` - Container registry username
- `REGISTRY_PASSWORD` - Container registry password
- `CONTAINER_REGISTRY` - Your registry URL (e.g., `registry.gitlab.com/your-group/your-project`)

## The Pipeline Configuration

Create a `.gitlab-ci.yml` at the root of your repository:

```yaml
stages:
  - build
  - validate
  - deploy-canary
  - test-canary
  - promote
  - cleanup

variables:
  DOCKER_TLS_CERTDIR: "/certs"
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  KUBECTL_VERSION: "1.28.0"
  ISTIO_VERSION: "1.20.0"

.kube_setup: &kube_setup
  before_script:
    - mkdir -p $HOME/.kube
    - echo "$KUBE_CONFIG" | base64 -d > $HOME/.kube/config
    - chmod 600 $HOME/.kube/config

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG
  only:
    - main
```

## Validating Istio Manifests

Before deploying anything, validate your Istio configuration files. This catches errors early:

```yaml
validate-istio:
  stage: validate
  image: bitnami/kubectl:$KUBECTL_VERSION
  <<: *kube_setup
  script:
    - curl -L https://istio.io/downloadIstio | ISTIO_VERSION=$ISTIO_VERSION sh -
    - export PATH=$PWD/istio-$ISTIO_VERSION/bin:$PATH
    - |
      for file in k8s/istio/*.yaml; do
        echo "Validating $file..."
        istioctl validate -f "$file"
        if [ $? -ne 0 ]; then
          echo "Validation failed for $file"
          exit 1
        fi
      done
    - echo "All Istio manifests are valid"
  only:
    - main
    - merge_requests
```

## Deploying the Canary

The canary deployment stage creates a new version alongside the existing one and routes a small amount of traffic to it:

```yaml
deploy-canary:
  stage: deploy-canary
  image: bitnami/kubectl:$KUBECTL_VERSION
  <<: *kube_setup
  script:
    - |
      cat <<EOF | kubectl apply -f -
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: my-app-canary
        namespace: production
        labels:
          app: my-app
          version: canary
      spec:
        replicas: 1
        selector:
          matchLabels:
            app: my-app
            version: canary
        template:
          metadata:
            labels:
              app: my-app
              version: canary
          spec:
            containers:
            - name: my-app
              image: $IMAGE_TAG
              ports:
              - containerPort: 8080
      EOF
    - kubectl rollout status deployment/my-app-canary -n production --timeout=180s
    - |
      cat <<EOF | kubectl apply -f -
      apiVersion: networking.istio.io/v1beta1
      kind: VirtualService
      metadata:
        name: my-app
        namespace: production
      spec:
        hosts:
        - my-app
        http:
        - route:
          - destination:
              host: my-app
              subset: stable
            weight: 90
          - destination:
              host: my-app
              subset: canary
            weight: 10
      EOF
  environment:
    name: production/canary
    url: https://my-app.example.com
  only:
    - main
```

## Testing the Canary

After the canary is deployed, run automated tests against it and check metrics:

```yaml
test-canary:
  stage: test-canary
  image: curlimages/curl:latest
  <<: *kube_setup
  script:
    - echo "Waiting for canary traffic to flow..."
    - sleep 120
    - |
      # Run smoke tests against the canary
      for i in $(seq 1 50); do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
          -H "Host: my-app.example.com" \
          http://istio-ingressgateway.istio-system/health)
        if [ "$STATUS" != "200" ]; then
          FAILURES=$((FAILURES + 1))
        fi
      done
    - |
      if [ "${FAILURES:-0}" -gt 5 ]; then
        echo "Too many failures: $FAILURES out of 50 requests"
        exit 1
      fi
    - echo "Canary tests passed"
  only:
    - main
```

## Promoting the Canary

If testing passes, shift all traffic to the new version:

```yaml
promote:
  stage: promote
  image: bitnami/kubectl:$KUBECTL_VERSION
  <<: *kube_setup
  script:
    - |
      # Update the stable deployment with the new image
      kubectl set image deployment/my-app-stable \
        my-app=$IMAGE_TAG \
        -n production
    - kubectl rollout status deployment/my-app-stable -n production --timeout=300s
    - |
      # Route all traffic to stable
      cat <<EOF | kubectl apply -f -
      apiVersion: networking.istio.io/v1beta1
      kind: VirtualService
      metadata:
        name: my-app
        namespace: production
      spec:
        hosts:
        - my-app
        http:
        - route:
          - destination:
              host: my-app
              subset: stable
            weight: 100
      EOF
  environment:
    name: production
    url: https://my-app.example.com
  only:
    - main
```

## Cleanup and Rollback

Add a cleanup job that removes the canary deployment, and a rollback job for failures:

```yaml
cleanup:
  stage: cleanup
  image: bitnami/kubectl:$KUBECTL_VERSION
  <<: *kube_setup
  script:
    - kubectl delete deployment my-app-canary -n production --ignore-not-found
  when: always
  only:
    - main

rollback:
  stage: cleanup
  image: bitnami/kubectl:$KUBECTL_VERSION
  <<: *kube_setup
  script:
    - |
      cat <<EOF | kubectl apply -f -
      apiVersion: networking.istio.io/v1beta1
      kind: VirtualService
      metadata:
        name: my-app
        namespace: production
      spec:
        hosts:
        - my-app
        http:
        - route:
          - destination:
              host: my-app
              subset: stable
            weight: 100
      EOF
    - kubectl delete deployment my-app-canary -n production --ignore-not-found
    - echo "Rolled back to stable version"
  when: on_failure
  only:
    - main
```

## Using GitLab Environments for Tracking

GitLab environments give you a nice UI for tracking deployments. Combine them with Istio to create review apps that get their own traffic routing:

```yaml
deploy-review:
  stage: deploy-canary
  image: bitnami/kubectl:$KUBECTL_VERSION
  <<: *kube_setup
  script:
    - export REVIEW_SLUG=$(echo $CI_COMMIT_REF_SLUG | head -c 20)
    - |
      cat <<EOF | kubectl apply -f -
      apiVersion: networking.istio.io/v1beta1
      kind: VirtualService
      metadata:
        name: my-app-$REVIEW_SLUG
        namespace: review
      spec:
        hosts:
        - my-app-$REVIEW_SLUG.review.example.com
        gateways:
        - review-gateway
        http:
        - route:
          - destination:
              host: my-app-$REVIEW_SLUG
      EOF
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    url: https://my-app-$CI_COMMIT_REF_SLUG.review.example.com
    on_stop: stop-review
  only:
    - merge_requests
```

## Pipeline Variables for Flexibility

Make your pipeline configurable with variables:

```yaml
variables:
  CANARY_WEIGHT: "10"
  CANARY_WAIT_SECONDS: "120"
  ERROR_THRESHOLD: "5"
  NAMESPACE: "production"
```

This way you can override values per-pipeline run through the GitLab UI without modifying the YAML.

## Tips for Production

Keep your Istio manifests in a separate repository and use GitLab's multi-project pipelines to trigger deployments. This gives you a clear audit trail of infrastructure changes separate from application code changes.

Use GitLab's protected environments feature to require approval before the promote stage runs. This adds a manual gate between the canary and full rollout.

Store your DestinationRule and Gateway resources separately from your per-deployment VirtualService. The DestinationRule and Gateway rarely change, while the VirtualService gets updated on every deployment.

Setting up Istio with GitLab CI/CD takes some initial effort, but once the pipeline is in place, you get automated canary deployments with built-in rollback. The combination of GitLab's environment tracking and Istio's traffic management gives you full visibility into what version is serving traffic and makes it straightforward to trace issues back to specific deployments.

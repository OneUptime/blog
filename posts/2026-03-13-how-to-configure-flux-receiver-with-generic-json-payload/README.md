# How to Configure Flux Receiver with Generic JSON Payload

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, Webhooks, Generic, JSON, CI/CD

Description: Learn how to configure a Flux Receiver with the generic type to accept JSON webhook payloads from any CI/CD system or custom automation tool.

---

## Introduction

Not every webhook source has a dedicated Flux Receiver type. CI/CD platforms like Jenkins, CircleCI, Tekton, Argo Workflows, and custom automation tools all generate webhook events that you might want to use as reconciliation triggers. The generic Receiver type in Flux accepts any JSON payload, making it a universal integration point for systems that do not have a built-in receiver type.

This guide covers how to configure a generic Flux Receiver, connect it to various CI/CD systems, and use it to build flexible event-driven reconciliation workflows.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux v2 installed and bootstrapped
- The notification controller accessible from your CI/CD system
- kubectl access to the flux-system namespace
- A CI/CD system or automation tool capable of sending HTTP POST requests

## How the Generic Receiver Works

The generic Receiver type accepts any HTTP POST request and validates it using an HMAC signature or a simple token header. Unlike provider-specific receivers (GitHub, GitLab, etc.), the generic type does not parse the payload for event-specific information. It simply validates the request and triggers reconciliation of the specified resources.

This makes it ideal for any system that can send an HTTP POST request with an authorization header.

## Creating the Webhook Secret

Create the authentication secret:

```bash
TOKEN=$(openssl rand -hex 32)
kubectl create secret generic generic-webhook-token \
  --namespace=flux-system \
  --from-literal=token=$TOKEN
```

YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: generic-webhook-token
  namespace: flux-system
stringData:
  token: "your-secure-random-token-here"
```

## Configuring the Generic Receiver

Create the Receiver with the `generic` type:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: generic-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: generic-webhook-token
  resources:
    - kind: GitRepository
      name: app-repo
    - kind: Kustomization
      name: apps
```

The generic Receiver does not require an `events` field since it processes all incoming requests that pass authentication.

## Applying and Getting the Webhook URL

Apply the Receiver and get the webhook path:

```bash
kubectl apply -f generic-receiver.yaml
kubectl get receiver generic-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

The complete webhook URL is your notification controller domain plus the webhook path.

## Calling the Generic Receiver

The generic receiver expects the token in the request body or as a header. Send a POST request with the token:

```bash
curl -X POST https://flux-webhook.yourdomain.com/hook/abc123... \
  -H "Content-Type: application/json" \
  -d '{}'
```

For HMAC-based validation, the generic receiver uses the token to verify the request body:

```bash
BODY='{}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "your-secure-random-token-here" | awk '{print $2}')
curl -X POST https://flux-webhook.yourdomain.com/hook/abc123... \
  -H "Content-Type: application/json" \
  -d "$BODY"
```

## Using with Generic HMAC Receiver

For systems that support HMAC signatures, use the `generic-hmac` type:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: generic-hmac-receiver
  namespace: flux-system
spec:
  type: generic-hmac
  secretRef:
    name: generic-webhook-token
  resources:
    - kind: GitRepository
      name: app-repo
    - kind: Kustomization
      name: apps
```

The `generic-hmac` type validates the `X-Signature` header against the HMAC-SHA256 of the request body using the shared secret.

## Integration with Jenkins

Configure a Jenkins pipeline to trigger Flux after a successful build:

```groovy
pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                sh 'docker build -t myapp:${BUILD_NUMBER} .'
                sh 'docker push myapp:${BUILD_NUMBER}'
            }
        }
        stage('Trigger Flux') {
            steps {
                sh '''
                    curl -X POST https://flux-webhook.yourdomain.com/hook/abc123... \
                      -H "Content-Type: application/json" \
                      -d '{"build": "'${BUILD_NUMBER}'"}'
                '''
            }
        }
    }
}
```

## Integration with CircleCI

Add a step in your CircleCI config to trigger the Receiver:

```yaml
version: 2.1
jobs:
  deploy-trigger:
    docker:
      - image: cimg/base:stable
    steps:
      - run:
          name: Trigger Flux Reconciliation
          command: |
            curl -X POST https://flux-webhook.yourdomain.com/hook/abc123... \
              -H "Content-Type: application/json" \
              -d '{"pipeline_id": "'$CIRCLE_PIPELINE_ID'", "branch": "'$CIRCLE_BRANCH'"}'

workflows:
  build-and-deploy:
    jobs:
      - build
      - deploy-trigger:
          requires:
            - build
```

## Integration with Tekton

Create a Tekton Task that calls the generic receiver:

```yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: trigger-flux
  namespace: ci-system
spec:
  params:
    - name: webhook-url
      type: string
  steps:
    - name: trigger
      image: curlimages/curl:latest
      script: |
        curl -X POST $(params.webhook-url) \
          -H "Content-Type: application/json" \
          -d '{"source": "tekton", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
```

## Integration with Custom Scripts

Any system that can make HTTP requests can trigger the generic receiver. A simple bash script:

```bash
#!/bin/bash
WEBHOOK_URL="https://flux-webhook.yourdomain.com/hook/abc123..."

# Trigger after deployment artifact is ready
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"source\": \"custom-script\",
    \"artifact\": \"$ARTIFACT_NAME\",
    \"version\": \"$VERSION\"
  }"
```

## Multiple Generic Receivers for Different Pipelines

Create separate receivers for different CI/CD pipelines:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: ci-build-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: ci-webhook-token
  resources:
    - kind: GitRepository
      name: app-repo
    - kind: ImageRepository
      name: my-app
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: infra-deploy-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: infra-webhook-token
  resources:
    - kind: GitRepository
      name: infrastructure-repo
    - kind: Kustomization
      name: infrastructure
```

Each receiver has its own webhook URL and secret, allowing independent triggering from different systems.

## Exposing the Notification Controller

Standard ingress configuration:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-generic-webhook
  namespace: flux-system
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - flux-webhook.yourdomain.com
      secretName: webhook-tls
  rules:
    - host: flux-webhook.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: notification-controller
                port:
                  number: 80
```

## Triggering Specific Resources

Target only the resources that need reconciliation:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: targeted-generic-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: generic-webhook-token
  resources:
    - kind: HelmRelease
      name: my-app
      namespace: production
    - kind: HelmRelease
      name: my-app
      namespace: staging
```

This triggers reconciliation only for specific HelmReleases, leaving other resources on their normal polling schedule.

## Verifying the Integration

Test the generic receiver with curl:

```bash
curl -v -X POST https://flux-webhook.yourdomain.com/hook/abc123... \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

A successful response returns HTTP 200. Monitor the notification controller:

```bash
kubectl logs -n flux-system deployment/notification-controller --tail=50 -f
```

Verify the targeted resources were reconciled:

```bash
flux get sources git app-repo -n flux-system
flux get kustomizations -n flux-system
```

## Troubleshooting

If the generic receiver is not triggering reconciliation:

Verify the Receiver status:

```bash
kubectl describe receiver generic-receiver -n flux-system
```

Test with a simple curl command to isolate networking issues from payload issues. The generic receiver should accept any valid JSON body.

Check the notification controller logs:

```bash
kubectl logs -n flux-system deployment/notification-controller | grep -i "error\|generic\|receiver"
```

Ensure the webhook URL path is correct. A common mistake is using the Receiver name instead of the generated webhook path from the status field.

## Conclusion

The generic Flux Receiver is the most versatile webhook integration point in the Flux notification system. By accepting any JSON payload with simple token or HMAC authentication, it connects Flux to any CI/CD platform or automation tool that can send HTTP POST requests. Whether you are using Jenkins, CircleCI, Tekton, or custom scripts, the generic receiver provides a standard interface for triggering event-driven reconciliation. Use separate receivers with different secrets for different pipelines to maintain security isolation, and target specific resources to keep reconciliation focused and efficient.

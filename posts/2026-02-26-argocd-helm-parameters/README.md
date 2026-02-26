# How to Pass Helm Parameters as ArgoCD Application Parameters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, CI/CD

Description: Learn how to pass Helm parameters in ArgoCD applications using set parameters, set-string, set-json, and environment variables for dynamic configuration.

---

Helm parameters in ArgoCD map directly to Helm's `--set` flags. They let you override individual values without maintaining separate values files, making them particularly useful for CI/CD pipelines where you need to dynamically set values like image tags, build numbers, or feature flags.

This guide covers all the ways to pass Helm parameters in ArgoCD, including standard parameters, string parameters, JSON parameters, and integration with CI/CD pipelines.

## Basic Helm Parameters

Helm parameters are key-value pairs specified in the Application spec:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/helm-charts.git
    targetRevision: main
    path: charts/my-app
    helm:
      parameters:
        # Simple value
        - name: replicaCount
          value: "3"
        # Nested value using dot notation
        - name: image.repository
          value: "myorg/my-app"
        - name: image.tag
          value: "v2.0.0"
        # Boolean values
        - name: ingress.enabled
          value: "true"
        - name: metrics.enabled
          value: "true"
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

Each parameter is equivalent to running `helm install --set key=value`.

## Using the CLI to Set Parameters

```bash
# Set a single parameter
argocd app set my-app -p image.tag=v2.0.0

# Set multiple parameters
argocd app set my-app \
  -p image.tag=v2.0.0 \
  -p replicaCount=3 \
  -p ingress.enabled=true

# Remove a parameter
argocd app unset my-app -p image.tag
```

## String Parameters (forceString)

Helm sometimes interprets values in ways you do not expect. For example, the value `1.0` might be treated as a number instead of a string. Use `forceString` to prevent this:

```yaml
helm:
  parameters:
    # Without forceString, "1.0" might become 1 (a number)
    - name: image.tag
      value: "1.0"
      forceString: true
    # Another common case: values that look like scientific notation
    - name: config.version
      value: "1e10"
      forceString: true
    # Values that look like booleans
    - name: config.value
      value: "true"
      forceString: true  # Keeps it as string "true" instead of boolean true
```

Using the CLI:

```bash
# Force string type with --helm-set-string
argocd app set my-app --helm-set-string image.tag=1.0
```

## JSON Parameters

For complex values like arrays or nested objects, use JSON parameters:

```yaml
helm:
  parameters:
    # Set a JSON value
    - name: resources.requests
      value: '{"memory": "512Mi", "cpu": "500m"}'
    # Set an array
    - name: env
      value: '[{"name": "LOG_LEVEL", "value": "info"}, {"name": "PORT", "value": "8080"}]'
```

Alternatively, use the `valuesObject` field for complex structures:

```yaml
helm:
  valuesObject:
    resources:
      requests:
        memory: "512Mi"
        cpu: "500m"
    env:
      - name: LOG_LEVEL
        value: info
      - name: PORT
        value: "8080"
```

## Array Indexing in Parameters

Access specific array elements using bracket notation:

```yaml
helm:
  parameters:
    # Set the first element of the env array
    - name: "env[0].name"
      value: "DATABASE_URL"
    - name: "env[0].value"
      value: "postgres://db:5432/myapp"
    # Set the second element
    - name: "env[1].name"
      value: "REDIS_URL"
    - name: "env[1].value"
      value: "redis://cache:6379"
```

## Parameters vs Values Files vs Inline Values

Understanding when to use each approach:

| Method | Best For | Example |
|--------|----------|---------|
| Parameters | CI/CD overrides, single values | Image tags, feature flags |
| Values files | Bulk configuration, environment settings | Full environment config |
| Inline values | Moderate customization, structured data | Third-party chart overrides |

Parameters have the highest precedence, so they always win:

```yaml
helm:
  # Values file says replicaCount: 3
  valueFiles:
    - values-prod.yaml
  # Inline values say replicaCount: 5
  values: |
    replicaCount: 5
  # Parameter says replicaCount: 10 - THIS WINS
  parameters:
    - name: replicaCount
      value: "10"
```

## CI/CD Integration Patterns

### GitHub Actions

```yaml
# .github/workflows/deploy.yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push Docker image
        run: |
          IMAGE_TAG=$(git rev-parse --short HEAD)
          docker build -t myorg/my-app:$IMAGE_TAG .
          docker push myorg/my-app:$IMAGE_TAG
          echo "IMAGE_TAG=$IMAGE_TAG" >> $GITHUB_ENV

      - name: Update ArgoCD application
        run: |
          argocd login argocd.example.com \
            --username ${{ secrets.ARGOCD_USER }} \
            --password ${{ secrets.ARGOCD_PASSWORD }} \
            --grpc-web

          # Set the image tag parameter
          argocd app set my-app-production \
            -p image.tag=${{ env.IMAGE_TAG }}

          # Wait for sync
          argocd app sync my-app-production
          argocd app wait my-app-production --health --timeout 300
```

### GitLab CI

```yaml
# .gitlab-ci.yml
deploy-production:
  stage: deploy
  script:
    - argocd login $ARGOCD_SERVER --username $ARGOCD_USER --password $ARGOCD_PASSWORD --grpc-web
    - argocd app set my-app-production -p image.tag=$CI_COMMIT_SHORT_SHA
    - argocd app sync my-app-production
    - argocd app wait my-app-production --health
  only:
    - main
```

### Jenkins Pipeline

```groovy
pipeline {
    stages {
        stage('Deploy') {
            steps {
                sh """
                    argocd login ${ARGOCD_SERVER} \
                        --username ${ARGOCD_USER} \
                        --password ${ARGOCD_PASSWORD} \
                        --grpc-web
                    argocd app set my-app-production \
                        -p image.tag=${env.BUILD_NUMBER}
                    argocd app sync my-app-production
                    argocd app wait my-app-production --health
                """
            }
        }
    }
}
```

## Parameters in ApplicationSets

Use parameters with ApplicationSets for multi-environment deployments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: dev
            replicas: "1"
            imageTag: "latest"
          - env: staging
            replicas: "2"
            imageTag: "v2.0.0-rc.1"
          - env: production
            replicas: "3"
            imageTag: "v2.0.0"
  template:
    metadata:
      name: 'my-app-{{env}}'
    spec:
      source:
        repoURL: https://github.com/myorg/helm-charts.git
        path: charts/my-app
        helm:
          parameters:
            - name: replicaCount
              value: '{{replicas}}'
            - name: image.tag
              value: '{{imageTag}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{env}}'
```

## Viewing Current Parameters

```bash
# List all parameters for an application
argocd app get my-app -o json | jq '.spec.source.helm.parameters'

# See rendered manifests with current parameters
argocd app manifests my-app

# Diff to see what parameters would change
argocd app diff my-app
```

## Summary

Helm parameters in ArgoCD give you fine-grained control over individual chart values, making them ideal for CI/CD integration where you need to dynamically set values like image tags. Use `forceString` for values that might be misinterpreted by YAML, and remember that parameters have the highest precedence among all override methods. For bulk configuration, combine parameters with [values files](https://oneuptime.com/blog/post/2026-02-26-argocd-helm-values-files/view) and [inline values](https://oneuptime.com/blog/post/2026-02-26-argocd-override-helm-values/view).

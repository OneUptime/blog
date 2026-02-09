# How to Configure GitHub Actions Matrix Builds for Kubernetes Multi-Cluster Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Kubernetes, CI/CD

Description: Learn how to use GitHub Actions matrix builds to deploy applications to multiple Kubernetes clusters in parallel, with environment-specific configurations and proper error handling.

---

Managing deployments across multiple Kubernetes clusters presents unique challenges. You need to deploy to development, staging, and production clusters, often spanning multiple regions or cloud providers. GitHub Actions matrix builds provide an elegant solution by running parallel deployment jobs with environment-specific configurations. This guide demonstrates building a robust multi-cluster deployment pipeline using matrix strategies.

## Understanding Matrix Build Benefits

Matrix builds execute the same workflow with different parameter combinations. For multi-cluster deployments, this means deploying to all your clusters simultaneously rather than sequentially. A deployment that once took 15 minutes across five clusters now completes in 3 minutes with proper parallelization.

Beyond speed, matrices provide consistency. Each deployment uses identical steps, reducing configuration drift between environments. They also improve visibility by showing deployment status for each cluster in a single workflow run, making it easy to identify which clusters succeeded or failed.

## Basic Multi-Cluster Matrix Configuration

Start with a simple matrix that deploys to multiple clusters:

```yaml
# .github/workflows/deploy-multi-cluster.yml
name: Multi-Cluster Deployment

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        cluster:
          - name: dev-us-west
            context: dev-us-west-1
            namespace: myapp-dev
            replicas: 2
          - name: staging-us-east
            context: staging-us-east-1
            namespace: myapp-staging
            replicas: 3
          - name: prod-us-west
            context: prod-us-west-1
            namespace: myapp-prod
            replicas: 5
          - name: prod-eu-west
            context: prod-eu-west-1
            namespace: myapp-prod
            replicas: 5

    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          method: kubeconfig
          kubeconfig: ${{ secrets[format('KUBECONFIG_{0}', matrix.cluster.context)] }}

      - name: Deploy to ${{ matrix.cluster.name }}
        run: |
          echo "Deploying to cluster: ${{ matrix.cluster.name }}"

          # Create namespace if it doesn't exist
          kubectl create namespace ${{ matrix.cluster.namespace }} --dry-run=client -o yaml | kubectl apply -f -

          # Update deployment with environment-specific replica count
          kubectl set image deployment/myapp \
            myapp=myregistry.azurecr.io/myapp:${{ github.sha }} \
            -n ${{ matrix.cluster.namespace }}

          kubectl scale deployment/myapp \
            --replicas=${{ matrix.cluster.replicas }} \
            -n ${{ matrix.cluster.namespace }}

          # Wait for rollout to complete
          kubectl rollout status deployment/myapp \
            -n ${{ matrix.cluster.namespace }} \
            --timeout=5m
```

This workflow deploys to four clusters in parallel, each with environment-specific configurations.

## Advanced Matrix with Environment Variables

For complex deployments, use matrix combinations with environment-specific variables:

```yaml
name: Advanced Multi-Cluster Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: choice
        options:
          - dev
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          # Development clusters
          - environment: dev
            cluster: dev-us-west
            context: arn:aws:eks:us-west-2:123456789012:cluster/dev-cluster
            region: us-west-2
            replicas: 2
            resources_cpu: "100m"
            resources_memory: "256Mi"

          # Staging clusters
          - environment: staging
            cluster: staging-us-east
            context: arn:aws:eks:us-east-1:123456789012:cluster/staging-cluster
            region: us-east-1
            replicas: 3
            resources_cpu: "500m"
            resources_memory: "512Mi"

          # Production clusters - multi-region
          - environment: production
            cluster: prod-us-west
            context: arn:aws:eks:us-west-2:123456789012:cluster/prod-cluster
            region: us-west-2
            replicas: 10
            resources_cpu: "1000m"
            resources_memory: "2Gi"

          - environment: production
            cluster: prod-eu-west
            context: arn:aws:eks:eu-west-1:123456789012:cluster/prod-eu-cluster
            region: eu-west-1
            replicas: 10
            resources_cpu: "1000m"
            resources_memory: "2Gi"

          - environment: production
            cluster: prod-ap-southeast
            context: arn:aws:eks:ap-southeast-1:123456789012:cluster/prod-ap-cluster
            region: ap-southeast-1
            replicas: 8
            resources_cpu: "1000m"
            resources_memory: "2Gi"

      # Only deploy to clusters matching selected environment
      fail-fast: false
      max-parallel: 5

    # Filter matrix based on input
    if: matrix.environment == github.event.inputs.environment

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ matrix.region }}

      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig \
            --name $(echo "${{ matrix.context }}" | cut -d'/' -f2) \
            --region ${{ matrix.region }}

      - name: Generate deployment manifest
        run: |
          cat > deployment.yaml <<EOF
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: myapp
            namespace: myapp-${{ matrix.environment }}
            labels:
              app: myapp
              environment: ${{ matrix.environment }}
              cluster: ${{ matrix.cluster }}
          spec:
            replicas: ${{ matrix.replicas }}
            selector:
              matchLabels:
                app: myapp
            template:
              metadata:
                labels:
                  app: myapp
                  environment: ${{ matrix.environment }}
                  version: ${{ github.sha }}
              spec:
                containers:
                  - name: myapp
                    image: myregistry.azurecr.io/myapp:${{ github.sha }}
                    ports:
                      - containerPort: 8080
                    resources:
                      requests:
                        cpu: ${{ matrix.resources_cpu }}
                        memory: ${{ matrix.resources_memory }}
                      limits:
                        cpu: ${{ matrix.resources_cpu }}
                        memory: ${{ matrix.resources_memory }}
                    env:
                      - name: ENVIRONMENT
                        value: ${{ matrix.environment }}
                      - name: CLUSTER_NAME
                        value: ${{ matrix.cluster }}
                      - name: REGION
                        value: ${{ matrix.region }}
          EOF

      - name: Deploy to ${{ matrix.cluster }}
        run: |
          kubectl apply -f deployment.yaml
          kubectl rollout status deployment/myapp \
            -n myapp-${{ matrix.environment }} \
            --timeout=10m

      - name: Verify deployment health
        run: |
          # Check that all pods are ready
          kubectl wait --for=condition=ready pod \
            -l app=myapp \
            -n myapp-${{ matrix.environment }} \
            --timeout=5m

          # Get deployment status
          kubectl get deployment myapp \
            -n myapp-${{ matrix.environment }} \
            -o jsonpath='{.status.conditions[?(@.type=="Available")].status}'
```

This advanced configuration uses matrix filtering to deploy only to selected environments while maintaining all configuration in one place.

## Handling Deployment Failures Gracefully

Configure failure handling to continue deployments even if one cluster fails:

```yaml
jobs:
  deploy:
    strategy:
      matrix:
        cluster: [...]
      fail-fast: false  # Continue deploying to other clusters if one fails
      max-parallel: 10  # Limit concurrent deployments

    steps:
      - name: Deploy with retry logic
        uses: nick-invision/retry@v2
        with:
          timeout_minutes: 10
          max_attempts: 3
          retry_on: error
          command: |
            kubectl apply -f k8s/
            kubectl rollout status deployment/myapp \
              -n ${{ matrix.cluster.namespace }} \
              --timeout=5m

      - name: Report deployment failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `❌ Deployment to cluster **${{ matrix.cluster.name }}** failed. Please investigate.`
            })
```

This configuration prevents one failing cluster from blocking deployments to others, and automatically creates issue comments for failures.

## Dynamic Matrix from Configuration File

For managing many clusters, generate the matrix dynamically from a configuration file:

```yaml
# clusters.json
{
  "clusters": [
    {
      "name": "dev-us-west",
      "context": "dev-us-west-1",
      "namespace": "myapp-dev",
      "replicas": 2,
      "environment": "dev"
    },
    {
      "name": "prod-us-west",
      "context": "prod-us-west-1",
      "namespace": "myapp-prod",
      "replicas": 10,
      "environment": "production"
    }
  ]
}
```

Generate matrix from this file:

```yaml
name: Dynamic Multi-Cluster Deploy

jobs:
  prepare:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4

      - name: Generate matrix
        id: set-matrix
        run: |
          MATRIX=$(jq -c '.clusters' clusters.json)
          echo "matrix=${MATRIX}" >> $GITHUB_OUTPUT

  deploy:
    needs: prepare
    runs-on: ubuntu-latest
    strategy:
      matrix:
        cluster: ${{ fromJson(needs.prepare.outputs.matrix) }}
      fail-fast: false

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to ${{ matrix.cluster.name }}
        run: |
          echo "Deploying to ${{ matrix.cluster.name }}"
          echo "Environment: ${{ matrix.cluster.environment }}"
          echo "Replicas: ${{ matrix.cluster.replicas }}"
```

This approach makes it easy to add or modify clusters without touching workflow files.

## Progressive Rollout Across Clusters

Implement canary deployments by staging rollouts across clusters:

```yaml
jobs:
  deploy-canary:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        cluster:
          - {name: "prod-canary", weight: "10%", stage: 1}
    steps:
      - name: Deploy canary
        run: kubectl apply -f k8s/canary/

  validate-canary:
    needs: deploy-canary
    runs-on: ubuntu-latest
    steps:
      - name: Run smoke tests
        run: ./scripts/smoke-tests.sh

  deploy-main:
    needs: validate-canary
    runs-on: ubuntu-latest
    strategy:
      matrix:
        cluster:
          - {name: "prod-us-west", stage: 2}
          - {name: "prod-eu-west", stage: 2}
      fail-fast: true  # Stop if first cluster fails
    steps:
      - name: Deploy to production
        run: kubectl apply -f k8s/production/

  deploy-remaining:
    needs: deploy-main
    runs-on: ubuntu-latest
    strategy:
      matrix:
        cluster:
          - {name: "prod-ap-southeast", stage: 3}
          - {name: "prod-ap-northeast", stage: 3}
    steps:
      - name: Deploy to remaining regions
        run: kubectl apply -f k8s/production/
```

This staged approach validates deployments in a canary cluster before proceeding to production regions.

## Collecting and Reporting Deployment Metrics

Aggregate deployment results across all clusters:

```yaml
jobs:
  deploy:
    # ... matrix deployment steps ...

    outputs:
      deployment-status: ${{ steps.deploy.outcome }}

  report:
    needs: deploy
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Collect deployment results
        uses: actions/github-script@v7
        with:
          script: |
            const deployJobs = context.payload.workflow_run.jobs;
            const results = deployJobs
              .filter(job => job.name.startsWith('deploy'))
              .map(job => ({
                cluster: job.name,
                status: job.conclusion,
                duration: job.completed_at - job.started_at
              }));

            const summary = results.reduce((acc, r) => {
              acc[r.status] = (acc[r.status] || 0) + 1;
              return acc;
            }, {});

            console.log('Deployment Summary:', summary);

            // Post to Slack, create issue, etc.
```

This provides visibility into which clusters succeeded or failed across the entire deployment.

## Conclusion

GitHub Actions matrix builds transform multi-cluster deployments from a sequential bottleneck into a fast, parallel operation. By encoding environment-specific configuration in the matrix and using proper failure handling, you create resilient deployment pipelines that scale to dozens of clusters without adding complexity.

The key is balancing parallelism with safety. Use `fail-fast: false` for independent environments but enable it for progressive rollouts where later stages depend on earlier success. Combined with dynamic matrix generation and comprehensive reporting, you build deployment automation that handles real-world complexity while remaining maintainable.

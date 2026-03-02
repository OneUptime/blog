# How to Set Up Complete CI/CD Pipeline with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CI/CD, GitOps, Canary Deployment, Kubernetes

Description: Build a CI/CD pipeline that leverages Istio traffic management for canary deployments, automated rollbacks, and safe production releases.

---

Istio's traffic management capabilities make it a natural fit for CI/CD pipelines. Instead of just deploying a new version and hoping for the best, you can use Istio to gradually shift traffic, monitor error rates, and automatically roll back if something goes wrong. Here's how to build a pipeline that takes advantage of these features.

## Pipeline Architecture

The pipeline we're building has these stages:

1. **Build**: Compile, test, and create container image
2. **Deploy to Staging**: Deploy to a staging namespace with Istio
3. **Validate Staging**: Run integration tests against staging
4. **Deploy Canary**: Deploy the new version alongside the old one in production
5. **Progressive Rollout**: Gradually shift traffic to the new version
6. **Promote or Rollback**: Based on metrics, complete the rollout or roll back

We'll use GitHub Actions for the CI part and Istio VirtualServices for the CD part.

## Step 1: The Build Stage

```yaml
# .github/workflows/deploy.yaml
name: Deploy with Istio Canary

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image_tag: ${{ steps.build.outputs.tag }}
    steps:
    - uses: actions/checkout@v4

    - name: Build and push image
      id: build
      run: |
        TAG="v$(date +%Y%m%d)-${GITHUB_SHA::8}"
        docker build -t myregistry.com/myapp:$TAG .
        docker push myregistry.com/myapp:$TAG
        echo "tag=$TAG" >> $GITHUB_OUTPUT

    - name: Run unit tests
      run: |
        go test ./... -v

    - name: Run linting
      run: |
        golangci-lint run
```

## Step 2: Deploy to Staging

```yaml
  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        kubeconfig: ${{ secrets.KUBECONFIG }}

    - name: Deploy to staging
      run: |
        TAG=${{ needs.build.outputs.image_tag }}

        # Update the deployment image
        kubectl set image deployment/myapp \
          myapp=myregistry.com/myapp:$TAG \
          -n staging

        # Wait for rollout
        kubectl rollout status deployment/myapp -n staging --timeout=300s

    - name: Validate Istio configuration
      run: |
        istioctl analyze -n staging
        if [ $? -ne 0 ]; then
          echo "Istio configuration validation failed"
          exit 1
        fi

    - name: Run integration tests
      run: |
        # Wait for service to be ready
        sleep 30

        # Run tests against staging
        STAGING_URL=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
        ./run-integration-tests.sh $STAGING_URL
```

## Step 3: Canary Deployment

This is where Istio comes in. Deploy the new version alongside the old one and use traffic splitting:

```yaml
  deploy-canary:
    needs: [build, deploy-staging]
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Deploy canary version
      run: |
        TAG=${{ needs.build.outputs.image_tag }}

        # Create or update the canary deployment
        kubectl apply -f - <<EOF
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: myapp-canary
          namespace: production
        spec:
          replicas: 2
          selector:
            matchLabels:
              app: myapp
              version: canary
          template:
            metadata:
              labels:
                app: myapp
                version: canary
            spec:
              containers:
              - name: myapp
                image: myregistry.com/myapp:$TAG
                ports:
                - containerPort: 8080
                livenessProbe:
                  httpGet:
                    path: /healthz
                    port: 8080
                readinessProbe:
                  httpGet:
                    path: /ready
                    port: 8080
        EOF

        # Wait for canary pods to be ready
        kubectl rollout status deployment/myapp-canary -n production --timeout=300s

    - name: Create DestinationRule for subsets
      run: |
        kubectl apply -f - <<EOF
        apiVersion: networking.istio.io/v1
        kind: DestinationRule
        metadata:
          name: myapp
          namespace: production
        spec:
          host: myapp
          subsets:
          - name: stable
            labels:
              version: stable
          - name: canary
            labels:
              version: canary
        EOF

    - name: Route 10% to canary
      run: |
        kubectl apply -f - <<EOF
        apiVersion: networking.istio.io/v1
        kind: VirtualService
        metadata:
          name: myapp
          namespace: production
        spec:
          hosts:
          - myapp
          http:
          - route:
            - destination:
                host: myapp
                subset: stable
              weight: 90
            - destination:
                host: myapp
                subset: canary
              weight: 10
        EOF
```

## Step 4: Progressive Traffic Shifting

After the canary is deployed, gradually increase traffic. This step includes metric checks at each stage:

```yaml
  progressive-rollout:
    needs: deploy-canary
    runs-on: ubuntu-latest
    steps:
    - name: Wait and check metrics at 10%
      run: |
        echo "Canary at 10% - waiting 5 minutes to collect metrics"
        sleep 300

        # Check error rate of canary
        ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query" \
          --data-urlencode 'query=sum(rate(istio_requests_total{destination_workload="myapp-canary",response_code=~"5.*",namespace="production"}[5m])) / sum(rate(istio_requests_total{destination_workload="myapp-canary",namespace="production"}[5m]))' \
          | jq -r '.data.result[0].value[1] // "0"')

        echo "Canary error rate: $ERROR_RATE"
        if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
          echo "Error rate too high, initiating rollback"
          exit 1
        fi

    - name: Increase to 30%
      run: |
        kubectl apply -f - <<EOF
        apiVersion: networking.istio.io/v1
        kind: VirtualService
        metadata:
          name: myapp
          namespace: production
        spec:
          hosts:
          - myapp
          http:
          - route:
            - destination:
                host: myapp
                subset: stable
              weight: 70
            - destination:
                host: myapp
                subset: canary
              weight: 30
        EOF

    - name: Wait and check metrics at 30%
      run: |
        echo "Canary at 30% - waiting 5 minutes"
        sleep 300

        ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query" \
          --data-urlencode 'query=sum(rate(istio_requests_total{destination_workload="myapp-canary",response_code=~"5.*",namespace="production"}[5m])) / sum(rate(istio_requests_total{destination_workload="myapp-canary",namespace="production"}[5m]))' \
          | jq -r '.data.result[0].value[1] // "0"')

        if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
          echo "Error rate too high at 30%, initiating rollback"
          exit 1
        fi

    - name: Increase to 70%
      run: |
        kubectl apply -f - <<EOF
        apiVersion: networking.istio.io/v1
        kind: VirtualService
        metadata:
          name: myapp
          namespace: production
        spec:
          hosts:
          - myapp
          http:
          - route:
            - destination:
                host: myapp
                subset: stable
              weight: 30
            - destination:
                host: myapp
                subset: canary
              weight: 70
        EOF

        sleep 300

        # Final metric check before full promotion
        ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query" \
          --data-urlencode 'query=sum(rate(istio_requests_total{destination_workload="myapp-canary",response_code=~"5.*",namespace="production"}[5m])) / sum(rate(istio_requests_total{destination_workload="myapp-canary",namespace="production"}[5m]))' \
          | jq -r '.data.result[0].value[1] // "0"')

        if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
          echo "Error rate too high at 70%, initiating rollback"
          exit 1
        fi
```

## Step 5: Promote or Rollback

```yaml
  promote:
    needs: progressive-rollout
    runs-on: ubuntu-latest
    steps:
    - name: Promote canary to stable
      run: |
        TAG=${{ needs.build.outputs.image_tag }}

        # Update the stable deployment with the canary image
        kubectl set image deployment/myapp \
          myapp=myregistry.com/myapp:$TAG \
          -n production

        kubectl rollout status deployment/myapp -n production --timeout=300s

        # Route 100% to stable
        kubectl apply -f - <<EOF
        apiVersion: networking.istio.io/v1
        kind: VirtualService
        metadata:
          name: myapp
          namespace: production
        spec:
          hosts:
          - myapp
          http:
          - route:
            - destination:
                host: myapp
                subset: stable
              weight: 100
        EOF

        # Delete the canary deployment
        kubectl delete deployment myapp-canary -n production
```

And the rollback job:

```yaml
  rollback:
    needs: progressive-rollout
    if: failure()
    runs-on: ubuntu-latest
    steps:
    - name: Rollback canary
      run: |
        # Route 100% back to stable
        kubectl apply -f - <<EOF
        apiVersion: networking.istio.io/v1
        kind: VirtualService
        metadata:
          name: myapp
          namespace: production
        spec:
          hosts:
          - myapp
          http:
          - route:
            - destination:
                host: myapp
                subset: stable
              weight: 100
        EOF

        # Delete the canary deployment
        kubectl delete deployment myapp-canary -n production

        echo "Rollback completed. Canary deployment removed."
```

## Step 6: Istio Configuration Validation in CI

Always validate Istio configuration before applying it:

```yaml
  validate-istio-config:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Install istioctl
      run: |
        curl -L https://istio.io/downloadIstio | sh -
        sudo cp istio-*/bin/istioctl /usr/local/bin/

    - name: Validate Istio manifests
      run: |
        # Validate all Istio YAML files in the repo
        for f in $(find k8s/istio -name "*.yaml"); do
          echo "Validating $f..."
          istioctl validate -f "$f"
          if [ $? -ne 0 ]; then
            echo "Validation failed for $f"
            exit 1
          fi
        done
```

## Header-Based Routing for Testing

Before sending real user traffic, test the canary with synthetic traffic using header-based routing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: myapp
  namespace: production
spec:
  hosts:
  - myapp
  http:
  # Route test traffic to canary based on header
  - match:
    - headers:
        x-canary-test:
          exact: "true"
    route:
    - destination:
        host: myapp
        subset: canary
  # All other traffic goes to stable
  - route:
    - destination:
        host: myapp
        subset: stable
```

Then run your test suite with the header:

```bash
curl -H "x-canary-test: true" http://myapp.production.svc.cluster.local:8080/api/test
```

This lets you verify the canary version works correctly before any real users see it.

The combination of CI/CD automation and Istio traffic management gives you confidence in every deployment. You catch problems with a small percentage of traffic, automatic rollbacks prevent widespread outages, and the progressive rollout lets you ship faster without taking bigger risks.

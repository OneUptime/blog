# How to Deploy IPv6 Applications from CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, CI/CD, Deployment, Kubernetes, Docker, DevOps

Description: Deploy IPv6-enabled applications from CI/CD pipelines to Kubernetes dual-stack clusters and Docker environments, including verification of IPv6 service endpoints.

## Introduction

Deploying IPv6 applications from CI/CD pipelines requires verifying that the deployment targets are IPv6-capable, that services expose IPv6 endpoints, and that post-deployment tests validate IPv6 connectivity. This guide covers deployment patterns for Kubernetes and Docker targets.

## Kubernetes Dual-Stack Deployment

```yaml
# k8s/deployment-ipv6.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myregistry.example.com/myapp:${IMAGE_TAG}
          ports:
            - containerPort: 8080
              protocol: TCP
          env:
            # Configure app to listen on IPv6
            - name: LISTEN_ADDR
              value: "::"
            - name: LISTEN_PORT
              value: "8080"

---
# Dual-stack Service

apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
  # Dual-stack: expose on both IPv4 and IPv6
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
    - IPv6
    - IPv4
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
  type: LoadBalancer
```

## GitHub Actions Deployment Pipeline

```yaml
# .github/workflows/deploy-ipv6.yml

name: Deploy to IPv6 Kubernetes

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.version }}
    steps:
      - uses: actions/checkout@v4

      - name: Docker meta
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: myregistry.example.com/myapp

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}

  deploy-to-ipv6-cluster:
    needs: build-and-push
    runs-on: [self-hosted, linux, ipv6]  # Runner with IPv6 cluster access
    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        uses: azure/setup-kubectl@v3

      - name: Set kubeconfig
        run: |
          echo "${{ secrets.KUBECONFIG }}" > ~/.kube/config

      - name: Deploy application
        run: |
          # Substitute image tag in manifests
          IMAGE_TAG=${{ needs.build-and-push.outputs.image-tag }}
          sed -i "s|\${IMAGE_TAG}|${IMAGE_TAG}|g" k8s/deployment-ipv6.yaml

          kubectl apply -f k8s/deployment-ipv6.yaml
          kubectl rollout status deployment/myapp --timeout=5m

      - name: Verify IPv6 Service Endpoints
        run: |
          # Wait for LoadBalancer to provision
          # kubectl JSONPath does not support regex, so emit one IP per line
          # and grep for IPv6 addresses (those containing a colon).
          for i in $(seq 1 30); do
            IPV6_LB=$(kubectl get svc myapp \
              -o jsonpath='{range .status.loadBalancer.ingress[*]}{.ip}{"\n"}{end}' \
              2>/dev/null | grep ':' | head -n1)
            if [ -n "$IPV6_LB" ]; then
              echo "IPv6 LoadBalancer: $IPV6_LB"
              break
            fi
            echo "Waiting for IPv6 LoadBalancer... ($i/30)"
            sleep 10
          done

          # Test application via IPv6
          if [ -n "$IPV6_LB" ]; then
            curl -6 -f "http://[$IPV6_LB]/health"
            echo "IPv6 health check PASSED"
          else
            echo "WARNING: No IPv6 LoadBalancer IP assigned"
          fi

      - name: Run post-deploy IPv6 smoke tests
        run: |
          # Run smoke tests via IPv6
          # ipFamilies lists IPv6 first, so clusterIPs[0] is the IPv6 address.
          python3 -m pytest tests/smoke_tests.py \
            --cluster-ipv6=$(kubectl get svc myapp -o jsonpath='{.spec.clusterIPs[0]}') \
            -v
```

## GitLab CI Deployment Pipeline

```yaml
# .gitlab-ci.yml snippet for IPv6 deployment

deploy_to_k8s_ipv6:
  stage: deploy
  image: bitnami/kubectl:latest
  tags:
    - ipv6   # Self-hosted runner with IPv6 cluster access
  script:
    # Apply manifests
    - |
      sed -i "s|\${IMAGE_TAG}|${CI_COMMIT_SHA:0:8}|g" k8s/deployment-ipv6.yaml
      kubectl apply -f k8s/
      kubectl rollout status deployment/myapp

    # Verify dual-stack service
    - |
      kubectl get svc myapp -o yaml
      # Check for IPv6 ClusterIP. ipFamilies lists IPv6 first, so clusterIPs[0] is IPv6.
      IPV6_CLUSTER_IP=$(kubectl get svc myapp -o jsonpath='{.spec.clusterIPs[0]}')
      echo "IPv6 ClusterIP: $IPV6_CLUSTER_IP"
      test -n "$IPV6_CLUSTER_IP"
  only:
    - main
  environment:
    name: production
    url: https://myapp.example.com
```

## Post-Deployment IPv6 Validation

```python
#!/usr/bin/env python3
# tests/smoke_tests.py
# Post-deployment smoke tests for IPv6

import socket
import urllib.request
import sys
import pytest

def pytest_addoption(parser):
    parser.addoption("--cluster-ipv6", action="store", default=None)

@pytest.fixture
def ipv6_addr(request):
    return request.config.getoption("--cluster-ipv6")

def test_service_responds_on_ipv6(ipv6_addr):
    """Verify the deployed service responds on its IPv6 ClusterIP."""
    if not ipv6_addr:
        pytest.skip("No IPv6 address provided")

    url = f"http://[{ipv6_addr}]/health"
    response = urllib.request.urlopen(url, timeout=10)
    assert response.status == 200

def test_ipv6_only_connection(ipv6_addr):
    """Test connecting exclusively over IPv6."""
    if not ipv6_addr:
        pytest.skip("No IPv6 address provided")

    sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    sock.settimeout(10)
    try:
        sock.connect((ipv6_addr, 80))
        # Send HTTP request
        sock.send(b"GET /health HTTP/1.0\r\nHost: myapp\r\n\r\n")
        response = sock.recv(1024).decode()
        assert "200 OK" in response
    finally:
        sock.close()
```

## Conclusion

Deploying IPv6 applications from CI/CD pipelines requires dual-stack Kubernetes manifests with `ipFamilyPolicy: RequireDualStack`, deployment runners with IPv6 cluster connectivity, and post-deployment smoke tests that explicitly verify IPv6 service endpoints. The pattern of substituting image tags in manifests, applying with `kubectl apply`, waiting for rollout, and verifying IPv6 LoadBalancer or ClusterIP addresses ensures reliable IPv6 deployments across CI/CD platforms.

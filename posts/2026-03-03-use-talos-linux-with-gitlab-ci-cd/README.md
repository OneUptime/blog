# How to Use Talos Linux with GitLab CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GitLab CI/CD, Kubernetes, DevOps, Integration Testing

Description: Set up Talos Linux clusters within GitLab CI/CD pipelines for automated Kubernetes testing, including Docker-in-Docker configuration and runner setup.

---

GitLab CI/CD is a powerful pipeline platform, and when paired with Talos Linux, it gives you the ability to spin up real Kubernetes clusters for testing as part of your build process. Unlike using a shared staging cluster, each pipeline run gets its own isolated environment. Tests do not interfere with each other, and you can test cluster-level changes without worrying about breaking shared infrastructure.

This guide covers setting up Talos Linux clusters in GitLab CI/CD pipelines, from runner configuration through to production deployment workflows.

## Prerequisites

To run Talos clusters in GitLab CI, you need:

- A GitLab instance (gitlab.com or self-hosted)
- A GitLab Runner with Docker or shell executor
- Docker-in-Docker (DinD) support if using Docker executor
- `talosctl` available in the pipeline environment

## Runner Configuration

The key requirement is that the runner can run Docker containers. The Docker-in-Docker approach works best:

### Using Docker-in-Docker

Register a runner with the Docker executor that supports DinD:

```toml
# /etc/gitlab-runner/config.toml

[[runners]]
  name = "docker-runner"
  url = "https://gitlab.com/"
  executor = "docker"
  [runners.docker]
    image = "docker:29.0.0-cli"
    privileged = true
    volumes = ["/certs/client", "/cache"]
```

The `privileged = true` setting is required because the Docker-in-Docker service needs privileged mode to start nested containers.

### Using Shell Executor

If you have a dedicated machine as a runner, the shell executor is simpler:

```toml
[[runners]]
  name = "shell-runner"
  url = "https://gitlab.com/"
  executor = "shell"
```

With the shell executor, Docker must be installed on the runner machine and the gitlab-runner user must have Docker access.

## Basic Pipeline Configuration

Here is a `.gitlab-ci.yml` that creates a Talos cluster for integration testing:

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

variables:
  TALOS_VERSION: "v1.13.0"
  KUBECTL_VERSION: "v1.36.0"
  CLUSTER_NAME: "ci-${CI_PIPELINE_ID}"
  APP_IMAGE: "${CI_REGISTRY_IMAGE}/myapp:${CI_COMMIT_SHA}"

.install_talosctl: &install_talosctl
  - |
    if ! command -v talosctl &> /dev/null; then
      curl -LO "https://github.com/siderolabs/talos/releases/download/${TALOS_VERSION}/talosctl-linux-amd64"
      chmod +x talosctl-linux-amd64
      mv talosctl-linux-amd64 /usr/local/bin/talosctl
    fi
  - talosctl version --client

.install_kubectl: &install_kubectl
  - |
    if ! command -v kubectl &> /dev/null; then
      curl -LO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
      chmod +x kubectl
      mv kubectl /usr/local/bin/kubectl
    fi
  - kubectl version --client

build:
  stage: build
  image: docker:29.0.0-cli
  services:
    - docker:29.0.0-dind
  variables:
    DOCKER_HOST: tcp://docker:2376
    DOCKER_TLS_CERTDIR: "/certs"
  script:
    - echo "${CI_REGISTRY_PASSWORD}" | docker login "${CI_REGISTRY}" -u "${CI_REGISTRY_USER}" --password-stdin
    - docker build -t "${APP_IMAGE}" .
    - docker push "${APP_IMAGE}"

integration-test:
  stage: test
  image: docker:29.0.0-cli
  services:
    - docker:29.0.0-dind
  variables:
    DOCKER_HOST: tcp://docker:2376
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    - apk add --no-cache curl
    - *install_talosctl
    - *install_kubectl
  script:
    # Create cluster
    - talosctl cluster create docker
        --name "${CLUSTER_NAME}"
        --workers 1

    # Get kubeconfig
    - talosctl kubeconfig --force /tmp/kubeconfig --merge=false
    - export KUBECONFIG=/tmp/kubeconfig

    # Wait for readiness
    - kubectl wait --for=condition=Ready nodes --all --timeout=300s

    # Deploy and test
    - kubectl apply -f manifests/
    - kubectl create secret docker-registry gitlab-registry
        --docker-server="${CI_REGISTRY}"
        --docker-username="${CI_REGISTRY_USER}"
        --docker-password="${CI_REGISTRY_PASSWORD}"
        --dry-run=client -o yaml | kubectl apply -f -
    - kubectl patch serviceaccount default -p '{"imagePullSecrets":[{"name":"gitlab-registry"}]}'
    - kubectl set image deployment/myapp myapp="${APP_IMAGE}"
    - kubectl rollout status deployment/myapp --timeout=120s
    - kubectl run test --image=busybox --rm -it --restart=Never --
        wget -qO- http://myapp-service/health

  after_script:
    - talosctl cluster destroy --name "${CLUSTER_NAME}" || true
  artifacts:
    when: on_failure
    paths:
      - test-logs/
    expire_in: 1 week
```

## Using Docker-in-Docker Properly

The Docker-in-Docker setup requires careful configuration. Here are the critical pieces:

```yaml
integration-test:
  image: docker:29.0.0-cli
  services:
    - name: docker:29.0.0-dind
      alias: docker
      command: ["--storage-driver=overlay2"]
  variables:
    # Connect to the DinD service
    DOCKER_HOST: tcp://docker:2376
    DOCKER_TLS_CERTDIR: "/certs"
    DOCKER_CERT_PATH: "/certs/client"
    DOCKER_TLS_VERIFY: "1"
```

If you are using a self-hosted runner with the shell executor, you do not need the DinD service - just make sure Docker is running on the host.

## Caching for Faster Pipelines

Cache the talosctl binary between runs:

```yaml
integration-test:
  cache:
    key: talos-${TALOS_VERSION}
    paths:
      - .cache/talosctl

  before_script:
    - |
      if [ -f .cache/talosctl ]; then
        cp .cache/talosctl /usr/local/bin/talosctl
        chmod +x /usr/local/bin/talosctl
      else
        curl -LO "https://github.com/siderolabs/talos/releases/download/${TALOS_VERSION}/talosctl-linux-amd64"
        chmod +x talosctl-linux-amd64
        mv talosctl-linux-amd64 /usr/local/bin/talosctl
        mkdir -p .cache
        cp /usr/local/bin/talosctl .cache/talosctl
      fi
```

## Multi-Stage Pipeline with Cluster Reuse

For pipelines that need the cluster across multiple stages, use a shell runner or another self-hosted runner with a persistent Docker daemon, and pass the generated kubeconfig as an artifact:

```yaml
variables:
  TALOS_VERSION: "v1.13.0"

.install_talosctl: &install_talosctl
  - |
    if ! command -v talosctl &> /dev/null; then
      curl -LO "https://github.com/siderolabs/talos/releases/download/${TALOS_VERSION}/talosctl-linux-amd64"
      chmod +x talosctl-linux-amd64
      mv talosctl-linux-amd64 /usr/local/bin/talosctl
    fi

stages:
  - setup
  - test
  - cleanup

setup-cluster:
  stage: setup
  script:
    - *install_talosctl
    - talosctl cluster create docker
        --name "${CLUSTER_NAME}"
        --workers 1
    - talosctl kubeconfig --force kubeconfig --merge=false
    - talosctl config info -o json > cluster-info.json
  artifacts:
    paths:
      - kubeconfig
      - cluster-info.json
    expire_in: 1 hour

unit-tests:
  stage: test
  needs: [setup-cluster]
  script:
    - export KUBECONFIG=$(pwd)/kubeconfig
    - kubectl get nodes
    - go test ./tests/unit/... -v

integration-tests:
  stage: test
  needs: [setup-cluster]
  script:
    - export KUBECONFIG=$(pwd)/kubeconfig
    - kubectl apply -f manifests/
    - go test ./tests/integration/... -v

e2e-tests:
  stage: test
  needs: [setup-cluster]
  script:
    - export KUBECONFIG=$(pwd)/kubeconfig
    - kubectl apply -f manifests/
    - go test ./tests/e2e/... -v

cleanup-cluster:
  stage: cleanup
  when: always
  script:
    - *install_talosctl
    - talosctl cluster destroy --name "${CLUSTER_NAME}" || true
```

## Testing Against Multiple Kubernetes Versions

Use GitLab's parallel matrix feature:

```yaml
variables:
  TALOS_VERSION: "v1.13.0"

.install_talosctl: &install_talosctl
  - |
    if ! command -v talosctl &> /dev/null; then
      curl -LO "https://github.com/siderolabs/talos/releases/download/${TALOS_VERSION}/talosctl-linux-amd64"
      chmod +x talosctl-linux-amd64
      mv talosctl-linux-amd64 /usr/local/bin/talosctl
    fi

integration-test:
  stage: test
  parallel:
    matrix:
      - K8S_VERSION: ["1.34.0", "1.35.0", "1.36.0"]
  variables:
    CLUSTER_NAME: "ci-${CI_PIPELINE_ID}-k8s-${K8S_VERSION}"
  script:
    - *install_talosctl
    - talosctl cluster create docker
        --name "${CLUSTER_NAME}"
        --workers 1
        --kubernetes-version "${K8S_VERSION}"
    - talosctl kubeconfig --force /tmp/kubeconfig --merge=false
    - export KUBECONFIG=/tmp/kubeconfig
    - kubectl get nodes
    - echo "Running tests against Kubernetes ${K8S_VERSION}"
    - make test
  after_script:
    - talosctl cluster destroy --name "${CLUSTER_NAME}" || true
```

## Deploying to Production Talos Clusters

For production deployments through GitLab CI:

```yaml
variables:
  TALOS_VERSION: "v1.13.0"
  KUBECTL_VERSION: "v1.36.0"

.install_talosctl: &install_talosctl
  - |
    if ! command -v talosctl &> /dev/null; then
      curl -LO "https://github.com/siderolabs/talos/releases/download/${TALOS_VERSION}/talosctl-linux-amd64"
      chmod +x talosctl-linux-amd64
      mv talosctl-linux-amd64 /usr/local/bin/talosctl
    fi

.install_kubectl: &install_kubectl
  - |
    if ! command -v kubectl &> /dev/null; then
      curl -LO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
      chmod +x kubectl
      mv kubectl /usr/local/bin/kubectl
    fi

deploy-production:
  stage: deploy
  image: alpine:3.22
  environment:
    name: production
    url: https://app.example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
  before_script:
    - apk add --no-cache curl
    - *install_talosctl
    - *install_kubectl
    # Retrieve kubeconfig from the production cluster
    - talosctl --talosconfig "${TALOSCONFIG}" kubeconfig --force /tmp/kubeconfig --merge=false
    - export KUBECONFIG=/tmp/kubeconfig
  script:
    - kubectl apply -f manifests/production/
    - kubectl rollout status deployment/myapp --timeout=300s
    - kubectl get pods -l app=myapp
```

Store the Talos configuration as a file-type CI/CD variable (`TALOSCONFIG`) under Settings > CI/CD > Variables, with the "Protected" flag enabled.

## Troubleshooting GitLab CI Issues

### DinD Connection Errors

If `talosctl cluster create` fails with Docker connection errors:

```yaml
# Make sure the Docker service is ready
before_script:
  - |
    for i in $(seq 1 30); do
      docker info && break
      echo "Waiting for Docker..."
      sleep 2
    done
```

Resource Limits

GitLab shared runners have limited resources. If cluster creation fails or is very slow:

```yaml
# Use a smaller cluster
script:
  - talosctl cluster create docker
      --name "${CLUSTER_NAME}"
      --workers 0
      --config-patch '[{"op":"add","path":"/cluster/allowSchedulingOnControlPlanes","value":true}]'
      --cpus-controlplanes 2.0
      --memory-controlplanes 2GiB
```

### Pipeline Cleanup

Always clean up clusters, even on failure:

```yaml
after_script:
  # after_script runs in its own shell, so reinstall talosctl
  - curl -sL https://talos.dev/install | sh
  - talosctl cluster destroy --name "${CLUSTER_NAME}" || true
```

## Wrapping Up

GitLab CI/CD and Talos Linux together provide a robust platform for automated Kubernetes testing. The Docker-in-Docker approach works well with both GitLab.com shared runners and self-hosted instances. By structuring your pipeline with proper caching, cleanup, and artifact management, you can run comprehensive integration tests against real Kubernetes clusters without maintaining persistent test infrastructure. The key is to always clean up clusters in the `after_script` block and use unique cluster names to avoid conflicts in parallel pipelines.

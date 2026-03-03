# How to Set Up Talos Linux Clusters in GitHub Actions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GitHub Actions, CI/CD, Kubernetes, Automated Testing

Description: A practical guide to creating Talos Linux Kubernetes clusters inside GitHub Actions workflows for automated integration testing and deployment validation.

---

GitHub Actions is the most widely used CI/CD platform for open-source projects, and it works well with Talos Linux for running integration tests against real Kubernetes clusters. The Docker provider for Talos runs smoothly on GitHub's Ubuntu runners, giving you a full Kubernetes cluster in your pipeline without needing self-hosted runners or cloud infrastructure.

This guide shows you how to set up Talos Linux clusters in GitHub Actions, from basic single-job workflows to advanced multi-cluster testing patterns.

## Basic Workflow

Here is a minimal GitHub Actions workflow that creates a Talos cluster, runs tests, and tears it down:

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install talosctl
        run: |
          curl -sL https://talos.dev/install | sh
          talosctl version --client

      - name: Create Talos cluster
        run: |
          talosctl cluster create \
            --provisioner docker \
            --name ci-cluster \
            --controlplanes 1 \
            --workers 1 \
            --wait-timeout 5m

      - name: Get kubeconfig
        run: |
          talosctl kubeconfig --force /tmp/kubeconfig --merge=false
          echo "KUBECONFIG=/tmp/kubeconfig" >> $GITHUB_ENV

      - name: Wait for cluster ready
        run: |
          kubectl wait --for=condition=Ready nodes --all --timeout=300s
          kubectl get nodes

      - name: Run tests
        run: |
          # Deploy your application
          kubectl apply -f manifests/
          kubectl rollout status deployment/myapp --timeout=120s

          # Run integration tests
          go test ./integration/... -v -timeout 10m

      - name: Collect logs on failure
        if: failure()
        run: |
          kubectl get pods --all-namespaces
          kubectl get events --sort-by='.lastTimestamp'
          talosctl -n 10.5.0.2 dmesg

      - name: Destroy cluster
        if: always()
        run: |
          talosctl cluster destroy --name ci-cluster
```

## Caching talosctl and Container Images

Speed up your workflow by caching the talosctl binary and pre-pulling Talos container images:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Cache talosctl
        uses: actions/cache@v4
        with:
          path: /usr/local/bin/talosctl
          key: talosctl-v1.7.0

      - name: Install talosctl
        run: |
          if ! command -v talosctl &> /dev/null; then
            curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/talosctl-linux-amd64
            chmod +x talosctl-linux-amd64
            sudo mv talosctl-linux-amd64 /usr/local/bin/talosctl
          fi
          talosctl version --client

      - name: Cache Talos images
        uses: actions/cache@v4
        with:
          path: /tmp/talos-images
          key: talos-images-v1.7.0

      - name: Load Talos images
        run: |
          if [ -f /tmp/talos-images/talos.tar ]; then
            docker load < /tmp/talos-images/talos.tar
          fi

      - name: Create cluster
        run: |
          talosctl cluster create \
            --provisioner docker \
            --name ci-cluster \
            --controlplanes 1 \
            --workers 1 \
            --wait-timeout 5m

      - name: Save Talos images for cache
        if: steps.cache-talos.outputs.cache-hit != 'true'
        run: |
          mkdir -p /tmp/talos-images
          docker save ghcr.io/siderolabs/talos:v1.7.0 > /tmp/talos-images/talos.tar
```

## Matrix Testing Across Kubernetes Versions

Test your application against multiple Kubernetes versions:

```yaml
jobs:
  test-matrix:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        kubernetes-version: ["1.28.0", "1.29.0", "1.30.0"]
      fail-fast: false

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install talosctl
        run: curl -sL https://talos.dev/install | sh

      - name: Create cluster with K8s ${{ matrix.kubernetes-version }}
        run: |
          talosctl cluster create \
            --provisioner docker \
            --name ci-k8s-${{ matrix.kubernetes-version }} \
            --controlplanes 1 \
            --workers 1 \
            --kubernetes-version ${{ matrix.kubernetes-version }} \
            --wait-timeout 5m

      - name: Get kubeconfig
        run: |
          talosctl kubeconfig --force /tmp/kubeconfig --merge=false
          echo "KUBECONFIG=/tmp/kubeconfig" >> $GITHUB_ENV

      - name: Run tests
        run: |
          kubectl get nodes
          echo "Testing against Kubernetes ${{ matrix.kubernetes-version }}"
          # Your tests here

      - name: Destroy cluster
        if: always()
        run: |
          talosctl cluster destroy --name ci-k8s-${{ matrix.kubernetes-version }}
```

## Reusable Workflow

Create a reusable workflow that other repositories can call:

```yaml
# .github/workflows/talos-cluster.yml
name: Reusable Talos Cluster

on:
  workflow_call:
    inputs:
      cluster-name:
        required: false
        type: string
        default: "ci-cluster"
      workers:
        required: false
        type: number
        default: 1
      kubernetes-version:
        required: false
        type: string
        default: ""
      talos-version:
        required: false
        type: string
        default: "v1.7.0"
    outputs:
      kubeconfig-path:
        description: "Path to the kubeconfig file"
        value: ${{ jobs.create.outputs.kubeconfig }}

jobs:
  create:
    runs-on: ubuntu-latest
    outputs:
      kubeconfig: /tmp/${{ inputs.cluster-name }}-kubeconfig
    steps:
      - name: Install talosctl
        run: |
          curl -LO https://github.com/siderolabs/talos/releases/download/${{ inputs.talos-version }}/talosctl-linux-amd64
          chmod +x talosctl-linux-amd64
          sudo mv talosctl-linux-amd64 /usr/local/bin/talosctl

      - name: Create cluster
        run: |
          ARGS="--provisioner docker --name ${{ inputs.cluster-name }} --controlplanes 1 --workers ${{ inputs.workers }} --wait-timeout 5m"
          if [ -n "${{ inputs.kubernetes-version }}" ]; then
            ARGS="$ARGS --kubernetes-version ${{ inputs.kubernetes-version }}"
          fi
          talosctl cluster create $ARGS

      - name: Export kubeconfig
        run: |
          talosctl kubeconfig --force /tmp/${{ inputs.cluster-name }}-kubeconfig --merge=false
```

Use it in your workflow:

```yaml
# .github/workflows/test.yml
name: Test
on: push

jobs:
  setup-cluster:
    uses: ./.github/workflows/talos-cluster.yml
    with:
      cluster-name: my-test
      workers: 2

  run-tests:
    needs: setup-cluster
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Test
        env:
          KUBECONFIG: ${{ needs.setup-cluster.outputs.kubeconfig-path }}
        run: make test
```

## Deploying to Talos Clusters from GitHub Actions

Use GitHub Actions to deploy to a persistent Talos cluster:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install talosctl
        run: curl -sL https://talos.dev/install | sh

      - name: Configure talosctl
        run: |
          # Use secrets for the talos config
          echo "${{ secrets.TALOSCONFIG }}" > /tmp/talosconfig
          talosctl --talosconfig /tmp/talosconfig kubeconfig --force /tmp/kubeconfig --merge=false
          echo "KUBECONFIG=/tmp/kubeconfig" >> $GITHUB_ENV

      - name: Deploy
        run: |
          kubectl apply -f manifests/
          kubectl rollout status deployment/myapp --timeout=300s

      - name: Verify
        run: |
          kubectl get pods -l app=myapp
          # Run smoke tests
          kubectl run smoke-test --image=busybox --rm -it --restart=Never -- \
            wget -qO- http://myapp-service/health
```

## Troubleshooting GitHub Actions Issues

### Runner Disk Space

GitHub runners have limited disk space. If cluster creation fails, free up space first:

```yaml
- name: Free disk space
  run: |
    sudo rm -rf /usr/share/dotnet
    sudo rm -rf /opt/ghc
    docker system prune -af
    df -h
```

### Docker Network Conflicts

If you run multiple clusters in the same workflow, make sure they use different names to avoid network conflicts:

```yaml
- name: Create clusters with unique names
  run: |
    talosctl cluster create --provisioner docker --name cluster-a --cidr 10.5.0.0/24
    talosctl cluster create --provisioner docker --name cluster-b --cidr 10.6.0.0/24
```

### Timeout Issues

GitHub Actions has a default 6-hour job timeout. For long test suites, set appropriate timeouts:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # Fail fast if something hangs
```

## Wrapping Up

GitHub Actions and Talos Linux work together naturally for CI/CD. The Docker provider creates clusters quickly enough to fit within CI time budgets, and the deterministic nature of Talos ensures consistent test environments across runs. By caching the talosctl binary and container images, you can get cluster creation time down to under two minutes, making it practical to run integration tests against real Kubernetes on every pull request.

# How to Set Up CI/CD Pipelines for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CI/CD, GitHub Actions, Kubernetes, DevOps, Automation, Pipeline

Description: Build CI/CD pipelines for Talos Linux clusters that validate configurations, test changes, and deploy workloads automatically.

---

A proper CI/CD pipeline is the backbone of reliable Talos Linux operations. Without it, configuration changes are risky, deployments are manual, and cluster upgrades are stressful. With a well-designed pipeline, every change gets validated before it reaches your cluster, deployments happen automatically when code is merged, and upgrades follow a tested, repeatable process. This guide covers building CI/CD pipelines for both Talos Linux infrastructure management and application deployments using GitHub Actions.

## What to Automate

There are two distinct CI/CD needs for a Talos Linux cluster:

1. **Infrastructure pipeline**: Validates and applies Talos machine configurations, handles cluster upgrades, and manages infrastructure-as-code changes
2. **Application pipeline**: Builds container images, runs tests, and deploys workloads to the cluster

We will cover both, starting with the infrastructure pipeline.

## Infrastructure CI/CD Pipeline

### Pipeline Structure

```text
.github/
  workflows/
    validate-talos-config.yaml     # PR validation
    apply-talos-config.yaml        # Post-merge application
    upgrade-talos.yaml             # Cluster upgrade
    test-cluster.yaml              # Integration testing
```

### Step 1: Configuration Validation on Pull Requests

```yaml
# .github/workflows/validate-talos-config.yaml
name: Validate Talos Configuration

on:
  pull_request:
    paths:
      - 'talos/**'
      - 'clusters/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install talosctl
        run: |
          curl -sL https://talos.dev/install | sh
          talosctl version --client

      - name: Validate machine configurations
        run: |
          for config in clusters/*/generated/*.yaml; do
            echo "Validating ${config}..."
            talosctl validate --config "${config}" --mode cloud
          done

      - name: Check YAML syntax
        run: |
          # Install yamllint
          pip install yamllint

          # Lint all YAML files
          yamllint -d "{extends: relaxed, rules: {line-length: {max: 150}}}" \
            clusters/ talos/

      - name: Diff configuration changes
        run: |
          # Show what changed in the generated configs
          git diff origin/main -- clusters/*/generated/ > /tmp/config-diff.txt

          if [ -s /tmp/config-diff.txt ]; then
            echo "## Configuration Changes" >> $GITHUB_STEP_SUMMARY
            echo '```diff' >> $GITHUB_STEP_SUMMARY
            cat /tmp/config-diff.txt >> $GITHUB_STEP_SUMMARY
            echo '```' >> $GITHUB_STEP_SUMMARY
          else
            echo "No configuration changes detected" >> $GITHUB_STEP_SUMMARY
          fi

  dry-run:
    runs-on: ubuntu-latest
    needs: validate
    if: contains(github.event.pull_request.labels.*.name, 'infrastructure')
    steps:
      - uses: actions/checkout@v4

      - name: Install talosctl
        run: curl -sL https://talos.dev/install | sh

      - name: Dry-run configuration apply
        env:
          TALOS_CONFIG: ${{ secrets.TALOS_CONFIG }}
        run: |
          echo "${TALOS_CONFIG}" > /tmp/talosconfig

          for config in clusters/production/generated/*.yaml; do
            node_name=$(basename "${config}" .yaml)
            echo "Dry-run for ${node_name}..."
            talosctl apply-config \
              --talosconfig /tmp/talosconfig \
              --nodes "${node_name}" \
              --file "${config}" \
              --dry-run 2>&1 || true
          done
```

### Step 2: Configuration Application After Merge

```yaml
# .github/workflows/apply-talos-config.yaml
name: Apply Talos Configuration

on:
  push:
    branches: [main]
    paths:
      - 'clusters/production/**'

jobs:
  apply:
    runs-on: self-hosted
    environment: production
    concurrency:
      group: talos-production-apply
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4

      - name: Install talosctl
        run: curl -sL https://talos.dev/install | sh

      - name: Apply configuration to control plane nodes
        env:
          TALOS_CONFIG: ${{ secrets.TALOS_CONFIG }}
        run: |
          echo "${TALOS_CONFIG}" > /tmp/talosconfig

          # Apply to control plane nodes one at a time
          for config in clusters/production/generated/cp*.yaml; do
            node_name=$(basename "${config}" .yaml)
            node_ip=$(yq '.machine.network.interfaces[0].addresses[0]' "${config}" | cut -d/ -f1)

            echo "Applying config to ${node_name} (${node_ip})..."
            talosctl apply-config \
              --talosconfig /tmp/talosconfig \
              --nodes "${node_ip}" \
              --file "${config}"

            # Wait for the node to be healthy before proceeding
            echo "Waiting for ${node_name} to be healthy..."
            talosctl health \
              --talosconfig /tmp/talosconfig \
              --nodes "${node_ip}" \
              --wait-timeout 300s
          done

      - name: Apply configuration to worker nodes
        env:
          TALOS_CONFIG: ${{ secrets.TALOS_CONFIG }}
        run: |
          echo "${TALOS_CONFIG}" > /tmp/talosconfig

          for config in clusters/production/generated/worker*.yaml; do
            node_name=$(basename "${config}" .yaml)
            node_ip=$(yq '.machine.network.interfaces[0].addresses[0]' "${config}" | cut -d/ -f1)

            echo "Applying config to ${node_name} (${node_ip})..."
            talosctl apply-config \
              --talosconfig /tmp/talosconfig \
              --nodes "${node_ip}" \
              --file "${config}"
          done

      - name: Verify cluster health
        env:
          KUBECONFIG_DATA: ${{ secrets.KUBECONFIG }}
        run: |
          echo "${KUBECONFIG_DATA}" > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig

          kubectl get nodes
          kubectl get pods --all-namespaces | grep -v Running | grep -v Completed || true
```

## Application CI/CD Pipeline

### Step 3: Application Build and Deploy Pipeline

```yaml
# .github/workflows/deploy-app.yaml
name: Build and Deploy Application

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'Dockerfile'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=ref,event=branch

      - name: Build and push image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  test:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4

      - name: Run unit tests
        run: |
          npm ci
          npm test

      - name: Run integration tests
        run: |
          npm run test:integration

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [build, test]
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Set up kubectl
        env:
          KUBECONFIG_DATA: ${{ secrets.STAGING_KUBECONFIG }}
        run: |
          echo "${KUBECONFIG_DATA}" > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig

      - name: Deploy to staging
        env:
          IMAGE_TAG: ${{ needs.build.outputs.image-tag }}
          KUBECONFIG: /tmp/kubeconfig
        run: |
          # Update the image tag in the deployment
          kubectl set image deployment/my-app \
            my-app=${IMAGE_TAG} \
            --namespace staging

          # Wait for rollout to complete
          kubectl rollout status deployment/my-app \
            --namespace staging \
            --timeout=300s

      - name: Run smoke tests
        env:
          KUBECONFIG: /tmp/kubeconfig
        run: |
          # Wait for the service to be ready
          sleep 30

          # Run smoke tests against staging
          STAGING_URL=$(kubectl get svc my-app -n staging -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
          curl -sf "http://${STAGING_URL}/health" || exit 1

  deploy-production:
    runs-on: ubuntu-latest
    needs: [build, deploy-staging]
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to production
        env:
          IMAGE_TAG: ${{ needs.build.outputs.image-tag }}
          KUBECONFIG_DATA: ${{ secrets.PRODUCTION_KUBECONFIG }}
        run: |
          echo "${KUBECONFIG_DATA}" > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig

          kubectl set image deployment/my-app \
            my-app=${IMAGE_TAG} \
            --namespace production

          kubectl rollout status deployment/my-app \
            --namespace production \
            --timeout=600s

      - name: Post-deployment verification
        env:
          KUBECONFIG: /tmp/kubeconfig
        run: |
          export KUBECONFIG=/tmp/kubeconfig

          # Check pod health
          kubectl get pods -n production -l app=my-app

          # Verify no crash loops
          RESTARTS=$(kubectl get pods -n production -l app=my-app \
            -o jsonpath='{.items[*].status.containerStatuses[0].restartCount}')
          for r in $RESTARTS; do
            if [ "$r" -gt 0 ]; then
              echo "Warning: Pod has $r restarts"
            fi
          done
```

### Step 4: Cluster Upgrade Pipeline

```yaml
# .github/workflows/upgrade-talos.yaml
name: Upgrade Talos Linux

on:
  workflow_dispatch:
    inputs:
      talos_version:
        description: 'Target Talos version'
        required: true
        type: string
      kubernetes_version:
        description: 'Target Kubernetes version'
        required: true
        type: string

jobs:
  upgrade:
    runs-on: self-hosted
    environment: production
    concurrency:
      group: talos-upgrade
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4

      - name: Install talosctl
        run: curl -sL https://talos.dev/install | sh

      - name: Pre-upgrade health check
        env:
          TALOS_CONFIG: ${{ secrets.TALOS_CONFIG }}
        run: |
          echo "${TALOS_CONFIG}" > /tmp/talosconfig
          talosctl --talosconfig /tmp/talosconfig health --wait-timeout 60s

      - name: Upgrade control plane nodes
        env:
          TALOS_CONFIG: ${{ secrets.TALOS_CONFIG }}
          TALOS_VERSION: ${{ inputs.talos_version }}
        run: |
          echo "${TALOS_CONFIG}" > /tmp/talosconfig

          # Get control plane node IPs
          CP_NODES=$(talosctl --talosconfig /tmp/talosconfig get members -o json | \
            jq -r '.spec.machineType == "controlplane" | select(.) | .spec.addresses[0]')

          for node in $CP_NODES; do
            echo "Upgrading control plane node: ${node}"
            talosctl --talosconfig /tmp/talosconfig upgrade \
              --nodes "${node}" \
              --image "ghcr.io/siderolabs/installer:${TALOS_VERSION}" \
              --wait

            echo "Waiting for node to be healthy..."
            sleep 30
            talosctl --talosconfig /tmp/talosconfig health \
              --nodes "${node}" \
              --wait-timeout 300s
          done

      - name: Upgrade worker nodes
        env:
          TALOS_CONFIG: ${{ secrets.TALOS_CONFIG }}
          TALOS_VERSION: ${{ inputs.talos_version }}
        run: |
          echo "${TALOS_CONFIG}" > /tmp/talosconfig

          WORKER_NODES=$(talosctl --talosconfig /tmp/talosconfig get members -o json | \
            jq -r '.spec.machineType == "worker" | select(.) | .spec.addresses[0]')

          for node in $WORKER_NODES; do
            echo "Draining worker node: ${node}"
            kubectl drain "${node}" --ignore-daemonsets --delete-emptydir-data --timeout=120s

            echo "Upgrading worker node: ${node}"
            talosctl --talosconfig /tmp/talosconfig upgrade \
              --nodes "${node}" \
              --image "ghcr.io/siderolabs/installer:${TALOS_VERSION}" \
              --wait

            echo "Uncordoning worker node: ${node}"
            kubectl uncordon "${node}"
            sleep 30
          done

      - name: Post-upgrade verification
        env:
          TALOS_CONFIG: ${{ secrets.TALOS_CONFIG }}
          KUBECONFIG_DATA: ${{ secrets.KUBECONFIG }}
        run: |
          echo "${KUBECONFIG_DATA}" > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig

          echo "=== Node versions ==="
          kubectl get nodes -o wide

          echo "=== Cluster health ==="
          echo "${TALOS_CONFIG}" > /tmp/talosconfig
          talosctl --talosconfig /tmp/talosconfig health --wait-timeout 120s

          echo "=== Pod status ==="
          kubectl get pods --all-namespaces | grep -v Running | grep -v Completed || echo "All pods healthy"
```

### Step 5: Secrets Management in Pipelines

Store sensitive data as GitHub secrets:

```bash
# Set up required secrets
gh secret set TALOS_CONFIG < talosconfig
gh secret set KUBECONFIG < kubeconfig
gh secret set STAGING_KUBECONFIG < staging-kubeconfig
gh secret set PRODUCTION_KUBECONFIG < production-kubeconfig
```

For more complex setups, use OIDC authentication with your cloud provider instead of long-lived secrets:

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - name: Configure AWS credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789:role/github-actions
      aws-region: us-east-1
```

## Best Practices

1. **Use environment protection rules**: Require approvals for production deployments in GitHub environment settings.
2. **Implement concurrency controls**: Prevent multiple configuration applies from running simultaneously.
3. **Add rollback steps**: Include automatic rollback on failure.
4. **Cache talosctl**: Download it once and cache it across workflow runs.
5. **Separate concerns**: Keep infrastructure and application pipelines independent.
6. **Monitor pipeline health**: Set up alerts for failed workflow runs.

## Conclusion

CI/CD pipelines for Talos Linux turn cluster management from a risky manual process into a safe, automated workflow. Configuration changes get validated before they reach your cluster, upgrades follow a tested procedure with health checks at each step, and application deployments progress through staging before reaching production. Start with the validation pipeline on pull requests, then add automated application after you are comfortable with the workflow. The upgrade pipeline can run on demand whenever a new Talos or Kubernetes version is ready for your cluster.

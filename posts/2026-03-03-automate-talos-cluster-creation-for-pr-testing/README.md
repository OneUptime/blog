# How to Automate Talos Cluster Creation for PR Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Pull Request Testing, CI/CD, Automation, Kubernetes

Description: Automate the creation and teardown of Talos Linux clusters for pull request testing, ensuring every code change is validated against a real Kubernetes environment.

---

Testing pull requests against real Kubernetes clusters before merging catches integration issues that code review alone cannot find. But manually spinning up clusters for each PR is not practical. You need automation that creates a cluster when a PR is opened, runs the tests, reports the results, and cleans up afterward. Talos Linux is well suited for this because its cluster creation is fast, deterministic, and fully scriptable.

This guide shows you how to build an automated system that creates Talos clusters specifically for PR testing across different CI platforms.

## The PR Testing Workflow

A well-designed PR testing pipeline follows this sequence:

1. A pull request is opened or updated
2. The pipeline detects the changes and determines what needs testing
3. A fresh Talos cluster is created
4. The application is built from the PR branch and deployed
5. Automated tests run against the deployed application
6. Results are reported back to the PR
7. The cluster is destroyed regardless of test outcome

This gives PR authors immediate feedback on whether their changes work in a real Kubernetes environment, not just in isolation.

## Building the Automation

### Core Cluster Management Functions

Start with reusable functions for cluster lifecycle management:

```bash
#!/bin/bash
# lib/cluster.sh - Reusable cluster management functions

create_pr_cluster() {
  local pr_number="$1"
  local cluster_name="pr-${pr_number}"

  echo "Creating cluster for PR #${pr_number}"

  talosctl cluster create \
    --provisioner docker \
    --name "$cluster_name" \
    --controlplanes 1 \
    --workers 1 \
    --wait-timeout 5m \
    --config-patch "[
      {\"op\": \"add\", \"path\": \"/cluster/allowSchedulingOnControlPlanes\", \"value\": true}
    ]"

  local kubeconfig="/tmp/${cluster_name}.kubeconfig"
  talosctl kubeconfig --force "$kubeconfig" --merge=false

  # Wait for cluster readiness
  KUBECONFIG="$kubeconfig" kubectl wait \
    --for=condition=Ready nodes --all --timeout=300s

  echo "$kubeconfig"
}

destroy_pr_cluster() {
  local pr_number="$1"
  local cluster_name="pr-${pr_number}"

  echo "Destroying cluster for PR #${pr_number}"
  talosctl cluster destroy --name "$cluster_name" 2>/dev/null || true
  rm -f "/tmp/${cluster_name}.kubeconfig"
}

deploy_application() {
  local kubeconfig="$1"
  local image_tag="$2"

  KUBECONFIG="$kubeconfig" kubectl apply -f manifests/

  # Update the image to the PR build
  KUBECONFIG="$kubeconfig" kubectl set image \
    deployment/myapp myapp="myapp:${image_tag}"

  # Wait for rollout
  KUBECONFIG="$kubeconfig" kubectl rollout status \
    deployment/myapp --timeout=120s
}

run_tests() {
  local kubeconfig="$1"

  export KUBECONFIG="$kubeconfig"

  # Run test suites
  go test ./tests/smoke/... -v -timeout 5m
  go test ./tests/integration/... -v -timeout 10m
}
```

### GitHub Actions Implementation

```yaml
# .github/workflows/pr-test.yml
name: PR Kubernetes Tests

on:
  pull_request:
    types: [opened, synchronize]
    branches: [main]

concurrency:
  group: pr-test-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  kubernetes-test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Free disk space
        run: |
          sudo rm -rf /usr/share/dotnet /opt/ghc
          docker system prune -af

      - name: Setup tools
        run: |
          # Install talosctl
          curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/talosctl-linux-amd64
          chmod +x talosctl-linux-amd64
          sudo mv talosctl-linux-amd64 /usr/local/bin/talosctl

      - name: Build application
        run: |
          docker build -t myapp:pr-${{ github.event.pull_request.number }} .

      - name: Create Talos cluster
        id: cluster
        run: |
          CLUSTER_NAME="pr-${{ github.event.pull_request.number }}"
          talosctl cluster create \
            --provisioner docker \
            --name "$CLUSTER_NAME" \
            --controlplanes 1 \
            --workers 1 \
            --wait-timeout 5m

          KUBECONFIG="/tmp/${CLUSTER_NAME}.kubeconfig"
          talosctl kubeconfig --force "$KUBECONFIG" --merge=false
          echo "kubeconfig=$KUBECONFIG" >> $GITHUB_OUTPUT

      - name: Deploy application
        env:
          KUBECONFIG: ${{ steps.cluster.outputs.kubeconfig }}
        run: |
          kubectl apply -f manifests/
          kubectl rollout status deployment/myapp --timeout=120s

      - name: Run smoke tests
        env:
          KUBECONFIG: ${{ steps.cluster.outputs.kubeconfig }}
        run: |
          # Verify basic health
          kubectl get pods -l app=myapp
          kubectl exec deploy/myapp -- wget -qO- http://localhost:8080/health

      - name: Run integration tests
        env:
          KUBECONFIG: ${{ steps.cluster.outputs.kubeconfig }}
        run: |
          go test ./tests/... -v -timeout 10m 2>&1 | tee /tmp/test-output.txt

      - name: Report results
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            let testOutput = 'No test output captured';
            try {
              testOutput = fs.readFileSync('/tmp/test-output.txt', 'utf8');
            } catch (e) {}

            const status = '${{ job.status }}' === 'success' ? 'passed' : 'failed';
            const emoji = status === 'passed' ? ':white_check_mark:' : ':x:';

            const body = `## Kubernetes Integration Tests ${emoji}

            **Status:** ${status}
            **PR:** #${{ github.event.pull_request.number }}
            **Commit:** \`${{ github.sha }}\`

            <details>
            <summary>Test Output</summary>

            \`\`\`
            ${testOutput.slice(-3000)}
            \`\`\`
            </details>`;

            // Update or create comment
            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: ${{ github.event.pull_request.number }},
            });

            const existing = comments.data.find(c =>
              c.body.includes('Kubernetes Integration Tests')
            );

            const params = {
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body,
            };

            if (existing) {
              await github.rest.issues.updateComment({...params, comment_id: existing.id});
            } else {
              await github.rest.issues.createComment({...params, issue_number: ${{ github.event.pull_request.number }}});
            }

      - name: Collect failure artifacts
        if: failure()
        env:
          KUBECONFIG: ${{ steps.cluster.outputs.kubeconfig }}
        run: |
          mkdir -p /tmp/artifacts
          kubectl get all --all-namespaces > /tmp/artifacts/resources.txt 2>&1 || true
          kubectl describe pods -l app=myapp > /tmp/artifacts/pod-details.txt 2>&1 || true
          kubectl logs deploy/myapp --all-containers > /tmp/artifacts/app-logs.txt 2>&1 || true
          kubectl get events --sort-by=.lastTimestamp > /tmp/artifacts/events.txt 2>&1 || true

      - name: Upload artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-artifacts-pr-${{ github.event.pull_request.number }}
          path: /tmp/artifacts/
          retention-days: 7

      - name: Destroy cluster
        if: always()
        run: |
          talosctl cluster destroy --name "pr-${{ github.event.pull_request.number }}" || true
```

### Selective Testing

Not every PR needs a full Kubernetes test. Add logic to determine when cluster tests are needed:

```yaml
  check-changes:
    runs-on: ubuntu-latest
    outputs:
      needs-cluster: ${{ steps.check.outputs.needs-cluster }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - id: check
        run: |
          # Check if changes affect Kubernetes-related files
          CHANGED_FILES=$(git diff --name-only origin/main...HEAD)

          if echo "$CHANGED_FILES" | grep -qE '(manifests/|Dockerfile|\.go$|charts/)'; then
            echo "needs-cluster=true" >> $GITHUB_OUTPUT
          else
            echo "needs-cluster=false" >> $GITHUB_OUTPUT
          fi

  kubernetes-test:
    needs: check-changes
    if: needs.check-changes.outputs.needs-cluster == 'true'
    # ... rest of the job
```

### Concurrency Management

Prevent multiple runs for the same PR from creating resource conflicts:

```yaml
concurrency:
  group: pr-test-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

This cancels any running workflow for the same PR when new commits are pushed.

## GitLab CI Implementation

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - cleanup

variables:
  CLUSTER_NAME: "pr-${CI_MERGE_REQUEST_IID}"

build:
  stage: build
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  script:
    - docker build -t myapp:mr-${CI_MERGE_REQUEST_IID} .

kubernetes-test:
  stage: test
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  services:
    - docker:24-dind
  script:
    - curl -sL https://talos.dev/install | sh
    - talosctl cluster create
        --provisioner docker
        --name "${CLUSTER_NAME}"
        --controlplanes 1
        --workers 1
        --wait-timeout 5m
    - talosctl kubeconfig --force /tmp/kubeconfig --merge=false
    - export KUBECONFIG=/tmp/kubeconfig
    - kubectl wait --for=condition=Ready nodes --all --timeout=300s
    - kubectl apply -f manifests/
    - kubectl rollout status deployment/myapp --timeout=120s
    - go test ./tests/... -v -timeout 10m
  after_script:
    - curl -sL https://talos.dev/install | sh
    - talosctl cluster destroy --name "${CLUSTER_NAME}" || true
```

## Handling Flaky Tests

PR tests need to be reliable or developers will start ignoring them. Build in retry logic:

```bash
#!/bin/bash
# run-with-retry.sh

MAX_RETRIES=2
RETRY_COUNT=0

until go test ./tests/... -v -timeout 10m; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "Tests failed after $MAX_RETRIES retries"
    exit 1
  fi
  echo "Test attempt $RETRY_COUNT failed. Retrying..."
  sleep 10
done
```

## Performance Optimization

Keep PR test cycles fast to maintain developer productivity:

- Use single-node clusters with `allowSchedulingOnControlPlanes`
- Cache talosctl and container images between runs
- Only run cluster tests when relevant files change
- Run different test categories in parallel where possible
- Set aggressive but reasonable timeouts

```bash
# Optimized single-node cluster for PR testing
talosctl cluster create \
  --provisioner docker \
  --name "$CLUSTER_NAME" \
  --controlplanes 1 \
  --workers 0 \
  --cpus 2 \
  --memory 2048 \
  --config-patch '[{"op":"add","path":"/cluster/allowSchedulingOnControlPlanes","value":true}]' \
  --wait-timeout 3m
```

## Wrapping Up

Automating Talos cluster creation for PR testing creates a feedback loop that catches integration issues before they reach the main branch. The key is making the process fast enough that developers do not see it as a bottleneck - under 10 minutes for the full cycle - and reliable enough that they trust the results. With proper concurrency management, selective triggering, and cleanup automation, PR-based cluster testing becomes a natural part of the development workflow rather than a special event.

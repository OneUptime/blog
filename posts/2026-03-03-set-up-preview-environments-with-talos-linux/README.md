# How to Set Up Preview Environments with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Preview Environments, Pull Requests, Kubernetes, Developer Experience

Description: Build automatic preview environments that spin up Talos Linux Kubernetes clusters for every pull request, giving reviewers a live running instance to test against.

---

Preview environments are one of the most powerful tools for improving code review quality. Instead of reviewing code changes in the abstract, reviewers get a live, running version of the application built from the pull request branch. They can click around, test edge cases, and verify that the changes actually work as intended. With Talos Linux, you can take this further by provisioning an entire Kubernetes cluster for each PR, giving reviewers not just the application but the complete infrastructure context.

This guide covers how to build an automated preview environment system using Talos Linux, from the architecture design through to the CI/CD integration.

## How Preview Environments Work

The flow is straightforward:

1. Developer opens a pull request
2. CI pipeline creates a Talos cluster
3. Application is deployed to the cluster from the PR branch
4. A unique URL is generated and posted as a comment on the PR
5. Reviewers use the URL to test the changes
6. When the PR is closed or merged, the cluster is destroyed

```text
PR Opened --> Create Cluster --> Deploy App --> Post URL
PR Closed --> Destroy Cluster
PR Updated --> Update Deployment
```

## Architecture

For preview environments at scale, you need:

- A management system that watches PRs and manages cluster lifecycle
- A way to expose applications from each cluster (DNS wildcard + ingress, or tunnels)
- Automatic cleanup when PRs are closed
- Resource limits to prevent runaway costs

```text
GitHub/GitLab
    |
    v
CI Pipeline (GitHub Actions / GitLab CI)
    |
    v
Create Talos Cluster (Docker Provider)
    |
    v
Deploy Application
    |
    v
Expose via Ingress/Tunnel
    |
    v
Post URL to PR
```

## Implementation with GitHub Actions

Here is a complete GitHub Actions workflow for preview environments:

```yaml
# .github/workflows/preview.yml
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

jobs:
  deploy-preview:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install tools
        run: |
          # Install talosctl
          curl -sL https://talos.dev/install | sh

          # Install kubectl
          curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
          chmod +x kubectl && sudo mv kubectl /usr/local/bin/

      - name: Create or update preview cluster
        env:
          CLUSTER_NAME: "preview-pr-${{ github.event.pull_request.number }}"
        run: |
          # Check if cluster already exists
          if talosctl cluster show --name "$CLUSTER_NAME" 2>/dev/null; then
            echo "Cluster already exists, updating deployment..."
          else
            echo "Creating new preview cluster..."
            talosctl cluster create \
              --provisioner docker \
              --name "$CLUSTER_NAME" \
              --controlplanes 1 \
              --workers 1 \
              --wait-timeout 5m
          fi

          talosctl kubeconfig --force /tmp/preview-kubeconfig --merge=false
          export KUBECONFIG=/tmp/preview-kubeconfig

          # Wait for readiness
          kubectl wait --for=condition=Ready nodes --all --timeout=300s

      - name: Build and deploy application
        env:
          KUBECONFIG: /tmp/preview-kubeconfig
        run: |
          # Build the application
          docker build -t myapp:pr-${{ github.event.pull_request.number }} .

          # Deploy to the preview cluster
          kubectl apply -f manifests/
          kubectl set image deployment/myapp \
            myapp=myapp:pr-${{ github.event.pull_request.number }}
          kubectl rollout status deployment/myapp --timeout=120s

      - name: Get preview URL
        id: preview-url
        env:
          KUBECONFIG: /tmp/preview-kubeconfig
        run: |
          # Get the node port
          NODE_PORT=$(kubectl get svc myapp -o jsonpath='{.spec.ports[0].nodePort}')
          NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}')
          echo "url=http://${NODE_IP}:${NODE_PORT}" >> $GITHUB_OUTPUT

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const url = '${{ steps.preview-url.outputs.url }}';
            const body = `## Preview Environment Ready

            Your changes are deployed and available for review:
            **URL:** ${url}

            This environment will be automatically destroyed when the PR is closed.

            _Last updated: ${new Date().toISOString()}_`;

            // Find existing comment
            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const botComment = comments.data.find(c =>
              c.body.includes('Preview Environment Ready')
            );

            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: body,
              });
            }

  destroy-preview:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Install talosctl
        run: curl -sL https://talos.dev/install | sh

      - name: Destroy preview cluster
        run: |
          CLUSTER_NAME="preview-pr-${{ github.event.pull_request.number }}"
          talosctl cluster destroy --name "$CLUSTER_NAME" || true

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: 'Preview environment has been destroyed.',
            });
```

## Exposing Preview Environments

The challenge with preview environments is making them accessible to reviewers. There are several approaches:

### NodePort with Self-Hosted Runners

If you use self-hosted runners, the cluster is on a network that might be reachable by your team:

```yaml
# Use NodePort services
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  type: NodePort
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30080
```

### Cloudflare Tunnel

For environments that need to be accessible from anywhere:

```bash
# Deploy cloudflared in the preview cluster
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloudflared
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cloudflared
  template:
    metadata:
      labels:
        app: cloudflared
    spec:
      containers:
        - name: cloudflared
          image: cloudflare/cloudflared:latest
          args:
            - tunnel
            - --no-autoupdate
            - run
            - --token
            - \$(TUNNEL_TOKEN)
          env:
            - name: TUNNEL_TOKEN
              valueFrom:
                secretKeyRef:
                  name: cloudflare-tunnel
                  key: token
EOF
```

### Tailscale Funnel

Expose the service through Tailscale for team-accessible previews:

```bash
# Add Tailscale to the cluster and use Funnel
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: tailscale-funnel
spec:
  containers:
    - name: tailscale
      image: tailscale/tailscale:latest
      env:
        - name: TS_AUTHKEY
          valueFrom:
            secretKeyRef:
              name: tailscale-auth
              key: key
      command:
        - sh
        - -c
        - |
          tailscaled &
          tailscale up --authkey=\$TS_AUTHKEY --hostname=preview-pr-123
          tailscale funnel 80
          sleep infinity
EOF
```

## Resource Limits and Cost Control

Preview environments can quickly consume resources if not managed:

```bash
# Limit the total number of concurrent preview environments
MAX_PREVIEWS=5
CURRENT=$(talosctl cluster show 2>/dev/null | grep -c "preview-" || echo "0")

if [ "$CURRENT" -ge "$MAX_PREVIEWS" ]; then
  echo "Maximum preview environments reached ($MAX_PREVIEWS)"
  echo "Please close an existing PR to free up resources"
  exit 1
fi
```

Use minimal cluster configurations for previews:

```bash
# Single-node preview cluster
talosctl cluster create \
  --provisioner docker \
  --name "$CLUSTER_NAME" \
  --controlplanes 1 \
  --workers 0 \
  --cpus 2 \
  --memory 2048 \
  --config-patch '[{"op":"add","path":"/cluster/allowSchedulingOnControlPlanes","value":true}]'
```

## Automatic Cleanup

Implement safety mechanisms to prevent orphaned environments:

```yaml
# .github/workflows/cleanup-stale-previews.yml
name: Cleanup Stale Previews

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Install talosctl
        run: curl -sL https://talos.dev/install | sh

      - name: Find and destroy stale clusters
        uses: actions/github-script@v7
        with:
          script: |
            // Get open PRs
            const prs = await github.rest.pulls.list({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'open',
            });
            const openPRNumbers = new Set(prs.data.map(pr => pr.number));

            // List preview clusters and destroy orphaned ones
            const { execSync } = require('child_process');
            const clusters = execSync('talosctl cluster show 2>/dev/null || true')
              .toString();

            const previewClusters = clusters.match(/preview-pr-\d+/g) || [];
            for (const cluster of previewClusters) {
              const prNum = parseInt(cluster.match(/\d+/)[0]);
              if (!openPRNumbers.has(prNum)) {
                console.log(`Destroying orphaned cluster: ${cluster}`);
                execSync(`talosctl cluster destroy --name ${cluster} || true`);
              }
            }
```

## Database and Stateful Services

Preview environments often need databases with test data:

```yaml
# Deploy a test database as part of the preview
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          env:
            - name: POSTGRES_DB
              value: testdb
            - name: POSTGRES_USER
              value: testuser
            - name: POSTGRES_PASSWORD
              value: testpass
          ports:
            - containerPort: 5432
```

## Wrapping Up

Preview environments built on Talos Linux transform the code review process from reading diffs to interacting with live applications. By automating the entire lifecycle - creation on PR open, updates on new commits, and destruction on PR close - you give reviewers a hands-on way to validate changes. The Docker provider keeps resource usage reasonable, and proper cleanup mechanisms prevent resource waste. The investment in setting up this system pays for itself through faster review cycles and fewer bugs making it to production.

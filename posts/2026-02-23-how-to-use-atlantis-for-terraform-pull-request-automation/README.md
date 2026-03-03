# How to Use Atlantis for Terraform Pull Request Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Atlantis, Pull Request Automation, CI/CD, DevOps, Infrastructure as Code

Description: A comprehensive guide to using Atlantis for Terraform pull request automation, covering installation, configuration, workflows, policy checks, and team collaboration patterns.

---

Atlantis is an open-source tool that automates Terraform workflows through pull request comments. Instead of running Terraform locally or configuring complex CI/CD pipelines, developers comment `atlantis plan` on a PR and Atlantis runs the plan, posts the output as a comment, and waits for `atlantis apply` to execute changes. It is simple, auditable, and team-friendly.

## Why Atlantis

CI/CD platforms like GitHub Actions work fine for Terraform, but Atlantis has some advantages:

- **Comment-driven workflow** - No pipeline configuration per repository
- **Lock management** - Prevents concurrent applies on the same directory
- **Plan review in context** - Plan output appears directly in the PR
- **Apply requires approval** - Built-in merge requirements before apply
- **Multi-repo support** - One Atlantis server can manage many repositories
- **Custom workflows** - Define pre-plan, post-plan, pre-apply, and post-apply hooks

## Installing Atlantis

### Docker

```bash
# Run Atlantis as a Docker container
docker run -d \
  --name atlantis \
  -p 4141:4141 \
  -e ATLANTIS_GH_USER="atlantis-bot" \
  -e ATLANTIS_GH_TOKEN="ghp_your_github_token" \
  -e ATLANTIS_GH_WEBHOOK_SECRET="your-webhook-secret" \
  -e ATLANTIS_REPO_ALLOWLIST="github.com/myorg/*" \
  -e AWS_ACCESS_KEY_ID="your_access_key" \
  -e AWS_SECRET_ACCESS_KEY="your_secret_key" \
  ghcr.io/runatlantis/atlantis:latest server
```

### Kubernetes with Helm

```bash
# Add the Atlantis Helm repository
helm repo add runatlantis https://runatlantis.github.io/helm-charts

# Install Atlantis
helm install atlantis runatlantis/atlantis \
  --set github.user=atlantis-bot \
  --set github.token=ghp_your_github_token \
  --set github.secret=your-webhook-secret \
  --set orgAllowlist="github.com/myorg/*" \
  --set aws.credentials="[default]\naws_access_key_id=xxx\naws_secret_access_key=xxx"
```

### Kubernetes Manifest

```yaml
# atlantis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: atlantis
  namespace: atlantis
spec:
  replicas: 1  # Atlantis must run as a single replica
  selector:
    matchLabels:
      app: atlantis
  template:
    metadata:
      labels:
        app: atlantis
    spec:
      containers:
        - name: atlantis
          image: ghcr.io/runatlantis/atlantis:latest
          args:
            - server
            - --gh-user=atlantis-bot
            - --gh-webhook-secret=$(WEBHOOK_SECRET)
            - --repo-allowlist=github.com/myorg/*
          env:
            - name: ATLANTIS_GH_TOKEN
              valueFrom:
                secretKeyRef:
                  name: atlantis-secrets
                  key: github-token
            - name: WEBHOOK_SECRET
              valueFrom:
                secretKeyRef:
                  name: atlantis-secrets
                  key: webhook-secret
          ports:
            - containerPort: 4141
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          volumeMounts:
            - name: atlantis-data
              mountPath: /atlantis-data
      volumes:
        - name: atlantis-data
          persistentVolumeClaim:
            claimName: atlantis-data-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: atlantis
  namespace: atlantis
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 4141
  selector:
    app: atlantis
```

## Configuring the Repository

Create an `atlantis.yaml` file in the root of your repository:

```yaml
# atlantis.yaml - Repository-level configuration
version: 3

projects:
  - name: production-networking
    dir: environments/production/networking
    workspace: default
    terraform_version: v1.7.0
    autoplan:
      when_modified:
        - "*.tf"
        - "*.tfvars"
        - "../../../modules/vpc/**"  # Also plan when shared modules change
      enabled: true
    apply_requirements:
      - approved  # PR must be approved before apply
      - mergeable  # PR must pass all other checks

  - name: production-compute
    dir: environments/production/compute
    workspace: default
    terraform_version: v1.7.0
    autoplan:
      when_modified:
        - "*.tf"
        - "*.tfvars"
        - "../../../modules/ecs-cluster/**"
      enabled: true
    apply_requirements:
      - approved
      - mergeable

  - name: staging-networking
    dir: environments/staging/networking
    workspace: default
    terraform_version: v1.7.0
    autoplan:
      when_modified:
        - "*.tf"
        - "*.tfvars"
      enabled: true
```

## The Atlantis Workflow

Here is the typical developer experience:

1. Developer creates a PR that modifies Terraform files
2. Atlantis detects the changes and automatically runs `terraform plan`
3. Plan output appears as a PR comment
4. Team reviews the plan and the code
5. Developer comments `atlantis apply` after getting approval
6. Atlantis runs `terraform apply` and posts the result
7. PR is merged

```text
Developer: Opens PR modifying environments/production/networking/main.tf

Atlantis Bot:
  Running Plan for dir: environments/production/networking workspace: default

  Plan: 2 to add, 1 to change, 0 to destroy.

  To apply this plan, comment:
    atlantis apply -d environments/production/networking

Developer: atlantis apply -d environments/production/networking

Atlantis Bot:
  Apply complete! Resources: 2 added, 1 changed, 0 destroyed.
```

## Custom Workflows

Define custom steps that run before or after plan and apply:

```yaml
# atlantis.yaml with custom workflows
version: 3

workflows:
  custom:
    plan:
      steps:
        # Run tflint before planning
        - run: tflint --init && tflint
        # Run checkov security scanning
        - run: checkov -d . --quiet --compact
        # Standard plan
        - init
        - plan
    apply:
      steps:
        - apply
        # Post-apply notification
        - run: |
            curl -X POST $SLACK_WEBHOOK \
              -d "{\"text\": \"Terraform applied in $REPO_REL_DIR by $PULL_AUTHOR\"}"

projects:
  - name: production
    dir: environments/production
    workflow: custom
```

## Server-Side Configuration

For organization-wide settings, configure Atlantis server-side:

```yaml
# repos.yaml - Server-side repository configuration
repos:
  # Default settings for all repos
  - id: "/.*/""
    branch: "/.*/"
    apply_requirements:
      - approved
      - mergeable
    allowed_overrides:
      - apply_requirements
      - workflow
    allow_custom_workflows: true

  # Stricter settings for production repos
  - id: "github.com/myorg/production-infrastructure"
    apply_requirements:
      - approved
      - mergeable
    allowed_overrides: []  # No overrides allowed
    allow_custom_workflows: false
```

## Atlantis Locking

Atlantis has a built-in locking mechanism separate from Terraform state locking. When a plan runs for a directory, Atlantis locks that directory to the specific PR. No other PR can plan or apply changes to the same directory until the lock is released.

```text
# If another PR tries to plan the same directory:

Developer: atlantis plan

Atlantis Bot:
  This project is currently locked by PR #42.
  To unlock, either merge or close PR #42,
  or comment atlantis unlock on this PR.
```

This prevents conflicting changes from being applied out of order.

## Security Considerations

Atlantis runs with cloud credentials, so security is important:

```yaml
# Restrict who can trigger Atlantis commands
# repos.yaml
repos:
  - id: "github.com/myorg/*"
    # Only allow apply from specific team members
    allowed_overrides: []
    allow_custom_workflows: false

# Use OIDC instead of static credentials
# atlantis-deployment.yaml
env:
  - name: AWS_ROLE_ARN
    value: "arn:aws:iam::123456789012:role/atlantis-role"
  - name: AWS_WEB_IDENTITY_TOKEN_FILE
    value: "/var/run/secrets/kubernetes.io/serviceaccount/token"
```

## Monitoring Atlantis

```yaml
# Prometheus metrics endpoint
# Atlantis exposes metrics at /metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: atlantis
spec:
  selector:
    matchLabels:
      app: atlantis
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

## Summary

Atlantis simplifies Terraform CI/CD by turning pull requests into the control plane for infrastructure changes. The comment-driven workflow is intuitive for developers, the built-in locking prevents conflicts, and the custom workflow hooks let you add security scanning and notifications. If you want Terraform automation without the overhead of building custom CI/CD pipelines, Atlantis is worth trying.

For platform-specific Atlantis setup, see our guides on [configuring Atlantis with GitHub](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-atlantis-with-github-for-terraform/view) and [configuring Atlantis with GitLab](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-atlantis-with-gitlab-for-terraform/view).

# How to Configure Atlantis with GitLab for Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Atlantis, GitLab, Merge Request, CI/CD, DevOps

Description: Complete guide to setting up Atlantis with GitLab for Terraform merge request automation, covering token configuration, webhooks, GitLab CI integration, and self-managed GitLab instances.

---

GitLab users can get the same Terraform pull request automation that GitHub teams enjoy with Atlantis. The setup is slightly different since GitLab uses merge requests instead of pull requests and has its own webhook format, but the core workflow is the same: open a merge request, get a plan comment, review, and apply through comments.

## Prerequisites

You need:
- A GitLab account (SaaS or self-managed)
- A GitLab personal access token or group access token
- A server or Kubernetes cluster to run Atlantis
- Network connectivity between Atlantis and GitLab

## Creating the GitLab Access Token

Create a dedicated user for Atlantis (e.g., `atlantis-bot`) and generate an access token:

1. Go to the user's Settings > Access Tokens
2. Create a token with these scopes:
   - `api` - Full API access for commenting on merge requests
   - `read_repository` - Clone repositories
   - `write_repository` - Push status updates

For group-level access, create a group access token instead:

```text
Group Settings > Access Tokens > Add new token
Name: atlantis-terraform
Role: Developer
Scopes: api, read_repository, write_repository
```

## Starting Atlantis with GitLab

```bash
# Start Atlantis for GitLab
atlantis server \
  --gitlab-user=atlantis-bot \
  --gitlab-token=glpat-xxxxxxxxxxxxxxxxxxxx \
  --gitlab-webhook-secret=your-random-secret \
  --repo-allowlist="gitlab.com/mygroup/*" \
  --gitlab-hostname=gitlab.com \
  --port=4141
```

For self-managed GitLab instances:

```bash
# Self-managed GitLab configuration
atlantis server \
  --gitlab-user=atlantis-bot \
  --gitlab-token=glpat-xxxxxxxxxxxxxxxxxxxx \
  --gitlab-webhook-secret=your-random-secret \
  --repo-allowlist="gitlab.mycompany.com/infrastructure/*" \
  --gitlab-hostname=gitlab.mycompany.com
```

## Setting Up Webhooks

Configure the webhook in your GitLab project or group:

### Project-Level Webhook

1. Go to Project Settings > Webhooks
2. Add a new webhook:

```text
URL: https://atlantis.mycompany.com/events
Secret Token: (same as --gitlab-webhook-secret)
Trigger:
  - Push events
  - Comments
  - Merge request events
SSL verification: Enable
```

### Group-Level Webhook (Premium/Ultimate)

For managing multiple projects from one webhook:

```text
Group Settings > Webhooks
URL: https://atlantis.mycompany.com/events
Secret Token: your-random-secret
Trigger:
  - Push events
  - Comments
  - Merge request events
```

## Repository Configuration

The `atlantis.yaml` file works the same way as with GitHub:

```yaml
# atlantis.yaml
version: 3

automerge: false
parallel_plan: true

projects:
  - name: production
    dir: environments/production
    terraform_version: v1.7.0
    autoplan:
      when_modified:
        - "*.tf"
        - "*.tfvars"
        - "../../modules/**/*.tf"
      enabled: true
    apply_requirements:
      - approved
      - mergeable

  - name: staging
    dir: environments/staging
    terraform_version: v1.7.0
    autoplan:
      when_modified:
        - "*.tf"
        - "*.tfvars"
      enabled: true
    apply_requirements:
      - mergeable
```

## The Merge Request Workflow

The workflow mirrors the GitHub experience but uses GitLab terminology:

```text
Developer: Creates merge request modifying environments/production/main.tf

atlantis-bot:
  Ran Plan for dir: environments/production workspace: default

  ```
  Terraform will perform the following actions:

    # aws_instance.web will be created
    + resource "aws_instance" "web" {
        + ami           = "ami-0c55b159cbfafe1f0"
        + instance_type = "t3.medium"
      }

  Plan: 1 to add, 0 to change, 0 to destroy.
  ```text

  To **apply** this plan, comment:
    `atlantis apply -d environments/production`

Developer: atlantis apply -d environments/production

atlantis-bot:
  Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

## GitLab Merge Request Approval Rules

Configure GitLab to require Atlantis plan success before merging:

```text
Project Settings > Merge Requests

Merge checks:
  - Pipelines must succeed
  - All discussions must be resolved

Approval rules:
  - Require approval from: 1
  - Approvers: platform-team
```

Since Atlantis creates pipeline statuses in GitLab, you can require those statuses to pass before the merge request can be merged.

## Custom Workflows for GitLab

```yaml
# atlantis.yaml with GitLab-specific workflows
version: 3

workflows:
  with-security-scan:
    plan:
      steps:
        - init
        - plan
        # Run tfsec security scanner
        - run: |
            tfsec . --format json --out tfsec-results.json || true
            # Post results as a merge request note if issues found
            if [ -s tfsec-results.json ]; then
              echo "Security issues found. Review tfsec-results.json"
            fi
    apply:
      steps:
        - apply

projects:
  - name: production
    dir: environments/production
    workflow: with-security-scan
```

## Integrating with GitLab CI

You can run Atlantis alongside existing GitLab CI pipelines. GitLab CI handles testing and validation, while Atlantis handles plan and apply:

```yaml
# .gitlab-ci.yml - Complementary pipeline
stages:
  - validate
  - security

# Run validation in GitLab CI (Atlantis handles plan/apply)
terraform-validate:
  stage: validate
  image: hashicorp/terraform:1.7.0
  script:
    - terraform fmt -check -recursive
    - terraform init -backend=false
    - terraform validate
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

security-scan:
  stage: security
  image: aquasec/tfsec:latest
  script:
    - tfsec .
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  allow_failure: true  # Advisory, does not block the MR
```

## Server-Side Configuration

Configure Atlantis behavior at the server level:

```yaml
# repos.yaml
repos:
  # Default for all GitLab projects
  - id: "/.*/""
    apply_requirements:
      - approved
    allowed_overrides:
      - apply_requirements
      - workflow

  # Stricter settings for production
  - id: "gitlab.com/mygroup/production-infrastructure"
    apply_requirements:
      - approved
      - mergeable
    allowed_overrides: []
    allow_custom_workflows: false

  # Relaxed settings for development
  - id: "gitlab.com/mygroup/dev-infrastructure"
    apply_requirements: []
    allowed_overrides:
      - apply_requirements
      - workflow
    allow_custom_workflows: true
```

## Deploying on GitLab-Managed Kubernetes

If you use GitLab's Kubernetes integration:

```yaml
# atlantis-deployment.yaml for GitLab-managed cluster
apiVersion: apps/v1
kind: Deployment
metadata:
  name: atlantis
  namespace: atlantis
spec:
  replicas: 1
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
            - --gitlab-user=atlantis-bot
            - --gitlab-hostname=gitlab.com
            - --repo-allowlist=gitlab.com/mygroup/*
          envFrom:
            - secretRef:
                name: atlantis-credentials
          ports:
            - containerPort: 4141
          livenessProbe:
            httpGet:
              path: /healthz
              port: 4141
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /healthz
              port: 4141
            periodSeconds: 10
```

## Handling Self-Managed GitLab

For self-managed GitLab instances behind a corporate network:

```bash
# Configure Atlantis for internal GitLab
atlantis server \
  --gitlab-user=atlantis-bot \
  --gitlab-token=$GITLAB_TOKEN \
  --gitlab-webhook-secret=$WEBHOOK_SECRET \
  --gitlab-hostname=gitlab.internal.mycompany.com \
  --repo-allowlist="gitlab.internal.mycompany.com/*" \
  --ssl-cert-file=/etc/ssl/certs/gitlab-ca.pem \
  --data-dir=/atlantis-data
```

If GitLab uses a self-signed certificate:

```bash
# Add the CA certificate to the Atlantis container
# In your Dockerfile:
COPY gitlab-ca.crt /usr/local/share/ca-certificates/
RUN update-ca-certificates
```

## Troubleshooting GitLab-Specific Issues

**Webhook returns 401**: Verify the webhook secret matches the `--gitlab-webhook-secret` flag exactly.

**Atlantis cannot clone the repository**: Check that the access token has `read_repository` scope and the user has at least Developer access to the project.

**Comments not appearing**: The token needs `api` scope. Also check that the atlantis-bot user is a member of the project.

**Self-managed GitLab SSL errors**: If using self-signed certificates, add the CA certificate to the Atlantis container's trust store.

**Merge request pipeline not triggered**: GitLab may need the `Push events` webhook trigger enabled for Atlantis to detect new commits on merge request branches.

## Summary

Atlantis works just as well with GitLab as it does with GitHub. The main differences are in the authentication setup (GitLab tokens vs GitHub Apps) and the webhook configuration. Once configured, the merge request workflow provides the same plan-and-apply experience that makes Atlantis popular. Combine it with GitLab CI for validation and security scanning to get a complete Terraform CI/CD pipeline.

For the GitHub equivalent, see our guide on [configuring Atlantis with GitHub](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-atlantis-with-github-for-terraform/view).

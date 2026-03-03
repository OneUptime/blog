# How to Configure Atlantis with GitHub for Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Atlantis, GitHub, Pull Requests, CI/CD, DevOps

Description: Step-by-step guide to configuring Atlantis with GitHub for Terraform pull request automation, including webhook setup, GitHub App creation, branch protection, and team workflows.

---

Atlantis and GitHub are a natural pairing for Terraform automation. Developers open pull requests, Atlantis plans automatically, and applies happen through PR comments. This guide walks through the complete setup from creating the GitHub integration to configuring branch protection rules that enforce the Atlantis workflow.

## Authentication Options

Atlantis supports two methods for connecting to GitHub:

1. **Personal Access Token (PAT)** - Simpler setup, runs as a specific user
2. **GitHub App** - More secure, better rate limits, finer permissions

For production, use a GitHub App.

### Option 1: Personal Access Token

Create a machine user account (e.g., `atlantis-bot`) and generate a PAT:

```bash
# Required token scopes:
# - repo (full control of private repositories)
# - read:org (if using team-based access control)

# Start Atlantis with the token
atlantis server \
  --gh-user=atlantis-bot \
  --gh-token=ghp_xxxxxxxxxxxxxxxxxxxx \
  --gh-webhook-secret=your-random-secret \
  --repo-allowlist="github.com/myorg/*"
```

### Option 2: GitHub App (Recommended)

Create a GitHub App for Atlantis:

1. Go to your GitHub organization settings
2. Navigate to Developer settings > GitHub Apps > New GitHub App
3. Configure the app:

```text
App Name: Atlantis Terraform
Homepage URL: https://atlantis.mycompany.com
Webhook URL: https://atlantis.mycompany.com/events
Webhook Secret: (generate a random string)

Permissions:
  Repository:
    - Administration: Read-only
    - Checks: Read & Write
    - Contents: Read & Write
    - Issues: Read & Write
    - Pull Requests: Read & Write
    - Commit statuses: Read & Write
  Organization:
    - Members: Read-only

Subscribe to events:
  - Issue comments
  - Pull requests
  - Pull request reviews
  - Push
```

4. Generate a private key and download it
5. Install the app on your organization

```bash
# Start Atlantis with GitHub App credentials
atlantis server \
  --gh-app-id=12345 \
  --gh-app-key-file=/path/to/private-key.pem \
  --gh-app-slug=atlantis-terraform \
  --gh-webhook-secret=your-random-secret \
  --repo-allowlist="github.com/myorg/*"
```

## Setting Up the Webhook

If not using a GitHub App (which handles webhooks automatically), configure the webhook manually:

1. Go to your repository Settings > Webhooks > Add webhook
2. Configure:

```text
Payload URL: https://atlantis.mycompany.com/events
Content type: application/json
Secret: (same secret used in Atlantis config)

Events:
  - Issue comments
  - Pull requests
  - Pull request reviews
  - Pushes
```

For organization-wide setup, create the webhook at the organization level instead of per-repository.

## Branch Protection Rules

Configure GitHub branch protection to enforce the Atlantis workflow:

```text
Repository Settings > Branches > Branch protection rules

Branch name pattern: main

Required settings:
  - Require a pull request before merging
  - Require approvals: 1 (or more)
  - Require status checks to pass before merging
    - Add "atlantis/plan" as a required check
  - Require branches to be up to date before merging
  - Do not allow bypassing the above settings
```

This ensures no one can push directly to main without going through the Atlantis plan/apply workflow.

## Repository Configuration

Create the `atlantis.yaml` in your repository root:

```yaml
# atlantis.yaml
version: 3

automerge: false  # Do not auto-merge after apply
parallel_plan: true  # Plan multiple projects in parallel
parallel_apply: false  # Apply one at a time for safety

projects:
  - name: dev-infrastructure
    dir: environments/dev
    terraform_version: v1.7.0
    autoplan:
      when_modified:
        - "*.tf"
        - "*.tfvars"
        - "../../modules/**/*.tf"
      enabled: true
    apply_requirements:
      - mergeable

  - name: production-infrastructure
    dir: environments/production
    terraform_version: v1.7.0
    autoplan:
      when_modified:
        - "*.tf"
        - "*.tfvars"
        - "../../modules/**/*.tf"
      enabled: true
    apply_requirements:
      - approved    # Must have PR approval
      - mergeable   # Must pass all status checks
```

## Custom Workflows with Policy Checks

Add security scanning and linting before plan:

```yaml
# atlantis.yaml with OPA policy checks
version: 3

workflows:
  production:
    plan:
      steps:
        - run: terraform fmt -check -recursive
        - init
        - plan
        # Run conftest for OPA policy validation
        - run: |
            terraform show -json $PLANFILE | \
              conftest test --policy policies/ -
    apply:
      steps:
        - apply

  development:
    plan:
      steps:
        - init
        - plan
    apply:
      steps:
        - apply

projects:
  - name: production
    dir: environments/production
    workflow: production
    apply_requirements:
      - approved
      - mergeable

  - name: development
    dir: environments/dev
    workflow: development
```

## GitHub Status Checks

Atlantis creates status checks on PRs for each project:

```text
atlantis/plan: environments/dev        - Success
atlantis/plan: environments/production - Success
atlantis/apply: environments/dev       - Pending (waiting for apply)
```

You can require specific status checks in branch protection:

```bash
# Use the GitHub API to configure required status checks
gh api repos/myorg/infrastructure/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["atlantis/plan: environments/production"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1}'
```

## Team-Based Access Control

Restrict who can run `atlantis apply` based on GitHub teams:

```yaml
# repos.yaml (server-side configuration)
repos:
  - id: "github.com/myorg/infrastructure"
    apply_requirements:
      - approved
      - mergeable

    # Only members of the platform-team can apply to production
    allowed_overrides: []
    allow_custom_workflows: false
```

For finer control, use a custom workflow with a team check:

```yaml
workflows:
  production:
    apply:
      steps:
        # Check if the user is in the allowed team
        - run: |
            ALLOWED_TEAMS="platform-team sre-team"
            USER_TEAMS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
              "https://api.github.com/orgs/myorg/members/$PULL_AUTHOR/teams" | \
              jq -r '.[].slug')

            AUTHORIZED=false
            for team in $ALLOWED_TEAMS; do
              if echo "$USER_TEAMS" | grep -q "$team"; then
                AUTHORIZED=true
                break
              fi
            done

            if [ "$AUTHORIZED" != "true" ]; then
              echo "User $PULL_AUTHOR is not authorized to apply to production"
              exit 1
            fi
        - apply
```

## Handling Multiple GitHub Organizations

If you manage infrastructure across multiple GitHub organizations:

```bash
# Atlantis supports multiple VCS hosts
atlantis server \
  --gh-app-id=12345 \
  --gh-app-key-file=/path/to/private-key.pem \
  --repo-allowlist="github.com/myorg/*,github.com/partner-org/shared-infra"
```

## Exposing Atlantis Securely

Atlantis needs to be accessible from the internet for GitHub webhooks. Use these approaches:

```yaml
# Kubernetes Ingress with TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: atlantis
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - atlantis.mycompany.com
      secretName: atlantis-tls
  rules:
    - host: atlantis.mycompany.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: atlantis
                port:
                  number: 80
```

For extra security, restrict incoming traffic to GitHub's webhook IP ranges:

```yaml
# Nginx config to only allow GitHub webhook IPs
annotations:
  nginx.ingress.kubernetes.io/whitelist-source-range: "140.82.112.0/20,185.199.108.0/22,192.30.252.0/22"
```

## Troubleshooting Common Issues

**Webhook not received**: Verify the webhook URL is accessible and the secret matches. Check GitHub webhook delivery logs under Settings > Webhooks > Recent Deliveries.

**Plan runs but no comment appears**: Check that the GitHub token or App has `pull_requests: write` permission.

**"This project is locked" errors**: Another PR has a pending plan. Either apply or discard that PR's plan first. Use `atlantis unlock` to force-unlock.

**Slow plans on large repos**: Enable `parallel_plan: true` in `atlantis.yaml` and consider splitting into smaller projects.

## Summary

Configuring Atlantis with GitHub provides a streamlined Terraform workflow where everything happens through pull requests. The GitHub App integration gives the best security and rate limit handling, branch protection rules enforce the workflow, and custom workflows add policy checks. Once set up, developers get a consistent experience across all Terraform changes.

For GitLab setup, see our companion guide on [configuring Atlantis with GitLab](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-atlantis-with-gitlab-for-terraform/view). For a broader look at Atlantis features, see [using Atlantis for Terraform pull request automation](https://oneuptime.com/blog/post/2026-02-23-how-to-use-atlantis-for-terraform-pull-request-automation/view).

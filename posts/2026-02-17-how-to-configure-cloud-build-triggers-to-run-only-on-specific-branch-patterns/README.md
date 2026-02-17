# How to Configure Cloud Build Triggers to Run Only on Specific Branch Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Branch Patterns, CI/CD, Build Triggers, Regex

Description: Learn how to configure Cloud Build triggers with branch pattern filters so builds only run on the branches you care about using regex patterns.

---

Not every branch needs every build. Your production deployment should only run from `main`, your integration tests only need to run on feature branches, and your staging deployment should only fire from `develop`. Cloud Build triggers support branch pattern filtering using regular expressions, giving you precise control over which branches trigger which builds. In this post, I will cover the most common patterns and show you how to set them up.

## How Branch Patterns Work

When you create a Cloud Build trigger with an event type of "Push to a branch," you specify a branch pattern. This pattern is a regular expression that the pushed branch name is matched against. If the branch name matches the pattern, the trigger fires. If it does not match, the push event is ignored.

The matching is done against the branch name only - not the full ref path. So you match against `main`, not `refs/heads/main`.

## Common Branch Patterns

### Single Branch

Match exactly one branch:

```bash
# Match only the main branch
gcloud builds triggers create github \
  --name="deploy-production" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml"
```

The `^` anchors to the start and `$` anchors to the end, so `^main$` matches only the exact string "main" and nothing else.

### Multiple Specific Branches

Match one of several named branches:

```bash
# Match main or develop branches
gcloud builds triggers create github \
  --name="build-on-main-or-develop" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^(main|develop)$" \
  --build-config="cloudbuild.yaml"
```

### Branch Prefix Patterns

Match all branches starting with a specific prefix:

```bash
# Match all feature branches (e.g., feature/login, feature/payment)
gcloud builds triggers create github \
  --name="test-feature-branches" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^feature/.*" \
  --build-config="cloudbuild-test.yaml"
```

```bash
# Match all release branches (e.g., release/1.0, release/2.3.1)
gcloud builds triggers create github \
  --name="build-release" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^release/.*" \
  --build-config="cloudbuild-release.yaml"
```

### All Branches

Match any branch:

```bash
# Match every branch
gcloud builds triggers create github \
  --name="lint-all-branches" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern=".*" \
  --build-config="cloudbuild-lint.yaml"
```

### Excluding Specific Branches

Cloud Build does not have a native "exclude" pattern, but you can use negative lookahead in your regex:

```bash
# Match all branches except main and develop
gcloud builds triggers create github \
  --name="test-all-except-main" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^(?!main$|develop$).*" \
  --build-config="cloudbuild-test.yaml"
```

This uses `(?!main$|develop$)` which is a negative lookahead that excludes exact matches for "main" and "develop."

### Semantic Version Release Branches

Match branches following semantic versioning:

```bash
# Match release branches with semantic version numbers (e.g., release/1.2.3)
gcloud builds triggers create github \
  --name="build-semver-release" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^release/[0-9]+\.[0-9]+\.[0-9]+$" \
  --build-config="cloudbuild-release.yaml"
```

## Using Tag Patterns

For triggers based on Git tags rather than branches, the pattern matching works the same way:

```bash
# Match semantic version tags (e.g., v1.0.0, v2.3.1)
gcloud builds triggers create github \
  --name="release-on-tag" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --tag-pattern="^v[0-9]+\.[0-9]+\.[0-9]+$" \
  --build-config="cloudbuild-release.yaml"
```

```bash
# Match pre-release tags (e.g., v1.0.0-rc.1, v2.0.0-beta.3)
gcloud builds triggers create github \
  --name="prerelease-build" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --tag-pattern="^v[0-9]+\.[0-9]+\.[0-9]+-(alpha|beta|rc)\.[0-9]+$" \
  --build-config="cloudbuild-prerelease.yaml"
```

## Combining Branch Patterns with File Filters

Branch patterns tell Cloud Build which branches to watch. File filters (included and excluded files) add another layer of filtering based on which files changed in the push:

```bash
# Only build when source code changes on the main branch (not README updates)
gcloud builds triggers create github \
  --name="deploy-on-code-change" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --included-files="src/**,package.json,Dockerfile"
```

```bash
# Build backend service when backend code changes on any branch
gcloud builds triggers create github \
  --name="test-backend" \
  --repo-name="my-monorepo" \
  --repo-owner="my-org" \
  --branch-pattern=".*" \
  --build-config="services/backend/cloudbuild.yaml" \
  --included-files="services/backend/**"
```

You can also exclude files:

```bash
# Build on main, but skip when only docs change
gcloud builds triggers create github \
  --name="build-skip-docs" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --ignored-files="docs/**,*.md,LICENSE"
```

## A Real-World Trigger Setup

Here is a complete set of triggers for a typical project with a Git Flow branching strategy:

```bash
# 1. Lint and test on all feature branches
gcloud builds triggers create github \
  --name="feature-branch-ci" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^feature/.*" \
  --build-config="cloudbuild-ci.yaml" \
  --description="Run lint and tests on feature branches"

# 2. Build and deploy to dev on develop branch
gcloud builds triggers create github \
  --name="deploy-dev" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^develop$" \
  --build-config="cloudbuild-deploy.yaml" \
  --substitutions="_ENV=dev,_MIN_INSTANCES=0" \
  --description="Auto-deploy to dev environment"

# 3. Build and deploy to staging on release branches
gcloud builds triggers create github \
  --name="deploy-staging" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^release/.*" \
  --build-config="cloudbuild-deploy.yaml" \
  --substitutions="_ENV=staging,_MIN_INSTANCES=1" \
  --description="Auto-deploy to staging environment"

# 4. Build and deploy to production on main (with approval)
gcloud builds triggers create github \
  --name="deploy-production" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild-deploy.yaml" \
  --substitutions="_ENV=production,_MIN_INSTANCES=3" \
  --require-approval \
  --description="Deploy to production (requires approval)"

# 5. Build release artifacts on version tags
gcloud builds triggers create github \
  --name="create-release" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --tag-pattern="^v[0-9]+\.[0-9]+\.[0-9]+$" \
  --build-config="cloudbuild-release.yaml" \
  --description="Create release artifacts for version tags"
```

## Testing Branch Patterns

Before deploying a trigger to production, test that your regex pattern matches what you expect. You can use the gcloud CLI to list triggers and their patterns:

```bash
# List all triggers and their branch patterns
gcloud builds triggers list --format="table(name, triggerTemplate.branchName, triggerTemplate.tagName)"
```

To test your regex without creating a trigger, use a simple command:

```bash
# Test a regex pattern against branch names
for branch in main develop feature/login hotfix/bug-123 release/1.0.0; do
  if echo "$branch" | grep -Pq "^feature/.*"; then
    echo "MATCH: $branch"
  else
    echo "NO MATCH: $branch"
  fi
done
```

## Managing Triggers at Scale

As you add more repositories and environments, the number of triggers grows. Here are some tips for managing them:

**Naming convention** - Use a consistent naming pattern like `{action}-{environment}` or `{service}-{action}-{branch}`. This makes triggers easy to find and filter.

**Description field** - Always fill in the description. Future you (or your teammates) will thank you when trying to understand what a trigger does.

**Terraform or Pulumi** - For large-scale trigger management, define triggers in infrastructure-as-code:

```hcl
# Terraform example for a Cloud Build trigger
resource "google_cloudbuild_trigger" "deploy_production" {
  name        = "deploy-production"
  description = "Deploy to production on push to main"

  github {
    owner = "my-org"
    name  = "my-app"
    push {
      branch = "^main$"
    }
  }

  filename = "cloudbuild-deploy.yaml"

  substitutions = {
    _ENV           = "production"
    _MIN_INSTANCES = "3"
  }

  approval_config {
    approval_required = true
  }
}
```

**Documentation** - Maintain a list of all triggers, what they do, and which environment they deploy to. This becomes essential when multiple teams share the same GCP project.

## Troubleshooting

**Trigger fires on wrong branch** - Double-check your regex anchors. Without `^` and `$`, the pattern `main` also matches `my-main-branch` or `maintain`. Always use anchors for exact matches.

**Trigger does not fire** - Verify the branch pattern matches the pushed branch name. Remember that the match is case-sensitive by default.

**Multiple triggers fire on the same push** - If you have a `.*` pattern and a `^main$` pattern, both will match a push to main. Design your triggers so patterns do not overlap, or make sure the builds from overlapping triggers are safe to run simultaneously.

## Wrapping Up

Branch pattern filtering is what turns Cloud Build triggers from a blunt instrument into a precise CI/CD tool. By matching triggers to specific branch patterns, you can build different pipelines for development, staging, and production without any manual intervention. Combined with file filters and substitution variables, a small set of triggers can handle complex multi-environment deployment workflows. Start with simple exact-match patterns for your main branches and add more sophisticated patterns as your branching strategy evolves.

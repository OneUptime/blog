# How to Configure RBAC with Glob Patterns for Applications in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Access Control

Description: Master glob pattern matching in ArgoCD RBAC policies to efficiently manage permissions across applications, projects, and resources using wildcards and pattern rules.

---

ArgoCD RBAC policies support glob patterns in the object field, which lets you write flexible rules that match groups of applications without listing each one individually. Instead of writing ten separate policy lines for ten applications, you can write one line with a pattern that matches all of them.

Understanding how glob patterns work in ArgoCD RBAC is essential for managing permissions at scale.

## Glob Pattern Basics

ArgoCD uses the `path.Match` function from Go's standard library for glob matching. The object field in RBAC policies follows the format `<project>/<application>`, and you can use patterns in either part.

The basic wildcards are:

| Pattern | Matches |
|---------|---------|
| `*` | Any sequence of characters (excluding `/`) |
| `?` | Any single character |
| `[abc]` | Any single character in the set |
| `[a-z]` | Any single character in the range |

Here are the most common patterns you will use:

```yaml
# Match all applications in a project
p, role:viewer, applications, get, myproject/*, allow

# Match all applications in all projects
p, role:viewer, applications, get, */*, allow

# Match applications with a specific prefix
p, role:deployer, applications, sync, myproject/staging-*, allow

# Match applications with a specific suffix
p, role:deployer, applications, sync, myproject/*-service, allow

# Match a specific pattern
p, role:deployer, applications, sync, myproject/web-app-*, allow
```

## Project-Level Patterns

Use patterns to match multiple projects:

```yaml
policy.csv: |
  # Match all projects starting with "team-"
  p, role:team-viewer, applications, get, team-*/*, allow

  # Match staging and dev projects
  p, role:non-prod-deployer, applications, sync, staging/*, allow
  p, role:non-prod-deployer, applications, sync, dev/*, allow

  # Match all projects (global access)
  p, role:global-viewer, applications, get, */*, allow
```

However, the `*` wildcard does not match the `/` separator. So `*` matches project names and application names independently. The pattern `*/app-name` matches `app-name` in any project, and `project-name/*` matches any application in a specific project.

## Application Name Patterns

When your applications follow consistent naming conventions, patterns become very powerful:

```yaml
policy.csv: |
  # Environment-based naming: staging-api, staging-web, staging-worker
  p, role:staging-deployer, applications, sync, myproject/staging-*, allow

  # Service-type naming: web-app, web-admin, web-portal
  p, role:web-deployer, applications, sync, myproject/web-*, allow

  # Region-based naming: us-east-api, us-west-api, eu-api
  p, role:us-deployer, applications, sync, myproject/us-*, allow

  # Microservice naming: payment-service, auth-service, notification-service
  p, role:service-deployer, applications, sync, myproject/*-service, allow
```

## Character Classes and Ranges

For more specific matching, use character classes:

```yaml
policy.csv: |
  # Match apps starting with a, b, or c
  p, role:deployer, applications, sync, myproject/[abc]*, allow

  # Match apps starting with any letter a through f
  p, role:deployer, applications, sync, myproject/[a-f]*, allow

  # Match apps with a single character prefix followed by a dash
  p, role:deployer, applications, sync, myproject/?-*, allow
```

Character classes are less commonly used in ArgoCD RBAC but can be useful for environments with very structured naming.

## Single Character Wildcards

The `?` matches exactly one character:

```yaml
policy.csv: |
  # Match v1-api, v2-api, v3-api but not v10-api
  p, role:deployer, applications, sync, myproject/v?-api, allow

  # Match app-a, app-b, app-c but not app-ab
  p, role:deployer, applications, sync, myproject/app-?, allow
```

## Practical Pattern Examples

### Environment Isolation

Organize applications by environment prefix and use patterns to control access:

```yaml
policy.csv: |
  # Developers can deploy to dev and staging
  p, role:developer, applications, get, */*, allow
  p, role:developer, applications, sync, dev/*, allow
  p, role:developer, applications, sync, staging/*, allow
  p, role:developer, applications, action, dev/*, allow
  p, role:developer, applications, action, staging/*, allow

  # Release managers can deploy to production
  p, role:release-manager, applications, get, */*, allow
  p, role:release-manager, applications, sync, prod/*, allow
  p, role:release-manager, applications, action, prod/*, allow

  g, all-developers, role:developer
  g, release-team, role:release-manager
```

### Team-Based Application Ownership

Use team prefixes in application names:

```yaml
policy.csv: |
  # Team alpha owns alpha-* apps across all projects
  p, role:alpha-deployer, applications, get, */alpha-*, allow
  p, role:alpha-deployer, applications, sync, */alpha-*, allow
  p, role:alpha-deployer, applications, action, */alpha-*, allow
  p, role:alpha-deployer, logs, get, */alpha-*, allow

  # Team beta owns beta-* apps
  p, role:beta-deployer, applications, get, */beta-*, allow
  p, role:beta-deployer, applications, sync, */beta-*, allow
  p, role:beta-deployer, applications, action, */beta-*, allow
  p, role:beta-deployer, logs, get, */beta-*, allow

  g, team-alpha, role:alpha-deployer
  g, team-beta, role:beta-deployer
```

### Microservice Architecture

For a microservice architecture where each service follows a naming pattern:

```yaml
policy.csv: |
  # Backend team deploys all services
  p, role:backend-deployer, applications, sync, production/*-service, allow
  p, role:backend-deployer, applications, sync, production/*-worker, allow
  p, role:backend-deployer, applications, get, */*, allow

  # Frontend team deploys web and admin applications
  p, role:frontend-deployer, applications, sync, production/*-web, allow
  p, role:frontend-deployer, applications, sync, production/*-admin, allow
  p, role:frontend-deployer, applications, get, */*, allow

  # Data team deploys pipeline and analytics apps
  p, role:data-deployer, applications, sync, production/*-pipeline, allow
  p, role:data-deployer, applications, sync, production/*-analytics, allow
  p, role:data-deployer, applications, get, */*, allow
```

## Combining Patterns with Deny Rules

Use patterns in deny rules to carve out exceptions:

```yaml
policy.csv: |
  # Allow sync for all apps in production
  p, role:deployer, applications, sync, production/*, allow

  # But deny sync for critical infrastructure apps
  p, role:deployer, applications, sync, production/infra-*, deny
  p, role:deployer, applications, sync, production/database-*, deny
```

Deny rules take precedence, so even though the first rule allows syncing all production apps, the deny rules block infrastructure and database applications.

## Testing Glob Patterns

Always test your patterns before deploying:

```bash
# Test that a pattern matches the expected application
argocd admin settings rbac can role:deployer sync applications 'production/web-app' \
  --policy-file policy.csv
# Output: Yes

# Test that a pattern does NOT match unexpected applications
argocd admin settings rbac can role:deployer sync applications 'production/infra-monitoring' \
  --policy-file policy.csv
# Output: No (if infra-* is denied)

# Test boundary cases
argocd admin settings rbac can role:deployer sync applications 'staging/web-app' \
  --policy-file policy.csv
# Output: depends on policy
```

Test with actual application names that exist in your cluster to catch subtle pattern mismatches.

## Common Pattern Mistakes

### The Double Wildcard Trap

```yaml
# WRONG: ** is not supported in ArgoCD RBAC
p, role:viewer, applications, get, **, allow

# CORRECT: use */* for all projects and apps
p, role:viewer, applications, get, */*, allow
```

ArgoCD does not support recursive glob patterns (`**`). Always use `*/*` to match all projects and applications.

### Forgetting the Project Part

```yaml
# WRONG: missing project part
p, role:viewer, applications, get, my-app, allow

# CORRECT: include project/app format
p, role:viewer, applications, get, */my-app, allow
p, role:viewer, applications, get, myproject/my-app, allow
```

### Overly Broad Patterns

```yaml
# DANGEROUS: gives access to everything in all projects
p, role:deployer, applications, sync, */*, allow

# BETTER: scope to specific projects
p, role:deployer, applications, sync, frontend/*, allow
```

## Naming Conventions That Work Well with Patterns

Design your application naming to work with glob patterns:

```text
<team>-<service>-<environment>
frontend-web-staging
frontend-web-production
backend-api-staging
backend-api-production

# Pattern: */frontend-*    matches all frontend apps
# Pattern: */*-staging     matches all staging apps
# Pattern: */frontend-*-production  matches frontend production apps
```

Having a consistent naming convention across your organization makes RBAC management significantly easier.

## Summary

Glob patterns in ArgoCD RBAC let you write concise, maintainable policies that scale with your application count. Use `*` for wildcard matching, structure your application and project names for pattern-friendly matching, combine patterns with deny rules for exceptions, and always test your policies before deploying. A well-designed naming convention paired with glob-based RBAC policies can reduce hundreds of policy lines down to a handful.

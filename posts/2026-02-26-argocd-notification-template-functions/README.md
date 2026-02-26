# How to Use Notification Template Functions in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Notifications, Go Templates

Description: Learn how to use ArgoCD notification template functions including time formatting, repo helpers, string manipulation, and custom functions for building dynamic notifications.

---

ArgoCD notification templates support a rich set of built-in functions that go beyond basic Go templating. These functions let you format timestamps, extract repository information, manipulate strings, and work with the application data in powerful ways. This guide documents every function category with practical examples.

## Built-in Go Template Functions

ArgoCD templates inherit all standard Go `text/template` functions plus additional helpers from the Sprig library and ArgoCD-specific functions.

### String Functions

```yaml
# Basic string manipulation
{{ .app.metadata.name | upper }}           # MYAPP
{{ .app.metadata.name | lower }}           # myapp
{{ .app.metadata.name | title }}           # Myapp
{{ .app.metadata.name | quote }}           # "myapp"

# Truncation (essential for commit SHAs)
{{ .app.status.sync.revision | trunc 7 }}  # abc1234

# Trimming
{{ .app.spec.source.repoURL | trimSuffix ".git" }}
{{ "  spaces  " | trim }}
{{ "prefix-name" | trimPrefix "prefix-" }}

# Replacement
{{ .app.metadata.name | replace "-" "_" }}

# Checking content
{{ if contains "prod" .app.spec.destination.namespace }}Production{{ end }}
{{ if hasPrefix "v" .app.spec.source.targetRevision }}Tag{{ end }}
{{ if hasSuffix ".git" .app.spec.source.repoURL }}Git repo{{ end }}
```

### Practical String Examples

```yaml
  template.string-demo: |
    slack:
      attachments: |
        [{
          "title": "{{ .app.metadata.name | upper }}",
          "fields": [
            {
              "title": "Repository",
              "value": "{{ .app.spec.source.repoURL | trimSuffix \".git\" | replace \"https://github.com/\" \"\" }}"
            },
            {
              "title": "Short SHA",
              "value": "`{{ .app.status.sync.revision | trunc 7 }}`"
            },
            {
              "title": "Environment",
              "value": "{{ if contains \"prod\" .app.spec.destination.namespace }}Production{{ else if contains \"staging\" .app.spec.destination.namespace }}Staging{{ else }}Development{{ end }}"
            }
          ]
        }]
```

## Repo Helper Functions

ArgoCD provides special functions for working with Git repository URLs. These are available through the `.repo` context.

### FullNameByRepoURL

Extracts the org/repo format from a Git URL:

```yaml
# Input: https://github.com/my-org/my-repo.git
# Output: my-org/my-repo
{{ call .repo.FullNameByRepoURL .app.spec.source.repoURL }}
```

This is essential for GitHub API calls:

```yaml
  template.github-status: |
    webhook:
      github:
        method: POST
        path: /repos/{{ call .repo.FullNameByRepoURL .app.spec.source.repoURL }}/statuses/{{ .app.status.sync.revision }}
        body: |
          {
            "state": "success",
            "context": "argocd/{{ .app.metadata.name }}"
          }
```

### RepoURLToHTTPS

Converts SSH Git URLs to HTTPS format:

```yaml
# Input: git@github.com:my-org/my-repo.git
# Output: https://github.com/my-org/my-repo
{{ call .repo.RepoURLToHTTPS .app.spec.source.repoURL }}
```

Useful for creating clickable links:

```yaml
  template.with-repo-link: |
    slack:
      attachments: |
        [{
          "title": "{{ .app.metadata.name }}",
          "title_link": "{{ call .repo.RepoURLToHTTPS .app.spec.source.repoURL }}/commit/{{ .app.status.sync.revision }}"
        }]
```

## Time Functions

### Formatting Timestamps

ArgoCD timestamps are in RFC3339 format. The Sprig library provides time formatting:

```yaml
# Display the raw timestamp
{{ .app.status.operationState.finishedAt }}
# Output: 2026-02-26T14:30:00Z

# Calculate duration between start and finish
# Note: direct time arithmetic is limited in Go templates
```

### Using toUnixMilli for APIs

Some APIs need Unix timestamps in milliseconds:

```yaml
  template.unix-time-example: |
    webhook:
      grafana:
        method: POST
        body: |
          {
            "time": {{ .app.status.operationState.finishedAt | toUnixMilli }},
            "text": "Deployed {{ .app.metadata.name }}"
          }
```

## Map and Index Functions

### Accessing Annotations and Labels

Use the `index` function for keys that contain dots or special characters:

```yaml
# Simple access (for keys without dots)
{{ .app.metadata.labels.team }}

# Index access (for keys with dots or special chars)
{{ index .app.metadata.annotations "argocd.argoproj.io/tracking-id" }}
{{ index .app.metadata.labels "app.kubernetes.io/part-of" }}
```

### Checking if a Key Exists

```yaml
{{ if (index .app.metadata.annotations "custom-field") }}
  Value: {{ index .app.metadata.annotations "custom-field" }}
{{ else }}
  Not set
{{ end }}
```

### Complete Annotation-Driven Template

```yaml
  template.annotation-driven: |
    slack:
      attachments: |
        [{
          "title": "{{ .app.metadata.name }}",
          "fields": [
            {
              "title": "Team",
              "value": "{{ if (index .app.metadata.labels \"team\") }}{{ index .app.metadata.labels \"team\" }}{{ else }}Unassigned{{ end }}",
              "short": true
            },
            {
              "title": "Jira",
              "value": "{{ if (index .app.metadata.annotations \"jira-ticket\") }}{{ index .app.metadata.annotations \"jira-ticket\" }}{{ else }}N/A{{ end }}",
              "short": true
            },
            {
              "title": "On-Call",
              "value": "{{ if (index .app.metadata.annotations \"oncall-email\") }}{{ index .app.metadata.annotations \"oncall-email\" }}{{ else }}Not configured{{ end }}",
              "short": true
            }
          ]
        }]
```

## JSON Functions

### toJson

Converts a value to its JSON representation. Essential for safely embedding dynamic content in JSON bodies:

```yaml
  template.safe-json-body: |
    webhook:
      my-api:
        method: POST
        body: |
          {
            "app": {{ .app.metadata.name | toJson }},
            "message": {{ .app.status.operationState.message | toJson }},
            "labels": {{ .app.metadata.labels | toJson }}
          }
```

The `toJson` function properly escapes quotes, newlines, and special characters that would otherwise break JSON parsing.

## Comparison and Logic Functions

### Equality and Comparison

```yaml
{{ if eq .app.status.sync.status "Synced" }}In sync{{ end }}
{{ if ne .app.status.health.status "Healthy" }}Unhealthy!{{ end }}
{{ if or (eq .app.status.sync.status "OutOfSync") (eq .app.status.health.status "Degraded") }}Problem detected{{ end }}
{{ if and (eq .app.status.sync.status "Synced") (eq .app.status.health.status "Healthy") }}All good{{ end }}
```

### Complex Conditional Template

```yaml
  template.smart-alert: |
    slack:
      attachments: |
        [{
          {{ if and (eq .app.status.operationState.phase "Succeeded") (eq .app.status.health.status "Healthy") }}
          "color": "#18be52",
          "title": "{{ .app.metadata.name }} - All Clear",
          "text": "Deployed and healthy at {{ .app.status.sync.revision | trunc 7 }}"
          {{ else if eq .app.status.operationState.phase "Succeeded" }}
          "color": "#f4c030",
          "title": "{{ .app.metadata.name }} - Deployed but Unhealthy",
          "text": "Sync succeeded but health is {{ .app.status.health.status }}"
          {{ else if or (eq .app.status.operationState.phase "Failed") (eq .app.status.operationState.phase "Error") }}
          "color": "#E96D76",
          "title": "{{ .app.metadata.name }} - Failed",
          "text": "{{ .app.status.operationState.message }}"
          {{ else }}
          "color": "#36a3f7",
          "title": "{{ .app.metadata.name }} - {{ .app.status.operationState.phase }}",
          "text": "Sync in progress"
          {{ end }}
        }]
```

## Building Commit URLs

Combine repo helper functions with revision data to create useful links:

```yaml
  template.with-commit-links: |
    slack:
      attachments: |
        [{
          "title": "{{ .app.metadata.name }}",
          "title_link": "https://argocd.example.com/applications/{{ .app.metadata.name }}",
          "fields": [
            {
              "title": "Commit",
              "value": "<{{ call .repo.RepoURLToHTTPS .app.spec.source.repoURL }}/commit/{{ .app.status.sync.revision }}|{{ .app.status.sync.revision | trunc 7 }}>",
              "short": true
            },
            {
              "title": "Diff",
              "value": "<{{ call .repo.RepoURLToHTTPS .app.spec.source.repoURL }}/compare/{{ .app.status.sync.comparedTo.source.targetRevision }}...{{ .app.status.sync.revision | trunc 7 }}|View changes>",
              "short": true
            }
          ]
        }]
```

## Range and Iteration

While less common in ArgoCD templates, you can iterate over lists:

```yaml
# Iterate over application conditions
{{ range .app.status.conditions }}
  Type: {{ .type }}, Message: {{ .message }}
{{ end }}
```

## Putting It All Together

Here is a comprehensive template that uses many of the functions described:

```yaml
  template.comprehensive-deploy: |
    slack:
      attachments: |
        [{
          {{ if eq .app.status.operationState.phase "Succeeded" }}
          "color": "#18be52",
          {{ else }}
          "color": "#E96D76",
          {{ end }}
          "author_name": "ArgoCD",
          "title": "{{ .app.metadata.name | upper }} - {{ .app.status.operationState.phase }}",
          "title_link": "https://argocd.example.com/applications/{{ .app.metadata.name }}",
          "text": "{{ if ne .app.status.operationState.phase \"Succeeded\" }}{{ .app.status.operationState.message }}{{ end }}",
          "fields": [
            {"short": true, "title": "Project", "value": "{{ .app.spec.project }}"},
            {"short": true, "title": "Revision", "value": "`{{ .app.status.sync.revision | trunc 7 }}`"},
            {"short": true, "title": "Namespace", "value": "{{ .app.spec.destination.namespace }}"},
            {"short": true, "title": "Health", "value": "{{ .app.status.health.status }}"},
            {"short": true, "title": "Repo", "value": "{{ .app.spec.source.repoURL | trimSuffix \".git\" | replace \"https://github.com/\" \"\" }}"},
            {"short": true, "title": "Branch", "value": "{{ .app.spec.source.targetRevision }}"}
          ],
          "footer": "{{ .app.status.operationState.finishedAt }}"
        }]
    webhook:
      audit:
        method: POST
        body: |
          {
            "app": {{ .app.metadata.name | toJson }},
            "phase": {{ .app.status.operationState.phase | toJson }},
            "revision": {{ .app.status.sync.revision | toJson }},
            "health": {{ .app.status.health.status | toJson }},
            "labels": {{ .app.metadata.labels | toJson }},
            "timestamp": "{{ .app.status.operationState.finishedAt }}"
          }
```

## Debugging Template Functions

When a function call fails, the template silently produces empty output or fails entirely. Check the notification controller logs:

```bash
kubectl logs -n argocd deploy/argocd-notifications-controller -f | grep -E "(template|render|error)"
```

Common function-related errors:
- `nil pointer evaluating` - Trying to access a field that does not exist
- `function not defined` - Using a function that is not available
- `wrong number of args` - Passing incorrect arguments to a function

For the custom template creation guide, see our post on [creating custom notification templates](https://oneuptime.com/blog/post/2026-02-26-argocd-custom-notification-templates/view). For the overall notification setup, see [ArgoCD notifications from scratch](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-setup-from-scratch/view).

Mastering template functions lets you extract maximum value from ArgoCD notifications. Every piece of data about your application is available - you just need the right function to format and present it.

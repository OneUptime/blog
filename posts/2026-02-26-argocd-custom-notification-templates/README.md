# How to Create Custom Notification Templates in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Notifications, Go Templates

Description: Learn how to create custom notification templates in ArgoCD using Go templating with conditional logic, loops, helper functions, and multi-service formatting.

---

ArgoCD notification templates give you complete control over what your notifications look like and what data they contain. While the built-in templates are good enough to get started, custom templates let you include exactly the information your team needs, format messages for specific services, and add conditional logic for different scenarios. This guide covers everything from basic template syntax to advanced patterns.

## Template Basics

ArgoCD notification templates use Go's `text/template` package. The primary data available in templates is the application object through `{{.app}}`, which gives you access to the full ArgoCD Application CRD.

```yaml
# In argocd-notifications-cm ConfigMap
template.my-template: |
  slack:
    attachments: |
      [{
        "title": "{{ .app.metadata.name }}",
        "text": "Status: {{ .app.status.sync.status }}"
      }]
  email:
    subject: "ArgoCD: {{ .app.metadata.name }}"
    body: "Application {{ .app.metadata.name }} is {{ .app.status.sync.status }}"
  webhook:
    my-service:
      method: POST
      body: |
        {"app": "{{ .app.metadata.name }}"}
```

A single template can target multiple services simultaneously. When the trigger fires, ArgoCD sends the notification to all services defined in the template.

## Available Data in Templates

### Application Metadata

```text
{{ .app.metadata.name }}                    - Application name
{{ .app.metadata.namespace }}               - Application namespace
{{ .app.metadata.annotations }}             - Annotations map
{{ .app.metadata.labels }}                  - Labels map
{{ .app.metadata.creationTimestamp }}        - When app was created
```

### Application Spec

```text
{{ .app.spec.project }}                     - ArgoCD project
{{ .app.spec.source.repoURL }}              - Git repo URL
{{ .app.spec.source.path }}                 - Path in repo
{{ .app.spec.source.targetRevision }}       - Branch/tag/commit
{{ .app.spec.destination.server }}          - Target cluster
{{ .app.spec.destination.namespace }}       - Target namespace
```

### Application Status

```text
{{ .app.status.sync.status }}               - Synced, OutOfSync, Unknown
{{ .app.status.sync.revision }}             - Current sync revision
{{ .app.status.health.status }}             - Healthy, Degraded, Missing, etc.
{{ .app.status.operationState.phase }}      - Succeeded, Failed, Error, Running
{{ .app.status.operationState.message }}    - Operation result message
{{ .app.status.operationState.startedAt }}  - When sync started
{{ .app.status.operationState.finishedAt }} - When sync finished
```

### Context Functions

```text
{{ .context.argocdUrl }}                    - ArgoCD server URL
```

## Conditional Logic

### If/Else

```yaml
  template.conditional-alert: |
    slack:
      attachments: |
        [{
          {{ if eq .app.status.operationState.phase "Succeeded" }}
          "color": "#18be52",
          "title": "{{ .app.metadata.name }} deployed successfully"
          {{ else if eq .app.status.operationState.phase "Failed" }}
          "color": "#E96D76",
          "title": "{{ .app.metadata.name }} deployment FAILED"
          {{ else }}
          "color": "#f4c030",
          "title": "{{ .app.metadata.name }} status: {{ .app.status.operationState.phase }}"
          {{ end }}
        }]
```

### Checking for Empty Values

```yaml
  template.safe-template: |
    slack:
      attachments: |
        [{
          "title": "{{ .app.metadata.name }}",
          "fields": [
            {"title": "Revision", "value": "{{ if .app.status.sync.revision }}{{ .app.status.sync.revision | trunc 7 }}{{ else }}N/A{{ end }}"},
            {"title": "Message", "value": "{{ if .app.status.operationState.message }}{{ .app.status.operationState.message }}{{ else }}No message{{ end }}"}
          ]
        }]
```

### Using Annotations for Dynamic Content

```yaml
  template.annotation-based: |
    slack:
      attachments: |
        [{
          "title": "{{ .app.metadata.name }}",
          "text": "{{ if (index .app.metadata.annotations \"deploy-notes\") }}Notes: {{ index .app.metadata.annotations \"deploy-notes\" }}{{ end }}",
          "fields": [
            {"title": "Owner", "value": "{{ if (index .app.metadata.labels \"team\") }}{{ index .app.metadata.labels \"team\" }}{{ else }}Unknown{{ end }}"}
          ]
        }]
```

## String Functions

ArgoCD templates support various built-in functions:

```yaml
  template.string-functions: |
    slack:
      attachments: |
        [{
          "fields": [
            {"title": "Short Rev", "value": "{{ .app.status.sync.revision | trunc 7 }}"},
            {"title": "Repo Name", "value": "{{ .app.spec.source.repoURL | trimSuffix \".git\" }}"},
            {"title": "Upper Name", "value": "{{ .app.metadata.name | upper }}"}
          ]
        }]
```

Available string functions:
- `trunc N` - Truncate to N characters
- `upper` / `lower` - Case conversion
- `trimPrefix` / `trimSuffix` - Remove prefix/suffix
- `replace "old" "new"` - String replacement
- `contains "substr"` - Check substring
- `hasPrefix` / `hasSuffix` - Check prefix/suffix
- `quote` - Wrap in quotes

## Time Functions

Format timestamps in notifications:

```yaml
  template.with-time: |
    slack:
      attachments: |
        [{
          "title": "{{ .app.metadata.name }}",
          "footer": "Deployed at {{ .app.status.operationState.finishedAt }}"
        }]
```

## Multi-Service Templates

A single template can format messages differently for each service:

```yaml
  template.multi-service: |
    slack:
      attachments: |
        [{
          "color": "#18be52",
          "title": "{{ .app.metadata.name }} deployed",
          "fields": [
            {"short": true, "title": "Revision", "value": "{{ .app.status.sync.revision | trunc 7 }}"},
            {"short": true, "title": "Namespace", "value": "{{ .app.spec.destination.namespace }}"}
          ]
        }]
    email:
      subject: "Deployed: {{ .app.metadata.name }} ({{ .app.status.sync.revision | trunc 7 }})"
      content-type: text/html
      body: |
        <h2>Deployment Successful</h2>
        <p><strong>{{ .app.metadata.name }}</strong> has been deployed.</p>
        <table>
          <tr><td>Revision</td><td>{{ .app.status.sync.revision | trunc 7 }}</td></tr>
          <tr><td>Namespace</td><td>{{ .app.spec.destination.namespace }}</td></tr>
        </table>
    webhook:
      audit-api:
        method: POST
        body: |
          {
            "event": "deployment",
            "app": "{{ .app.metadata.name }}",
            "revision": "{{ .app.status.sync.revision }}",
            "status": "{{ .app.status.operationState.phase }}"
          }
```

## Template Reuse with Named Templates

You can define reusable template fragments:

```yaml
  template.app-details: |
    message: |
      Application: {{ .app.metadata.name }}
      Project: {{ .app.spec.project }}
      Revision: {{ .app.status.sync.revision | trunc 7 }}
      Namespace: {{ .app.spec.destination.namespace }}
      Health: {{ .app.status.health.status }}
      Sync: {{ .app.status.sync.status }}
```

While ArgoCD does not support Go's `define`/`template` syntax for shared blocks across templates, you can achieve reuse by having triggers send to multiple templates.

## Environment-Aware Templates

Customize messages based on the target environment:

```yaml
  template.env-aware-deploy: |
    slack:
      attachments: |
        [{
          {{ if contains "prod" .app.spec.destination.namespace }}
          "color": "#E96D76",
          "pretext": "PRODUCTION DEPLOYMENT",
          {{ else if contains "staging" .app.spec.destination.namespace }}
          "color": "#f4c030",
          "pretext": "Staging deployment",
          {{ else }}
          "color": "#18be52",
          "pretext": "Development deployment",
          {{ end }}
          "title": "{{ .app.metadata.name }}",
          "fields": [
            {"short": true, "title": "Namespace", "value": "{{ .app.spec.destination.namespace }}"},
            {"short": true, "title": "Revision", "value": "{{ .app.status.sync.revision | trunc 7 }}"}
          ]
        }]
```

## Accessing Nested Annotations

Annotations with dots or special characters need the `index` function:

```yaml
  template.with-custom-annotations: |
    slack:
      attachments: |
        [{
          "title": "{{ .app.metadata.name }}",
          "fields": [
            {"title": "Jira Ticket", "value": "{{ index .app.metadata.annotations \"jira.example.com/ticket\" }}"},
            {"title": "Deploy Reason", "value": "{{ index .app.metadata.annotations \"deploy-reason\" }}"}
          ]
        }]
```

## Error Handling in Templates

Template rendering errors cause silent notification failures. Test your templates by checking the notification controller logs:

```bash
# Watch for template rendering errors
kubectl logs -n argocd deploy/argocd-notifications-controller -f | grep -i "template"
```

Common template mistakes:
- Accessing a nil field without checking `if` first
- Missing closing braces `}}`
- Invalid JSON in webhook body due to unescaped special characters in template output
- Using `{{ .app.status.operationState.message }}` when operationState might be nil

To avoid JSON issues with dynamic content that might contain quotes or newlines:

```yaml
  template.safe-json: |
    webhook:
      my-service:
        method: POST
        body: |
          {
            "app": "{{ .app.metadata.name }}",
            "message": {{ .app.status.operationState.message | toJson }}
          }
```

## Testing Templates

There is no built-in template testing tool, but you can verify templates by:

1. Creating a test trigger that always fires
2. Subscribing a test application to it
3. Checking the notification controller logs for rendering output

```yaml
  # Test trigger - fires on any state change
  trigger.test-template: |
    - when: "true"
      send: [my-new-template]
```

After testing, remove the test trigger to avoid constant notifications.

For the complete notification system overview, see our [ArgoCD notifications from scratch guide](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-setup-from-scratch/view). For understanding template helper functions, check out our guide on [notification template functions](https://oneuptime.com/blog/post/2026-02-26-argocd-notification-template-functions/view).

Custom templates transform ArgoCD notifications from generic alerts into information-rich messages tailored to your team's workflow. Invest time in getting your templates right, and your team will thank you every time they get a notification that tells them exactly what they need to know.

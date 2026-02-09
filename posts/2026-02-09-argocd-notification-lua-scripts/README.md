# How to use ArgoCD notification templates with custom Lua scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Notifications, Lua, Automation, GitOps

Description: Learn how to create powerful custom ArgoCD notification templates using Lua scripts to transform notification data, implement conditional logic, and build sophisticated alerting workflows.

---

ArgoCD notifications provide essential visibility into your GitOps deployments, but sometimes the default notification templates don't match your needs. By leveraging Lua scripting within notification templates, you can transform data, implement complex conditional logic, enrich notifications with external data, and create highly customized alerting workflows that integrate seamlessly with your team's communication tools.

This guide explores how to use Lua scripts in ArgoCD notification templates to build intelligent, context-aware notifications that provide exactly the information your team needs.

## Understanding ArgoCD notifications and Lua

ArgoCD notifications use triggers to determine when to send notifications and templates to format the notification content. Templates support Go templating by default, but Lua scripts provide more powerful data manipulation capabilities.

Lua advantages in notification templates:
- Complex string manipulation and formatting
- Conditional logic beyond Go template capabilities
- Data transformation and enrichment
- Custom functions for repeated logic
- Better handling of nested data structures

ArgoCD includes a Lua runtime that makes functions from the Lua standard library available within templates.

## Setting up basic Lua-enhanced notifications

Start with the notification ConfigMap structure:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: $slack-token

  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [deployment-success]

  template.deployment-success: |
    message: |
      {{- $details := call .lua "getDeploymentDetails" . -}}
      Application: {{ $details.appName }}
      Status: {{ $details.status }}
      Environment: {{ $details.environment }}
      Duration: {{ $details.duration }}
    slack:
      attachments: |
        [{
          "title": "Deployment Successful",
          "color": "#18be52",
          "fields": [
            {{ range $key, $value := call .lua "getFields" . }}
            {
              "title": "{{ $key }}",
              "value": "{{ $value }}",
              "short": true
            }{{ if not (last $key) }},{{ end }}
            {{ end }}
          ]
        }]

  script: |
    function getDeploymentDetails(app)
      local details = {}
      details.appName = app.metadata.name
      details.status = app.status.operationState.phase
      details.environment = app.metadata.namespace

      -- Calculate duration
      local startTime = app.status.operationState.startedAt
      local finishTime = app.status.operationState.finishedAt
      if startTime and finishTime then
        details.duration = calculateDuration(startTime, finishTime)
      else
        details.duration = "Unknown"
      end

      return details
    end

    function calculateDuration(startTime, finishTime)
      -- Convert ISO timestamps to seconds
      local pattern = "(%d+)-(%d+)-(%d+)T(%d+):(%d+):(%d+)Z"

      local startYear, startMonth, startDay, startHour, startMin, startSec =
        string.match(startTime, pattern)
      local finishYear, finishMonth, finishDay, finishHour, finishMin, finishSec =
        string.match(finishTime, pattern)

      local startEpoch = os.time({
        year=startYear, month=startMonth, day=startDay,
        hour=startHour, min=startMin, sec=startSec
      })
      local finishEpoch = os.time({
        year=finishYear, month=finishMonth, day=finishDay,
        hour=finishHour, min=finishMin, sec=finishSec
      })

      local diff = finishEpoch - startEpoch

      if diff < 60 then
        return string.format("%ds", diff)
      elseif diff < 3600 then
        return string.format("%dm %ds", math.floor(diff/60), diff%60)
      else
        return string.format("%dh %dm", math.floor(diff/3600), math.floor((diff%3600)/60))
      end
    end

    function getFields(app)
      local fields = {}
      fields["Repository"] = app.spec.source.repoURL
      fields["Revision"] = app.status.sync.revision:sub(1,8)
      fields["Namespace"] = app.spec.destination.namespace
      fields["Sync Status"] = app.status.sync.status
      return fields
    end
```

This configuration defines Lua functions that extract and format deployment details.

## Implementing conditional notifications with Lua

Create intelligent notifications that adjust based on application state:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  template.smart-deployment: |
    message: |
      {{- $notification := call .lua "buildNotification" . -}}
      {{ $notification.title }}

      {{ $notification.message }}

      {{- if $notification.hasWarnings }}
      ⚠️ Warnings:
      {{- range $notification.warnings }}
      - {{ . }}
      {{- end }}
      {{- end }}

      {{- if $notification.actionRequired }}
      🚨 Action Required: {{ $notification.actionMessage }}
      {{- end }}

  script: |
    function buildNotification(app)
      local notification = {
        hasWarnings = false,
        warnings = {},
        actionRequired = false
      }

      local phase = app.status.operationState.phase
      local health = app.status.health.status

      -- Determine notification type
      if phase == "Succeeded" then
        if health == "Healthy" then
          notification.title = "✅ Deployment Successful"
          notification.message = string.format(
            "Application %s deployed successfully to %s",
            app.metadata.name,
            app.spec.destination.namespace
          )
        elseif health == "Progressing" then
          notification.title = "🔄 Deployment In Progress"
          notification.message = "Deployment succeeded but application is still progressing"
          notification.hasWarnings = true
          table.insert(notification.warnings, "Health check status: " .. health)
        elseif health == "Degraded" then
          notification.title = "⚠️ Deployment Completed with Issues"
          notification.message = "Deployment succeeded but application health is degraded"
          notification.actionRequired = true
          notification.actionMessage = "Check application logs and health status"
          notification.hasWarnings = true
          table.insert(notification.warnings, "Application health is degraded")
        end
      elseif phase == "Failed" then
        notification.title = "❌ Deployment Failed"
        notification.message = string.format(
          "Application %s failed to deploy",
          app.metadata.name
        )
        notification.actionRequired = true
        notification.actionMessage = "Review sync operation logs and resolve issues"

        -- Add failure details
        if app.status.operationState.message then
          table.insert(notification.warnings,
            "Error: " .. app.status.operationState.message)
        end
      end

      -- Check for sync issues
      if app.status.sync.status == "OutOfSync" then
        notification.hasWarnings = true
        table.insert(notification.warnings, "Application is out of sync")
      end

      -- Check resource count
      local resourceCount = 0
      if app.status.resources then
        for _ in pairs(app.status.resources) do
          resourceCount = resourceCount + 1
        end
      end

      if resourceCount > 100 then
        notification.hasWarnings = true
        table.insert(notification.warnings,
          string.format("Large deployment: %d resources", resourceCount))
      end

      return notification
    end
```

## Enriching notifications with resource analysis

Analyze deployed resources and include relevant details:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  template.resource-analysis: |
    message: |
      Deployment Summary for {{ .app.metadata.name }}

      {{- $analysis := call .lua "analyzeResources" . -}}

      📊 Resource Breakdown:
      {{- range $type, $count := $analysis.resourceCounts }}
      - {{ $type }}: {{ $count }}
      {{- end }}

      {{- if $analysis.hasIssues }}

      ⚠️ Issues Detected:
      {{- range $analysis.issues }}
      - {{ . }}
      {{- end }}
      {{- end }}

      🔍 Notable Resources:
      {{- range $analysis.notableResources }}
      - {{ . }}
      {{- end }}

  script: |
    function analyzeResources(app)
      local analysis = {
        resourceCounts = {},
        issues = {},
        notableResources = {},
        hasIssues = false
      }

      if not app.status.resources then
        return analysis
      end

      -- Count resources by kind
      for _, resource in ipairs(app.status.resources) do
        local kind = resource.kind
        if analysis.resourceCounts[kind] then
          analysis.resourceCounts[kind] = analysis.resourceCounts[kind] + 1
        else
          analysis.resourceCounts[kind] = 1
        end

        -- Check for unhealthy resources
        if resource.health and resource.health.status ~= "Healthy" then
          analysis.hasIssues = true
          table.insert(analysis.issues, string.format(
            "%s '%s' is %s",
            resource.kind,
            resource.name,
            resource.health.status
          ))
        end

        -- Flag notable resources
        if kind == "Ingress" then
          table.insert(analysis.notableResources,
            string.format("Ingress: %s", resource.name))
        elseif kind == "PersistentVolumeClaim" then
          table.insert(analysis.notableResources,
            string.format("PVC: %s", resource.name))
        elseif kind == "StatefulSet" then
          table.insert(analysis.notableResources,
            string.format("StatefulSet: %s (replicas: %s)",
            resource.name,
            resource.status and resource.status.replicas or "unknown"))
        end
      end

      return analysis
    end
```

## Creating formatted change summaries

Generate detailed change summaries from Git commits:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  template.change-summary: |
    message: |
      📝 Deployment Change Summary

      Application: {{ .app.metadata.name }}
      {{- $changes := call .lua "formatChanges" . -}}

      Revision: {{ $changes.shortRevision }}
      Author: {{ $changes.author }}
      Time: {{ $changes.timestamp }}

      Commit Message:
      {{ $changes.commitMessage }}

      {{- if $changes.files }}

      Files Changed: {{ $changes.fileCount }}
      {{- range $changes.files }}
      - {{ . }}
      {{- end }}
      {{- end }}

  script: |
    function formatChanges(app)
      local changes = {
        files = {},
        fileCount = 0
      }

      local revision = app.status.sync.revision
      if revision then
        changes.shortRevision = string.sub(revision, 1, 8)
      else
        changes.shortRevision = "unknown"
      end

      -- Extract commit information if available
      if app.status.operationState and app.status.operationState.operation then
        local source = app.status.operationState.operation.sync.source

        if source then
          changes.author = extractAuthorName(source)
          changes.commitMessage = source.targetRevision or "No commit message"
          changes.timestamp = formatTimestamp(app.status.operationState.finishedAt)
        end
      end

      -- Parse changed files from sync result
      if app.status.operationState.syncResult then
        local resources = app.status.operationState.syncResult.resources
        if resources then
          for _, resource in ipairs(resources) do
            if resource.message and string.find(resource.message, "configured") then
              local fileName = string.format("%s/%s", resource.kind, resource.name)
              table.insert(changes.files, fileName)
              changes.fileCount = changes.fileCount + 1
            end
          end
        end
      end

      return changes
    end

    function extractAuthorName(source)
      -- Extract author from source information
      -- This is a simplified version
      return "Developer"
    end

    function formatTimestamp(timestamp)
      if not timestamp then
        return "unknown"
      end

      -- Parse ISO timestamp and format it
      local pattern = "(%d+)-(%d+)-(%d+)T(%d+):(%d+):(%d+)"
      local year, month, day, hour, min, sec = string.match(timestamp, pattern)

      if year then
        return string.format("%s-%s-%s %s:%s:%s UTC",
          year, month, day, hour, min, sec)
      end

      return timestamp
    end
```

## Implementing multi-channel notifications with Lua

Route notifications to different channels based on conditions:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: $slack-token

  service.pagerduty: |
    token: $pagerduty-token

  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded', 'Failed']
      send: [deployment-notification]

  template.deployment-notification: |
    {{- $routing := call .lua "routeNotification" . -}}
    message: {{ $routing.message }}
    {{- if eq $routing.channel "pagerduty" }}
    pagerduty:
      severity: {{ $routing.severity }}
      summary: {{ $routing.summary }}
    {{- else }}
    slack:
      attachments: |
        [{
          "title": "{{ $routing.title }}",
          "color": "{{ $routing.color }}",
          "text": "{{ $routing.message }}"
        }]
    {{- end }}

  script: |
    function routeNotification(app)
      local routing = {}

      local phase = app.status.operationState.phase
      local health = app.status.health.status
      local environment = app.metadata.namespace

      -- Determine severity and routing
      local isProd = (environment == "production" or environment == "prod")
      local isCritical = false

      if phase == "Failed" then
        isCritical = true
        routing.severity = "error"
        routing.color = "#ff0000"
        routing.title = "❌ Deployment Failed"
      elseif phase == "Succeeded" and health == "Degraded" then
        isCritical = isProd
        routing.severity = "warning"
        routing.color = "#ff9900"
        routing.title = "⚠️ Deployment Degraded"
      else
        routing.severity = "info"
        routing.color = "#18be52"
        routing.title = "✅ Deployment Successful"
      end

      -- Route critical production issues to PagerDuty
      if isProd and isCritical then
        routing.channel = "pagerduty"
        routing.summary = string.format(
          "Critical deployment issue for %s in production",
          app.metadata.name
        )
      else
        routing.channel = "slack"
      end

      routing.message = string.format(
        "Application: %s\nEnvironment: %s\nStatus: %s\nHealth: %s",
        app.metadata.name,
        environment,
        phase,
        health
      )

      return routing
    end
```

## Building custom formatting functions

Create reusable Lua functions for common formatting tasks:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  script: |
    -- Utility library for notification formatting

    function truncateString(str, maxLen)
      if string.len(str) <= maxLen then
        return str
      end
      return string.sub(str, 1, maxLen - 3) .. "..."
    end

    function pluralize(count, singular, plural)
      if count == 1 then
        return string.format("%d %s", count, singular)
      else
        return string.format("%d %s", count, plural or (singular .. "s"))
      end
    end

    function formatList(items, bullet)
      bullet = bullet or "•"
      local result = ""
      for i, item in ipairs(items) do
        result = result .. bullet .. " " .. item
        if i < #items then
          result = result .. "\n"
        end
      end
      return result
    end

    function safeAccess(obj, path)
      local current = obj
      for segment in string.gmatch(path, "[^.]+") do
        if current == nil then
          return nil
        end
        current = current[segment]
      end
      return current
    end

    function formatResourceName(resource)
      return string.format("%s/%s",
        resource.kind,
        resource.name
      )
    end

    function calculatePercentage(value, total)
      if total == 0 then
        return "0%"
      end
      local percent = (value / total) * 100
      return string.format("%.1f%%", percent)
    end

    -- Use these functions in templates
    function buildSummary(app)
      local summary = {}

      summary.appName = truncateString(app.metadata.name, 50)

      local resourceCount = 0
      if app.status.resources then
        for _ in pairs(app.status.resources) do
          resourceCount = resourceCount + 1
        end
      end
      summary.resourceSummary = pluralize(resourceCount, "resource")

      return summary
    end
```

## Debugging Lua scripts in notifications

Test and debug Lua scripts:

```bash
# Enable debug logging for notifications
kubectl edit configmap argocd-notifications-cm -n argocd

# Add to the ConfigMap:
# data:
#   log.level: debug

# Watch notification controller logs
kubectl logs -f -n argocd -l app.kubernetes.io/name=argocd-notifications-controller

# Trigger a test notification
argocd app actions run my-app restart --kind Deployment

# Validate Lua syntax locally
lua -c script.lua
```

Common Lua errors in ArgoCD notifications:
- Nil reference errors when accessing nested fields
- String formatting issues with special characters
- Table iteration problems
- Type mismatches in comparisons

## Best practices for Lua in notifications

1. **Handle nil values gracefully:** Always check if fields exist before accessing
2. **Keep scripts readable:** Use descriptive function and variable names
3. **Limit complexity:** Overly complex Lua makes debugging difficult
4. **Test thoroughly:** Verify scripts with different application states
5. **Use helper functions:** Create reusable utilities for common tasks
6. **Document script behavior:** Add comments explaining logic
7. **Performance matters:** Avoid expensive operations in scripts that run frequently

## Conclusion

Lua scripts transform ArgoCD notifications from simple alerts into intelligent, context-aware messages that provide exactly the information your team needs. By implementing conditional logic, data transformation, and custom formatting in Lua, you create notification templates that adapt to different scenarios, route messages appropriately, and present information clearly. This powerful combination of ArgoCD's notification system and Lua's scripting capabilities enables sophisticated alerting workflows that scale with your GitOps adoption.

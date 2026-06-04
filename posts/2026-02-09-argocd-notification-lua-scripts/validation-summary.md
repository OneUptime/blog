# Validation Summary: How to use ArgoCD notification templates with custom Lua scripts

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Notifications
- Argo CD notification triggers and templates
- Kubernetes ConfigMaps
- Slack notifications
- PagerDuty notifications
- Lua
- Go templates

## Sources Consulted
- Argo CD Notifications Overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD Notification Templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Notification Template Functions: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/functions/
- Argo CD Resource Health and Lua Custom Health Checks: https://argo-cd.readthedocs.io/en/release-2.14/operator-manual/health/
- Argo CD PagerDuty notification service: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/pagerduty/
- Argo CD PagerDuty V2 notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/pagerduty_v2/

## Issues Found
- The central premise is incorrect: official Argo CD notification templates use Go's `html/template` package and documented template variables/functions, not embedded Lua scripts.
- The examples use `call .lua "functionName" .`, but the official notification template documentation does not define a `.lua` object or a Lua function bridge for notifications.
- The examples place a top-level `script:` key in `argocd-notifications-cm`; official notification configuration documents services, triggers, templates, context, and related notification fields, but not a `script` key for Lua execution.
- The claim that "ArgoCD includes a Lua runtime that makes functions from the Lua standard library available within templates" is inaccurate. Argo CD documents Lua for custom resource health checks in `argocd-cm`, and standard Lua libraries are disabled by default unless enabled with `resource.customizations.useOpenLibs.<group>_<kind>`.
- The PagerDuty example mixes notification routing with unsupported Lua-driven conditional template generation. Argo CD does support PagerDuty and PagerDuty V2 notification services, but the shown conditional Lua routing template would not work as written.
- The debugging section is misleading because there are no Lua notification scripts to debug in Argo CD notifications. Local `lua -c script.lua` can validate standalone Lua syntax, but it does not validate Argo CD notification templates.
- Because the article is built around a non-existent Argo CD notification feature, correcting it would require rewriting the post into a different guide about Go templates or Lua custom health checks. The post should be removed or replaced rather than patched in place.

## Review Notes
Argo CD does support Lua in custom resource health checks, but that feature is configured through `resource.customizations.health.<group>_<kind>` in `argocd-cm`, not through notification templates in `argocd-notifications-cm`. A replacement article could cover either advanced Argo CD notification templates using Go templates, Sprig, `repo`, `sync`, `time`, and `strings` functions, or Lua-based custom health checks.

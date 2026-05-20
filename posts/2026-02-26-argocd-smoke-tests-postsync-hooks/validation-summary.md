# Validation Summary: How to Run Smoke Tests as PostSync Hooks in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource hooks and PostSync hooks
- Kubernetes Jobs, init containers, ConfigMaps, Secrets, and downward API environment variables
- Shell scripting with curl and wget
- Python 3 standard library HTTP checks
- Slack incoming webhooks
- Kustomize overlays

## Sources Consulted
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes TTL-after-finished controller documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes downward API environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/environment-variable-expose-pod-information/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Slack message formatting documentation: https://docs.slack.dev/messaging/formatting-message-text/
- Referenced OneUptime integration-test article: https://oneuptime.com/blog/post/2026-02-26-argocd-integration-tests-after-deployment/view

## Issues Found
- The post described PostSync hooks as running after every sync. Argo CD runs PostSync hooks after all Sync hooks have succeeded, the application has been applied successfully, and resources are Healthy; hooks also do not run during selective sync. Updated the description, introduction, and diagram label to say successful full sync / applied and healthy.
- The basic Job example used `ttlSecondsAfterFinished` alongside Argo CD hook deletion. Argo CD documentation warns that Kubernetes TTL cleanup for hook Jobs can cause Applications to appear OutOfSync, and recommends hook delete policies for cleanup. Removed the TTL field from the example.
- The curl-based shell examples used `set -e` with command substitutions. A failed curl could exit the script before the custom failure accounting and reporting logic ran. Added `|| true` to the relevant curl command substitutions so failed requests are recorded as failed checks.
- The Slack webhook example embedded command-substitution output containing literal newlines into a JSON string, which can produce invalid JSON. Updated the snippet to keep newline escapes as `\n` in the JSON payload and removed the non-portable `echo -e` call.
- The Slack snippet assigned two `local` variables in one statement. Split the assignments into separate lines for clearer shell compatibility.

## Review Notes
- The YAML examples parse successfully after the fixes.
- The embedded shell scripts pass `/bin/sh -n`, and the embedded Python script compiles successfully.
- The examples use placeholder service names and endpoints, which is appropriate for a guide but must be adapted to the reader's application.

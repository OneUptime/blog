# Validation Summary: How to Handle Application Created Events in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Notifications
- Argo CD Application and ApplicationSet custom resources
- Kubernetes watch APIs and `kubectl get`
- Kubernetes RBAC
- Kopf Python operator framework
- Slack and webhook notifications

## Sources Consulted
- Argo CD Notifications overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD Notifications triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications webhook service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications Slack service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD ApplicationSet Progressive Syncs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Argo CD v2.2 to v2.3 upgrade notes: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/upgrading/2.2-2.3/
- Kubernetes API concepts, watch semantics: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kopf resource selector documentation: https://docs.kopf.dev/en/stable/resources/

## Issues Found
- The introduction said the fourth approach was resource hooks, but the post actually covered ApplicationSet progressive sync. Updated the wording to match the implementation.
- The post said ArgoCD Notifications was included by default in ArgoCD 2.6+. Official upgrade notes state Notifications became part of Argo CD in v2.3, so the version claim was corrected.
- The notification trigger could send repeatedly while the creation-time condition remained true. Added `oncePer: app.metadata.uid`, matching Argo CD Notifications trigger guidance.
- The Kubernetes watcher expected `.type == "ADDED"` from `kubectl get --watch -o json`, but `kubectl` only emits watch event wrapper objects when `--output-watch-events` is set. Updated the command to use `--watch-only --output-watch-events` and parse `.object`.
- The watcher image was `bitnami/kubectl`, but the script also requires `jq` and `curl`. Updated the example to use an image that includes those tools and added a clarifying comment.
- The watcher command used `/bin/bash`; the selected Alpine-based image provides `/bin/sh`. Updated the command accordingly.
- The Python controller was described as using the Kubernetes Python client, but the example uses Kopf. Updated the description, removed an unused import, added required environment variable reads, and supplied the missing `log_audit_event` function.
- The ApplicationSet progressive sync text implied it directly triggered events. Updated it to say progressive sync controls rollout and can be combined with notifications, and noted that progressive syncs must be enabled on the ApplicationSet controller.

## Review Notes
- The Argo CD notification pattern is an approximation of an application-created event based on `metadata.creationTimestamp`; Argo CD Notifications does not expose a dedicated create-only lifecycle hook.
- The snippets are illustrative and still use placeholder internal platform URLs and API endpoints.

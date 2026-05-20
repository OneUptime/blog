# Validation Summary: How to Use Git Directory Generator in ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- Git Directory generator
- GitOps
- Kubernetes manifests and kubectl
- Kustomize overlays

## Sources Consulted
- Argo CD Git Generator documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/

## Issues Found
- The polling section incorrectly showed `timeout.reconciliation` in `argocd-cm` as the way to set the Git generator poll interval. Argo CD documents `requeueAfterSeconds` on the Git generator for the ApplicationSet polling interval; `timeout.reconciliation` controls repo-server revision cache expiration and can affect when new commits become visible. Updated the example and explanation accordingly.
- The webhook example pointed to a generic Argo CD URL. Argo CD documents the ApplicationSet webhook endpoint as `/api/webhook` on the ApplicationSet webhook endpoint, which may be exposed separately from the Argo CD API server. Updated the example host to `applicationset.example.com`.

## Review Notes
The examples use the default fasttemplate syntax such as `{{path}}`, `{{path.basename}}`, and `{{path[1]}}`, which is still documented for `goTemplate: false`. Current Argo CD docs recommend Go templates for newer examples, where these become `{{.path.path}}`, `{{.path.basename}}`, and `{{index .path.segments 1}}`.

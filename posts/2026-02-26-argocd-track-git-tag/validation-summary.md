# Validation Summary: How to Track a Git Tag in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Git tags
- GitHub Actions
- Kubernetes manifests
- yq

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Tracking and Deployment Strategies: https://argo-cd.readthedocs.io/en/latest/user-guide/tracking_strategies/
- Argo CD Git Generator documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Git/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_create/
- GitHub Actions Workflow Syntax: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- Git `git-tag` documentation: https://git-scm.com/docs/git-tag.html

## Issues Found
- The post described tags as inherently immutable. Git tags can be moved, so the wording was updated to say tag tracking is deterministic when tags are treated as immutable.
- The post said ApplicationSets with the Git generator can detect new tags and create applications automatically. Official Argo CD documentation describes the Git generator as generating from repository files or directories, not enumerating tags, so this was corrected.
- The post only mentioned semver tracking for Helm chart versions. Argo CD documentation also supports semantic version constraints for Git tags, so the wording was updated.
- The GitHub Actions tag filter used a regex-like pattern. GitHub Actions uses glob patterns for tag filters, so the example was adjusted to use glob include and exclude patterns.
- The moved-tag behavior was too absolute. The wording now says Argo CD detects the new tag target during comparison or sync, and the application becomes OutOfSync if the rendered manifests differ.

## Review Notes
The examples use the current `argoproj.io/v1alpha1` Application API and documented Argo CD CLI flags. The GitHub Actions tag glob remains an illustrative filter rather than a strict semantic-version parser; strict validation can be added in the workflow script if needed.

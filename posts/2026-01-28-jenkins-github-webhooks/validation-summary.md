# Validation Summary: How to Use Jenkins with GitHub Webhooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Jenkins
- Jenkins GitHub plugin
- Jenkins GitHub Branch Source plugin
- Jenkins Multibranch Pipeline
- GitHub webhooks
- GitHub personal access tokens

## Sources Consulted
- Jenkins GitHub plugin documentation: https://plugins.jenkins.io/github/
- Jenkins GitHub Branch Source plugin documentation: https://plugins.jenkins.io/github-branch-source/
- CloudBees GitHub Webhook: Pipeline Multibranch documentation: https://docs.cloudbees.com/docs/cloudbees-ci-kb/latest/client-and-managed-controllers/github-webhook-pipeline-multibranch
- GitHub Docs, Creating webhooks: https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks
- GitHub Docs, Webhook events and payloads: https://docs.github.com/en/webhooks/webhook-events-and-payloads
- GitHub Docs, REST API endpoints for repository webhooks: https://docs.github.com/en/rest/repos/webhooks

## Issues Found
- The original credentials guidance said the token "only needs repo webhook access." That was too narrow for a Jenkins multibranch setup: Jenkins may need repository read access to discover or clone private repositories, while webhook administration permissions are only needed when Jenkins manages hooks automatically. Updated the sentence to describe those separate least-privilege requirements.

## Review Notes
The webhook URL format `https://jenkins.example.com/github-webhook/`, `application/json` content type, and push plus pull request events align with Jenkins GitHub plugin and GitHub webhook documentation. For production setups, a webhook secret is also recommended by GitHub, but the post remains technically correct without covering that optional hardening detail.

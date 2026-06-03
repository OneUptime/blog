# Validation Summary: Create a Tekton EventListener That Triggers Pipelines from GitHub Webhooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Tekton Triggers
- Tekton Pipelines
- Kubernetes
- Kubernetes RBAC
- Kubernetes Ingress
- GitHub webhooks
- GitHub REST API commit statuses
- CEL interceptors

## Sources Consulted
- Tekton Triggers installation documentation: https://tekton.dev/docs/installation/triggers/
- Tekton EventListeners documentation: https://tekton.dev/docs/triggers/eventlisteners/
- Tekton TriggerBindings documentation: https://tekton.dev/docs/triggers/triggerbindings/
- Tekton TriggerTemplates documentation: https://tekton.dev/docs/triggers/triggertemplates/
- Tekton Interceptors documentation: https://tekton.dev/docs/triggers/interceptors/
- Tekton Pipelines API documentation: https://tekton.dev/docs/pipelines/pipeline-api/
- Tekton Pipelines deprecations documentation: https://tekton.dev/docs/pipelines/deprecations/
- GitHub webhook events and payloads documentation: https://docs.github.com/en/webhooks/webhook-events-and-payloads
- GitHub REST API commit statuses documentation: https://docs.github.com/en/rest/commits/statuses

## Issues Found
- The PipelineRun and Task examples used `tekton.dev/v1beta1`, which Tekton marks as deprecated for Pipelines resources. Updated both examples to `tekton.dev/v1`.
- The RBAC example included `pipelineresources`, which Tekton lists as removed. Removed `pipelineresources` from the Role resource list.
- Some later EventListener and TriggerBinding snippets omitted the `tekton-pipelines` namespace and, in one case, `serviceAccountName`, making them inconsistent with the rest of the tutorial. Added the missing namespace and service account fields.
- The pull request binding used `$(body.pull_request.number)` for the PR number. GitHub pull request webhook payloads expose the event number at `$(body.number)`, so the binding was corrected.
- The multi-event example referenced `github-release-binding` without defining it. Added a release-specific TriggerBinding using fields from the GitHub release webhook payload.
- The custom parameter section said it used overlays but only showed a TriggerBinding and did not create overlay data. Added a CEL interceptor overlay and updated the binding to read `$(extensions.short_sha)` and `$(extensions.branch_name)`.
- The GitHub commit status curl example used older header conventions. Updated it to GitHub's current recommended `Bearer` authorization, `application/vnd.github+json` Accept header, and REST API version header.
- The local webhook test posted to `localhost:8080` without first exposing the EventListener service. Added a `kubectl port-forward` step and the `X-GitHub-Event` header needed by GitHub event handling.

## Review Notes
The examples still use `triggers.tekton.dev/v1beta1`, which is the API version shown in current Tekton Triggers documentation. Template references such as `build-template`, `pr-template`, `release-template`, and `build-and-deploy` assume matching Pipeline and TriggerTemplate resources exist elsewhere in the reader's setup.

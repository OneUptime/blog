# Validation Summary: How to Integrate ArgoCD with Argo Events

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Argo CD
- Argo Events
- Kubernetes
- Argo Workflows
- GitHub webhooks
- Docker registry webhooks
- Kubernetes Ingress
- Argo CD RBAC and API tokens

## Sources Consulted
- Argo Events installation documentation: https://argoproj.github.io/argo-events/installation/
- Argo Events GitHub EventSource documentation and examples: https://argoproj.github.io/argo-events/eventsources/setup/github/
- Argo Events Calendar EventSource documentation: https://argoproj.github.io/argo-events/eventsources/setup/calendar/
- Argo Events HTTP trigger documentation: https://argoproj.github.io/argo-events/sensors/triggers/http-trigger/
- Argo Events Argo Workflow trigger documentation: https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/
- Argo Events API reference for EventSource, Sensor, HTTPTrigger, SecureHeader, and TriggerParameter: https://raw.githubusercontent.com/argoproj/argo-events/stable/docs/APIs.md
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD Swagger API definitions: https://raw.githubusercontent.com/argoproj/argo-cd/stable/assets/swagger.json
- Argo CD local user and token documentation: https://raw.githubusercontent.com/argoproj/argo-cd/stable/docs/operator-manual/user-management/index.md
- Argo CD RBAC documentation: https://raw.githubusercontent.com/argoproj/argo-cd/stable/docs/operator-manual/rbac.md
- Argo CD automated sync documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/

## Issues Found
- The post described Argo CD as checking Git every 3 minutes by default. Updated this to the current documented default of `timeout.reconciliation: 120s` plus `timeout.reconciliation.jitter: 60s`, which means refreshes can take up to about 3 minutes.
- The GitHub EventSource used `apiToken` but did not include the externally reachable `webhook.url` needed when Argo Events registers the GitHub webhook. Added `url: https://webhooks.mycompany.com`.
- The HTTP trigger had both a static `Authorization` header containing an unsubstituted shell-style variable and a `secureHeaders` Authorization header. Removed the static header and kept `secureHeaders`, which is the supported way to read the token from a Kubernetes Secret.
- The Docker registry webhook EventSource omitted the `spec.service.ports` configuration needed to expose the webhook listener. Added the service port for `13000`.
- The Argo Workflow trigger example omitted the Sensor service account used for workflow operations. Added `spec.template.serviceAccountName: operate-workflow-sa`, matching the official Argo Events workflow trigger pattern.
- The scheduled sync and rollback examples attempted to send raw JSON by setting an HTTP payload item with an empty `dest`. Argo Events HTTP payload parameters construct JSON fields using `dest` paths, so these were changed to send valid request bodies with the Argo CD application `name`.
- The best-practices section referred to dead-letter queues. Argo Events documents dead-letter handling as `dlqTrigger`, so this was corrected to dead-letter triggers.

## Review Notes
The examples are syntactically valid YAML after the corrections. In a real deployment, the `operate-workflow-sa` account still needs RBAC allowing it to create Workflows in the target namespace, and the Docker registry webhook payload paths may need adjustment for the specific registry provider.

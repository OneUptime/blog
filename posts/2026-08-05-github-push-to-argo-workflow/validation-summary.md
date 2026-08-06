# Validation Summary: From GitHub Push to Argo Workflow with Argo Events

## Status

validated

## Post Type

Technical tutorial / implementation guide

## Technologies Covered

- Argo Events
- Argo Workflows and WorkflowTemplates
- GitHub repository webhooks
- Kubernetes custom resources, Services, Ingress, Secrets, RBAC, and service accounts
- NATS JetStream EventBus
- ingress-nginx
- Alpine Linux containers

## Sources Consulted

- [Argo Events GitHub EventSource documentation](https://argoproj.github.io/argo-events/eventsources/setup/github/)
- [Argo Events GitHub EventSource API reference](https://argoproj.github.io/argo-events/APIs/#argoproj.io/v1alpha1.GithubEventSource)
- [Argo Events GitHub EventSource implementation](https://github.com/argoproj/argo-events/blob/77cb8cb8f3e014ab3c66c2bfef886155f876ea86/pkg/eventsources/sources/github/start.go)
- [Argo Events GitHub event data types](https://github.com/argoproj/argo-events/blob/77cb8cb8f3e014ab3c66c2bfef886155f876ea86/pkg/eventsources/events/event-data.go)
- [Argo Events official GitHub Sensor example](https://github.com/argoproj/argo-events/blob/77cb8cb8f3e014ab3c66c2bfef886155f876ea86/examples/sensors/github.yaml)
- [Argo Events EventSource Services documentation](https://argoproj.github.io/argo-events/eventsources/services/)
- [Argo Events JetStream EventBus documentation](https://argoproj.github.io/argo-events/eventbus/jetstream/)
- [Argo Events Argo Workflow trigger documentation](https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/)
- [Argo Events service-account requirements](https://argoproj.github.io/argo-events/service-accounts/)
- [Argo Events data-filter API](https://argoproj.github.io/argo-events/APIs/#argoproj.io/v1alpha1.DataFilter)
- [Argo Events parameterization tutorial](https://argoproj.github.io/argo-events/tutorials/02-parameterization/)
- [Argo Workflows WorkflowTemplate documentation](https://argo-workflows.readthedocs.io/en/latest/workflow-templates/)
- [Argo Workflows workflow RBAC documentation](https://argo-workflows.readthedocs.io/en/latest/workflow-rbac/)
- [GitHub repository webhook REST API](https://docs.github.com/en/rest/repos/webhooks)
- [GitHub webhook payload documentation](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
- [GitHub webhook signature validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [GitHub webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks)
- [GitHub webhook redelivery documentation](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/redelivering-webhooks)
- [Kubernetes Ingress documentation](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Kubernetes Secrets documentation](https://kubernetes.io/docs/concepts/configuration/secret/)
- [kubectl wait reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [ingress-nginx annotation reference](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)
- [Alpine Linux release branches](https://www.alpinelinux.org/releases/)

## Issues Found

- The EventSource set `webhook.url` to `https://events.example.com/push`. Argo Events appends `webhook.endpoint` when it creates a GitHub hook, which would register `/push/push`. Changed `webhook.url` to the public base URL and clarified that a manually configured GitHub hook uses the complete `/push` payload URL.
- The manual-hook wording said to omit only `apiToken` and treated omission of either authentication method as disabling hook management. Argo creates hooks when either `apiToken` or `githubApp` is configured with a URL. Corrected the instructions to omit both credentials for a manual hook and clarified that `events` and `active` configure an Argo-managed GitHub hook rather than the local route.
- The explanation of `insecure` was reversed. The field maps to GitHub's `insecure_ssl` hook setting and controls GitHub's verification of the webhook endpoint certificate; it does not control the Argo Events GitHub API client's TLS verification. Corrected the explanation.
- The anchored `^push$` filter targeted `headers.X-Github-Event`, whose value is a JSON array because the EventSource serializes Go's `http.Header`. The regex would see the serialized array rather than the scalar header value. Changed the path to `headers.X-Github-Event.0` and updated the explanation of array indexing.
- The troubleshooting table associated signature failures with HTTP `401`. The GitHub EventSource sends HTTP `400` when `ValidatePayload` rejects the request. Corrected the status code.
- The prerequisites only stated that the Argo Events controller watches `argo-events`, although the example creates Workflows in that namespace. Added the requirement that the Argo Workflows controller also watches it.
- The WorkflowTemplate did not select or configure a Workflow pod service account. Current Argo Workflows executors need `create` and `patch` access to `workflowtaskresults`, and relying on the namespace's default account would not make the example portable. Added a dedicated `github-build` service account, minimal executor Role and RoleBinding, and `spec.serviceAccountName`.
- The example used `alpine:3.20`, whose standard support ended on 2026-04-01. Updated it to the supported `alpine:3.24` branch.

## Review Notes

- `argoproj.io/v1alpha1` remains the current API version for the reviewed Argo Events and Argo Workflows resources.
- NATS Server `2.10.29` is present in the current upstream Argo Events controller configuration, but supported versions are release-specific as the post notes. The `standard` StorageClass is also cluster-specific.
- The Workflow executor RBAC shown targets Argo Workflows 3.4 and later with the Emissary executor. Older or non-default executors can require different permissions.
- Kubernetes Ingress `networking.k8s.io/v1` remains stable, but the Ingress API is frozen and Kubernetes recommends Gateway API for new capabilities. The shown Ingress remains valid.
- All six YAML blocks parsed successfully. The relevant current upstream Argo Events unit tests for the GitHub EventSource, Sensor dependency filters, Argo Workflow trigger, and JetStream installer passed. The `kubectl wait`, `rollout status`, and `create secret generic` syntax was checked against kubectl v1.34.1 help.

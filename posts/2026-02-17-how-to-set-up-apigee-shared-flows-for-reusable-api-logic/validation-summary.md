# Validation Summary: How to Set Up Apigee Shared Flows for Reusable API Logic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Apigee
- Apigee shared flows
- Apigee policies: FlowCallout, VerifyAPIKey, SpikeArrest, AssignMessage, MessageLogging, CORS
- Apigee flow hooks
- Apigee REST API
- Google Cloud Logging
- XML configuration
- curl and gcloud authentication

## Sources Consulted
- Google Cloud Apigee: Creating reusable shared flows: https://docs.cloud.google.com/apigee/docs/api-platform/fundamentals/shared-flows
- Google Cloud Apigee: Shared flow bundle configuration reference: https://docs.cloud.google.com/apigee/docs/api-platform/reference/shared-flow-bundle-configuration-reference
- Google Cloud Apigee: FlowCallout policy: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/flow-callout-policy
- Google Cloud Apigee: MessageLogging policy: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/message-logging-policy
- Google Cloud Apigee: AssignMessage policy: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/assign-message-policy
- Google Cloud Apigee: CORS policy: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/cors-policy
- Google Cloud Apigee: Flow variables reference: https://docs.cloud.google.com/apigee/docs/api-platform/reference/variables-reference
- Google Cloud Apigee: Message templates: https://docs.cloud.google.com/apigee/docs/api-platform/reference/message-template-intro
- Google Cloud Apigee: Attaching a shared flow using a flow hook: https://docs.cloud.google.com/apigee/docs/api-platform/fundamentals/flow-hooks
- Google Cloud Apigee REST API: organizations.sharedflows.create: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.sharedflows/create
- Google Cloud Apigee REST API: shared flow revision deployments: https://cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.sharedflows.revisions.deployments/deploy
- Google Cloud Apigee REST API: flowhooks.attachSharedFlowToFlowHook: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.flowhooks/attachSharedFlowToFlowHook

## Issues Found
- The security shared flow included a response-header AssignMessage policy while the proxy example called the shared flow from the request PreFlow. Removed that policy from the request-flow shared flow so the example only includes request-side rate limiting and API key verification.
- The shared-flow import command used a raw octet-stream upload. Updated it to use the documented `-F "file=@security-shared-flow.zip"` form upload.
- The logging template attempted arithmetic inside a message template for `latencyMs`. Apigee message templates support variable substitution and template functions, not arbitrary arithmetic, so the field was changed to the documented `target.received.start.timestamp` variable.
- The CORS preflight example used AssignMessage policies that set response headers but did not reliably terminate the request flow. Replaced them with Apigee's CORS policy using `GeneratePreflightResponse`.
- Several XML snippets placed filename comments before the XML declaration. Moved those comments after the declaration so the snippets remain well-formed XML if copied into files.

## Review Notes
Cloud Logging through MessageLogging requires the Cloud Logging API and the appropriate Apigee Google authentication setup in the deployment environment. The post's fixed CORS example reflects the request origin; production APIs should restrict allowed origins to a deliberate allowlist where possible.

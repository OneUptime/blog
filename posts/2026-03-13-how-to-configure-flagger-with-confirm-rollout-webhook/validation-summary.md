# Validation Summary: How to Configure Flagger with confirm-rollout Webhook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- Kubernetes
- Canary deployments
- Webhooks
- Flagger load tester
- kubectl
- Python

## Sources Consulted
- Flagger official Webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flagger GitHub repository and README examples: https://github.com/fluxcd/flagger
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Python 3.12 http.server documentation: https://docs.python.org/3.12/library/http.server.html

## Issues Found
- Flagger webhook success handling was described as only HTTP 200. Updated the post to use HTTP 2xx where the official Flagger webhook documentation defines generic webhook success, while preserving the manual gate behavior.
- The confirm-rollout lifecycle wording said the hook runs before routing traffic to canary. Updated it to match Flagger documentation: confirm-rollout runs before scaling up the canary deployment, before the canary analysis proceeds.
- The webhook payload examples omitted the current `checksum` field documented by Flagger. Added `checksum` to both payload examples.
- The load tester manual gate example used `/gate/approve` while also describing the gate as closed by default and controlled through open/close calls. Updated the confirmation URL to `/gate/check`, which is the stateful manual gate endpoint used with `/gate/open` and `/gate/close`.
- The load tester open/close commands did not include the canary name and namespace payload shown in the official Flagger examples. Added the JSON payload to both commands.
- The sample webhook receiver used `nginx:alpine`, which would not return HTTP 200 for arbitrary POST requests to the gate path. Replaced it with a minimal Python HTTP handler that returns 200 to POST requests.

## Review Notes
The post does not pin a Flagger version. The corrections were made against the current Flagger documentation available on 2026-05-13.

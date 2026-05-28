# Validation Summary: How to Build a Go HTTP Proxy on Cloud Run That Authenticates Requests with

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Run
- Google Cloud Identity-Aware Proxy
- Google Cloud external Application Load Balancer
- Serverless network endpoint groups
- Go
- Go `net/http` and `net/http/httputil`
- `google.golang.org/api/idtoken`
- Google Cloud CLI

## Sources Consulted
- Google Cloud IAP documentation: Enable IAP for Cloud Run - https://docs.cloud.google.com/iap/docs/enabling-cloud-run
- Google Cloud IAP documentation: Securing your app with signed headers - https://docs.cloud.google.com/iap/docs/signed-headers-howto
- Google Cloud Load Balancing documentation: Set up a global external Application Load Balancer with Cloud Run - https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless
- Google Cloud Load Balancing documentation: Set up a classic Application Load Balancer with Cloud Run - https://docs.cloud.google.com/load-balancing/docs/https/setting-up-https-serverless
- Google Cloud SDK reference: `gcloud compute backend-services update` - https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud SDK reference: `gcloud compute network-endpoint-groups create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-endpoint-groups/create
- Google Cloud SDK reference: `gcloud iap web add-iam-policy-binding` - https://docs.cloud.google.com/sdk/gcloud/reference/iap/web
- Go package documentation: `google.golang.org/api/idtoken` - https://pkg.go.dev/google.golang.org/api/idtoken
- Google API Go Client source for IAP ES256 validation and payload fields - https://github.com/googleapis/google-api-go-client/blob/main/idtoken/validate.go

## Issues Found
- The setup text said IAP does not work directly with Cloud Run URLs. Current Google Cloud documentation recommends enabling IAP directly on Cloud Run when appropriate. Updated the note to clarify that this tutorial intentionally uses an external Application Load Balancer pattern.
- The setup commands enabled IAP on the backend service but did not grant the IAP service agent `roles/run.invoker` on the Cloud Run service. Added the service-agent creation command and Cloud Run IAM binding.
- The setup commands did not show granting users access through IAP. Added an `gcloud iap web add-iam-policy-binding` example using `roles/iap.httpsResourceAccessor`.
- The Go sample imported `encoding/json` but did not use it, which would make a complete Go file fail to compile. Removed the unused import.
- The Go sample read `sub` and `iss` from `payload.Claims`. The `idtoken.Payload` type exposes these standard JWT claims as `Subject` and `Issuer`; using those fields is clearer and avoids depending on the additional-claims map. Updated the code accordingly.
- The main function comment incorrectly described the IAP audience as the OAuth client ID. For IAP signed headers behind a backend service, the expected audience is `/projects/PROJECT_NUM/global/backendServices/BACKEND_ID`. Corrected the comment.
- The deployment command omitted `GRAFANA_BACKEND_URL` even though the route configuration includes `/grafana`. Added the environment variable and combined the Cloud Run environment variables into one `--set-env-vars` argument.

## Review Notes
The load balancer setup snippet is still intentionally abbreviated: a full external Application Load Balancer also needs frontend resources such as a URL map, target proxy, certificate for HTTPS, and forwarding rule. That omission is acceptable for this post because the snippet is focused on the IAP-relevant backend service and serverless NEG steps.

# Validation Summary: How to Set Up Service-to-Service Authentication Between Two Cloud Run Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Google Cloud IAM
- Google Cloud CLI (`gcloud`)
- Google-signed OpenID Connect ID tokens
- Python `google-auth`
- Node.js `google-auth-library`
- Go `google.golang.org/api/idtoken`

## Sources Consulted
- Cloud Run service-to-service authentication: https://cloud.google.com/run/docs/authenticating/service-to-service
- Cloud Run IAM access control: https://cloud.google.com/run/docs/securing/managing-access
- Cloud Run troubleshooting authentication and authorization errors: https://cloud.google.com/run/docs/troubleshooting
- Cloud Run service identity configuration: https://cloud.google.com/run/docs/configuring/services/service-identity
- `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- `gcloud run services add-iam-policy-binding` reference: https://cloud.google.com/sdk/gcloud/reference/run/services/add-iam-policy-binding
- `gcloud run services logs read` reference: https://cloud.google.com/sdk/gcloud/reference/run/services/logs/read
- Python `google.oauth2.id_token` reference: https://googleapis.dev/python/google-auth/latest/reference/google.oauth2.id_token.html
- Node.js `GoogleAuth.getIdTokenClient` reference: https://cloud.google.com/nodejs/docs/reference/google-auth-library/latest/google-auth-library/googleauth
- Go `google.golang.org/api/idtoken` reference: https://pkg.go.dev/google.golang.org/api/idtoken

## Issues Found
- The Go sample read and returned the backend response body without checking the HTTP status. This could treat an authentication or application error as successful backend data, and could fail later when encoding a non-JSON error body as `json.RawMessage`. I added a non-2xx status check that returns an error with the backend status and response body.
- The post described IAM-based service-to-service authorization as the serverless equivalent of Kubernetes network policies. That wording was too broad because Cloud Run IAM controls identity-based invocation, not network reachability. I changed it to describe fine-grained identity-based control.

## Review Notes
- The main Cloud Run authentication pattern is correct: grant `roles/run.invoker` on the receiving service to the calling service account, fetch a Google-signed ID token with the receiving service URL as the audience, and send it in the `Authorization: Bearer` header.
- The Python, Node.js, and Go client library choices are current and align with official documentation.
- The local environment did not include `gcloud`, so CLI validation was performed against the official Google Cloud SDK reference rather than local `--help` output.

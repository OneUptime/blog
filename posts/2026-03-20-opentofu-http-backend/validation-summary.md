# Validation Summary: How to Configure the HTTP Backend in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTofu (HTTP backend)
- Terraform HCL configuration
- GitLab managed Terraform/OpenTofu state backend
- mTLS / TLS client authentication
- HTTP basic authentication

## Sources Consulted
- OpenTofu HTTP backend documentation: https://opentofu.org/docs/language/settings/backends/http/
- GitLab Terraform/OpenTofu state documentation: https://docs.gitlab.com/user/infrastructure/iac/terraform_state/

## Issues Found
- **Incorrect description of the `ID` query parameter on state writes.** The original text said: *"The POST request includes an `ID` query parameter with the lineage for conflict detection."* According to the OpenTofu HTTP backend spec, the `ID` query parameter on state update requests contains the **lock ID** (when state locking is enabled), not the state lineage. The lock ID lets the server verify that the writer still holds the active lock. Fixed the sentence to: *"When state locking is enabled, the POST request includes an `ID` query parameter containing the lock ID, so the server can verify the writer holds the current lock."*

## Review Notes
- All HCL backend block argument names are correct: `address`, `lock_address`, `unlock_address`, `lock_method`, `unlock_method`, `username`, `password`, `client_certificate_pem`, `client_private_key_pem`, `client_ca_certificate_pem`, `skip_cert_verification`, `retry_max`, `retry_wait_min`, `retry_wait_max`.
- Default HTTP methods listed in the table (GET for read, POST for update, DELETE for delete, LOCK for lock, UNLOCK for unlock) match the OpenTofu spec.
- Environment variables `TF_HTTP_USERNAME`, `TF_HTTP_PASSWORD`, `TF_HTTP_ADDRESS` are all valid. The HTTP backend additionally supports `TF_HTTP_UPDATE_METHOD`, `TF_HTTP_LOCK_ADDRESS`, `TF_HTTP_LOCK_METHOD`, `TF_HTTP_UNLOCK_ADDRESS`, `TF_HTTP_UNLOCK_METHOD`, `TF_HTTP_RETRY_MAX`, `TF_HTTP_RETRY_WAIT_MIN`, `TF_HTTP_RETRY_WAIT_MAX`, and the three `TF_HTTP_CLIENT_*_PEM` vars — not mentioned, but not incorrect to omit.
- The GitLab example correctly uses `lock_method = "POST"`, `unlock_method = "DELETE"`, `retry_wait_min = 5`, and a personal access token as the password. GitLab requires the token to have the `api` scope; that detail is not mentioned but is not technically wrong.
- The post does not mention the `update_method` argument or the `headers` argument; both exist but are optional and omitting them is fine for an introductory guide.
- Default values not stated in the post: `retry_max` defaults to 2 (post example uses 3), `retry_wait_min` defaults to 1, `retry_wait_max` defaults to 30. Examples show non-default values, which is consistent with the surrounding "Override" framing.

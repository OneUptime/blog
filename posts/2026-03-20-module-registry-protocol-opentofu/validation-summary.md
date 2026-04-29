# Validation Summary: How the OpenTofu Module Registry Protocol Works

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (module registry protocol)
- Terraform module registry protocol (compatibility)
- HTTP service discovery via `.well-known/terraform.json`
- Python `http.server` (minimal registry implementation)
- GitLab Terraform Module Registry
- HCL configuration (terraform.rc / main.tf)

## Sources Consulted
- OpenTofu Module Registry Protocol docs: https://opentofu.org/docs/internals/module-registry-protocol/
- OpenTofu Remote Service Discovery docs: https://opentofu.org/docs/internals/remote-service-discovery/
- Live OpenTofu registry service discovery endpoint: https://registry.opentofu.org/.well-known/terraform.json
- Live OpenTofu registry versions endpoint: https://registry.opentofu.org/v1/modules/terraform-aws-modules/vpc/aws/versions
- Gitea Packages overview docs: https://docs.gitea.com/usage/packages/overview
- GitLab Terraform Module Registry docs: https://docs.gitlab.com/user/packages/terraform_module_registry/

## Issues Found
- **Incorrect claim about Gitea**: The post stated that Gitea has "built-in Terraform module registry support" and provided a fabricated `POST /api/packages/.../terraform/...` endpoint. Per Gitea's official package registry docs, Gitea supports a Terraform **State** registry, not a Terraform **Module** registry. The conclusion also referenced "Gitea or GitLab that implement the protocol natively." I replaced the Gitea example with an accurate GitLab example using the documented endpoint `PUT /projects/:id/packages/terraform/modules/:module-name/:module-system/:module-version/file`, and removed the Gitea reference from the conclusion.
- **Minor clarification**: Per the OpenTofu protocol docs, the download endpoint may return the module location either via the `X-Terraform-Get` response header **or** a `location` field in the JSON response body (OpenTofu prefers the body if both are present). I added a brief mention of the JSON body alternative to the conclusion sentence so the description is complete.

## Review Notes
- The service discovery URL (`/.well-known/terraform.json`), the example response body (`modules.v1` / `providers.v1`), and the URL pattern for the modules versions and download endpoints were verified against both the protocol docs and the live `registry.opentofu.org` responses; all match.
- The Python `http.server` example uses correct path-splitting indices: for `/v1/modules/<ns>/<name>/<provider>/versions`, `parts[3:6]` gives `[ns, name, provider]`; for `.../<version>/download`, `parts[3:7]` gives `[ns, name, provider, version]`.
- The example uses HTTP 204 with `X-Terraform-Get` for the download response, which matches the documented behavior.
- The address format `[<HOSTNAME>/]<NAMESPACE>/<MODULE_NAME>/<PROVIDER>` and the surrounding examples (registry, git::, local path) are correct.
- The OpenTofu registry currently advertises version 6.x of `terraform-aws-modules/vpc/aws`; the example uses 5.x versions, which still exist on the registry and remain valid for illustrative purposes — not a technical error, just a future-dating consideration.

# Validation Summary: How OpenTofu Remote Service Discovery Works

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu remote service discovery protocol
- OpenTofu module registry protocol
- OpenTofu provider registry protocol
- OpenTofu login protocol
- OpenTofu remote backend / TACOS
- NGINX
- Python / Flask

## Sources Consulted
- OpenTofu Remote Service Discovery: https://opentofu.org/docs/internals/remote-service-discovery/
- OpenTofu Server-side Login Protocol: https://opentofu.org/docs/internals/login-protocol/
- OpenTofu Command: login: https://opentofu.org/docs/cli/commands/login/
- OpenTofu CLI Configuration File: https://opentofu.org/docs/cli/config/config-file/
- OpenTofu Module Registry Protocol: https://opentofu.org/docs/internals/module-registry-protocol/
- OpenTofu Provider Registry Protocol: https://opentofu.org/docs/internals/provider-registry-protocol/
- OpenTofu Backend Type: remote: https://opentofu.org/docs/language/settings/backends/remote/
- HashiCorp Terraform Remote Service Discovery reference: https://developer.hashicorp.com/terraform/internals/remote-service-discovery
- Live OpenTofu registry discovery document: https://registry.opentofu.org/.well-known/terraform.json
- Live Terraform Cloud discovery document: https://app.terraform.io/.well-known/terraform.json

## Issues Found
- The sample response for `https://registry.opentofu.org/.well-known/terraform.json` was incorrect. The live discovery document currently advertises only `modules.v1` and `providers.v1`, so I updated the response block and the related explanation.
- The post described every discovery value as a base path and modeled `login.v1` as a string URL. OpenTofu's login protocol defines `login.v1` as an object containing OAuth client and endpoint metadata, so I corrected the service description, the NGINX example, and the `tofu login` walkthrough.
- The introduction and conclusion overstated discovery as something OpenTofu performs for any hostname it interacts with. The protocol applies to OpenTofu-native service hosts, so I narrowed that wording.
- The remote backend section claimed OpenTofu discovers specifically `tfe.v2.1` and uses it for all remote-backend functions. The current `app.terraform.io` discovery document exposes multiple host-specific entries, including `state.v2` and several `tfe.v2*` services, so I rewrote that section to avoid an unsupported version-specific claim.
- The manual credentials example used `~/.terraformrc`. OpenTofu still supports that path for backward compatibility, but `.tofurc` is the current native CLI config location, so I updated the example.
- The Flask module-registry sample used `provider` for the third module path segment, while the documented protocol uses `system`. I aligned the route with the official protocol and added a TLS trust note for production use.

## Review Notes
- The post is technically accurate after the above corrections.
- OpenTofu still supports the `remote` backend, but the current OpenTofu docs recommend the built-in `cloud` integration over `backend "remote"` when that integration is available.
- `.terraformrc` remains supported by OpenTofu for backward compatibility even though `.tofurc` is preferred.

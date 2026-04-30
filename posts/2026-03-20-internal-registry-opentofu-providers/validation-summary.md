# Validation Summary: How to Set Up an Internal Registry for OpenTofu Providers

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu provider registry protocol
- OpenTofu CLI configuration
- OpenTofu OCI provider mirrors
- nginx
- Go
- Terraform Plugin SDK v2
- GitLab CI/CD
- GitLab OCI registry

## Sources Consulted
- OpenTofu Provider Registry Protocol: https://opentofu.org/docs/v1.9/internals/provider-registry-protocol/
- OpenTofu CLI Configuration File: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu Provider Mirrors in OCI Registries: https://opentofu.org/docs/cli/oci_registries/provider-mirror/
- OpenTofu OCI Registry Credentials: https://opentofu.org/docs/cli/oci_registries/credentials/
- GitLab OpenTofu CI/CD component README: https://gitlab.com/components/opentofu/-/blob/main/README.md#publish-providers-to-the-gitlab-oci-registry
- GitLab OpenTofu `provider-release` template: https://gitlab.com/components/opentofu/-/raw/main/templates/provider-release.yml
- HashiCorp provider publishing requirements: https://developer.hashicorp.com/terraform/registry/providers/publishing
- HashiCorp Terraform Plugin SDK v2 docs: https://developer.hashicorp.com/terraform/plugin/sdkv2

## Issues Found
- The post conflated an origin provider registry with provider mirrors for upstream providers. I corrected the description, introduction, GitLab section, and conclusion so mirrored public providers are directed to OpenTofu mirror mechanisms instead of the registry protocol.
- The static-file setup commands were incomplete. I added creation of the `.well-known` and `files` directories and fixed the nested `download/linux` path so the sample commands can run successfully.
- The provider versions JSON included extra top-level fields not defined by the registry protocol and did not match the platforms built later in the Makefile. I removed the extra fields and aligned the listed platforms with the build output.
- The sample package metadata used an obviously invalid checksum placeholder. I replaced it with a correctly formatted SHA-256 value so the example matches the protocol’s required field shape.
- The nginx example used `add_header Content-Type` for extensionless JSON endpoints and forced `/files/` responses to `application/zip`, which is incorrect for checksum and signature files. I changed the JSON locations to use `default_type application/json` and removed the incorrect zip content-type override.
- The Go provider snippet did not compile because it referenced an undefined `resourceService()` function. I replaced that with an empty `ResourcesMap` so the minimal example is syntactically valid.
- The Makefile had multiple correctness issues: it did not create `dist/`, built provider binaries with the wrong release naming pattern, omitted the Windows `.exe` suffix, ran `gpg` in the wrong directory, and assumed the registry files directory already existed. I fixed each of those points.
- The OpenTofu CLI config filename was wrong. I changed `~/.terraform.rc` to `~/.tofurc`, which is the correct OpenTofu default on non-Windows systems.
- The GitLab example was outdated. GitLab’s current documented flow for OpenTofu providers uses the OCI registry plus the `provider-release` component, not the old package-registry upload pattern shown in the draft. I replaced the section accordingly and separated CLI config from OpenTofu configuration so the file contexts are correct.

## Review Notes
- The SDK v2 provider example is still technically valid for protocol `5.0`, but HashiCorp now recommends the Terraform Plugin Framework for new provider development. The post remains accurate after correction because it presents SDK v2 as a minimal example rather than the preferred modern scaffolding.
- GitLab’s OCI-provider flow is version-specific: the current GitLab documentation notes a minimum of GitLab 18.4 and OpenTofu 1.10 for the `provider-release` component workflow.

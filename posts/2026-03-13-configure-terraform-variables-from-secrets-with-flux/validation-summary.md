# Validation Summary: How to Configure Terraform Variables from Secrets with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Tofu Controller / Terraform Controller
- Terraform / OpenTofu
- Kubernetes Secrets and ConfigMaps
- SOPS with age encryption
- External Secrets Operator
- Terraform AWS provider

## Sources Consulted
- Tofu Controller API reference for `infra.contrib.fluxcd.io/v1alpha2` Terraform resources: https://flux-iac.github.io/tofu-controller/References/terraform/
- Tofu Controller runner pod customization guide: https://flux-iac.github.io/tofu-controller/use-tf-controller/provision-resources-with-customized-runner-pods/
- Tofu Controller variable reference documentation: https://pkg.go.dev/github.com/flux-iac/tofu-controller/api/v1alpha1
- Flux SOPS/Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux secrets management documentation: https://fluxcd.io/flux/security/secrets-management/
- SOPS official documentation: https://github.com/getsops/sops
- Terraform sensitive variables documentation: https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Terraform Google provider documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/

## Issues Found
- The plaintext SOPS file path comment did not match the command input path. Updated the example comment to use `production-sensitive-vars-plain.yaml` so the workflow is internally consistent.
- The SOPS command encrypted the manifest without limiting encrypted fields. Flux documentation recommends leaving Kubernetes `apiVersion`, `kind`, and `metadata` plaintext by encrypting only `data` and `stringData`; added `--encrypted-regex '^(data|stringData)$'`.
- The Terraform sensitive variable explanation overstated protection by implying sensitive values are not stored in state. Terraform documents that sensitive values are redacted from command output but still stored in state, so the post now explicitly tells readers to protect the state backend.
- The runner pod environment-variable example omitted `AWS_SESSION_TOKEN` even though the credentials Secret included an `aws_session_token` key for temporary credentials. Added an optional `AWS_SESSION_TOKEN` environment variable.
- The External Secrets Operator snippet used `external-secrets.io/v1beta1`; current documentation uses `external-secrets.io/v1`. Updated the example to the current API version.

## Review Notes
- `sops` was not installed in the local workspace, so the SOPS command was verified against official documentation rather than local `--help` output.
- The Tofu Controller `varsFrom`, `varsKeys`, `optional`, `runnerPodTemplate.spec.env`, and `approvePlan` examples match the official v1alpha2 API reference.

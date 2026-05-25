# Validation Summary: How to Create Azure AD Service Principals in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureAD provider
- HashiCorp AzureRM provider
- HashiCorp Time provider
- HashiCorp TLS provider
- Microsoft Entra ID / Azure AD applications and service principals
- Azure RBAC role assignments
- GitHub Actions OIDC / workload identity federation
- AKS workload identity federation

## Sources Consulted
- Terraform Registry: AzureAD `azuread_application`, `azuread_service_principal`, `azuread_application_password`, `azuread_application_certificate`, and `azuread_application_federated_identity_credential` resources: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs
- Terraform Registry: AzureRM `azurerm_role_assignment` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- Terraform Registry: Time `time_rotating` resource: https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/rotating
- Terraform Registry: TLS provider and `tls_private_key` / `tls_self_signed_cert` resources: https://registry.terraform.io/providers/hashicorp/tls/latest/docs
- Microsoft Learn: Application and service principal objects in Microsoft Entra ID: https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals
- Microsoft Learn: Azure role assignments: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments
- Microsoft Learn: Azure built-in roles: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
- GitHub Docs: Configuring OpenID Connect in Azure: https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-azure
- GitHub Docs: OpenID Connect reference: https://docs.github.com/en/actions/reference/security/oidc

## Issues Found
- The certificate example used `tls_private_key` and `tls_self_signed_cert` but the provider configuration did not declare the `hashicorp/tls` provider. Added the TLS provider to `required_providers`.
- The client secret example described `end_date_relative` as "6-month rotation"; it sets expiration, not rotation. Updated the comment to say "6-month expiration."
- The rotating password comment implied automatic rotation happens independently. `time_rotating` only triggers recreation when Terraform is run after the rotation interval, so the comment was corrected.
- The certificate section said the private key never leaves the client. In the shown Terraform-generated certificate example, the private key is stored in Terraform state, so the text now clarifies that state must be protected.
- Role assignments for the newly-created service principal could fail because of Microsoft Entra replication lag. Added `skip_service_principal_aad_check = true`, which the AzureRM provider supports for newly provisioned service principals.

## Review Notes
The post pins AzureAD `~> 2.47` and AzureRM `~> 3.80`, while newer major versions exist. The reviewed snippets are still consistent with the pinned provider generation; a future post refresh could update the examples to current major provider versions.

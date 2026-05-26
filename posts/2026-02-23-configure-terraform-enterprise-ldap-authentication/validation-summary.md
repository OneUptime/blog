# Validation Summary: How to Configure Terraform Enterprise LDAP Authentication

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Terraform Enterprise
- Replicated installer dashboard
- LDAP and LDAPS
- Active Directory
- OpenLDAP
- SAML and SCIM
- PowerShell Active Directory cmdlets
- OpenLDAP client tools

## Sources Consulted
- HashiCorp Help Center: Configuring LDAP Authentication for Terraform Enterprise - https://support.hashicorp.com/hc/en-us/articles/17120747987219-Configuring-LDAP-Authentication-for-Terraform-Enterprise
- HashiCorp Help Center: Configuring LDAP authentication for the Terraform Enterprise installer dashboard (Replicated) - https://support.hashicorp.com/hc/en-us/articles/360042080154-Configuring-LDAP-authentication-for-the-Terraform-Enterprise-installer-dashboard-Replicated
- HashiCorp Developer: Configure Terraform Enterprise as the SAML service provider - https://developer.hashicorp.com/terraform/enterprise/saml/configuration
- HashiCorp Developer: Configure SCIM provisioning in Terraform Enterprise - https://developer.hashicorp.com/terraform/enterprise/scim/configure
- HashiCorp Developer: Terraform Enterprise configuration reference - https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- Microsoft Learn: New-ADUser - https://learn.microsoft.com/en-us/powershell/module/activedirectory/new-aduser
- Microsoft Learn: New-ADGroup - https://learn.microsoft.com/en-us/powershell/module/activedirectory/new-adgroup
- Local OpenLDAP client man pages for ldapsearch, ldapadd, and ldapwhoami.
- Local OpenSSL s_client help output.

## Issues Found
- The post incorrectly claimed Terraform Enterprise application users can sign in natively with LDAP and that LDAP groups automatically map to TFE teams. HashiCorp's current Terraform Enterprise user SSO guidance is SAML, with SCIM for provisioning and group mapping; LDAP documentation applies to the Replicated installer dashboard. Updated the article throughout to scope LDAP to installer dashboard authentication and point application user/team management to SAML/SCIM.
- The post referenced a non-existent TFE Admin UI path (`Admin > LDAP`) and an unsupported `/api/v2/admin/ldap-settings` API. Replaced these with the documented Replicated installer dashboard path and automated installation configuration files.
- The post listed `TFE_LDAP_*` environment variables that are not in the current Terraform Enterprise configuration reference. Replaced them with Replicated LDAP settings and the documented `replicatedctl app-config export --hidden` command.
- The Active Directory examples were marked as Bash and used backslash continuation even though they were PowerShell commands. Changed the code fences to PowerShell and used PowerShell continuation syntax.
- The LDAP group/team mapping section described unsupported LDAP-to-TFE team synchronization. Reworked it as a restricted installer dashboard access group and added a note that application team membership should use SAML or SCIM.
- Troubleshooting content referred to LDAP group membership sync and TFE application trust behavior. Updated it to match Replicated LDAP validation errors, group restriction behavior, and the documented TFE CA bundle setting.

## Review Notes
The corrected article now focuses on Replicated-based Terraform Enterprise installations. Current flexible deployment paths do not expose the same Replicated installer dashboard workflow, so future updates should confirm whether the target deployment model is Replicated, Docker, Kubernetes, or Nomad before expanding this guide.

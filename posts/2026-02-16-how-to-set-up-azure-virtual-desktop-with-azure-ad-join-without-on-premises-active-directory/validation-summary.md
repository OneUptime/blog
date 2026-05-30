# Validation Summary: How to Set Up Azure Virtual Desktop with Azure AD Join Without On-Premises

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Virtual Desktop
- Microsoft Entra ID / Azure AD join
- Azure CLI
- Azure Virtual Machines
- AADLoginForWindows VM extension
- Microsoft Intune
- FSLogix
- Azure Files with Microsoft Entra Kerberos
- Azure RBAC

## Sources Consulted
- Microsoft Learn: Microsoft Entra joined session hosts in Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/azure-ad-joined-session-hosts
- Microsoft Learn: Deploy Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/deploy-azure-virtual-desktop
- Microsoft Learn: Add session hosts to a host pool - https://learn.microsoft.com/en-us/azure/virtual-desktop/add-session-hosts-host-pool
- Microsoft Learn: Sign in to a Windows virtual machine in Azure by using Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/identity/devices/howto-vm-sign-in-azure-ad-windows
- Microsoft Learn Azure CLI reference: az desktopvirtualization hostpool - https://learn.microsoft.com/en-us/cli/azure/desktopvirtualization/hostpool
- Microsoft Learn Azure CLI reference: az desktopvirtualization applicationgroup - https://learn.microsoft.com/en-us/cli/azure/desktopvirtualization/applicationgroup
- Microsoft Learn Azure CLI reference: az desktopvirtualization workspace - https://learn.microsoft.com/en-us/cli/azure/desktopvirtualization/workspace
- Microsoft Learn Azure CLI reference: az vm run-command - https://learn.microsoft.com/en-us/cli/azure/vm/run-command
- Microsoft Learn: Enable Microsoft Entra Kerberos authentication for Azure Files - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-identity-auth-hybrid-identities-enable
- Microsoft Learn Azure CLI reference: az storage account - https://learn.microsoft.com/en-us/cli/azure/storage/account

## Issues Found
- The host pool registration token was retrieved with `az desktopvirtualization hostpool show --query "registrationInfo.token"`. Microsoft documents `az desktopvirtualization hostpool retrieve-registration-token --query token`; the command was corrected.
- The registration token expiration was hard-coded to `2026-02-17T00:00:00Z`, which is expired as of the validation date, 2026-05-30. The example now generates a 24-hour UTC expiration timestamp.
- The host pool text implied Azure AD join is configured on the host pool itself. The post now clarifies that the host pool should contain only Azure AD-joined session hosts and includes `targetisaadjoined:i:1` for legacy authentication client compatibility.
- The VM creation command did not enable a system-assigned managed identity, which is required before installing the Microsoft Entra sign-in extension. The command now includes `--assign-identity`.
- The AADLoginForWindows extension command pinned `--version 2.0`, which does not match the current Microsoft example and can make deployments brittle. The version pin was removed.
- The session host registration used the legacy DSC gallery artifact and an `aadJoin` setting. Microsoft's current guidance for VMs created outside the Azure Virtual Desktop service is to install the Azure Virtual Desktop Agent and Agent Boot Loader and pass the registration token. The sample was updated to use `az vm run-command invoke` and `msiexec`.
- The Intune enrollment instructions referred to Azure AD device settings and an outdated authority URL workflow. The steps now point to Intune automatic enrollment and the current MDM discovery URL.
- The Azure Files / FSLogix section omitted required Microsoft Entra Kerberos steps for cloud-only identities, including admin consent, cloud-only group support, share-level permissions, and cloud Kerberos ticket retrieval. The section now calls out those requirements and uses a separate storage location variable because cloud-only Entra Kerberos RBAC support is region-limited.

## Review Notes
The corrected article remains a high-level CLI walkthrough. In production, Microsoft recommends using groups for role assignments, validating regional availability and latency for Azure Files, enabling single sign-on for the best client experience, and testing the full host registration flow in a subscription because the local review environment did not have Azure CLI installed.

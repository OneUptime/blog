# Validation Summary: How to Assign Users and Groups to Application Groups

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Desktop
- Azure CLI desktopvirtualization extension
- Azure RBAC
- Az.DesktopVirtualization PowerShell module
- Microsoft Entra Conditional Access
- Windows App

## Sources Consulted
- Microsoft Learn: Publish applications with RemoteApp in Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/publish-applications-stream-remoteapp
- Microsoft Learn: Deploy Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/deploy-azure-virtual-desktop
- Microsoft Learn: az desktopvirtualization applicationgroup - https://learn.microsoft.com/en-us/cli/azure/desktopvirtualization/applicationgroup
- Microsoft Learn: az desktopvirtualization workspace - https://learn.microsoft.com/en-us/cli/azure/desktopvirtualization/workspace
- Microsoft Learn: Built-in Azure RBAC roles for Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/rbac
- Microsoft Learn: Enforce Microsoft Entra multifactor authentication for Azure Virtual Desktop using Conditional Access - https://learn.microsoft.com/en-us/azure/virtual-desktop/set-up-mfa
- Microsoft Learn: Connect to Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/connect-azure-virtual-desktop
- Microsoft Learn: Remote Desktop client overview - https://learn.microsoft.com/en-us/previous-versions/remote-desktop-client/overview
- Microsoft Learn: New-AzWvdApplication reference - https://learn.microsoft.com/powershell/module/az.desktopvirtualization/new-azwvdapplication

## Issues Found
- The post used `az desktopvirtualization application create` to publish RemoteApps. Microsoft documentation states RemoteApp applications can be published with the Azure portal or Azure PowerShell, and not with Azure CLI. Replaced those examples with `New-AzWvdApplication`.
- The post said a user cannot be assigned to both Desktop and RemoteApp application groups on the same host pool. Current behavior for pooled host pools is governed by the preferred application group type, so updated the explanation and common mistake wording.
- The diagram and group assignment example implied the same group should receive both Desktop and RemoteApp access from the same host pool. Adjusted the diagram and example text to avoid that misleading setup.
- The post said Desktop application groups are created automatically with every host pool. Microsoft documentation scopes this automatic creation to Azure portal host-pool creation, so the wording was narrowed.
- The Conditional Access guidance used the older Azure AD portal wording and suggested targeting access by full desktop versus RemoteApp. Updated it to Microsoft Entra Conditional Access wording and the relevant Azure Virtual Desktop and Windows Cloud Login app targets.
- The post directed users to the older Remote Desktop web client URL. Microsoft now positions Windows App as the replacement, and the Remote Desktop web client is no longer supported for public cloud environments as of March 27, 2026. Updated the connection guidance to Windows App at `https://windows.cloud.microsoft/`.
- The PowerShell automation snippet used `$subId` without defining it. Added a command to populate `$subId` from the active Azure CLI account.

## Review Notes
Azure CLI was not installed in the local environment, so CLI syntax was verified against Microsoft Learn command references rather than local `az --help` output.

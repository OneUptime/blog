# Validation Summary: How to Attach MSIX App Packages to Azure Virtual Desktop Session Hosts

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Virtual Desktop
- App Attach / MSIX app attach
- MSIX Packaging Tool
- MSIXMGR
- Azure Files / SMB file shares
- Az.DesktopVirtualization PowerShell
- Azure CLI for Azure Files share operations
- Windows PowerShell certificate and MSIX signing tools

## Sources Consulted
- Microsoft Learn: App Attach in Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/app-attach-overview
- Microsoft Learn: Add and manage App Attach applications in Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/app-attach-setup
- Microsoft Learn: Create an MSIX image to use with App Attach in Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/app-attach-create-msix-image
- Microsoft Learn: MSIXMGR tool parameters - https://learn.microsoft.com/en-us/azure/virtual-desktop/msixmgr-tool-syntax-description
- Microsoft Learn: Create an MSIX package from any desktop installer - https://learn.microsoft.com/en-us/windows/msix/packaging-tool/create-app-package
- Microsoft Learn: How to generate a template file for command line conversions - https://learn.microsoft.com/en-us/windows/msix/packaging-tool/generate-template-file
- Microsoft Learn: Sign your MSIX package: end-to-end guide - https://learn.microsoft.com/en-us/windows/msix/package/sign-msix-package-guide
- Microsoft Learn: Sign an app package using SignTool - https://learn.microsoft.com/en-us/windows/msix/package/sign-app-package-using-signtool
- Microsoft Learn: Create a certificate for package signing - https://learn.microsoft.com/en-us/windows/msix/package/create-certificate-package-signing
- Microsoft Learn: az storage file - https://learn.microsoft.com/en-us/cli/azure/storage/file
- Microsoft Learn: az storage share-rm - https://learn.microsoft.com/en-us/cli/azure/storage/share-rm
- Microsoft Learn: New-AzWvdApplicationGroup - https://learn.microsoft.com/en-us/powershell/module/az.desktopvirtualization/new-azwvdapplicationgroup

## Issues Found
- The post described staging as occurring when the VM starts. Current App Attach documentation describes application images being mounted from the file share for assigned user sessions during sign-in/application use. Updated the stage description and diagram.
- The prerequisites were too narrow, requiring Windows 11 Enterprise multi-session. Current App Attach documentation supports supported Windows client and server operating systems, with Windows Server 2022 and 2025 support noted by Microsoft. Updated the prerequisite wording and added the Az.DesktopVirtualization module requirement.
- The MSIX Packaging Tool template omitted the documented template namespace and did not follow the documented sample element order. Added the official namespace and reordered the XML sample.
- The certificate signing flow exported only a CER but then tried to sign with a PFX that had not been created. Added PFX export with a password and changed the certificate subject to match the MSIX publisher name.
- The VHD creation example manually created and mounted a VHDX, then unpacked the package into a directory. Current Microsoft guidance uses MSIXMGR with `-create`, `-fileType`, and `-rootDirectory` to create the app attach image. Replaced the block with the supported MSIXMGR VHDX creation command.
- The Azure portal instructions referenced the older host pool "MSIX packages" workflow. Updated the instructions to use Azure Virtual Desktop > App Attach and the current registration type names.
- The Azure CLI examples for adding MSIX packages and publishing MSIX RemoteApps were not current for App Attach. Microsoft documentation states App Attach applications are added and managed using the portal or Azure PowerShell, not Azure CLI. Replaced those examples with Az.DesktopVirtualization PowerShell commands.
- The update and troubleshooting wording referred only to VHD images. Updated it to refer to app attach/MSIX images so it also aligns with VHDX and CIM terminology.

## Review Notes
The post now uses VHDX for the worked example, which is supported. Microsoft recommends CIM for best performance, especially on Windows 11, so a future enhancement could add a CIM example without changing the correctness of the VHDX workflow.

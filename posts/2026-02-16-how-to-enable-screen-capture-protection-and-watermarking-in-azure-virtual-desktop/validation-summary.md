# Validation Summary: How to Enable Screen Capture Protection and Watermarking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Desktop
- Screen capture protection
- Watermarking
- Microsoft Intune
- Group Policy / ADMX templates
- Windows App and Remote Desktop clients
- Azure Monitor Log Analytics / Kusto Query Language
- PowerShell registry configuration

## Sources Consulted
- Microsoft Learn: Enable screen capture protection in Azure Virtual Desktop & Windows 365: https://learn.microsoft.com/en-us/azure/virtual-desktop/screen-capture-protection
- Microsoft Learn: Watermarking in Azure Virtual Desktop: https://learn.microsoft.com/en-us/azure/virtual-desktop/watermarking
- Microsoft Learn: Azure Virtual Desktop diagnostics log analytics: https://learn.microsoft.com/en-za/azure/virtual-desktop/diagnostics-log-analytics
- Microsoft Learn: Azure Monitor Logs reference - WVDConnections: https://learn.microsoft.com/en-au/azure/azure-monitor/reference/tables/wvdconnections
- ADMX Viewer: Enable watermarking policy details: https://gpedit.tplant.com.au/en-us/policy/terminalserver-avd/AVD_SERVER_WATERMARKING/
- ADMX Viewer: Enable screen capture protection policy details: https://gpedit.tplant.com.au/en-us/policy/terminalserver-avd/AVD_SERVER_SCREEN_CAPTURE_PROTECTION/

## Issues Found
- The prerequisites listed Windows Server 2022 and the Windows Desktop client 1.2.3317 as screen capture protection requirements. Microsoft documentation currently lists Windows 10/11 22H2 or later for VM configuration, Windows 11 22H2 or later for client-and-server blocking, and Remote Desktop Windows client 1.2.1672 or later / macOS 10.7.0 or later. Updated the prerequisite text accordingly.
- The post used Azure AD terminology. Updated relevant references to Microsoft Entra ID.
- The client support notes said only Windows Desktop and macOS clients support screen capture protection and that unsupported clients simply do not apply protection. Microsoft documentation now covers Windows App, Remote Desktop clients, and mobile hybrid enforcement with Intune MAM, while unsupported clients such as web are blocked when host-based screen capture protection is enabled. Updated the wording.
- The Group Policy path omitted Windows Components > Remote Desktop Services > Remote Desktop Session Host. Updated both screen capture protection and watermarking paths to the documented path.
- The watermarking section described semi-transparent text, user UPN, timestamps, custom strings, font size, and percent opacity. Microsoft documentation describes QR code watermarks containing Connection ID or Device ID, with opacity from 100 to 9999, scale factor, and grid width/height options. Rewrote the affected claims and registry example.
- The Intune section showed unsupported custom OMA-URI settings for these AVD policies. Microsoft documentation recommends the Settings catalog under Administrative templates. Replaced the OMA-URI snippet with Settings catalog instructions.
- The monitoring query referenced a `ScreenCaptureProtected` column that is not in the documented `WVDConnections` schema. Replaced it with a documented client type/version query and the documented `CorrelationId` lookup for watermarking investigations.

## Review Notes
The registry examples are lower-level than Microsoft's primary Intune and Group Policy guidance. For production documentation, prefer the supported Settings catalog or Group Policy UI when possible, and use registry automation only after validating the current ADMX-backed value names in a test host pool.

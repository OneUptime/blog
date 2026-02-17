# How to Enable Screen Capture Protection and Watermarking in Azure Virtual Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Virtual Desktop, Screen Capture Protection, Watermarking, Security, AVD, Data Loss Prevention, Enterprise Security

Description: Learn how to enable screen capture protection and watermarking in Azure Virtual Desktop to prevent unauthorized screenshots and data leakage from remote sessions.

---

If you manage Azure Virtual Desktop (AVD) environments in a regulated industry or any organization that cares about data leakage, you have probably worried about users taking screenshots of sensitive data displayed in their remote sessions. Screen capture protection and watermarking are two features that directly address this risk. In this guide, I will walk through how to enable both features, explain the requirements, and share some practical tips from real-world deployments.

## Why Screen Capture Protection Matters

Remote desktop sessions often display sensitive data - financial records, patient health information, proprietary code, or confidential business documents. Without screen capture protection, any user can simply press Print Screen, use a snipping tool, or share their screen in a video call. The captured content then lives outside your control.

Screen capture protection in AVD works by blocking screen capture at the client level. When a user tries to capture the screen (via screenshot tools, screen sharing, or screen recording), the AVD session window appears as a black rectangle. The actual content is not transmitted to the capture buffer.

Watermarking takes a complementary approach. Rather than blocking captures outright, it overlays identifying information on the session display. If someone photographs their screen with a phone (which no software-based protection can fully prevent), the watermark ties the image back to a specific user and session.

## Prerequisites

Before you start, make sure you have the following in place:

- An Azure Virtual Desktop environment with session hosts running Windows 11 22H2 or later (or Windows Server 2022 with the latest updates)
- The Windows Desktop client version 1.2.3317 or later (screen capture protection is client-dependent)
- Group Policy or Intune access to configure session host policies
- An Azure AD account with permissions to manage AVD host pools

One important note: screen capture protection currently works only with the Windows Desktop client and the macOS client. Web browsers and mobile clients do not support it yet. Plan your rollout accordingly if your users connect from different platforms.

## Enabling Screen Capture Protection

Screen capture protection is controlled via Group Policy on the session hosts. You need to configure it on every session host VM in your host pool.

### Step 1: Install the Administrative Templates

If you have not already imported the AVD administrative templates, download and install them first. The templates add AVD-specific policy settings to your Group Policy editor.

Here is how to install the templates using PowerShell on a session host:

```powershell
# Download the AVD ADMX templates from Microsoft
# This downloads the template MSI installer to a temp directory
$templateUrl = "https://aka.ms/avdgpo"
$outputPath = "$env:TEMP\AVDGroupPolicyTemplates.msi"
Invoke-WebRequest -Uri $templateUrl -OutFile $outputPath

# Run the installer silently
Start-Process msiexec.exe -ArgumentList "/i `"$outputPath`" /quiet /norestart" -Wait

# Verify the ADMX files were installed
Get-ChildItem "C:\Program Files\Microsoft AVD Group Policy Templates" -Recurse
```

### Step 2: Configure the Group Policy

Open the Group Policy Editor on your session host (or use a domain-level GPO if your session hosts are domain-joined):

1. Navigate to **Computer Configuration > Administrative Templates > Azure Virtual Desktop > Session**
2. Find the policy named **Enable screen capture protection**
3. Set it to **Enabled**
4. Choose the protection level:
   - **Block screen capture on client** - Blocks screenshots at the client side
   - **Block screen capture on client and server** - Blocks both client-side and server-side screen capture

For most deployments, I recommend the "client and server" option. Here is the equivalent registry configuration if you prefer scripting over the GUI:

```powershell
# Set screen capture protection via registry
# Value 1 = block on client only
# Value 2 = block on client and server
$regPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services"

# Create the registry key if it does not exist
if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force
}

# Enable screen capture protection at the highest level (client and server)
Set-ItemProperty -Path $regPath -Name "fEnableScreenCaptureProtect" -Value 2 -Type DWord

# Restart the session host service to apply changes
Restart-Service -Name "TermService" -Force
```

### Step 3: Verify It Works

After applying the policy and restarting the session host, connect to the AVD session using the Windows Desktop client. Try taking a screenshot using the Snipping Tool or Print Screen. The AVD window should render as solid black in the captured image.

You can also verify the policy is active by checking the registry on the session host:

```powershell
# Confirm the policy is set correctly
Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services" `
    -Name "fEnableScreenCaptureProtect"
```

## Enabling Watermarking

Watermarking overlays semi-transparent text on the session display. By default, it shows the connection ID and a timestamp, but you can configure it to show the user's UPN (email address) or a custom string.

### Step 1: Configure the Watermark Policy

In the same Group Policy path, look for the watermarking settings:

1. Navigate to **Computer Configuration > Administrative Templates > Azure Virtual Desktop > Session**
2. Find **Enable watermarking**
3. Set it to **Enabled**
4. Configure the watermark content and appearance

Here is the registry-based approach for automation:

```powershell
# Configure watermarking on session hosts
$regPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services"

# Enable watermarking
Set-ItemProperty -Path $regPath -Name "fEnableWatermarking" -Value 1 -Type DWord

# Set watermark content to show user UPN
# Options: 0 = Connection ID, 1 = User UPN
Set-ItemProperty -Path $regPath -Name "WatermarkingContent" -Value 1 -Type DWord

# Set watermark opacity (0-100, where 100 is fully opaque)
# A value around 20-30 is visible but does not obstruct work
Set-ItemProperty -Path $regPath -Name "WatermarkingOpacity" -Value 25 -Type DWord

# Set watermark text size in points
Set-ItemProperty -Path $regPath -Name "WatermarkingFontSize" -Value 14 -Type DWord

# Set the number of watermark QR codes per width
Set-ItemProperty -Path $regPath -Name "WatermarkingQrScale" -Value 4 -Type DWord
```

### Step 2: Customize the Watermark Appearance

The watermark supports QR codes in addition to text. The QR code encodes the same information but makes it machine-readable, which is useful for forensic investigation. You can control the density of QR codes across the screen - more codes mean it is harder to crop them out of a photograph.

For a balanced setup that does not annoy users but still provides traceability, I typically configure:

- Opacity at 20-25 percent
- Font size at 12-14 points
- QR code scale at 4 (moderate density)
- Content set to user UPN

## Deploying at Scale with Intune

If your session hosts are Azure AD-joined and managed through Intune, you can deploy these settings as a configuration profile instead of relying on domain-based Group Policy.

Create a custom configuration profile in Intune using OMA-URI settings:

```
OMA-URI: ./Device/Vendor/MSFT/Policy/Config/RemoteDesktopServices/EnableScreenCaptureProtection
Data type: Integer
Value: 2

OMA-URI: ./Device/Vendor/MSFT/Policy/Config/RemoteDesktopServices/EnableWatermarking
Data type: Integer
Value: 1
```

This approach scales much better than per-VM Group Policy and ties into your existing Intune compliance workflows.

## Limitations to Keep in Mind

Screen capture protection is not a silver bullet. Here are the key limitations:

- **Phone cameras**: No software protection can prevent someone from photographing their physical screen with a phone camera. Watermarking mitigates this by making it traceable, but it does not prevent it.
- **Client support**: Only the Windows Desktop client and macOS client support screen capture protection. If users connect via the web client, the protection does not apply.
- **Performance impact**: Watermarking adds a rendering overlay on the session host. In my testing, the performance impact is negligible for typical office workloads but could be noticeable in graphics-intensive scenarios.
- **Clipboard**: Screen capture protection does not block clipboard operations. If you need to restrict clipboard as well, configure the clipboard redirection policy separately.

## Monitoring and Compliance

After deployment, you want to confirm that all session hosts have the policies applied and that users are connecting with supported clients. Use Azure Monitor and Log Analytics to track this:

```kusto
// Query to find sessions where screen capture protection is active
WVDConnections
| where TimeGenerated > ago(7d)
| where ScreenCaptureProtected == true
| summarize ProtectedSessions = count() by UserName, SessionHostName
| order by ProtectedSessions desc
```

You can also create an Azure Monitor alert that fires when a session connects without screen capture protection, which could indicate a user connecting from an unsupported client.

## Combining Both Features

I recommend enabling both screen capture protection and watermarking together. Screen capture protection handles the software-based capture threat, while watermarking addresses the physical camera threat and provides an audit trail. Together, they form a reasonable defense-in-depth strategy for protecting visual data in AVD sessions.

For organizations in healthcare, finance, or government, these features are often a compliance requirement. Deploying them early in your AVD rollout saves you from retrofitting security controls later.

## Summary

Enabling screen capture protection and watermarking in Azure Virtual Desktop involves configuring Group Policy or Intune settings on your session hosts. The process is straightforward, but you need to account for client compatibility and communicate the changes to your users. With both features active, you significantly reduce the risk of unauthorized data capture from remote desktop sessions.

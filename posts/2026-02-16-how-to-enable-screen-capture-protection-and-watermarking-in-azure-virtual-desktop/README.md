# How to Enable Screen Capture Protection and Watermarking

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

- An Azure Virtual Desktop environment with session hosts running Windows 10 22H2 or later, or Windows 11 22H2 or later. Use Windows 11 22H2 or later if you want to block screen capture on both the client and the session host
- Windows App or a supported Remote Desktop client. For the Remote Desktop client, use Windows Desktop client version 1.2.1672 or later, or macOS client version 10.7.0 or later
- Group Policy or Intune access to configure session host policies
- A Microsoft Entra ID account with permissions to manage AVD host pools

One important note: screen capture protection on session hosts is enforced by Windows App or the Remote Desktop client. Web browser connections are not supported when this setting is enabled. Mobile support requires Windows App with Intune mobile application management (MAM) policies that block screen capture, so plan your rollout carefully if your users connect from different platforms.

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

1. Navigate to **Computer Configuration > Policies > Administrative Templates > Windows Components > Remote Desktop Services > Remote Desktop Session Host > Azure Virtual Desktop**
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

Watermarking overlays QR codes on the session display. The QR code contains the connection ID by default, or the device ID for supported personal host pool scenarios, which admins can use to trace the session.

### Step 1: Configure the Watermark Policy

In the same Group Policy path, look for the watermarking settings:

1. Navigate to **Computer Configuration > Policies > Administrative Templates > Windows Components > Remote Desktop Services > Remote Desktop Session Host > Azure Virtual Desktop**
2. Find **Enable watermarking**
3. Set it to **Enabled**
4. Configure the QR code content and appearance

Here is the registry-based approach for automation:

```powershell
# Configure watermarking on session hosts
$regPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services"

# Enable watermarking
Set-ItemProperty -Path $regPath -Name "fEnableWatermarking" -Value 1 -Type DWord

# Set QR code content to connection ID
# Options: 0 = Connection ID, 1 = Device ID
Set-ItemProperty -Path $regPath -Name "WatermarkingContent" -Value 0 -Type DWord

# Set QR code opacity (100-9999, where 100 is most transparent and 9999 is fully opaque)
Set-ItemProperty -Path $regPath -Name "WatermarkingOpacity" -Value 2000 -Type DWord

# Set grid spacing relative to the QR code bitmap
Set-ItemProperty -Path $regPath -Name "WatermarkingWidthFactor" -Value 320 -Type DWord
Set-ItemProperty -Path $regPath -Name "WatermarkingHeightFactor" -Value 180 -Type DWord

# Set the QR code bitmap scale factor
Set-ItemProperty -Path $regPath -Name "WatermarkingQrScale" -Value 4 -Type DWord
```

### Step 2: Customize the Watermark Appearance

The QR code makes the session identifier machine-readable, which is useful for forensic investigation. You can control the spacing of QR codes across the screen - more codes mean it is harder to crop them out of a photograph.

For a balanced setup that does not annoy users but still provides traceability, I typically configure:

- Opacity near the default value of 2000, adjusted after testing readability and scan reliability
- QR code scale at 4 (moderate density)
- Content set to connection ID, unless you have a supported personal host pool scenario where device ID is appropriate

## Deploying at Scale with Intune

If your session hosts are Microsoft Entra joined and managed through Intune, you can deploy these settings as a configuration profile instead of relying on domain-based Group Policy.

Create or edit a configuration profile for Windows 10 and later devices using the Settings catalog profile type. In the settings picker, browse to **Administrative templates > Windows Components > Remote Desktop Services > Remote Desktop Session Host > Azure Virtual Desktop**, then enable **Enable screen capture protection** and **Enable watermarking**. For screen capture protection, set **Screen Capture Protection Options (Device)** according to whether you want to block client capture only or both client and server capture.

This approach scales much better than per-VM Group Policy and ties into your existing Intune compliance workflows.

## Limitations to Keep in Mind

Screen capture protection is not a silver bullet. Here are the key limitations:

- **Phone cameras**: No software protection can prevent someone from photographing their physical screen with a phone camera. Watermarking mitigates this by making it traceable, but it does not prevent it.
- **Client support**: Windows App and supported Remote Desktop clients enforce screen capture protection. If screen capture protection is enabled on the session host, unsupported clients such as the web client are blocked from connecting.
- **Performance impact**: Watermarking adds a rendering overlay on the session host. In my testing, the performance impact is negligible for typical office workloads but could be noticeable in graphics-intensive scenarios.
- **Clipboard**: Screen capture protection does not block clipboard operations. If you need to restrict clipboard as well, configure the clipboard redirection policy separately.

## Monitoring and Compliance

After deployment, you want to confirm that all session hosts have the policies applied and that users are connecting with supported clients. Use Azure Monitor and Log Analytics to track client types and versions:

```kusto
// Query client types and versions used to connect to Azure Virtual Desktop
WVDConnections
| where TimeGenerated > ago(7d)
| summarize UserCount=dcount(UserName) by ClientType, ClientVersion
| sort by ClientVersion, ClientType, UserCount desc
```

For watermarking investigations, scan the QR code and look up the connection ID in Log Analytics:

```kusto
WVDConnections
| where CorrelationId contains "<connection ID>"
```

You can also use this data to identify users connecting with old or unsupported clients before enforcing the policies broadly.

## Combining Both Features

I recommend enabling both screen capture protection and watermarking together. Screen capture protection handles the software-based capture threat, while watermarking addresses the physical camera threat and provides an audit trail. Together, they form a reasonable defense-in-depth strategy for protecting visual data in AVD sessions.

For organizations in healthcare, finance, or government, these features are often a compliance requirement. Deploying them early in your AVD rollout saves you from retrofitting security controls later.

## Summary

Enabling screen capture protection and watermarking in Azure Virtual Desktop involves configuring Group Policy or Intune settings on your session hosts. The process is straightforward, but you need to account for client compatibility and communicate the changes to your users. With both features active, you significantly reduce the risk of unauthorized data capture from remote desktop sessions.

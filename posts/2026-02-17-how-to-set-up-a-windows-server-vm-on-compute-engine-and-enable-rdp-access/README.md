# How to Set Up a Windows Server VM on Compute Engine and Enable RDP Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Windows Server, RDP, Cloud Infrastructure

Description: A complete guide to setting up a Windows Server VM on GCP Compute Engine, enabling RDP access, setting passwords, and configuring common Windows services.

---

While Linux dominates cloud infrastructure, Windows Server is still essential for many enterprise workloads - Active Directory, .NET applications, SQL Server, and more. GCP Compute Engine runs Windows Server well, with licensed images that include the Windows license cost in the per-hour pricing.

In this post, I will walk through creating a Windows Server VM, setting up RDP access, configuring the Windows password, and handling common post-setup tasks.

## Creating a Windows Server VM

GCP provides several Windows Server image families. Here are the most common:

```bash
# List available Windows Server images
gcloud compute images list --project=windows-cloud --filter="family:windows"
```

Common image families:
- `windows-2022` - Windows Server 2022
- `windows-2022-core` - Windows Server 2022 Core (no GUI)
- `windows-2019` - Windows Server 2019
- `windows-2019-core` - Windows Server 2019 Core
- `windows-2016` - Windows Server 2016

Create a Windows Server 2022 VM:

```bash
# Create a Windows Server 2022 VM
gcloud compute instances create windows-server \
    --zone=us-central1-a \
    --machine-type=e2-standard-4 \
    --image-family=windows-2022 \
    --image-project=windows-cloud \
    --boot-disk-size=100GB \
    --boot-disk-type=pd-ssd \
    --tags=rdp-server
```

Windows VMs need more resources than Linux VMs. I recommend at least `e2-standard-2` (2 vCPUs, 8 GB RAM) for a decent experience, and `e2-standard-4` if you are running anything beyond basic tasks.

## Setting the Windows Password

After the VM is created, you need to set the initial Windows password. The VM takes a few minutes to boot for the first time - Windows needs to complete its setup process.

```bash
# Set (or reset) the Windows password for a user
gcloud compute reset-windows-password windows-server \
    --zone=us-central1-a \
    --user=admin
```

This outputs something like:

```
ip_address: 35.192.x.x
password:   aB3dEf6GhIj
username:   admin
```

Save the password somewhere secure. You will need it for RDP.

If you need to create additional Windows users:

```bash
# Reset/create password for another user
gcloud compute reset-windows-password windows-server \
    --zone=us-central1-a \
    --user=developer
```

## Creating a Firewall Rule for RDP

RDP uses TCP port 3389. Create a firewall rule to allow RDP access:

```bash
# Allow RDP access from specific IP addresses (recommended)
gcloud compute firewall-rules create allow-rdp \
    --network=default \
    --action=allow \
    --direction=ingress \
    --source-ranges=YOUR_IP_ADDRESS/32 \
    --target-tags=rdp-server \
    --rules=tcp:3389
```

For better security, restrict the source range to your office IP or VPN range. Opening RDP to `0.0.0.0/0` is strongly discouraged - there are constant brute force attacks against RDP endpoints on the internet.

For the most secure approach, use IAP tunneling instead (no public IP needed):

```bash
# Allow RDP through IAP only
gcloud compute firewall-rules create allow-rdp-from-iap \
    --network=default \
    --action=allow \
    --direction=ingress \
    --source-ranges=35.235.240.0/20 \
    --target-tags=rdp-server \
    --rules=tcp:3389
```

## Connecting via RDP

**Using the Cloud Console:**
1. Go to Compute Engine > VM Instances
2. Click the RDP button next to your Windows VM
3. This opens an in-browser RDP session

**Using IAP tunnel (recommended for VMs without public IPs):**

```bash
# Start an IAP tunnel for RDP
gcloud compute start-iap-tunnel windows-server 3389 \
    --local-host-port=localhost:3389 \
    --zone=us-central1-a
```

Then connect your RDP client to `localhost:3389`.

**Using a native RDP client:**

On macOS, use Microsoft Remote Desktop. On Windows, use the built-in Remote Desktop Connection (mstsc.exe). On Linux, use Remmina or xfreerdp:

```bash
# Connect using xfreerdp on Linux
xfreerdp /v:35.192.x.x /u:admin /p:aB3dEf6GhIj /size:1920x1080
```

## Terraform Configuration

```hcl
# Windows Server VM
resource "google_compute_instance" "windows" {
  name         = "windows-server"
  machine_type = "e2-standard-4"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "windows-cloud/windows-2022"
      size  = 100
      type  = "pd-ssd"
    }
  }

  network_interface {
    network = "default"
    access_config {
      # Gives the VM a public IP for RDP access
    }
  }

  tags = ["rdp-server"]

  # Windows-specific metadata
  metadata = {
    # Enable WinRM for remote management
    windows-startup-script-ps1 = <<-EOF
      # Enable WinRM for remote management
      Enable-PSRemoting -Force
      Set-Item WSMan:\localhost\Service\AllowUnencrypted -Value $true

      # Install IIS (optional)
      # Install-WindowsFeature -Name Web-Server -IncludeManagementTools
    EOF
  }
}

# Firewall rule for RDP via IAP
resource "google_compute_firewall" "rdp_iap" {
  name    = "allow-rdp-from-iap"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["3389"]
  }

  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["rdp-server"]
}
```

## Using PowerShell Startup Scripts

Windows VMs support PowerShell startup scripts through the `windows-startup-script-ps1` metadata key:

```bash
# Create a Windows VM with a PowerShell startup script
gcloud compute instances create windows-server \
    --zone=us-central1-a \
    --machine-type=e2-standard-4 \
    --image-family=windows-2022 \
    --image-project=windows-cloud \
    --boot-disk-size=100GB \
    --metadata=windows-startup-script-ps1='
# Install IIS
Install-WindowsFeature -Name Web-Server -IncludeManagementTools

# Install Chocolatey package manager
Set-ExecutionPolicy Bypass -Scope Process -Force
iex ((New-Object System.Net.WebClient).DownloadString("https://chocolatey.org/install.ps1"))

# Install common tools
choco install -y googlechrome notepadplusplus 7zip git

# Configure Windows Defender exclusions for app folder
Add-MpPreference -ExclusionPath "C:\App"

# Create application directory
New-Item -ItemType Directory -Force -Path C:\App
'
```

## Checking Startup Script Output

To debug Windows startup scripts:

```bash
# Check the serial port output for startup script results
gcloud compute instances get-serial-port-output windows-server \
    --zone=us-central1-a --port=1
```

Inside the VM, check the startup script log at:
```
C:\Program Files\Google\Compute Engine\agent\GCEWindowsAgent.log
```

## Enabling WinRM for Remote Management

WinRM lets you run PowerShell commands on the Windows VM remotely, which is useful for automation:

```bash
# Run a PowerShell command remotely via WinRM
gcloud compute ssh windows-server \
    --zone=us-central1-a \
    --command="Get-Service | Where-Object {$_.Status -eq 'Running'}"
```

Note that `gcloud compute ssh` on Windows VMs uses PowerShell over SSH (not the traditional Linux SSH).

## Installing SQL Server

A common use case for Windows VMs is running SQL Server. GCP offers images with SQL Server pre-installed:

```bash
# Create a VM with SQL Server 2022 Standard pre-installed
gcloud compute instances create sql-server \
    --zone=us-central1-a \
    --machine-type=e2-standard-8 \
    --image-family=sql-std-2022-win-2022 \
    --image-project=windows-sql-cloud \
    --boot-disk-size=200GB \
    --boot-disk-type=pd-ssd \
    --tags=sql-server
```

SQL Server images include the SQL Server license, so you pay a higher hourly rate that covers both Windows and SQL Server licensing.

## Joining Active Directory

If you need to join the Windows VM to an Active Directory domain, you can use the Managed Microsoft AD service or configure it manually:

```bash
# Using a startup script to join a domain
gcloud compute instances add-metadata windows-server \
    --zone=us-central1-a \
    --metadata=windows-startup-script-ps1='
$domain = "corp.example.com"
$password = ConvertTo-SecureString "DomainPassword" -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential("CORP\admin", $password)
Add-Computer -DomainName $domain -Credential $credential -Restart -Force
'
```

## Cost Considerations

Windows VMs are more expensive than Linux VMs due to the included Windows Server license. Here is a rough comparison for an e2-standard-4 in us-central1:

| Configuration | Approximate Hourly Cost |
|--------------|------------------------|
| Linux (e2-standard-4) | $0.134 |
| Windows Server (e2-standard-4) | $0.258 |
| Windows + SQL Server Standard | $0.707 |
| Windows + SQL Server Enterprise | $2.051 |

If you have existing Windows Server licenses with Software Assurance, consider using sole-tenant nodes with BYOL to avoid the Windows license premium.

## Security Best Practices

1. **Never open RDP to the internet** (0.0.0.0/0). Use IAP tunneling or restrict to known IP ranges.
2. **Use strong passwords** and change the auto-generated password after first login.
3. **Enable Windows Update** and configure automatic updates.
4. **Install the Cloud Monitoring agent** for visibility into Windows performance metrics.
5. **Use Network Level Authentication (NLA)** for RDP - it is enabled by default on GCP Windows images.
6. **Consider Windows Server Core** for workloads that do not need a GUI - smaller attack surface and lower resource usage.

## Wrapping Up

Running Windows Server on GCP Compute Engine is straightforward once you know the setup steps. Create the VM with a Windows image, set the password with `gcloud compute reset-windows-password`, open the firewall for RDP (preferably through IAP), and connect. For production workloads, always use IAP tunneling instead of public IP access, automate your configuration with PowerShell startup scripts, and keep the OS patched.

# How to Set Up Managed Microsoft AD Integration with Google Cloud Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Managed Microsoft AD, Active Directory, Identity Integration, Hybrid Cloud

Description: A practical guide to setting up Google Cloud Managed Microsoft AD and integrating it with GCP services for seamless Windows workload authentication and hybrid identity management.

---

If your organization runs Windows workloads, you probably depend on Active Directory for authentication, group policies, and domain services. Moving those workloads to Google Cloud does not mean giving up Active Directory. Google Cloud's Managed Microsoft AD provides a fully managed Active Directory domain running on Google's infrastructure, handling the operational overhead of domain controllers, patching, replication, and backups.

This guide covers setting up Managed Microsoft AD and integrating it with GCP services like Compute Engine, Cloud SQL for SQL Server, and identity federation.

## What Managed Microsoft AD Provides

Managed Microsoft AD deploys actual Windows Server-based domain controllers in your VPC. You get standard AD features like domain join, Group Policy, Kerberos authentication, LDAP, and DNS. Google manages the infrastructure - the domain controllers run in a dedicated project, get patched automatically, replicate across zones for high availability, and are backed up daily.

You get a standard AD forest with one or more domains, but you do not get Domain Admin or Enterprise Admin access. Instead, you get a delegated admin account that can manage users, groups, OUs, and Group Policies within your domain.

## Step 1: Enable the API and Create the Domain

```bash
# Enable the Managed AD API
gcloud services enable managedidentities.googleapis.com

# Create a Managed Microsoft AD domain
gcloud active-directory domains create corp.mycompany.com \
  --reserved-ip-range=10.0.0.0/24 \
  --region=us-central1 \
  --authorized-networks=projects/PROJECT_ID/global/networks/default \
  --admin-name="admin"
```

The domain creation takes about 30-60 minutes. During this time, Google provisions domain controllers, configures DNS, and sets up the domain.

```bash
# Check the status of the domain creation
gcloud active-directory domains describe corp.mycompany.com

# Wait until the state shows READY
gcloud active-directory domains describe corp.mycompany.com \
  --format="value(state)"
```

## Step 2: Configure DNS Forwarding

Your VPC needs to use the Managed AD DNS servers so that domain-joined machines can resolve the domain name.

```bash
# Get the domain controller IPs
gcloud active-directory domains describe corp.mycompany.com \
  --format="value(directoryIp)"

# Create a DNS policy to forward queries to the AD DNS servers
gcloud dns policies create ad-dns-forwarding \
  --description="Forward DNS to Managed AD" \
  --networks=default \
  --alternative-name-servers="10.0.0.2,10.0.0.3" \
  --enable-inbound-forwarding
```

If you are using Cloud DNS with a private zone, create a forwarding zone instead:

```bash
# Create a forwarding zone for the AD domain
gcloud dns managed-zones create ad-forward-zone \
  --description="Forward AD domain queries to Managed AD" \
  --dns-name="corp.mycompany.com." \
  --networks=default \
  --visibility=private \
  --forwarding-targets="10.0.0.2,10.0.0.3"
```

## Step 3: Domain Join Windows VMs

Create Windows VMs and join them to the Managed AD domain.

```bash
# Create a Windows VM
gcloud compute instances create windows-server-01 \
  --zone=us-central1-a \
  --machine-type=n2-standard-4 \
  --image-family=windows-2022 \
  --image-project=windows-cloud \
  --boot-disk-size=100GB \
  --network=default

# Set the Windows password
gcloud compute reset-windows-password windows-server-01 \
  --zone=us-central1-a
```

Then RDP into the VM and join the domain. You can also automate this with a startup script:

```powershell
# startup-script.ps1
# Automated domain join via startup script

# Set the DNS to point to the AD domain controllers
$adDnsServers = "10.0.0.2", "10.0.0.3"
$adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}
Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ServerAddresses $adDnsServers

# Wait for DNS to be available
$maxRetries = 30
$retry = 0
while ($retry -lt $maxRetries) {
    try {
        Resolve-DnsName corp.mycompany.com -ErrorAction Stop
        break
    } catch {
        Start-Sleep -Seconds 10
        $retry++
    }
}

# Join the domain using the delegated admin credentials
# Store credentials securely in Secret Manager, not in the script
$securePassword = ConvertTo-SecureString "RETRIEVED_FROM_SECRET_MANAGER" -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential("admin@corp.mycompany.com", $securePassword)

Add-Computer -DomainName "corp.mycompany.com" -Credential $credential -Restart -Force
```

For a more secure approach, use Secret Manager to store the domain join credentials:

```bash
# Store the domain admin password in Secret Manager
gcloud secrets create ad-admin-password \
  --replication-policy="automatic"

echo -n "YOUR_ADMIN_PASSWORD" | \
  gcloud secrets versions add ad-admin-password --data-file=-
```

## Step 4: Set Up Trust Relationships

If you have an on-premises AD domain, create a trust relationship so users from either domain can authenticate to resources in both.

```bash
# Create a one-way or two-way trust with your on-premises AD
gcloud active-directory domains trusts create corp.mycompany.com \
  --target-domain-name=onprem.mycompany.com \
  --target-dns-ip-addresses=192.168.1.10,192.168.1.11 \
  --trust-type=FOREST \
  --trust-direction=BIDIRECTIONAL \
  --trust-handshake-secret="SHARED_SECRET"
```

For the trust to work, you also need network connectivity between GCP and your on-premises network (via VPN or Cloud Interconnect) and DNS forwarding configured in both directions.

```bash
# Create a VPN tunnel to your on-premises network
gcloud compute vpn-tunnels create onprem-vpn \
  --peer-address=ON_PREM_PUBLIC_IP \
  --shared-secret=VPN_SHARED_SECRET \
  --region=us-central1 \
  --vpn-gateway=gcp-vpn-gateway \
  --ike-version=2
```

## Step 5: Integrate with Cloud SQL for SQL Server

Cloud SQL for SQL Server supports Windows Authentication via Managed AD, allowing users to connect to SQL Server using their AD credentials.

```bash
# Create a Cloud SQL for SQL Server instance with AD integration
gcloud sql instances create sql-server-01 \
  --database-version=SQLSERVER_2019_ENTERPRISE \
  --tier=db-custom-4-16384 \
  --region=us-central1 \
  --active-directory-domain=projects/PROJECT_ID/locations/global/domains/corp.mycompany.com \
  --root-password="SQL_ROOT_PASSWORD"

# Create an AD-authenticated database user
gcloud sql users create "corp.mycompany.com\\dbuser" \
  --instance=sql-server-01 \
  --type=CLOUD_IAM_USER
```

Users can then connect with Windows Authentication:

```powershell
# Connect to Cloud SQL from a domain-joined Windows machine
# Using SQL Server Management Studio or sqlcmd
sqlcmd -S CLOUD_SQL_IP -E -d master

# The -E flag means use Windows Authentication
# No username/password needed - Kerberos handles it
```

## Step 6: Configure Group Policy Objects

You can manage Group Policies through the domain just like on-premises AD.

```powershell
# From a domain-joined management VM, install RSAT tools
Install-WindowsFeature RSAT-AD-Tools, GPMC -IncludeAllSubFeature

# Open Group Policy Management Console
gpmc.msc

# Create and link GPOs as you normally would
# Example: Create a GPO for security baseline
New-GPO -Name "Security Baseline" | New-GPLink -Target "OU=Servers,DC=corp,DC=mycompany,DC=com"

# Set password policy via GPO
Set-ADDefaultDomainPasswordPolicy -ComplexityEnabled $true `
  -MinPasswordLength 14 `
  -MaxPasswordAge "90.00:00:00" `
  -PasswordHistoryCount 24 `
  -LockoutThreshold 5 `
  -LockoutDuration "00:30:00" `
  -Identity "corp.mycompany.com"
```

## Step 7: Monitor the Managed AD Environment

Set up monitoring for the health and security of your Managed AD domain.

```bash
# Check domain health
gcloud active-directory domains describe corp.mycompany.com \
  --format="yaml(state,statusMessage,trusts)"

# Set up alerts for domain health issues
gcloud alpha monitoring policies create \
  --display-name="Managed AD Health Alert" \
  --condition-display-name="Managed AD domain unhealthy" \
  --condition-filter='resource.type="microsoft_ad_domain" AND metric.type="managedidentities.googleapis.com/domain/available"' \
  --condition-threshold-value=1 \
  --condition-threshold-comparison=COMPARISON_LT \
  --notification-channels="projects/PROJECT_ID/notificationChannels/CHANNEL_ID"
```

```python
# Python script to audit AD authentication events
from google.cloud import logging_v2

def audit_ad_logins(project_id, days_back=1):
    """Audit Active Directory login events."""
    client = logging_v2.Client(project=project_id)

    filter_str = (
        'resource.type="microsoft_ad_domain" AND '
        'protoPayload.methodName:"authentication"'
    )

    for entry in client.list_entries(filter_=filter_str):
        print(f"Time: {entry.timestamp}")
        print(f"Event: {entry.payload}")
        print("---")
```

## Step 8: Backup and Recovery

Managed AD includes automatic daily backups, but you can also trigger manual backups before major changes.

```bash
# List available backups
gcloud active-directory domains backups list \
  --domain=corp.mycompany.com

# Create a manual backup
gcloud active-directory domains backups create \
  --domain=corp.mycompany.com \
  --backup-id="pre-migration-backup"

# Restore from a backup if needed
gcloud active-directory domains restore corp.mycompany.com \
  --backup=pre-migration-backup
```

Managed Microsoft AD on Google Cloud gives you a production-ready Active Directory environment without the operational burden of managing domain controllers. Combined with trust relationships to on-premises AD, Cloud SQL Windows Authentication, and Group Policy management, it provides a complete AD experience for your Windows workloads running in GCP.

# How to Join FSx for Windows to Active Directory

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, FSx, Windows, Active Directory, SMB

Description: Learn how to join Amazon FSx for Windows File Server to both AWS Managed Microsoft AD and self-managed Active Directory for authentication and access control.

---

FSx for Windows File Server needs Active Directory to function. It's not optional - the file system joins AD to authenticate users, manage file permissions, and support features like DFS namespaces. You have two options: use AWS Managed Microsoft AD or join a self-managed Active Directory that you're already running (on-premises or on EC2). Each path has its own setup requirements and tradeoffs.

Let's walk through both approaches in detail.

## Understanding the AD Requirement

When FSx for Windows joins Active Directory, it:

1. Creates a computer object in AD for the file system
2. Registers DNS records so clients can find it by name
3. Uses Kerberos authentication for SMB connections
4. Evaluates NTFS permissions based on AD users and groups
5. Supports Group Policy for consistent management

Without AD, you can't create or access file shares. This is fundamental to how Windows file sharing works.

## Option 1: AWS Managed Microsoft AD

AWS Managed Microsoft AD is the simpler option. AWS runs the domain controllers, handles patching, manages replication, and provides high availability across two AZs. You just use it.

### Creating AWS Managed AD

```bash
# Create an AWS Managed Microsoft AD
DIR_ID=$(aws ds create-microsoft-ad \
  --name "corp.example.com" \
  --short-name "CORP" \
  --password "YourAdminP@ssword1" \
  --vpc-settings '{
    "VpcId": "vpc-0abc123",
    "SubnetIds": ["subnet-0aaa111", "subnet-0bbb222"]
  }' \
  --edition "Standard" \
  --query "DirectoryId" \
  --output text)

echo "Directory ID: $DIR_ID"
```

Wait for the directory to become active (this can take 20-30 minutes):

```bash
# Poll until the directory is active
aws ds describe-directories \
  --directory-ids "$DIR_ID" \
  --query "DirectoryDescriptions[0].{Status:Stage,DNS:DnsIpAddrs}" \
  --output table
```

### Joining FSx to Managed AD

Creating the FSx file system with Managed AD is straightforward - just pass the directory ID:

```bash
# Create FSx for Windows joined to Managed AD
aws fsx create-file-system \
  --file-system-type WINDOWS \
  --storage-capacity 300 \
  --storage-type SSD \
  --subnet-ids "subnet-0aaa111" "subnet-0bbb222" \
  --security-group-ids "sg-0fsx123" \
  --windows-configuration '{
    "ActiveDirectoryId": "'$DIR_ID'",
    "ThroughputCapacity": 32,
    "DeploymentType": "MULTI_AZ_1",
    "PreferredSubnetId": "subnet-0aaa111",
    "AutomaticBackupRetentionDays": 7
  }' \
  --tags '[{"Key": "Name", "Value": "corp-fileserver"}]'
```

That's it. FSx handles the domain join, DNS registration, and computer account creation automatically.

### Configuring VPC for Managed AD

Your VPC needs DNS resolution enabled and the DHCP options set must point to the AD DNS servers:

```bash
# Get the AD DNS IPs
DNS_IPS=$(aws ds describe-directories \
  --directory-ids "$DIR_ID" \
  --query "DirectoryDescriptions[0].DnsIpAddrs" \
  --output text)

echo "AD DNS IPs: $DNS_IPS"

# Create a DHCP options set with AD DNS
DHCP_ID=$(aws ec2 create-dhcp-options \
  --dhcp-configurations \
    "Key=domain-name-servers,Values=$DNS_IPS" \
    "Key=domain-name,Values=corp.example.com" \
  --query "DhcpOptions.DhcpOptionsId" \
  --output text)

# Associate with VPC
aws ec2 associate-dhcp-options \
  --dhcp-options-id "$DHCP_ID" \
  --vpc-id "vpc-0abc123"
```

## Option 2: Self-Managed Active Directory

If you already have an Active Directory - whether on-premises or running on EC2 - you can join FSx directly to it. This is the right choice when:

- You have existing users and groups you want to keep using
- Your AD is on-premises and connected via VPN or Direct Connect
- You need fine-grained control over the AD configuration
- You're running AD on EC2 and don't want to pay for Managed AD

### Prerequisites for Self-Managed AD

Before FSx can join your AD, you need:

1. **Network connectivity** between the VPC and your AD domain controllers (DNS resolution, Kerberos, LDAP, SMB ports)
2. **A service account** in AD that FSx will use to join the domain
3. **An organizational unit (OU)** where FSx will create its computer object
4. **DNS resolution** from the VPC to your AD DNS servers

### Creating the Service Account

On your domain controller, create a service account with specific permissions. You can use PowerShell:

```powershell
# On the AD domain controller
# Create an OU for FSx computer objects
New-ADOrganizationalUnit -Name "FSx" -Path "DC=corp,DC=example,DC=com"

# Create a service account for FSx
New-ADUser -Name "fsx-service" `
  -UserPrincipalName "fsx-service@corp.example.com" `
  -SamAccountName "fsx-service" `
  -AccountPassword (ConvertTo-SecureString "ServiceP@ss123!" -AsPlainText -Force) `
  -Enabled $true `
  -PasswordNeverExpires $true `
  -CannotChangePassword $true `
  -Path "OU=ServiceAccounts,DC=corp,DC=example,DC=com"

# Delegate permissions to join computers to the FSx OU
$ou = "OU=FSx,DC=corp,DC=example,DC=com"
$user = "CORP\fsx-service"

# Grant permissions to create and delete computer objects
dsacls $ou /G "${user}:CC;computer"
dsacls $ou /G "${user}:DC;computer"
dsacls $ou /G "${user}:LC"

# Grant permissions to set specific properties on computer objects
$props = @(
    "servicePrincipalName",
    "dNSHostName",
    "msDS-SupportedEncryptionTypes",
    "description",
    "userAccountControl"
)
foreach ($prop in $props) {
    dsacls $ou /G "${user}:WP;${prop};computer"
    dsacls $ou /G "${user}:RP;${prop};computer"
}
```

### Setting Up DNS Forwarding

If your AD DNS is on-premises, set up Route 53 conditional forwarding:

```bash
# Create a Route 53 Resolver outbound endpoint
ENDPOINT_ID=$(aws route53resolver create-resolver-endpoint \
  --creator-request-id "fsx-dns-forward" \
  --name "ad-dns-forwarder" \
  --security-group-ids "sg-0resolver123" \
  --direction "OUTBOUND" \
  --ip-addresses \
    "SubnetId=subnet-0aaa111" \
    "SubnetId=subnet-0bbb222" \
  --query "ResolverEndpoint.Id" \
  --output text)

# Create forwarding rule for your AD domain
aws route53resolver create-resolver-rule \
  --creator-request-id "ad-forward-rule" \
  --name "forward-to-ad" \
  --rule-type "FORWARD" \
  --domain-name "corp.example.com" \
  --resolver-endpoint-id "$ENDPOINT_ID" \
  --target-ips "Ip=10.1.1.10" "Ip=10.1.2.10"

# Associate the rule with your VPC
aws route53resolver associate-resolver-rule \
  --resolver-rule-id "rslvr-rr-abc123" \
  --vpc-id "vpc-0abc123"
```

### Joining FSx to Self-Managed AD

```bash
# Create FSx joined to self-managed AD
aws fsx create-file-system \
  --file-system-type WINDOWS \
  --storage-capacity 500 \
  --storage-type SSD \
  --subnet-ids "subnet-0aaa111" "subnet-0bbb222" \
  --security-group-ids "sg-0fsx123" \
  --windows-configuration '{
    "SelfManagedActiveDirectoryConfiguration": {
      "DomainName": "corp.example.com",
      "UserName": "fsx-service",
      "Password": "ServiceP@ss123!",
      "DnsIps": ["10.1.1.10", "10.1.2.10"],
      "OrganizationalUnitDistinguishedName": "OU=FSx,DC=corp,DC=example,DC=com",
      "FileSystemAdministratorsGroup": "FSxAdmins"
    },
    "ThroughputCapacity": 64,
    "DeploymentType": "MULTI_AZ_1",
    "PreferredSubnetId": "subnet-0aaa111",
    "AutomaticBackupRetentionDays": 30
  }' \
  --tags '[{"Key": "Name", "Value": "corp-fileserver-prod"}]'
```

Key parameters for self-managed AD:

- **UserName/Password**: The service account credentials
- **DnsIps**: IP addresses of your AD DNS servers
- **OrganizationalUnitDistinguishedName**: Where to create the computer object
- **FileSystemAdministratorsGroup**: AD group whose members can administer the file system (defaults to "Domain Admins")

## Required Ports Between FSx and AD

Your security groups must allow these ports between FSx and the AD domain controllers:

| Port | Protocol | Purpose |
|------|----------|---------|
| 53 | TCP/UDP | DNS |
| 88 | TCP/UDP | Kerberos authentication |
| 135 | TCP | DCE/RPC |
| 389 | TCP/UDP | LDAP |
| 445 | TCP | SMB |
| 464 | TCP/UDP | Kerberos password change |
| 636 | TCP | LDAPS |
| 3268 | TCP | Global Catalog LDAP |
| 3269 | TCP | Global Catalog LDAPS |
| 9389 | TCP | AD Web Services |
| 49152-65535 | TCP | Dynamic RPC ports |

Here's the security group setup:

```bash
# Ports from FSx to AD domain controllers
for PORT in 53 88 135 389 445 464 636 3268 3269 9389; do
  aws ec2 authorize-security-group-ingress \
    --group-id "sg-0ad-controllers" \
    --protocol tcp --port $PORT \
    --source-group "sg-0fsx123"
done

# UDP ports
for PORT in 53 88 389 464; do
  aws ec2 authorize-security-group-ingress \
    --group-id "sg-0ad-controllers" \
    --protocol udp --port $PORT \
    --source-group "sg-0fsx123"
done

# Dynamic RPC range
aws ec2 authorize-security-group-ingress \
  --group-id "sg-0ad-controllers" \
  --protocol tcp --port 49152-65535 \
  --source-group "sg-0fsx123"
```

## Terraform Configuration

### With Managed AD

```hcl
resource "aws_directory_service_directory" "corp" {
  name     = "corp.example.com"
  password = var.ad_admin_password
  edition  = "Standard"
  type     = "MicrosoftAD"

  vpc_settings {
    vpc_id     = var.vpc_id
    subnet_ids = var.ad_subnet_ids
  }
}

resource "aws_fsx_windows_file_system" "managed_ad" {
  storage_capacity    = 300
  subnet_ids          = var.fsx_subnet_ids
  throughput_capacity = 32
  deployment_type     = "MULTI_AZ_1"
  preferred_subnet_id = var.fsx_subnet_ids[0]
  security_group_ids  = [aws_security_group.fsx.id]

  active_directory_id = aws_directory_service_directory.corp.id

  automatic_backup_retention_days = 7

  tags = {
    Name = "corp-fileserver"
  }
}
```

### With Self-Managed AD

```hcl
resource "aws_fsx_windows_file_system" "self_managed" {
  storage_capacity    = 500
  subnet_ids          = var.fsx_subnet_ids
  throughput_capacity = 64
  deployment_type     = "MULTI_AZ_1"
  preferred_subnet_id = var.fsx_subnet_ids[0]
  security_group_ids  = [aws_security_group.fsx.id]

  self_managed_active_directory {
    domain_name = "corp.example.com"
    username    = var.fsx_service_username
    password    = var.fsx_service_password
    dns_ips     = var.ad_dns_ips

    organizational_unit_distinguished_name = "OU=FSx,DC=corp,DC=example,DC=com"
    file_system_administrators_group       = "FSxAdmins"
  }

  automatic_backup_retention_days = 30

  tags = {
    Name = "corp-fileserver-prod"
  }
}
```

## Setting Up File Share Permissions

After the file system is created and joined to AD, configure share-level and NTFS permissions.

Connect to the file system's remote admin endpoint from a domain-joined instance:

```powershell
# Create a file share with AD-based permissions
$FSxDns = "amznfsxabc123.corp.example.com"

Invoke-Command -ComputerName $FSxDns -ConfigurationName FSxRemoteAdmin -ScriptBlock {
    # Create the share
    New-FSxSmbShare -Name "Engineering" -Path "D:\Engineering" `
        -FolderEnumerationMode AccessBased `
        -Description "Engineering team files"

    # Grant full access to the Engineering group
    Grant-FSxSmbShareAccess -Name "Engineering" `
        -AccountName "CORP\Engineering" -AccessRight Full

    # Grant read access to the whole domain
    Grant-FSxSmbShareAccess -Name "Engineering" `
        -AccountName "CORP\Domain Users" -AccessRight Read

    # Remove the default Everyone access
    Revoke-FSxSmbShareAccess -Name "Engineering" `
        -AccountName "Everyone"
}
```

Set NTFS permissions on the underlying folders:

```powershell
# Map the share temporarily to set NTFS permissions
net use T: \\amznfsxabc123.corp.example.com\Engineering

# Use icacls to set NTFS permissions
icacls "T:\" /grant "CORP\Engineering:(OI)(CI)F"
icacls "T:\" /grant "CORP\Domain Users:(OI)(CI)R"
icacls "T:\" /remove "Everyone"

# Disconnect
net use T: /delete
```

## Troubleshooting Domain Join Issues

The domain join is the most common point of failure. Here's how to diagnose issues:

**File system stuck in "Creating" state**: Usually a DNS or network connectivity issue. Verify that:

```bash
# Check if the file system shows an error
aws fsx describe-file-systems \
  --file-system-ids "fs-0abc123" \
  --query "FileSystems[0].{Status:Lifecycle,Error:FailureDetails}" \
  --output json
```

**DNS resolution check** from an instance in the same VPC:

```bash
# Test DNS resolution of the AD domain
nslookup corp.example.com
nslookup _ldap._tcp.corp.example.com

# Test connectivity to AD ports
nc -zv 10.1.1.10 389
nc -zv 10.1.1.10 88
nc -zv 10.1.1.10 445
```

**Service account permissions**: Make sure the account has delegated permissions on the OU. A common mistake is granting permissions at the domain level instead of the specific OU.

**Computer object already exists**: If a previous attempt created a computer object with the same name, the join might fail. Delete the stale computer object from AD.

## Updating AD Credentials

If you need to change the service account password:

```bash
# Update the AD configuration (self-managed only)
aws fsx update-file-system \
  --file-system-id "fs-0abc123" \
  --windows-configuration '{
    "SelfManagedActiveDirectoryConfiguration": {
      "UserName": "fsx-service",
      "Password": "NewServiceP@ss456!"
    }
  }'
```

## Best Practices

1. **Use a dedicated service account** for FSx - don't use a Domain Admin account.
2. **Grant minimum required permissions** on the OU, not the whole domain.
3. **Use a dedicated OU** for FSx computer objects so you can manage permissions cleanly.
4. **Test DNS resolution** from the VPC before creating the file system.
5. **Enable audit logging** to track who's accessing what.
6. **Rotate the service account password** periodically and update it in FSx.
7. **Document your security group rules** - the port requirements are extensive and easy to get wrong.

For the complete FSx for Windows setup including storage configuration and features, see our guide on [setting up FSx for Windows File Server](https://oneuptime.com/blog/post/amazon-fsx-windows-file-server/view).

## Wrapping Up

Joining FSx for Windows to Active Directory is the foundational step that makes everything else work - file shares, permissions, DFS, shadow copies - it all depends on AD. AWS Managed AD is simpler to set up but costs extra. Self-managed AD integration is more complex but uses what you already have. Either way, get the DNS right, get the ports open, and give the service account the right permissions. Once the domain join succeeds, you've got a fully functional Windows file server in the cloud.

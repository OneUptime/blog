# How to Set Up DNSSEC with Azure DNS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: DNSSEC, Azure, Azure DNS, DNS, Security, Cloud

Description: A comprehensive guide to implementing DNSSEC on Azure DNS to protect your domains from DNS spoofing and cache poisoning attacks, covering both Azure Portal and CLI methods.

---

Domain Name System Security Extensions (DNSSEC) adds a layer of cryptographic authentication to DNS responses, ensuring that the answers your users receive actually came from your authoritative nameservers. Without DNSSEC, attackers can intercept DNS queries and redirect traffic to malicious servers - a technique known as DNS spoofing or cache poisoning.

Azure DNS now supports DNSSEC signing for public zones, bringing enterprise-grade domain security to the cloud. This guide walks through the complete setup process using both the Azure Portal and Azure CLI, explains the underlying concepts, and provides a troubleshooting reference for common issues.

---

## Why DNSSEC Matters

DNS was designed in the 1980s when the internet was a trusted academic network. It has no built-in mechanism to verify that a DNS response is legitimate. This architectural gap enables several attack vectors:

- **Cache poisoning:** An attacker injects forged DNS records into a resolver's cache, redirecting users to malicious servers without their knowledge.
- **Man-in-the-middle attacks:** Traffic intended for your domain gets routed through attacker-controlled infrastructure where credentials, session tokens, and sensitive data can be harvested.
- **Domain hijacking:** Without cryptographic proof of ownership, attackers can impersonate your domain and intercept email, API calls, or user logins.
- **BGP hijacking amplification:** Attackers who control routing can combine BGP hijacks with DNS spoofing to create persistent, hard-to-detect compromises.

DNSSEC solves these problems by adding digital signatures to DNS records. Resolvers that support DNSSEC can verify the signature chain back to the DNS root, ensuring that every response is authentic and unmodified.

---

## How DNSSEC Works

DNSSEC introduces several new record types and a hierarchical trust model:

### Key Concepts

**Zone Signing Key (ZSK):** A cryptographic key pair used to sign individual DNS records within a zone. The ZSK changes relatively frequently (every few months) to limit exposure if compromised.

**Key Signing Key (KSK):** A stronger key pair that signs the DNSKEY records containing the ZSK. The KSK is the trust anchor that links your zone to the parent zone. It rotates less frequently than the ZSK.

**DS Record (Delegation Signer):** A hash of the KSK that gets published in the parent zone. This record establishes the chain of trust from the parent (like .com) down to your domain.

**RRSIG Record (Resource Record Signature):** The actual digital signature attached to each record set. Resolvers use this to verify authenticity.

**NSEC/NSEC3 Records:** These prove that a queried name does not exist, preventing attackers from forging negative responses.

### The Chain of Trust

1. The DNS root zone is signed with keys managed by ICANN
2. Top-level domains (.com, .org, .net) have DS records in the root zone pointing to their keys
3. Your domain has a DS record in the TLD zone pointing to your KSK
4. Your zone's DNSKEY records contain both KSK and ZSK
5. All your DNS records (A, AAAA, MX, CNAME, etc.) are signed with the ZSK

When a DNSSEC-validating resolver queries your domain, it walks this chain from the root down, verifying each signature along the way.

---

## Prerequisites

Before enabling DNSSEC on Azure DNS, ensure you have:

- An active Azure subscription with appropriate permissions
- A public DNS zone already created in Azure DNS
- Access to your domain registrar to add DS records
- Azure CLI installed (version 2.50.0 or later) if using the CLI method
- The domain must use Azure DNS nameservers (ns1-XX.azure-dns.com, etc.)

### Required Permissions

You need one of these Azure RBAC roles:

- Owner
- Contributor
- DNS Zone Contributor

Or a custom role with the following permissions:

```
Microsoft.Network/dnszones/read
Microsoft.Network/dnszones/write
Microsoft.Network/dnszones/dnssecConfigs/read
Microsoft.Network/dnszones/dnssecConfigs/write
```

---

## Method 1: Enable DNSSEC via Azure Portal

The Azure Portal provides a straightforward graphical interface for DNSSEC configuration.

### Step 1: Navigate to Your DNS Zone

1. Sign in to the [Azure Portal](https://portal.azure.com)
2. In the search bar, type "DNS zones" and select it from the results
3. Click on the DNS zone you want to secure
4. Verify that the zone is using Azure DNS nameservers by checking the NS records

### Step 2: Access DNSSEC Settings

1. In the DNS zone blade, look for "DNSSEC" in the left navigation menu under "Settings"
2. Click on "DNSSEC" to open the configuration panel
3. You will see the current DNSSEC status (Disabled by default)

### Step 3: Enable DNSSEC Signing

1. Click the "Enable" button or toggle the DNSSEC switch to "On"
2. Azure will begin the signing process, which may take a few minutes
3. Wait for the status to change to "Enabled"

### Step 4: Retrieve the DS Records

Once DNSSEC is enabled, Azure generates the necessary cryptographic keys and DS records:

1. In the DNSSEC panel, locate the "DS records" section
2. You will see one or more DS records with the following information:
   - Key Tag: A numeric identifier for the key
   - Algorithm: The cryptographic algorithm (typically 13 for ECDSAP256SHA256)
   - Digest Type: The hash algorithm (typically 2 for SHA-256)
   - Digest: The actual hash value

3. Copy all displayed DS records - you will need them for your registrar

### Step 5: Add DS Records at Your Registrar

This step varies by registrar. Here are general instructions:

1. Log in to your domain registrar's control panel
2. Navigate to the DNS or DNSSEC settings for your domain
3. Look for an option to add DS records
4. Enter each DS record from Azure:
   - Key Tag
   - Algorithm
   - Digest Type
   - Digest

5. Save the changes

**Common Registrar Interfaces:**

For **GoDaddy:**
- Go to Domain Settings > DNS > DNSSEC
- Click "Add" and enter the DS record details

For **Namecheap:**
- Go to Domain List > Manage > Advanced DNS
- Scroll to DNSSEC section and click "Add new DS record"

For **Cloudflare Registrar:**
- Go to Domain Registration > Manage
- Scroll to DNSSEC and enter the DS record

For **Google Domains:**
- Go to DNS > DNSSEC
- Click "Add DS record" and fill in the details

### Step 6: Verify DNSSEC Configuration

After adding DS records at your registrar, verify the setup:

1. Wait 24-48 hours for DNS propagation
2. Return to the Azure Portal DNSSEC panel
3. Check the "Validation status" - it should show "Validated"
4. Use external tools to confirm (covered in the verification section below)

---

## Method 2: Enable DNSSEC via Azure CLI

The Azure CLI offers scriptable, repeatable DNSSEC management suitable for automation and infrastructure-as-code workflows.

### Step 1: Install and Configure Azure CLI

If you haven't already, install the Azure CLI:

```bash
# macOS
brew update && brew install azure-cli

# Windows (PowerShell)
winget install -e --id Microsoft.AzureCLI

# Linux (Ubuntu/Debian)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Linux (RHEL/CentOS/Fedora)
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
sudo dnf install azure-cli
```

Authenticate with Azure:

```bash
az login
```

Verify your subscription:

```bash
az account show
```

If needed, set the correct subscription:

```bash
az account set --subscription "Your Subscription Name"
```

### Step 2: Verify Your DNS Zone

List your DNS zones to confirm the zone exists:

```bash
az network dns zone list --output table
```

Get details about your specific zone:

```bash
az network dns zone show \
  --name example.com \
  --resource-group myResourceGroup
```

Verify the zone is using Azure DNS nameservers:

```bash
az network dns record-set ns show \
  --zone-name example.com \
  --resource-group myResourceGroup \
  --name "@"
```

### Step 3: Enable DNSSEC

Enable DNSSEC signing on your zone:

```bash
az network dns dnssec-config create \
  --resource-group myResourceGroup \
  --zone-name example.com
```

This command initiates the signing process. Azure will:
- Generate the Zone Signing Key (ZSK)
- Generate the Key Signing Key (KSK)
- Sign all existing records
- Create DNSKEY, RRSIG, and NSEC3 records

### Step 4: Check DNSSEC Status

Monitor the signing progress:

```bash
az network dns dnssec-config show \
  --resource-group myResourceGroup \
  --zone-name example.com
```

The output includes:

```json
{
  "id": "/subscriptions/.../dnszones/example.com/dnssecConfigs/default",
  "name": "default",
  "provisioningState": "Succeeded",
  "signingKeys": [
    {
      "delegationSignerInfo": [
        {
          "digestAlgorithmType": "Sha256",
          "digestValue": "AB12CD34...",
          "record": "12345 13 2 AB12CD34..."
        }
      ],
      "flags": 257,
      "keyTag": 12345,
      "protocol": 3,
      "publicKey": "...",
      "securityAlgorithmType": "ECDSAP256SHA256"
    }
  ]
}
```

### Step 5: Extract DS Records

Parse the DS record information from the output:

```bash
az network dns dnssec-config show \
  --resource-group myResourceGroup \
  --zone-name example.com \
  --query "signingKeys[].delegationSignerInfo[].record" \
  --output tsv
```

This outputs the DS records in the format required by most registrars:

```
12345 13 2 AB12CD34EF56789012345678901234567890ABCDEF12345678901234
```

For a more detailed breakdown:

```bash
az network dns dnssec-config show \
  --resource-group myResourceGroup \
  --zone-name example.com \
  --query "signingKeys[].delegationSignerInfo[]" \
  --output table
```

### Step 6: Add DS Records via Registrar API (Optional)

Some registrars provide APIs for DS record management. Here's an example using a hypothetical registrar API:

```bash
# Example - adjust for your specific registrar
curl -X POST "https://api.registrar.com/v1/domains/example.com/dnssec" \
  -H "Authorization: Bearer $REGISTRAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dsRecords": [
      {
        "keyTag": 12345,
        "algorithm": 13,
        "digestType": 2,
        "digest": "AB12CD34EF56789012345678901234567890ABCDEF12345678901234"
      }
    ]
  }'
```

### Step 7: Automate with Scripts

Here's a complete Bash script for enabling DNSSEC:

```bash
#!/bin/bash

# Variables
RESOURCE_GROUP="myResourceGroup"
ZONE_NAME="example.com"

# Enable DNSSEC
echo "Enabling DNSSEC for $ZONE_NAME..."
az network dns dnssec-config create \
  --resource-group "$RESOURCE_GROUP" \
  --zone-name "$ZONE_NAME"

# Wait for provisioning
echo "Waiting for DNSSEC provisioning..."
while true; do
  STATE=$(az network dns dnssec-config show \
    --resource-group "$RESOURCE_GROUP" \
    --zone-name "$ZONE_NAME" \
    --query "provisioningState" \
    --output tsv)

  if [ "$STATE" == "Succeeded" ]; then
    echo "DNSSEC enabled successfully!"
    break
  elif [ "$STATE" == "Failed" ]; then
    echo "DNSSEC enablement failed!"
    exit 1
  fi

  echo "Current state: $STATE. Waiting..."
  sleep 10
done

# Display DS records
echo ""
echo "DS Records to add at your registrar:"
echo "======================================"
az network dns dnssec-config show \
  --resource-group "$RESOURCE_GROUP" \
  --zone-name "$ZONE_NAME" \
  --query "signingKeys[].delegationSignerInfo[].record" \
  --output tsv
```

---

## Method 3: Enable DNSSEC via Azure PowerShell

For Windows administrators or those preferring PowerShell:

### Step 1: Install Azure PowerShell Module

```powershell
# Install the Az module if not present
Install-Module -Name Az -Repository PSGallery -Force

# Import the module
Import-Module Az

# Connect to Azure
Connect-AzAccount
```

### Step 2: Enable DNSSEC

```powershell
# Set variables
$resourceGroup = "myResourceGroup"
$zoneName = "example.com"

# Enable DNSSEC
$dnssec = New-AzDnsSecConfig -ResourceGroupName $resourceGroup -ZoneName $zoneName

# Display status
$dnssec | Format-List
```

### Step 3: Get DS Records

```powershell
# Retrieve DNSSEC configuration
$config = Get-AzDnsSecConfig -ResourceGroupName $resourceGroup -ZoneName $zoneName

# Display DS records
foreach ($key in $config.SigningKeys) {
    foreach ($ds in $key.DelegationSignerInfo) {
        Write-Host "DS Record: $($ds.Record)"
    }
}
```

---

## Method 4: Enable DNSSEC via Terraform

For infrastructure-as-code deployments, here's a Terraform configuration:

```hcl
# providers.tf
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}

# variables.tf
variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "myResourceGroup"
}

variable "zone_name" {
  description = "DNS zone name"
  type        = string
  default     = "example.com"
}

# main.tf
resource "azurerm_resource_group" "dns" {
  name     = var.resource_group_name
  location = "East US"
}

resource "azurerm_dns_zone" "main" {
  name                = var.zone_name
  resource_group_name = azurerm_resource_group.dns.name
}

resource "azurerm_dns_zone_dnssec_config" "main" {
  dns_zone_id = azurerm_dns_zone.main.id
}

# outputs.tf
output "ds_records" {
  description = "DS records to add at registrar"
  value       = azurerm_dns_zone_dnssec_config.main.signing_keys[*].delegation_signer_info[*].record
}

output "dnssec_status" {
  description = "DNSSEC provisioning status"
  value       = azurerm_dns_zone_dnssec_config.main.provisioning_state
}
```

Apply the configuration:

```bash
terraform init
terraform plan
terraform apply
```

---

## Verifying DNSSEC Configuration

After enabling DNSSEC and adding DS records, verify the configuration works correctly.

### Using dig Command

Check DNSKEY records:

```bash
dig example.com DNSKEY +dnssec +short
```

Expected output shows the public keys:

```
257 3 13 mdsswUyr3DPW132mOi8V9xESWE8jTo0d...
256 3 13 oJMRESz5E4gYzS/q6XDrvU1qMPYIjCWz...
```

Check RRSIG records on your A record:

```bash
dig example.com A +dnssec
```

Look for RRSIG records in the response:

```
;; ANSWER SECTION:
example.com.    300    IN    A    203.0.113.50
example.com.    300    IN    RRSIG    A 13 2 300 20260215000000 20260115000000 12345 example.com. ...
```

Verify the DS record is published:

```bash
dig example.com DS +short
```

### Using Online Tools

Several websites provide comprehensive DNSSEC validation:

**DNSViz (https://dnsviz.net):**
- Enter your domain name
- View a graphical representation of the chain of trust
- Identify any broken links or configuration errors

**Verisign DNSSEC Debugger (https://dnssec-debugger.verisignlabs.com):**
- Comprehensive step-by-step validation
- Clear error messages for troubleshooting

**DNSSEC Analyzer (https://dnssec-analyzer.verisignlabs.com):**
- Detailed technical analysis
- Algorithm and key strength verification

### Using delv Command

The `delv` command (part of BIND) provides detailed DNSSEC validation:

```bash
delv example.com A +rtrace
```

A successful validation shows:

```
; fully validated
example.com.    300    IN    A    203.0.113.50
```

An unsigned or invalid response shows:

```
; unsigned answer
example.com.    300    IN    A    203.0.113.50
```

---

## Managing DNSSEC Keys

Azure DNS handles key management automatically, but understanding the process helps with troubleshooting.

### Key Rollover

Azure automatically rotates the Zone Signing Key (ZSK) periodically. This process is transparent and requires no action from you.

Key Signing Key (KSK) rollover is more complex because it requires updating DS records at the registrar. Azure uses a pre-publish method:

1. A new KSK is generated and published alongside the old one
2. New DS records are created
3. You add the new DS record at your registrar
4. After propagation, the old KSK and DS record can be removed

### Viewing Current Keys

```bash
az network dns dnssec-config show \
  --resource-group myResourceGroup \
  --zone-name example.com \
  --query "signingKeys[]" \
  --output json
```

Key flags indicate the key type:
- 256 = Zone Signing Key (ZSK)
- 257 = Key Signing Key (KSK)

### Emergency Key Rollover

If you suspect a key has been compromised:

1. Contact Azure Support immediately
2. They can initiate an emergency key rollover
3. Update DS records at your registrar as soon as new ones are provided
4. Monitor for any validation failures

---

## Disabling DNSSEC

If you need to disable DNSSEC (not recommended for production domains):

### Using Azure Portal

1. Navigate to your DNS zone
2. Go to Settings > DNSSEC
3. Click "Disable" or toggle DNSSEC to "Off"
4. Confirm the action

**Important:** Before disabling DNSSEC on Azure, remove the DS records from your registrar first. Otherwise, resolvers will expect signed responses and fail validation.

### Using Azure CLI

Remove DS records from your registrar first, then:

```bash
az network dns dnssec-config delete \
  --resource-group myResourceGroup \
  --zone-name example.com \
  --yes
```

### Safe Disable Process

1. Remove DS records from your registrar
2. Wait for TTL expiration (check DS record TTL, typically 24-48 hours)
3. Verify DS records are no longer returned: `dig example.com DS +short`
4. Disable DNSSEC in Azure
5. Verify records are no longer signed: `dig example.com A +dnssec`

---

## Troubleshooting Common Issues

### Issue: DNSSEC Validation Failing

**Symptoms:** SERVFAIL responses, websites unreachable from some networks

**Causes and Solutions:**

1. **DS record mismatch**
   - Verify DS records at registrar match Azure output
   - Check for copy/paste errors in digest value
   - Ensure algorithm and digest type are correct

2. **DS record not propagated**
   - Wait 24-48 hours after adding DS records
   - Check propagation: `dig example.com DS +trace`

3. **Expired signatures**
   - Azure automatically resigns records
   - If signatures appear expired, contact Azure Support

### Issue: Partial DNSSEC Validation

**Symptoms:** Some record types validate, others don't

**Solutions:**

1. Check that all record sets have RRSIG records
2. Verify no unsigned delegations exist
3. Look for CNAME records pointing to unsigned zones

### Issue: DS Record Not Accepted by Registrar

**Symptoms:** Registrar rejects DS record submission

**Solutions:**

1. **Unsupported algorithm**
   - Some registrars don't support ECDSA (algorithm 13)
   - Check registrar documentation for supported algorithms
   - Contact registrar support for assistance

2. **Format issues**
   - Ensure no extra whitespace in digest
   - Verify key tag is numeric
   - Try different input formats (with/without spaces)

### Issue: Slow DNS Resolution After Enabling DNSSEC

**Symptoms:** Noticeable delay in DNS lookups

**Causes:**

1. Larger response sizes due to signatures
2. Additional queries for DNSKEY records
3. Signature verification overhead

**Mitigation:**

1. Enable EDNS0 support on your resolvers
2. Ensure UDP buffer sizes are adequate (4096 bytes recommended)
3. Consider using resolvers geographically closer to users

### Issue: Email Delivery Problems

**Symptoms:** Emails rejected or delayed after enabling DNSSEC

**Solutions:**

1. Verify MX records have valid RRSIG
2. Check SPF, DKIM, and DMARC records are signed
3. Ensure receiving mail servers support DNSSEC
4. Add all related DNS records before enabling DNSSEC

---

## Best Practices

### Before Enabling DNSSEC

1. **Audit your zone**
   - Document all existing records
   - Verify no stale or incorrect records
   - Ensure TTLs are appropriate (not too low, not too high)

2. **Test in staging**
   - Use a test domain first
   - Validate the complete workflow before production

3. **Coordinate with stakeholders**
   - Notify teams that depend on the domain
   - Plan a maintenance window if needed
   - Have rollback procedures ready

### After Enabling DNSSEC

1. **Monitor continuously**
   - Set up alerts for DNSSEC validation failures
   - Monitor DNS response times
   - Track signature expiration

2. **Document DS records**
   - Store DS records in your password manager or secrets vault
   - Record when they were added to the registrar
   - Note the expected KSK rotation schedule

3. **Test regularly**
   - Include DNSSEC validation in your monitoring
   - Periodically verify chain of trust
   - Test from multiple geographic locations

### Security Considerations

1. **Protect Azure credentials**
   - Use Azure AD with MFA
   - Apply principle of least privilege
   - Audit access to DNS zones

2. **Monitor for attacks**
   - DNSSEC doesn't prevent DDoS
   - Monitor for amplification attempts
   - Consider DNS firewall services

3. **Plan for incidents**
   - Document emergency contacts (Azure Support, registrar)
   - Have procedures for emergency key rollover
   - Know how to quickly disable DNSSEC if needed

---

## DNSSEC and Other Azure Services

### Azure Front Door

When using Azure Front Door with a custom domain secured by DNSSEC:

1. DNSSEC validation happens before traffic reaches Front Door
2. Ensure CNAME records pointing to Front Door are signed
3. Front Door's managed certificates work with DNSSEC-signed domains

### Azure CDN

Similar considerations apply to Azure CDN:

1. Custom domain CNAME must be properly signed
2. Certificate validation is unaffected by DNSSEC
3. CDN edge nodes respect DNSSEC-validated responses

### Azure Traffic Manager

For Traffic Manager profiles:

1. The Traffic Manager DNS name doesn't need DNSSEC (managed by Microsoft)
2. Your domain's CNAME pointing to Traffic Manager must be signed
3. Geographic routing respects DNSSEC-validated resolver locations

---

## Summary Table

| Task | Azure Portal | Azure CLI | PowerShell |
|------|--------------|-----------|------------|
| Enable DNSSEC | DNS Zone > DNSSEC > Enable | `az network dns dnssec-config create` | `New-AzDnsSecConfig` |
| View Status | DNS Zone > DNSSEC | `az network dns dnssec-config show` | `Get-AzDnsSecConfig` |
| Get DS Records | DNS Zone > DNSSEC > DS Records | `--query "signingKeys[].delegationSignerInfo[]"` | `$config.SigningKeys.DelegationSignerInfo` |
| Disable DNSSEC | DNS Zone > DNSSEC > Disable | `az network dns dnssec-config delete` | `Remove-AzDnsSecConfig` |
| View Keys | DNS Zone > DNSSEC > Keys | `--query "signingKeys[]"` | `$config.SigningKeys` |

---

## Cost Considerations

DNSSEC on Azure DNS has the following cost implications:

1. **No additional charge** for DNSSEC signing itself
2. **Increased query volume** may occur due to:
   - DNSKEY queries from resolvers
   - Larger response sizes
   - Retry queries during validation
3. **Standard Azure DNS pricing** applies to all DNS queries
4. **Bandwidth costs** may increase slightly due to larger responses

---

## Conclusion

DNSSEC provides essential protection against DNS-based attacks that can compromise your entire security posture. With Azure DNS's native DNSSEC support, enabling this protection is straightforward whether you prefer the Azure Portal's visual interface or the scriptability of Azure CLI.

The key steps are:

1. Enable DNSSEC signing on your Azure DNS zone
2. Retrieve the generated DS records
3. Add DS records at your domain registrar
4. Verify the chain of trust is complete
5. Monitor ongoing validation status

While DNSSEC adds complexity to DNS management, the security benefits far outweigh the operational overhead - especially for domains handling sensitive traffic like authentication, email, or financial transactions.

Start with a test domain to familiarize yourself with the process, then roll out to production domains systematically. With proper planning and monitoring, DNSSEC becomes just another layer in your defense-in-depth strategy.

---

## Additional Resources

- [Azure DNS DNSSEC Documentation](https://learn.microsoft.com/en-us/azure/dns/dnssec)
- [DNSSEC Operational Practices (RFC 6781)](https://datatracker.ietf.org/doc/html/rfc6781)
- [DNSViz Visualization Tool](https://dnsviz.net)
- [ICANN DNSSEC Resources](https://www.icann.org/resources/pages/dnssec-what-is-it-why-important-2019-03-05-en)

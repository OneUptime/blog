# How to Configure gMSA Credential Spec for Active Directory Integration in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, gMSA, Active Directory, Credential Spec, Security

Description: Learn how to create and configure gMSA credential specifications for seamless Active Directory integration with Windows containers running on Kubernetes.

---

The gMSA credential specification (credspec) is the bridge between Kubernetes and Active Directory, defining how Windows containers authenticate to domain resources. Creating proper credential specs requires understanding Active Directory structure, security principals, and Kubernetes resource definitions.

In this guide, you'll learn how to generate, customize, and manage gMSA credential specifications for production Windows workloads on Kubernetes.

## Understanding Credential Spec Structure

A credential spec is a JSON document containing Active Directory configuration that Windows containers use for authentication. It includes the domain join configuration with SID, GUID, and domain names. It specifies the Group Managed Service Account details. It lists CMS plugins for credential management.

The credential spec enables containers to authenticate as domain identities without being domain-joined themselves.

## Generating Credential Specs with PowerShell

Install the CredentialSpec PowerShell module on a domain-joined Windows machine:

```powershell
# Install from PowerShell Gallery
Install-Module CredentialSpec -Force

# Verify installation
Get-Module CredentialSpec -ListAvailable

# Import the module
Import-Module CredentialSpec
```

Generate a basic credential spec:

```powershell
# Create gMSA account first (on domain controller)
New-ADServiceAccount -Name app-gmsa `
  -DNSHostName app-gmsa.contoso.com `
  -PrincipalsAllowedToRetrieveManagedPassword "K8s-Nodes"

# Generate credential spec (on Windows node or domain-joined machine)
New-CredentialSpec -Name app-gmsa -AccountName app-gmsa

# View the generated file
$credSpecPath = "C:\ProgramData\Docker\CredentialSpecs\app-gmsa.json"
Get-Content $credSpecPath | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

The generated credential spec contains:

```json
{
  "CmsPlugins": [
    "ActiveDirectory"
  ],
  "DomainJoinConfig": {
    "Sid": "S-1-5-21-1234567890-1234567890-1234567890",
    "MachineAccountName": "app-gmsa",
    "Guid": "12345678-1234-1234-1234-123456789012",
    "DnsTreeName": "contoso.com",
    "DnsName": "contoso.com",
    "NetBiosName": "CONTOSO"
  },
  "ActiveDirectoryConfig": {
    "GroupManagedServiceAccounts": [
      {
        "Name": "app-gmsa",
        "Scope": "contoso.com"
      },
      {
        "Name": "app-gmsa",
        "Scope": "CONTOSO"
      }
    ],
    "HostAccountConfig": {
      "PortableCcgVersion": "1",
      "PluginGUID": "{859E1386-BDB4-49E8-85C7-3070B13920E1}",
      "PluginInput": {
        "CredentialArn": ""
      }
    }
  }
}
```

## Creating Credential Specs for Multiple Domains

For environments with multiple AD domains or forests:

```powershell
# Create gMSA in domain contoso.com
New-ADServiceAccount -Name webapp-gmsa `
  -DNSHostName webapp-gmsa.contoso.com `
  -Server dc1.contoso.com

# Create gMSA in domain fabrikam.com
New-ADServiceAccount -Name webapp-gmsa `
  -DNSHostName webapp-gmsa.fabrikam.com `
  -Server dc1.fabrikam.com

# Generate credential spec for multi-domain access
$credSpec = New-CredentialSpec -Name webapp-multi -AccountName webapp-gmsa
```

Manually create a multi-domain credential spec:

```json
{
  "CmsPlugins": ["ActiveDirectory"],
  "DomainJoinConfig": {
    "Sid": "S-1-5-21-...",
    "MachineAccountName": "webapp-gmsa",
    "Guid": "...",
    "DnsTreeName": "contoso.com",
    "DnsName": "contoso.com",
    "NetBiosName": "CONTOSO"
  },
  "ActiveDirectoryConfig": {
    "GroupManagedServiceAccounts": [
      {
        "Name": "webapp-gmsa",
        "Scope": "contoso.com"
      },
      {
        "Name": "webapp-gmsa",
        "Scope": "fabrikam.com"
      }
    ]
  }
}
```

## Converting Credential Specs to Kubernetes CRDs

Convert the JSON credential spec to a Kubernetes GMSACredentialSpec resource:

```bash
# Using a helper script
cat > convert-credspec.sh <<'EOF'
#!/bin/bash

CREDSPEC_FILE=$1
GMSA_NAME=$2

if [ -z "$CREDSPEC_FILE" ] || [ -z "$GMSA_NAME" ]; then
  echo "Usage: $0 <credspec-file.json> <gmsa-name>"
  exit 1
fi

# Read and encode the credential spec
CREDSPEC_JSON=$(cat $CREDSPEC_FILE)

# Create Kubernetes YAML
cat <<YAML
apiVersion: windows.k8s.io/v1
kind: GMSACredentialSpec
metadata:
  name: $GMSA_NAME
credspec:
$(echo "$CREDSPEC_JSON" | sed 's/^/  /')
YAML
EOF

chmod +x convert-credspec.sh

# Convert credential spec
./convert-credspec.sh app-gmsa.json app-gmsa > app-gmsa-credspec.yaml
```

Alternatively, create the CRD directly:

```yaml
apiVersion: windows.k8s.io/v1
kind: GMSACredentialSpec
metadata:
  name: sql-app-gmsa
  labels:
    app: sql-client
    environment: production
credspec:
  ActiveDirectoryConfig:
    GroupManagedServiceAccounts:
    - Name: sql-app-gmsa
      Scope: contoso.com
    - Name: sql-app-gmsa
      Scope: CONTOSO
    HostAccountConfig:
      PluginGUID: "{859E1386-BDB4-49E8-85C7-3070B13920E1}"
      PluginInput:
        CredentialArn: ""
      PortableCcgVersion: "1"
  CmsPlugins:
  - ActiveDirectory
  DomainJoinConfig:
    DnsName: contoso.com
    DnsTreeName: contoso.com
    Guid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    MachineAccountName: sql-app-gmsa
    NetBiosName: CONTOSO
    Sid: S-1-5-21-1111111111-2222222222-3333333333
```

Apply the credential spec:

```bash
kubectl apply -f app-gmsa-credspec.yaml

# Verify creation
kubectl get gmsacredentialspec
kubectl describe gmsacredentialspec app-gmsa
```

## Managing Multiple Credential Specs

Organize credential specs by application or environment:

```yaml
# Production database gMSA
apiVersion: windows.k8s.io/v1
kind: GMSACredentialSpec
metadata:
  name: prod-db-gmsa
  namespace: production
  labels:
    app: database
    environment: production
credspec:
  ActiveDirectoryConfig:
    GroupManagedServiceAccounts:
    - Name: prod-db-gmsa
      Scope: contoso.com
  DomainJoinConfig:
    DnsName: contoso.com
    MachineAccountName: prod-db-gmsa
    Sid: S-1-5-21-1111111111-2222222222-3333333333

---
# Staging database gMSA
apiVersion: windows.k8s.io/v1
kind: GMSACredentialSpec
metadata:
  name: staging-db-gmsa
  namespace: staging
  labels:
    app: database
    environment: staging
credspec:
  ActiveDirectoryConfig:
    GroupManagedServiceAccounts:
    - Name: staging-db-gmsa
      Scope: contoso.com
  DomainJoinConfig:
    DnsName: contoso.com
    MachineAccountName: staging-db-gmsa
    Sid: S-1-5-21-4444444444-5555555555-6666666666
```

## Configuring Service Principal Names (SPNs)

SPNs are critical for Kerberos authentication:

```powershell
# Set SPNs for HTTP service
setspn -S HTTP/webapp.contoso.com webapp-gmsa
setspn -S HTTP/webapp webapp-gmsa

# Set SPNs for SQL Server service
setspn -S MSSQLSvc/sqlserver.contoso.com:1433 sql-gmsa
setspn -S MSSQLSvc/sqlserver.contoso.com sql-gmsa

# Verify SPNs
setspn -L webapp-gmsa

# Registered ServicePrincipalNames for CN=webapp-gmsa:
#   HTTP/webapp.contoso.com
#   HTTP/webapp
```

Update the credential spec if SPNs change:

```yaml
apiVersion: windows.k8s.io/v1
kind: GMSACredentialSpec
metadata:
  name: webapp-gmsa
  annotations:
    spns: "HTTP/webapp.contoso.com,HTTP/webapp"
credspec:
  ActiveDirectoryConfig:
    GroupManagedServiceAccounts:
    - Name: webapp-gmsa
      Scope: contoso.com
  DomainJoinConfig:
    DnsName: contoso.com
    MachineAccountName: webapp-gmsa
    Sid: S-1-5-21-...
```

## Validating Credential Specs

Create a validation script:

```powershell
# validate-credspec.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$CredSpecPath,

    [Parameter(Mandatory=$true)]
    [string]$gMSAName
)

# Load credential spec
$credSpec = Get-Content $CredSpecPath | ConvertFrom-Json

# Validate structure
$required = @('CmsPlugins', 'DomainJoinConfig', 'ActiveDirectoryConfig')
foreach ($field in $required) {
    if (-not $credSpec.$field) {
        Write-Error "Missing required field: $field"
        exit 1
    }
}

# Verify gMSA exists in AD
try {
    $gmsa = Get-ADServiceAccount -Identity $gMSAName
    Write-Host "✓ gMSA account exists: $gMSAName"
} catch {
    Write-Error "gMSA account not found: $gMSAName"
    exit 1
}

# Verify SID matches
$adSid = $gmsa.SID.Value
$credSpecSid = $credSpec.DomainJoinConfig.Sid

if ($adSid -ne $credSpecSid) {
    Write-Warning "SID mismatch!"
    Write-Host "AD SID:       $adSid"
    Write-Host "CredSpec SID: $credSpecSid"
} else {
    Write-Host "✓ SID matches"
}

# Verify DNS names
$domain = $gmsa.DNSHostName.Split('.')[1..99] -join '.'
if ($credSpec.DomainJoinConfig.DnsName -ne $domain) {
    Write-Warning "DNS name mismatch"
} else {
    Write-Host "✓ DNS name matches"
}

# Test if current machine can retrieve gMSA
try {
    Test-ADServiceAccount -Identity $gMSAName
    Write-Host "✓ Can retrieve gMSA credentials"
} catch {
    Write-Warning "Cannot retrieve gMSA credentials from this machine"
}

Write-Host "`nCredential spec validation complete"
```

Run validation:

```powershell
.\validate-credspec.ps1 -CredSpecPath "C:\ProgramData\Docker\CredentialSpecs\app-gmsa.json" -gMSAName "app-gmsa"
```

## Automating Credential Spec Management

Create a script to automate credential spec generation and deployment:

```powershell
# deploy-gmsa.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$gMSAName,

    [Parameter(Mandatory=$true)]
    [string]$Domain,

    [string]$Namespace = "default"
)

# Generate credential spec
Write-Host "Generating credential spec for $gMSAName..."
New-CredentialSpec -Name $gMSAName -AccountName $gMSAName

# Read generated spec
$credSpecPath = "C:\ProgramData\Docker\CredentialSpecs\$gMSAName.json"
$credSpec = Get-Content $credSpecPath | ConvertFrom-Json

# Create Kubernetes YAML
$yaml = @"
apiVersion: windows.k8s.io/v1
kind: GMSACredentialSpec
metadata:
  name: $gMSAName
  namespace: $Namespace
  labels:
    gmsa-account: $gMSAName
credspec:
$(($credSpec | ConvertTo-Json -Depth 10).Split("`n") | ForEach-Object { "  $_" } | Out-String)
"@

# Save YAML
$yamlPath = "$gMSAName-credspec.yaml"
$yaml | Out-File $yamlPath -Encoding UTF8

Write-Host "Credential spec YAML created: $yamlPath"

# Apply to Kubernetes
Write-Host "Applying to Kubernetes..."
kubectl apply -f $yamlPath

Write-Host "✓ gMSA credential spec deployed successfully"
```

## Troubleshooting Credential Spec Issues

Common issues and solutions:

```powershell
# Issue: Invalid SID in credential spec
# Solution: Regenerate credential spec
Remove-Item "C:\ProgramData\Docker\CredentialSpecs\$gMSAName.json"
New-CredentialSpec -Name $gMSAName -AccountName $gMSAName

# Issue: Domain join configuration incorrect
# Solution: Verify AD domain information
Get-ADDomain | Select-Object Name, DNSRoot, NetBIOSName

# Issue: gMSA account not accessible
# Solution: Check permissions
Get-ADServiceAccount $gMSAName -Properties PrincipalsAllowedToRetrieveManagedPassword

# Issue: Credential spec not found by webhook
# Solution: Verify CRD exists
kubectl get gmsacredentialspec -A

# Check webhook logs
kubectl logs -n kube-system -l app=gmsa-webhook
```

## Best Practices

Generate credential specs on machines with current AD information to ensure accuracy.

Store credential spec JSON files in version control alongside Kubernetes manifests.

Use descriptive names that indicate the application and environment.

Validate credential specs before deploying to production clusters.

Document which gMSA accounts are used by which applications for troubleshooting.

Regularly audit gMSA permissions to ensure only authorized nodes can retrieve credentials.

Test credential specs in development environments before production deployment.

## Conclusion

Proper credential spec configuration is essential for reliable gMSA integration with Kubernetes. By understanding the credential spec structure and using automated generation tools, you can deploy Windows containers that seamlessly authenticate to Active Directory resources.

Start with simple single-domain scenarios and expand to complex multi-domain configurations as your understanding grows. Always validate credential specs thoroughly before production deployment to avoid authentication failures.

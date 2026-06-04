# How to Use Group Managed Service Accounts (gMSA) with Windows Pods on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Window, GMSA, Active Directory, Authentication, Security

Description: Learn how to configure Group Managed Service Accounts for Windows containers on Kubernetes to enable Active Directory authentication without managing passwords.

---

Group Managed Service Accounts (gMSA) provide a way for Windows containers to authenticate to Active Directory resources without storing passwords. This is essential for Windows workloads that need to access domain-joined resources like SQL Server databases, file shares, or other AD-integrated services.

In this guide, you'll learn how to configure gMSA for Windows pods in Kubernetes, enabling secure authentication to Active Directory resources.

## Understanding gMSA in Kubernetes

Group Managed Service Accounts are special Active Directory accounts where passwords are automatically managed by Active Directory. The password rotates automatically and is never exposed to administrators. Windows containers can use gMSA accounts to authenticate as domain identities.

For Kubernetes integration, gMSA credential specs are stored as Custom Resources and referenced in pod specifications. Admission webhooks inline and validate the credential spec, and the Windows container runtime configures the container to use the gMSA for domain authentication.

## Prerequisites

Before configuring gMSA, ensure these requirements are met:

- Windows Server 2019 or later for worker nodes
- Active Directory domain controller running Windows Server 2012 or later
- Windows nodes domain-joined and able to communicate with AD
- PowerShell 5.1 or later with AD module installed
- Kubernetes 1.18 or later for stable gMSA support
- A Key Distribution Services (KDS) root key in the Active Directory forest

## Creating a gMSA Account in Active Directory

On your domain controller, create the gMSA account:

```powershell
# Import Active Directory module

Import-Module ActiveDirectory

# Create the gMSA account
New-ADServiceAccount -Name webapp-gmsa `
  -DNSHostName webapp-gmsa.contoso.com `
  -PrincipalsAllowedToRetrieveManagedPassword "Domain Computers" `
  -KerberosEncryptionType AES128, AES256 `
  -ServicePrincipalNames "HTTP/webapp-gmsa", "HTTP/webapp-gmsa.contoso.com"

# Verify creation
Get-ADServiceAccount -Identity webapp-gmsa

# Test gMSA from a Windows node
Install-ADServiceAccount -Identity webapp-gmsa
Test-ADServiceAccount -Identity webapp-gmsa
```

Create a dedicated security group for nodes that can retrieve the gMSA:

```powershell
# Create security group
New-ADGroup -Name "K8s-gMSA-Users" `
  -GroupScope DomainLocal `
  -GroupCategory Security `
  -Description "Kubernetes nodes allowed to retrieve webapp-gmsa"

# Add Windows nodes to the group
Add-ADGroupMember -Identity "K8s-gMSA-Users" `
  -Members "windows-node-1$", "windows-node-2$"

# Update gMSA permissions
Set-ADServiceAccount -Identity webapp-gmsa `
  -PrincipalsAllowedToRetrieveManagedPassword "K8s-gMSA-Users"
```

Restart Windows nodes after adding their computer accounts to the group so the updated group membership is present in the machine token.

## Installing gMSA Webhook on Kubernetes

The gMSA admission webhooks mutate pod specifications to inline credential specs and validate that the pod's service account is authorized to use the referenced gMSA:

```bash
# Clone the webhook repository
git clone https://github.com/kubernetes-sigs/windows-gmsa.git
cd windows-gmsa

# Generate certificates for webhook
./admission-webhook/deploy/deploy-gmsa-webhook.sh --file ./admission-webhook/deploy/gmsa-webhook.yml \
  --namespace kube-system \
  --certs-dir ./admission-webhook/deploy/certs

# The script deploys the generated manifest. Reapply it later if needed:
kubectl apply -f ./admission-webhook/deploy/gmsa-webhook.yml
```

Verify the webhook is running:

```bash
kubectl get pods -n kube-system -l app=gmsa-webhook
kubectl logs -n kube-system -l app=gmsa-webhook
```

## Creating gMSA Credential Spec

Generate a credential spec file:

```powershell
# On Windows node or domain-joined machine with CredentialSpec module
Install-Module CredentialSpec

# Generate credential spec for the gMSA
New-CredentialSpec -Name webapp-gmsa -AccountName webapp-gmsa

# The credential spec is saved to:
# C:\ProgramData\Docker\CredentialSpecs\webapp-gmsa.json

# View the credential spec
Get-Content C:\ProgramData\Docker\CredentialSpecs\webapp-gmsa.json
```

The credential spec looks like:

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
        "Scope": "CONTOSO"
      }
    ]
  }
}
```

## Creating GMSACredentialSpec Custom Resource

Convert the credential spec to a Kubernetes CRD:

```yaml
apiVersion: windows.k8s.io/v1
kind: GMSACredentialSpec
metadata:
  name: webapp-gmsa
credspec:
  ActiveDirectoryConfig:
    GroupManagedServiceAccounts:
    - Name: webapp-gmsa
      Scope: contoso.com
    - Name: webapp-gmsa
      Scope: CONTOSO
  CmsPlugins:
  - ActiveDirectory
  DomainJoinConfig:
    DnsName: contoso.com
    DnsTreeName: contoso.com
    Guid: "..."  # Copy from credential spec
    MachineAccountName: webapp-gmsa
    NetBiosName: CONTOSO
    Sid: S-1-5-21-...  # Copy from credential spec
```

Apply the credential spec:

```bash
kubectl apply -f webapp-gmsa-credspec.yaml
kubectl get gmsa
```

## Configuring RBAC for gMSA Access

Create a role that allows pods to use the gMSA:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: gmsa-webapp-user
rules:
- apiGroups: ["windows.k8s.io"]
  resources: ["gmsacredentialspecs"]
  verbs: ["use"]
  resourceNames: ["webapp-gmsa"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: allow-webapp-gmsa
  namespace: default
subjects:
- kind: ServiceAccount
  name: webapp-sa
  namespace: default
roleRef:
  kind: ClusterRole
  name: gmsa-webapp-user
  apiGroup: rbac.authorization.k8s.io

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: webapp-sa
  namespace: default
```

## Deploying a Pod with gMSA

Create a deployment that uses the gMSA:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp-with-gmsa
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      serviceAccountName: webapp-sa
      nodeSelector:
        kubernetes.io/os: windows
      securityContext:
        windowsOptions:
          gmsaCredentialSpecName: webapp-gmsa
      containers:
      - name: webapp
        image: mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2019
        ports:
        - containerPort: 80
        env:
        - name: ASPNETCORE_ENVIRONMENT
          value: Production
```

The webhook intercepts the pod creation and injects the full credential spec.

## Verifying gMSA Functionality

Deploy a test pod to verify AD authentication:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gmsa-test
  namespace: default
spec:
  serviceAccountName: webapp-sa
  nodeSelector:
    kubernetes.io/os: windows
  securityContext:
    windowsOptions:
      gmsaCredentialSpecName: webapp-gmsa
  containers:
  - name: powershell
    image: mcr.microsoft.com/windows/servercore:ltsc2019
    command:
    - powershell.exe
    - -Command
    - |
      while ($true) {
        Write-Host "Running as: $env:USERNAME"
        nltest /query
        Start-Sleep -Seconds 300
      }
```

Check the pod is running with gMSA identity:

```bash
kubectl logs gmsa-test

# You should see output like:
# Running as: ContainerAdministrator
# The command completed successfully
```

Execute commands in the pod to test AD access:

```bash
kubectl exec -it gmsa-test -- powershell

# Inside the pod
whoami
# Output: user manager\containeradministrator

nltest /query
# Output: The command completed successfully

# Test SQL Server connection with integrated auth
$conn = New-Object System.Data.SqlClient.SqlConnection
$conn.ConnectionString = "Server=sqlserver.contoso.com;Database=AppDB;Integrated Security=SSPI;"
$conn.Open()
$conn.State
# Output: Open
```

## Accessing File Shares with gMSA

Access SMB file shares using AD authentication:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: file-access-test
spec:
  serviceAccountName: webapp-sa
  nodeSelector:
    kubernetes.io/os: windows
  securityContext:
    windowsOptions:
      gmsaCredentialSpecName: webapp-gmsa
  containers:
  - name: app
    image: mcr.microsoft.com/windows/servercore:ltsc2019
    command:
    - powershell.exe
    - -Command
    - |
      # Test file share access
      New-PSDrive -Name Z -PSProvider FileSystem -Root "\\fileserver.contoso.com\share"
      Get-ChildItem Z:\
      New-Item -ItemType Directory -Force C:\temp
      Copy-Item Z:\data.txt C:\temp\
```

## Using gMSA with SQL Server Integrated Authentication

Example ASP.NET application connecting to SQL Server:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=sqlserver.contoso.com;Database=AppDB;Integrated Security=SSPI;TrustServerCertificate=True;"
  }
}
```

```csharp
public void ConfigureServices(IServiceCollection services)
{
    services.AddDbContext<ApplicationDbContext>(options =>
        options.UseSqlServer(
            Configuration.GetConnectionString("DefaultConnection")));
}
```

Deploy the application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aspnet-sqlauth
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aspnet-app
  template:
    metadata:
      labels:
        app: aspnet-app
    spec:
      serviceAccountName: webapp-sa
      nodeSelector:
        kubernetes.io/os: windows
      securityContext:
        windowsOptions:
          gmsaCredentialSpecName: webapp-gmsa
      containers:
      - name: webapp
        image: myregistry.io/aspnet-app:v1.0
        ports:
        - containerPort: 80
```

## Troubleshooting gMSA Issues

Common issues and solutions:

```powershell
# Issue: Pod fails to start with gMSA
# Check webhook logs
kubectl logs -n kube-system -l app=gmsa-webhook

# Verify node can retrieve gMSA
# On Windows node:
Install-ADServiceAccount webapp-gmsa
Test-ADServiceAccount webapp-gmsa

# Issue: Authentication fails
# Verify credential spec matches AD
Get-ADServiceAccount webapp-gmsa -Properties *

# Check SPN configuration
setspn -L webapp-gmsa

# Issue: Permission denied on file share
# Verify gMSA has proper ACLs
icacls \\fileserver\share

# Check current identity in pod
kubectl exec -it <pod> -- powershell -Command "whoami; nltest /query"
```

## Security Best Practices

Create separate gMSA accounts for different applications to follow the principle of least privilege.

Regularly review and audit which nodes can retrieve gMSA credentials.

Use network policies to restrict which pods can use specific gMSAs.

Monitor gMSA usage through AD audit logs to detect unauthorized access.

Recreate or rotate affected gMSA accounts after suspected compromise even though managed passwords rotate automatically.

## Conclusion

Group Managed Service Accounts provide secure, password-less authentication for Windows containers running on Kubernetes. By leveraging Active Directory's automatic credential management, you can modernize Windows applications while maintaining integration with existing AD infrastructure.

Start with a single test application to verify your gMSA configuration, then expand to production workloads as you gain confidence in the setup and troubleshooting procedures.

# How to configure Windows security context options for Windows containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Window, Security, Windows Containers, Pod Security

Description: Learn how to configure Windows-specific security context options in Kubernetes for Windows containers, including user context, host process containers, and Group Managed Service Accounts.

---

Windows containers have unique security requirements that differ from Linux containers. Kubernetes provides Windows-specific security context fields that control user identity, host access, and Active Directory integration. Understanding these options enables you to secure Windows workloads appropriately while leveraging Windows-native security features.

## Windows Security Context Basics

Windows containers support a subset of standard security context fields plus Windows-specific options. Unlike Linux where UID/GID define identity, Windows uses user account names and security identifiers (SIDs). Windows containers can run as LocalSystem, NetworkService, or custom user accounts.

The security context for Windows containers focuses on user identity, credential management, and host process capabilities. These controls integrate with Windows security subsystems such as Active Directory, while endpoint protection such as Microsoft Defender Antivirus is configured separately on Windows nodes.

## Running as Specific Windows Users

Configure Windows containers to run as specific user accounts:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: windows-user-demo
spec:
  os:
    name: windows
  nodeSelector:
    kubernetes.io/os: windows
  securityContext:
    windowsOptions:
      runAsUserName: "ContainerUser"
  containers:
  - name: app
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command: ["powershell", "-Command"]
    args:
    - |
      Write-Output "Running as: $(whoami)"
      whoami /user
      Start-Sleep -Seconds 3600
```

The `runAsUserName` field specifies the user account. If the account doesn't exist, the container fails to start. You must create custom user accounts in your Windows container images.

## Creating Custom User Accounts in Windows Images

Build Windows images with dedicated user accounts:

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Create a non-admin user

RUN net user appuser SecurePassword123! /add && \
    net localgroup Users appuser /add

# Set permissions on application directory
WORKDIR C:\app
COPY app.exe .
RUN icacls C:\app /grant appuser:F

# Application will run as this user via runAsUserName
EXPOSE 8080
CMD ["C:\\app\\app.exe"]
```

Create user accounts during image build, then specify them via security context at runtime.

## Group Managed Service Accounts (GMSA)

Integrate Windows containers with Active Directory using GMSA:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gmsa-demo
spec:
  os:
    name: windows
  nodeSelector:
    kubernetes.io/os: windows
  securityContext:
    windowsOptions:
      gmsaCredentialSpecName: webapp-gmsa
  containers:
  - name: app
    image: mycompany/windows-app:latest
    command: ["powershell", "-Command"]
    args:
    - |
      # Container uses the GMSA for domain network authentication
      Write-Output "Process user: $(whoami)"

      # Verify domain connectivity or access domain resources required by the app
      nltest /parentdomain

      Start-Sleep -Seconds 3600
```

GMSA credential specs are stored in CRDs that reference Active Directory accounts. The credential spec does not contain secret data; containers using GMSA can authenticate to domain resources without embedding credentials in the image or Pod spec.

## Configuring GMSA Credential Specs

Create GMSACredentialSpec custom resources:

```yaml
apiVersion: windows.k8s.io/v1
kind: GMSACredentialSpec
metadata:
  name: webapp-gmsa
credspec:
  ActiveDirectoryConfig:
    GroupManagedServiceAccounts:
    - Name: WebAppSVC
      Scope: EXAMPLE
    - Name: WebAppSVC
      Scope: example.com
  CmsPlugins:
  - ActiveDirectory
  DomainJoinConfig:
    DnsName: example.com
    DnsTreeName: example.com
    Guid: 244818ae-87ac-4fcd-92ec-e79e5252348a
    MachineAccountName: WebAppSVC
    NetBiosName: EXAMPLE
    Sid: S-1-5-21-2126449477-2524075714-3094792973
```

Reference this credential spec in pod specifications to enable AD authentication.

## Host Process Containers

Windows host process containers run with host-level privileges:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: host-process-demo
spec:
  os:
    name: windows
  hostNetwork: true
  nodeSelector:
    kubernetes.io/os: windows
  securityContext:
    windowsOptions:
      hostProcess: true
      runAsUserName: "NT AUTHORITY\\SYSTEM"
  containers:
  - name: privileged-tool
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command: ["powershell", "-Command"]
    args:
    - |
      # Can access host resources
      Get-Process
      Get-Service
      Get-NetAdapter

      Start-Sleep -Seconds 3600
```

Host process containers run outside the container isolation boundary. Use them only for system management tasks like monitoring agents or CNI plugins.

## Security Implications of Host Process Containers

Host process containers have extensive privileges:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: windows-node-monitor
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: node-monitor
  template:
    metadata:
      labels:
        app: node-monitor
      annotations:
        security-note: "Requires host process for node metrics collection"
        reviewer: "security-team"
        review-date: "2026-02-09"
    spec:
      os:
        name: windows
      hostNetwork: true
      nodeSelector:
        kubernetes.io/os: windows
      securityContext:
        windowsOptions:
          hostProcess: true
          runAsUserName: "NT AUTHORITY\\SYSTEM"
      containers:
      - name: monitor
        image: monitoring/windows-exporter:latest
```

Document and justify all host process container usage.

## Combining Windows Security Options

Layer multiple security controls:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-windows-app
spec:
  os:
    name: windows
  nodeSelector:
    kubernetes.io/os: windows
  securityContext:
    runAsNonRoot: true
    windowsOptions:
      runAsUserName: "ContainerUser"
      gmsaCredentialSpecName: app-gmsa
  containers:
  - name: app
    image: mycompany/secure-app:latest
    resources:
      limits:
        memory: "2Gi"
        cpu: "1000m"
```

This configuration runs as a dedicated non-administrator user with GMSA authentication. Linux-specific controls such as `allowPrivilegeEscalation` and POSIX capabilities are not used for Windows Pods.

## Windows Container User Management

Manage container users systematically:

```powershell
# In Dockerfile or container startup
# Create dedicated user
net user containerapp SecurePass123! /add

# Add to specific groups
net localgroup IIS_IUSRS containerapp /add

# Set directory permissions
icacls C:\inetpub\wwwroot /grant containerapp:M

# Remove from Administrators if the account was added earlier
net localgroup Administrators containerapp /delete
```

Follow least privilege principles by creating users with minimal necessary permissions.

## Windows Defender Integration

Configure Microsoft Defender Antivirus on Windows nodes rather than through per-Pod `windowsOptions` fields:

```powershell
# Run on the Windows node with administrative privileges
Add-MpPreference -ExclusionPath "C:\var\lib\kubelet"
Add-MpPreference -ExclusionPath "C:\ProgramData\containerd"
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
```

Configure Defender exclusions deliberately on the node for performance-sensitive Kubernetes and container runtime paths.

## Troubleshooting Windows Security Context

Debug Windows container security issues:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: windows-debug
spec:
  os:
    name: windows
  nodeSelector:
    kubernetes.io/os: windows
  securityContext:
    windowsOptions:
      runAsUserName: "ContainerAdministrator"
  containers:
  - name: debug
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command: ["powershell", "-Command"]
    args:
    - |
      Write-Output "=== User Context ==="
      whoami
      whoami /groups

      Write-Output "`n=== Process Privileges ==="
      whoami /priv

      Write-Output "`n=== File System Permissions ==="
      icacls C:\app

      Write-Output "`n=== Network Configuration ==="
      ipconfig /all

      Start-Sleep -Seconds 3600
```

This debug pod helps diagnose permission and identity issues.

## Windows Pod Security Standards

Pod Security Standards apply to Windows with some differences:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: windows-apps
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: v1
kind: Pod
metadata:
  name: compliant-windows-pod
  namespace: windows-apps
spec:
  os:
    name: windows
  nodeSelector:
    kubernetes.io/os: windows
  securityContext:
    runAsNonRoot: true
    windowsOptions:
      runAsUserName: "ContainerUser"
  containers:
  - name: app
    image: myapp:latest
```

Baseline standard permits most Windows container configurations while blocking obviously dangerous settings.

## Performance Considerations

Windows container security features have different performance characteristics than Linux:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: performance-tuned
spec:
  os:
    name: windows
  nodeSelector:
    kubernetes.io/os: windows
  securityContext:
    windowsOptions:
      runAsUserName: "ContainerUser"
  containers:
  - name: app
    image: myapp:latest
    resources:
      limits:
        memory: "4Gi"  # Windows containers typically need more memory
        cpu: "2000m"
      requests:
        memory: "2Gi"
        cpu: "1000m"
```

Windows containers generally require more resources than equivalent Linux containers.

## Conclusion

Windows container security in Kubernetes involves unique considerations around user identity, Active Directory integration, and host process capabilities. Use runAsUserName to specify non-admin accounts, leverage GMSA for Active Directory authentication, and restrict host process containers to necessary infrastructure components. Build container images with dedicated user accounts and proper permissions. While Windows containers don't support all Linux security features, combining runAsUserName, runAsNonRoot, Pod Security Admission, and resource limits creates secure Windows workloads. Understand the differences between Windows and Linux security models to apply appropriate protections. Regular security reviews ensure Windows container configurations remain secure as your environment evolves.

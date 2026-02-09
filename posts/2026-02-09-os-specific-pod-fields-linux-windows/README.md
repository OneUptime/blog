# How to Configure OS-Specific Pod Fields for Linux and Windows Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, Linux

Description: Learn how to use OS-specific pod fields in Kubernetes to configure Linux and Windows containers correctly, set sysctls, configure Windows security contexts, and manage hybrid clusters.

---

Kubernetes clusters can run both Linux and Windows nodes, and each operating system requires different configuration options. The pod specification includes OS-specific fields that let you fine-tune security, performance, and behavior based on the target platform. Understanding these fields is essential for running heterogeneous workloads and ensuring that your applications behave correctly on their intended operating system.

These configurations affect everything from security contexts to filesystem permissions, kernel parameters, and runtime behavior.

## Specifying the Target OS

The `os` field in the pod specification explicitly declares which operating system the pod requires:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: linux-pod
spec:
  os:
    name: linux
  containers:
  - name: app
    image: ubuntu:22.04
    command: ["sleep", "3600"]
```

For Windows pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: windows-pod
spec:
  os:
    name: windows
  containers:
  - name: app
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command: ["powershell", "-Command", "Start-Sleep -Seconds 3600"]
```

The Kubernetes scheduler uses this field to ensure pods are placed on nodes running the correct operating system. This prevents scheduling failures and startup errors.

## Linux-Specific Security Context

Linux pods support a rich set of security context options:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-linux-app
spec:
  os:
    name: linux
  securityContext:
    # Pod-level security context
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
    fsGroupChangePolicy: "OnRootMismatch"
    seccompProfile:
      type: RuntimeDefault
    supplementalGroups: [4000, 5000]
  containers:
  - name: app
    image: nginx:1.25
    securityContext:
      # Container-level security context
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      capabilities:
        drop:
        - ALL
        add:
        - NET_BIND_SERVICE
    volumeMounts:
    - name: cache
      mountPath: /var/cache/nginx
    - name: run
      mountPath: /var/run
  volumes:
  - name: cache
    emptyDir: {}
  - name: run
    emptyDir: {}
```

These Linux-specific fields control user IDs, group IDs, capabilities, and security profiles like SELinux and AppArmor.

## Windows-Specific Security Context

Windows pods have a different set of security options:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-windows-app
spec:
  os:
    name: windows
  securityContext:
    windowsOptions:
      # Run as specific Windows user
      runAsUserName: "NT AUTHORITY\\SYSTEM"
      # Configure host process container
      hostProcess: false
      # Set the GMSA credential spec
      gmsaCredentialSpecName: "webapp-gmsa"
  containers:
  - name: iis
    image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
    ports:
    - containerPort: 80
```

The `windowsOptions` field provides Windows-specific security configurations:

- `runAsUserName`: Specifies the Windows username
- `gmsaCredentialSpecName`: Enables group Managed Service Account (gMSA) for Active Directory authentication
- `gmsaCredentialSpec`: Inline GMSA credential specification
- `hostProcess`: Enables Windows host process containers for privileged operations

## Setting Linux Kernel Parameters with Sysctls

Linux pods can modify kernel parameters using sysctls:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: tuned-linux-pod
spec:
  os:
    name: linux
  securityContext:
    # Safe sysctls (allowed by default)
    sysctls:
    - name: net.ipv4.ip_local_port_range
      value: "32768 60999"
    - name: net.core.somaxconn
      value: "1024"
    - name: net.ipv4.tcp_tw_reuse
      value: "1"
  containers:
  - name: high-performance-app
    image: myapp:1.0
    ports:
    - containerPort: 8080
```

For unsafe sysctls (like `kernel.*`), you need to enable them in kubelet configuration:

```yaml
# Node-level kubelet config (not pod spec)
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
allowedUnsafeSysctls:
- "kernel.msg*"
- "kernel.shm*"
```

Then use them in pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database-pod
spec:
  os:
    name: linux
  securityContext:
    sysctls:
    - name: kernel.shmmax
      value: "68719476736"
    - name: kernel.shmall
      value: "4294967296"
  containers:
  - name: postgres
    image: postgres:15
```

## Hybrid Cluster Deployment

Here's a complete example showing both Linux and Windows workloads:

```yaml
# Linux web application
apiVersion: apps/v1
kind: Deployment
metadata:
  name: linux-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
      os: linux
  template:
    metadata:
      labels:
        app: api
        os: linux
    spec:
      os:
        name: linux
      nodeSelector:
        kubernetes.io/os: linux
      containers:
      - name: api
        image: golang-api:1.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
---
# Windows frontend application
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
      os: windows
  template:
    metadata:
      labels:
        app: frontend
        os: windows
    spec:
      os:
        name: windows
      nodeSelector:
        kubernetes.io/os: windows
        # Optionally specify Windows version
        node.kubernetes.io/windows-build: "10.0.20348"
      containers:
      - name: iis-app
        image: mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
```

The nodeSelector ensures each pod lands on the correct OS, while the `os` field provides an explicit declaration for better validation.

## Volume Mount Differences

Linux and Windows handle volume mounts differently:

```yaml
# Linux pod with standard mounts
apiVersion: v1
kind: Pod
metadata:
  name: linux-volumes
spec:
  os:
    name: linux
  containers:
  - name: app
    image: ubuntu:22.04
    volumeMounts:
    - name: config
      mountPath: /etc/app/config  # Linux-style path
    - name: data
      mountPath: /var/lib/app/data
      readOnly: false
    - name: secrets
      mountPath: /run/secrets
      readOnly: true
  volumes:
  - name: config
    configMap:
      name: app-config
  - name: data
    persistentVolumeClaim:
      claimName: app-data
  - name: secrets
    secret:
      secretName: app-secrets
---
# Windows pod with Windows-style paths
apiVersion: v1
kind: Pod
metadata:
  name: windows-volumes
spec:
  os:
    name: windows
  containers:
  - name: app
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    volumeMounts:
    - name: config
      mountPath: C:\ProgramData\config  # Windows-style path
    - name: data
      mountPath: C:\Data
  volumes:
  - name: config
    configMap:
      name: app-config
  - name: data
    persistentVolumeClaim:
      claimName: app-data
```

Note the path separators and drive letters in Windows paths versus Unix-style paths in Linux.

## Using Group Managed Service Accounts

Windows pods can use gMSA for Active Directory authentication:

```yaml
# First, create the credential spec
apiVersion: windows.k8s.io/v1
kind: GMSACredentialSpec
metadata:
  name: webapp-gmsa
credspec:
  ActiveDirectoryConfig:
    GroupManagedServiceAccounts:
    - Name: webapp-gmsa
      Scope: DOMAIN
    HostAccountConfig:
      PluginGUID: "{00000000-0000-0000-0000-000000000000}"
      PortableCcgVersion: 1
  CmsPlugins:
  - ActiveDirectory
  DomainJoinConfig:
    DnsName: corp.example.com
    DnsTreeName: example.com
    Guid: "{12345678-1234-1234-1234-123456789012}"
    MachineAccountName: WEBAPP-GMSA
    NetBiosName: CORP
    Sid: S-1-5-21-123456789-123456789-123456789
---
# Use it in a pod
apiVersion: v1
kind: Pod
metadata:
  name: gmsa-webapp
spec:
  os:
    name: windows
  securityContext:
    windowsOptions:
      gmsaCredentialSpecName: webapp-gmsa
  containers:
  - name: app
    image: myapp:windows-ltsc2022
    env:
    - name: GMSA_ACCOUNT
      value: "webapp-gmsa"
```

This enables the container to authenticate to AD resources using the managed service account.

## AppArmor and SELinux for Linux

Linux pods can use AppArmor or SELinux profiles:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: apparmor-pod
  annotations:
    # AppArmor profile annotation
    container.apparmor.security.beta.kubernetes.io/app: localhost/k8s-apparmor-example
spec:
  os:
    name: linux
  containers:
  - name: app
    image: nginx:1.25
    securityContext:
      # SELinux options
      seLinuxOptions:
        level: "s0:c123,c456"
        role: "system_r"
        type: "container_t"
        user: "system_u"
```

These profiles enforce mandatory access control policies specific to Linux.

## Runtime Class Selection

Different runtimes might be appropriate for different OS types:

```yaml
# Linux pod with gVisor runtime
apiVersion: v1
kind: Pod
metadata:
  name: sandboxed-linux
spec:
  os:
    name: linux
  runtimeClassName: gvisor
  containers:
  - name: app
    image: untrusted-app:1.0
---
# Windows pod with default runtime
apiVersion: v1
kind: Pod
metadata:
  name: windows-app
spec:
  os:
    name: windows
  # Windows typically uses default runtime
  containers:
  - name: app
    image: trusted-app:windows
```

## Best Practices

Always set the `os` field explicitly. This improves scheduling reliability and makes your intent clear.

Use node selectors in addition to the OS field. This ensures pods land on nodes with the right Windows version or Linux distribution.

Understand that Windows and Linux have different security models. Don't try to apply Linux security contexts to Windows pods or vice versa.

Test on the target OS. Windows containers behave differently than Linux containers, especially around file permissions and process isolation.

For hybrid clusters, use consistent labeling:

```yaml
metadata:
  labels:
    app: myapp
    os: linux  # or 'windows'
```

Monitor resource usage separately for each OS. Windows containers typically require more memory and CPU than equivalent Linux containers.

Document OS requirements in your deployment manifests. Use comments to explain why specific OS-level configurations are needed.

Keep Windows and Linux workloads in separate namespaces when possible. This makes RBAC and resource quotas easier to manage.

Running multi-OS Kubernetes clusters requires understanding the unique requirements of each platform. By properly configuring OS-specific pod fields, you can ensure your applications run reliably whether they target Linux or Windows nodes.

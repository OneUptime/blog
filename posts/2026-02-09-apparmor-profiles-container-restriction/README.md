# How to implement AppArmor profiles for container process restriction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, AppArmor

Description: Master AppArmor mandatory access control to restrict container capabilities including file access network operations and process execution for enhanced security.

---

AppArmor is a Linux security module that provides mandatory access control (MAC) through profiles that define what resources processes can access. Unlike traditional discretionary access control where the process owner determines permissions, AppArmor enforces system-wide policies that even root cannot bypass. This makes it particularly valuable for securing containers where compromised processes might attempt unauthorized actions.

When combined with other security mechanisms like seccomp and capabilities, AppArmor provides defense-in-depth that significantly raises the bar for attackers. Even if they compromise a container, AppArmor policies restrict what they can do with that access.

## Understanding AppArmor modes

AppArmor profiles operate in several modes:

**Enforce**: Violations are blocked and logged. This is production mode.

**Complain**: Violations are logged but not blocked. Use for testing profiles.

**Unconfined**: No restrictions applied. Default when no profile is specified.

Most production containers should run in enforce mode with appropriate profiles.

## Using default Docker AppArmor profile

Kubernetes uses the container runtime's default AppArmor profile when available:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: webapp
  annotations:
    container.apparmor.security.beta.kubernetes.io/webapp: runtime/default
spec:
  containers:
  - name: webapp
    image: webapp:v1.0
```

The annotation specifies the profile for each container. The `runtime/default` profile provides basic restrictions suitable for most applications.

## Checking AppArmor availability

Verify AppArmor is enabled on nodes:

```bash
# Check if AppArmor is running
sudo aa-status

# List loaded profiles
sudo apparmor_status
```

If AppArmor is not available, the annotations are ignored and containers run unconfined.

## Creating custom AppArmor profiles

Custom profiles give precise control over container permissions:

```
#include <tunables/global>

profile webapp-restricted flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>

  # Deny writing to /etc
  deny /etc/** wl,

  # Allow reading from /etc
  /etc/** r,

  # Allow full access to /app
  /app/** rw,

  # Allow reading libraries
  /lib/** r,
  /usr/lib/** r,

  # Allow network
  network inet tcp,
  network inet udp,

  # Deny raw sockets
  deny network raw,

  # Allow reading /proc and /sys
  /proc/** r,
  /sys/** r,

  # Deny mounting filesystems
  deny mount,

  # Deny ptrace
  deny ptrace,

  # Allow common binaries
  /bin/bash ix,
  /usr/bin/node ix,
}
```

Save this as `/etc/apparmor.d/webapp-restricted` on all nodes.

## Loading AppArmor profiles

Load the profile into the kernel:

```bash
# Parse and load the profile
sudo apparmor_parser -r -W /etc/apparmor.d/webapp-restricted

# Verify it's loaded
sudo aa-status | grep webapp-restricted
```

For production, automate profile distribution across nodes using DaemonSets or configuration management tools.

## Using custom profiles in pods

Reference custom profiles in pod annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-webapp
  annotations:
    container.apparmor.security.beta.kubernetes.io/webapp: localhost/webapp-restricted
spec:
  containers:
  - name: webapp
    image: webapp:v1.0
    securityContext:
      runAsNonRoot: true
      runAsUser: 1000
      capabilities:
        drop:
        - ALL
```

The `localhost/` prefix indicates a custom profile loaded on the host.

## Building profiles in complain mode

Develop profiles iteratively using complain mode:

```
#include <tunables/global>

profile webapp-dev flags=(attach_disconnected,mediate_deleted,complain) {
  #include <abstractions/base>
  # Profile rules here
}
```

The `complain` flag logs violations without blocking them. Load the profile:

```bash
sudo apparmor_parser -r -W /etc/apparmor.d/webapp-dev
```

Deploy your application and review logs:

```bash
# View AppArmor denials
sudo journalctl -xe | grep apparmor

# Or check audit logs
sudo ausearch -m AVC
```

Use the logged denials to refine the profile, adding necessary permissions.

## Common AppArmor abstractions

AppArmor provides abstractions for common patterns:

```
profile myapp {
  #include <abstractions/base>          # Basic system access
  #include <abstractions/nameservice>   # DNS resolution
  #include <abstractions/ssl_certs>     # SSL certificate access
  #include <abstractions/openssl>       # OpenSSL libraries

  # Application-specific rules
  /app/** rw,
}
```

These abstractions include commonly needed permissions, reducing profile complexity.

## File access control

Control filesystem access with fine granularity:

```
profile webapp-files {
  # Read-only access to application code
  /app/bin/** r,
  /app/lib/** r,

  # Read-write access to data directory
  /app/data/** rw,

  # Read-only access to configuration
  /app/config/** r,

  # Write access to logs with append-only
  /app/logs/** a,

  # Deny access to sensitive files
  deny /etc/shadow r,
  deny /root/** rw,
}
```

Permissions include:
- `r` - Read
- `w` - Write
- `a` - Append
- `x` - Execute
- `ix` - Execute inheriting profile
- `px` - Execute with profile transition
- `ux` - Execute unconfined

## Network restrictions

Control network operations:

```
profile webapp-network {
  # Allow outbound HTTP/HTTPS
  network inet stream,
  network inet6 stream,

  # Allow DNS
  network inet dgram,
  network inet6 dgram,

  # Deny raw sockets (prevents packet sniffing)
  deny network raw,
  deny network packet,

  # Deny bluetooth
  deny network bluetooth,
}
```

These rules prevent containers from creating raw sockets or using unexpected network protocols.

## Capability restrictions

AppArmor can restrict capabilities:

```
profile webapp-caps {
  # Deny all capabilities
  deny capability,

  # Explicitly allow specific capabilities
  capability net_bind_service,
  capability setuid,
  capability setgid,
}
```

This complements Kubernetes securityContext capability controls.

## Process execution control

Restrict which binaries containers can execute:

```
profile webapp-exec {
  # Allow executing application binary
  /app/bin/webapp ix,

  # Allow shell scripts with inherited profile
  /bin/bash ix,
  /bin/sh ix,

  # Allow specific utilities
  /usr/bin/curl ux,
  /usr/bin/wget ux,

  # Deny executing from /tmp
  deny /tmp/** x,
}
```

The `deny /tmp/** x` rule prevents executing files from /tmp, blocking common attack patterns.

## Database containers with AppArmor

PostgreSQL profile example:

```
#include <tunables/global>

profile postgres-secure flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  # Allow database data directory
  /var/lib/postgresql/** rwk,

  # Allow configuration
  /etc/postgresql/** r,

  # Allow binaries
  /usr/lib/postgresql/** ix,
  /usr/bin/postgres ix,

  # Allow network for client connections
  network inet stream,
  network inet6 stream,

  # Deny mounting
  deny mount,

  # Deny raw network access
  deny network raw,

  # Deny ptrace
  deny ptrace,
}
```

Load and apply to PostgreSQL pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: postgres
  annotations:
    container.apparmor.security.beta.kubernetes.io/postgres: localhost/postgres-secure
spec:
  containers:
  - name: postgres
    image: postgres:15
```

## Web server AppArmor profiles

Nginx profile with strict restrictions:

```
#include <tunables/global>

profile nginx-secure flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  # Nginx binaries
  /usr/sbin/nginx ix,
  /usr/bin/nginx ix,

  # Configuration
  /etc/nginx/** r,

  # Web content (read-only)
  /usr/share/nginx/** r,
  /var/www/** r,

  # Logs
  /var/log/nginx/** w,

  # Runtime
  /var/run/nginx.pid rw,
  /run/nginx.pid rw,

  # Cache and temporary files
  /var/cache/nginx/** rw,
  /var/tmp/nginx/** rw,

  # Network
  network inet stream,
  network inet6 stream,

  # Deny mounting and ptrace
  deny mount,
  deny ptrace,

  # Deny access to sensitive files
  deny /etc/shadow r,
  deny /root/** rw,
}
```

## Debugging AppArmor issues

When AppArmor blocks legitimate operations:

```bash
# View recent denials
sudo journalctl -xe | grep apparmor | tail -20

# Use aa-genprof to build profiles interactively
sudo aa-genprof /app/bin/webapp

# Check if a profile is in enforce or complain mode
sudo aa-status
```

Common issues and solutions:

**Denied file access**: Add appropriate file rules
**Denied capability**: Add capability rules
**Denied network**: Add network rules
**Permission denied on exec**: Add execute rules with proper transitions

## Distributing AppArmor profiles via DaemonSet

Automate profile distribution:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: apparmor-profiles
  namespace: kube-system
data:
  webapp-profile: |
    #include <tunables/global>
    profile webapp flags=(attach_disconnected,mediate_deleted) {
      #include <abstractions/base>
      /app/** rw,
      deny /etc/** w,
    }
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: apparmor-loader
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: apparmor-loader
  template:
    metadata:
      labels:
        app: apparmor-loader
    spec:
      hostPID: true
      containers:
      - name: loader
        image: ubuntu:22.04
        command:
        - sh
        - -c
        - |
          apt-get update && apt-get install -y apparmor-utils
          cp /profiles/* /etc/apparmor.d/
          apparmor_parser -r -W /etc/apparmor.d/webapp-profile
          sleep infinity
        volumeMounts:
        - name: profiles
          mountPath: /profiles
        - name: apparmor-dir
          mountPath: /etc/apparmor.d
        securityContext:
          privileged: true
      volumes:
      - name: profiles
        configMap:
          name: apparmor-profiles
      - name: apparmor-dir
        hostPath:
          path: /etc/apparmor.d
```

This ensures all nodes have required AppArmor profiles.

## Enforcing AppArmor with admission controllers

Validate that pods use appropriate AppArmor profiles:

```yaml
# ValidatingWebhookConfiguration
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: apparmor-validator
webhooks:
- name: validate.apparmor.security
  rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    operations: ["CREATE", "UPDATE"]
    resources: ["pods"]
  clientConfig:
    service:
      name: apparmor-validator
      namespace: security
      path: /validate
```

The webhook ensures all pods specify AppArmor profiles, blocking those that don't.

## Monitoring AppArmor enforcement

Track AppArmor status and violations:

```yaml
# PrometheusRule
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: apparmor-alerts
spec:
  groups:
  - name: apparmor
    rules:
    - alert: AppArmorProfileNotLoaded
      expr: |
        kube_pod_annotations{annotation_container_apparmor_security_beta_kubernetes_io_container!=""}
        unless on(namespace,pod)
        apparmor_profile_loaded == 1
      annotations:
        summary: "Pod using AppArmor profile that is not loaded"

    - alert: AppArmorViolation
      expr: |
        rate(apparmor_violations_total[5m]) > 0
      annotations:
        summary: "AppArmor blocking operations"
```

## Best practices for AppArmor

Start with runtime/default profile for all containers. It provides baseline protection with broad compatibility.

Develop custom profiles in complain mode first, reviewing logs to identify necessary permissions.

Use abstractions to simplify profiles and maintain consistency.

Test profiles thoroughly in non-production before enforcing in production.

Version and store profiles in version control alongside application code.

Document why specific permissions are granted in profile comments.

Regularly review and tighten profiles as applications evolve.

## Conclusion

AppArmor provides mandatory access control that restricts container capabilities at the kernel level. By defining explicit profiles that control file access, network operations, and process execution, you create strong security boundaries that protect against compromised containers.

The runtime/default profile offers immediate security benefits with minimal effort, while custom profiles enable fine-grained control for security-sensitive workloads. When combined with other security mechanisms like seccomp, capabilities, and Pod Security Standards, AppArmor forms part of a comprehensive defense-in-depth strategy that makes Kubernetes environments significantly more secure.

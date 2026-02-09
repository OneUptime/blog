# How to Configure AppArmor Profiles for Kubernetes Pod Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Linux

Description: Learn how to create and apply AppArmor security profiles to Kubernetes containers for mandatory access control and enhanced container isolation.

---

AppArmor provides mandatory access control (MAC) that restricts programs to a limited set of resources. Unlike seccomp which filters system calls, AppArmor controls file access, network operations, and capabilities at a higher level. Applying AppArmor profiles to Kubernetes containers adds another layer of defense against container breakouts and privilege escalation.

## Understanding AppArmor Basics

AppArmor enforces security policies through profiles loaded into the Linux kernel. Each profile defines what a program can and cannot do, including which files it can access, which network operations it can perform, and which capabilities it possesses.

Profiles operate in two modes: enforce mode actively blocks violations, while complain mode logs violations without blocking them. Start with complain mode to understand application behavior, then switch to enforce mode for production security.

## Checking AppArmor Availability

Verify AppArmor support on your nodes:

```bash
# Check if AppArmor is enabled
ssh node01 "cat /sys/module/apparmor/parameters/enabled"
# Output: Y

# Check AppArmor status
ssh node01 "sudo apparmor_status"

# List loaded profiles
ssh node01 "sudo aa-status"
```

Most modern Ubuntu and Debian systems have AppArmor enabled by default. Some distributions like RHEL use SELinux instead.

## Creating a Basic AppArmor Profile

Create a profile that restricts a web application:

```bash
# /etc/apparmor.d/k8s-nginx-restricted
#include <tunables/global>

profile k8s-nginx-restricted flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>

  # Allow network operations
  network inet tcp,
  network inet udp,
  network inet6 tcp,
  network inet6 udp,

  # Allow reading configuration
  /etc/nginx/** r,
  /etc/ssl/** r,

  # Allow writing to specific directories only
  /var/log/nginx/** w,
  /var/cache/nginx/** rw,
  /var/run/nginx.pid w,

  # Deny writing to system directories
  deny /etc/** w,
  deny /usr/** w,
  deny /bin/** w,
  deny /sbin/** w,

  # Allow executing nginx binary
  /usr/sbin/nginx ix,
  /usr/sbin/nginx-debug ix,

  # Allow reading content directory
  /usr/share/nginx/html/** r,

  # Required capabilities
  capability chown,
  capability dac_override,
  capability setgid,
  capability setuid,
  capability net_bind_service,

  # Signal rules
  signal (send) set=(term, kill),
  signal (receive),

  # Deny dangerous operations
  deny /proc/sys/** w,
  deny @{PROC}/@{pid}/mem r,
  deny ptrace,
  deny mount,
  deny umount,
}
```

This profile:
- Allows network operations necessary for web serving
- Permits reading configuration and content
- Restricts writing to specific logging directories
- Denies modifications to system files
- Blocks dangerous operations like ptrace and mount

## Loading AppArmor Profiles on Nodes

Deploy profiles using a DaemonSet:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: apparmor-profiles
  namespace: kube-system
data:
  k8s-nginx-restricted: |
    #include <tunables/global>

    profile k8s-nginx-restricted flags=(attach_disconnected,mediate_deleted) {
      #include <abstractions/base>

      network inet tcp,
      network inet udp,

      /etc/nginx/** r,
      /var/log/nginx/** w,
      /var/cache/nginx/** rw,
      /usr/share/nginx/html/** r,

      deny /etc/** w,
      deny /usr/** w,

      capability net_bind_service,
      capability setgid,
      capability setuid,

      deny mount,
      deny umount,
      deny ptrace,
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
      initContainers:
      - name: loader
        image: ubuntu:22.04
        command:
        - /bin/bash
        - -c
        - |
          #!/bin/bash
          set -e

          # Install AppArmor utilities
          apt-get update
          apt-get install -y apparmor-utils

          # Copy profiles to host
          cp /profiles/* /host-profiles/

          # Load profiles
          for profile in /host-profiles/*; do
            if [ -f "$profile" ]; then
              echo "Loading profile: $(basename $profile)"
              apparmor_parser -r -W "$profile"
            fi
          done

          echo "AppArmor profiles loaded successfully"
        volumeMounts:
        - name: profiles
          mountPath: /profiles
        - name: host-profiles
          mountPath: /host-profiles
        - name: sys
          mountPath: /sys
        securityContext:
          privileged: true
      containers:
      - name: pause
        image: k8s.gcr.io/pause:3.5
        resources:
          requests:
            cpu: 10m
            memory: 20Mi
      volumes:
      - name: profiles
        configMap:
          name: apparmor-profiles
      - name: host-profiles
        hostPath:
          path: /etc/apparmor.d
      - name: sys
        hostPath:
          path: /sys
```

## Applying AppArmor to Pods

Use annotations to apply AppArmor profiles:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-secure
  annotations:
    container.apparmor.security.beta.kubernetes.io/nginx: localhost/k8s-nginx-restricted
spec:
  containers:
  - name: nginx
    image: nginx:1.21
    ports:
    - containerPort: 80
    volumeMounts:
    - name: html
      mountPath: /usr/share/nginx/html
  volumes:
  - name: html
    emptyDir: {}
```

The annotation format is `container.apparmor.security.beta.kubernetes.io/<container-name>: <profile>`.

Profile options:
- `runtime/default`: Use the container runtime's default profile
- `localhost/<profile-name>`: Use a profile loaded on the node
- `unconfined`: No AppArmor restrictions (never use in production)

## Creating Application-Specific Profiles

Generate a profile by analyzing application behavior:

```bash
# Run application in complain mode
sudo aa-genprof /usr/sbin/nginx

# In another terminal, exercise the application
curl http://localhost
curl http://localhost/admin
# ... perform all application operations

# Back in the aa-genprof terminal, save the profile
# Press 'S' to save

# The generated profile is saved to /etc/apparmor.d/
```

Refine the generated profile:

```bash
# Edit the profile
sudo vi /etc/apparmor.d/usr.sbin.nginx

# Test in complain mode
sudo aa-complain /usr/sbin/nginx

# Monitor logs for violations
sudo tail -f /var/log/syslog | grep apparmor

# Switch to enforce mode when ready
sudo aa-enforce /usr/sbin.nginx
```

## Multi-Container Pod Example

Apply different profiles to different containers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-tier-app
  annotations:
    container.apparmor.security.beta.kubernetes.io/web: localhost/k8s-nginx-restricted
    container.apparmor.security.beta.kubernetes.io/api: localhost/k8s-api-restricted
    container.apparmor.security.beta.kubernetes.io/cache: runtime/default
spec:
  containers:
  - name: web
    image: nginx:1.21
    ports:
    - containerPort: 80

  - name: api
    image: myapi:latest
    ports:
    - containerPort: 8080

  - name: cache
    image: redis:7
    ports:
    - containerPort: 6379
```

## Database Profile Example

Create a profile for PostgreSQL:

```bash
# /etc/apparmor.d/k8s-postgres-restricted
#include <tunables/global>

profile k8s-postgres-restricted flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/nameservice>
  #include <abstractions/openssl>

  # Network access
  network inet stream,
  network inet6 stream,

  # PostgreSQL binaries
  /usr/lib/postgresql/** ix,
  /usr/bin/postgres ix,

  # Configuration files
  /etc/postgresql/** r,
  /var/lib/postgresql/** rw,

  # Data directory
  /var/lib/postgresql/data/** rwk,

  # Allow UNIX socket
  /var/run/postgresql/.s.PGSQL.* rw,
  /tmp/.s.PGSQL.* rw,

  # Capabilities needed by PostgreSQL
  capability chown,
  capability dac_override,
  capability dac_read_search,
  capability fowner,
  capability fsetid,
  capability kill,
  capability setgid,
  capability setuid,
  capability sys_resource,

  # IPC
  capability ipc_lock,

  # Deny dangerous operations
  deny /proc/sys/** w,
  deny mount,
  deny umount,
  deny ptrace,

  # Prevent modification of executables
  deny /usr/** w,
  deny /bin/** w,
  deny /sbin/** w,
}
```

## Debugging AppArmor Denials

When applications fail due to AppArmor restrictions:

```bash
# Check AppArmor audit logs
ssh node01 "sudo dmesg | grep apparmor | tail -20"

# Or check syslog
ssh node01 "sudo grep apparmor /var/log/syslog | tail -20"

# Use aa-notify for user-friendly messages
ssh node01 "sudo aa-notify -s 1 -v"

# Generate summary of denials
ssh node01 "sudo aa-logprof"
```

Example denial message:

```
audit: type=1400 audit(1612345678.123:456): apparmor="DENIED" operation="open"
profile="k8s-nginx-restricted" name="/etc/shadow" pid=1234 comm="nginx"
requested_mask="r" denied_mask="r" fsuid=33 ouid=0
```

This shows nginx tried to read `/etc/shadow` which the profile denies.

## Testing Profiles Before Deployment

Create a test pod to validate profiles:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: apparmor-test
  annotations:
    container.apparmor.security.beta.kubernetes.io/test: localhost/k8s-nginx-restricted
spec:
  containers:
  - name: test
    image: nginx:1.21
    command:
    - /bin/bash
    - -c
    - |
      echo "Test 1: Reading allowed file"
      cat /etc/nginx/nginx.conf > /dev/null && echo "PASS" || echo "FAIL"

      echo "Test 2: Writing to allowed directory"
      echo "test" > /var/log/nginx/test.log && echo "PASS" || echo "FAIL"

      echo "Test 3: Writing to denied directory (should fail)"
      echo "test" > /etc/test.txt 2>&1 | grep -q "Permission denied" && echo "PASS (correctly denied)" || echo "FAIL"

      echo "Test 4: Attempting ptrace (should fail)"
      strace -p 1 2>&1 | grep -q "Operation not permitted" && echo "PASS (correctly denied)" || echo "FAIL"

      echo "All tests complete"
      sleep 300
```

## Deployment with Helm

Create a Helm chart for AppArmor-secured applications:

```yaml
# templates/daemonset-apparmor.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: {{ .Release.Name }}-apparmor-loader
  namespace: {{ .Release.Namespace }}
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
      initContainers:
      - name: loader
        image: {{ .Values.apparmor.loaderImage }}
        command: ["/load-profiles.sh"]
        volumeMounts:
        - name: profiles
          mountPath: /profiles
        - name: host-apparmor
          mountPath: /etc/apparmor.d
        - name: sys
          mountPath: /sys
        securityContext:
          privileged: true
      containers:
      - name: pause
        image: k8s.gcr.io/pause:3.5
      volumes:
      - name: profiles
        configMap:
          name: {{ .Release.Name }}-apparmor-profiles
      - name: host-apparmor
        hostPath:
          path: /etc/apparmor.d
      - name: sys
        hostPath:
          path: /sys
---
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}
      annotations:
        container.apparmor.security.beta.kubernetes.io/{{ .Chart.Name }}: localhost/{{ .Values.apparmor.profile }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
        ports:
        - containerPort: {{ .Values.service.port }}
```

## Monitoring AppArmor Status

Check profile enforcement across the cluster:

```bash
#!/bin/bash
# check-apparmor-status.sh

echo "AppArmor Status Across Cluster"
echo "==============================="

nodes=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}')

for node in $nodes; do
  echo ""
  echo "Node: $node"
  echo "---"

  # Check if AppArmor is enabled
  enabled=$(ssh $node "cat /sys/module/apparmor/parameters/enabled 2>/dev/null")
  echo "AppArmor enabled: $enabled"

  # List loaded profiles
  profiles=$(ssh $node "sudo apparmor_status --profiled 2>/dev/null | wc -l")
  echo "Loaded profiles: $profiles"

  # Check enforcement
  enforced=$(ssh $node "sudo apparmor_status --enforced 2>/dev/null | wc -l")
  complain=$(ssh $node "sudo apparmor_status --complaining 2>/dev/null | wc -l")
  echo "Enforced: $enforced, Complain: $complain"
done
```

## Best Practices

Start with complain mode to understand application behavior before enforcing restrictions. This prevents breaking functional applications.

Use abstractions and includes to avoid duplicating common rules. AppArmor provides abstractions like `<abstractions/base>` for common operations.

Test profiles thoroughly in development before deploying to production. AppArmor denials can cause mysterious application failures.

Version control your profiles and track changes. Document why specific permissions are granted or denied.

Monitor AppArmor logs regularly to detect policy violations and potential security issues.

Use the most restrictive profile possible while still allowing necessary functionality. Deny by default, allow specifically.

## Conclusion

AppArmor profiles provide mandatory access control for Kubernetes containers, adding defense-in-depth security beyond namespace isolation. By restricting file access, network operations, and capabilities, AppArmor limits the damage from container compromises. Create profiles methodically, test thoroughly, and monitor continuously to maintain both security and functionality.

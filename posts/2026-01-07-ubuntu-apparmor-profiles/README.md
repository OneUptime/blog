# Creating and Managing AppArmor Profiles on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, AppArmor, Security, Containers

Description: Write custom AppArmor profiles to confine applications on Ubuntu. Covers enforce vs complain modes, profile syntax, debugging denials, and Docker container integration.

---

## Introduction

AppArmor (Application Armor) is a Linux Security Module (LSM) that provides Mandatory Access Control (MAC) for programs. Unlike traditional Unix discretionary access controls (DAC) that rely on user and group permissions, AppArmor confines individual programs to a limited set of resources based on security profiles. This tutorial will guide you through understanding, configuring, and managing AppArmor profiles on Ubuntu systems.

AppArmor has been the default security module in Ubuntu since version 7.10 (Gutsy Gibbon), making it an integral part of Ubuntu's security architecture. By learning to work with AppArmor, you can significantly enhance your system's security posture by limiting what applications can do, even if they become compromised.

## Prerequisites

Before we begin, ensure you have:

- Ubuntu 20.04 LTS or later (this guide uses Ubuntu 22.04/24.04)
- Root or sudo access to your system
- Basic understanding of Linux file permissions and command line

## AppArmor vs SELinux: Understanding the Differences

Both AppArmor and SELinux provide Mandatory Access Control, but they take different approaches:

### AppArmor Characteristics

- **Path-based access control**: Rules are defined based on file paths
- **Easier learning curve**: Simpler syntax and configuration
- **Profile-based**: Each application has its own profile
- **Default on Ubuntu, SUSE, and Debian-based distributions**
- **Deny by default with explicit allow rules**

### SELinux Characteristics

- **Label-based access control**: Uses security labels/contexts on files
- **More complex but granular**: Offers finer-grained control
- **Policy-based**: Uses comprehensive system-wide policies
- **Default on Red Hat, CentOS, and Fedora**
- **Steeper learning curve but potentially more secure**

### When to Choose AppArmor

AppArmor is ideal when:

- You need quick deployment of application confinement
- Your team is new to MAC systems
- You want to confine specific applications without system-wide policy changes
- You're running Ubuntu or Debian-based systems

## Understanding AppArmor Architecture

AppArmor operates through profiles that define what resources a program can access. Let's explore the core concepts:

### Profile Components

1. **Profile Header**: Defines which executable the profile applies to
2. **Capability Rules**: Control Linux capabilities the program can use
3. **File Rules**: Define file access permissions
4. **Network Rules**: Control network access
5. **Include Statements**: Import common rules from abstraction files

### Profile Storage Locations

AppArmor profiles are stored in specific directories:

```bash
# Main profile directory - contains active profiles
/etc/apparmor.d/

# Abstractions - reusable rule sets
/etc/apparmor.d/abstractions/

# Tunables - variables used across profiles
/etc/apparmor.d/tunables/

# Local overrides - customize profiles without modifying originals
/etc/apparmor.d/local/

# Cache for compiled profiles (improves load time)
/etc/apparmor.d/cache/
```

## Installing AppArmor Utilities

While AppArmor is pre-installed on Ubuntu, you'll need additional utilities for profile management:

```bash
# Install AppArmor utilities including aa-genprof and aa-logprof
sudo apt update
sudo apt install apparmor-utils apparmor-profiles apparmor-profiles-extra

# Verify AppArmor is enabled and running
sudo aa-status
```

The `aa-status` command shows the current state of AppArmor, including loaded profiles and their modes.

## AppArmor Modes: Enforce vs Complain

AppArmor profiles can operate in two main modes:

### Enforce Mode

In enforce mode, AppArmor actively blocks any access not explicitly permitted by the profile. This is the production-ready mode:

```bash
# Set a profile to enforce mode
sudo aa-enforce /etc/apparmor.d/usr.bin.firefox

# Or specify the program path directly
sudo aa-enforce /usr/bin/firefox
```

### Complain Mode

In complain mode, AppArmor logs violations but doesn't block them. This is useful for testing and profile development:

```bash
# Set a profile to complain mode for testing
sudo aa-complain /etc/apparmor.d/usr.bin.firefox

# Or specify the program path
sudo aa-complain /usr/bin/firefox
```

### Disabled State

You can also disable a profile entirely:

```bash
# Disable a specific profile
sudo aa-disable /etc/apparmor.d/usr.bin.firefox

# This creates a symlink in the disable directory
ls -la /etc/apparmor.d/disable/
```

## Viewing Existing Profiles

Let's explore what profiles are already on your system:

### Checking AppArmor Status

```bash
# Display comprehensive AppArmor status
sudo aa-status

# Example output shows:
# - Number of loaded profiles
# - Profiles in enforce mode
# - Profiles in complain mode
# - Processes with profiles
# - Unconfined processes with profiles
```

### Listing All Profiles

```bash
# List all profile files in the main directory
ls -la /etc/apparmor.d/

# List only profile files (excluding directories and abstractions)
ls /etc/apparmor.d/ | grep -v "^abstractions\|^tunables\|^local\|^cache\|^disable\|^force-complain"
```

### Examining a Specific Profile

```bash
# View the contents of a profile (e.g., for cups-browsed)
cat /etc/apparmor.d/usr.sbin.cups-browsed

# View with syntax highlighting using less
less /etc/apparmor.d/usr.sbin.cups-browsed
```

### Finding Profiles for Running Processes

```bash
# Check which running processes have AppArmor profiles
ps auxZ | grep -v "^unconfined"

# Or use aa-status for a cleaner view
sudo aa-status | grep -A 100 "processes have profiles"
```

## Understanding Profile Syntax

AppArmor profiles use a specific syntax. Let's break down the components:

### Basic Profile Structure

```bash
# Example profile structure for a custom application
# Profile name matches the executable path with dots replacing slashes

#include <tunables/global>

/usr/bin/myapp {
  # Include common abstractions for base functionality
  #include <abstractions/base>

  # Capability rules - what kernel capabilities the app can use
  capability net_bind_service,
  capability setuid,

  # Network rules - control network access
  network inet stream,
  network inet dgram,

  # File rules - define file access permissions
  # r = read, w = write, x = execute, m = memory map
  # k = lock, l = link, a = append

  /usr/bin/myapp mr,
  /etc/myapp.conf r,
  /var/log/myapp.log w,
  /tmp/myapp/** rw,

  # Deny specific access explicitly
  deny /etc/shadow r,
  deny /etc/passwd w,
}
```

### File Permission Flags

Understanding file permission flags is crucial:

```bash
# File permission reference for AppArmor profiles
#
# r  - read
# w  - write
# a  - append (implies w)
# x  - execute (discrete execution)
# m  - memory map executable
# k  - file locking
# l  - link (create hard links)
# ix - inherit execute (child inherits parent's profile)
# px - discrete profile execute (child uses its own profile)
# Px - discrete profile execute (clean environment)
# ux - unconfined execute (child runs unconfined)
# Ux - unconfined execute (clean environment)
# cx - child profile execute
# Cx - child profile execute (clean environment)
```

### Globbing Patterns

AppArmor supports glob patterns for flexible file matching:

```bash
# Globbing patterns in AppArmor profiles

# Single asterisk - matches any characters except /
/var/log/*.log r,

# Double asterisk - matches any characters including /
/home/**/documents/** r,

# Question mark - matches exactly one character
/tmp/file?.txt rw,

# Character classes - match specific characters
/var/log/app[0-9].log r,

# Alternatives - match one of several options
/etc/{passwd,group,shadow} r,
```

### Common Abstractions

Abstractions are reusable rule sets for common functionality:

```bash
# Commonly used abstractions and their purposes

# Base system access - almost always needed
#include <abstractions/base>

# Name resolution (DNS, hosts file)
#include <abstractions/nameservice>

# User home directory access
#include <abstractions/user-tmp>

# Audio playback
#include <abstractions/audio>

# X11 display access
#include <abstractions/X>

# GNOME desktop integration
#include <abstractions/gnome>

# KDE desktop integration
#include <abstractions/kde>

# SSL/TLS certificates
#include <abstractions/ssl_certs>

# PHP interpreter
#include <abstractions/php>

# Python interpreter
#include <abstractions/python>
```

## Creating Custom Profiles

Now let's create custom profiles for your applications.

### Method 1: Using aa-genprof (Recommended)

The `aa-genprof` tool creates profiles by monitoring application behavior:

```bash
# Start profile generation for an application
# This runs the application in complain mode and monitors its behavior
sudo aa-genprof /usr/bin/myapp
```

After running the command, follow these steps:

1. In another terminal, run your application normally
2. Perform all typical operations the application needs
3. Return to the aa-genprof terminal and press 'S' to scan logs
4. Review and approve suggested rules
5. Press 'F' to finish when done

### Method 2: Manual Profile Creation

For more control, create profiles manually:

```bash
# Create a new profile file for a custom application
sudo nano /etc/apparmor.d/usr.local.bin.myapp
```

Add the following content:

```bash
# AppArmor profile for custom application
# Path: /etc/apparmor.d/usr.local.bin.myapp

#include <tunables/global>

/usr/local/bin/myapp flags=(attach_disconnected) {
  # Include base abstractions for essential system access
  #include <abstractions/base>
  #include <abstractions/nameservice>

  # Allow reading the application binary
  /usr/local/bin/myapp mr,

  # Configuration files - read only
  /etc/myapp/ r,
  /etc/myapp/** r,

  # Data directory - full access
  /var/lib/myapp/ rw,
  /var/lib/myapp/** rwk,

  # Log files - append only for security
  /var/log/myapp/ rw,
  /var/log/myapp/** w,

  # Temporary files
  /tmp/myapp-* rw,
  /run/myapp.pid rw,

  # Network access - restrict to specific protocols
  network inet stream,
  network inet6 stream,

  # Required capabilities
  capability net_bind_service,
  capability setgid,
  capability setuid,

  # Deny access to sensitive system files
  deny /etc/shadow r,
  deny /etc/gshadow r,
  deny /root/** rwx,

  # Include local customizations
  #include <local/usr.local.bin.myapp>
}
```

### Loading and Testing the Profile

```bash
# Parse and load the new profile
sudo apparmor_parser -r /etc/apparmor.d/usr.local.bin.myapp

# Verify the profile is loaded
sudo aa-status | grep myapp

# Start in complain mode for testing
sudo aa-complain /usr/local/bin/myapp

# Run your application and check for issues
/usr/local/bin/myapp

# Check logs for any denials or complaints
sudo dmesg | grep -i apparmor | tail -20
```

## Creating a Profile for a Web Application

Let's create a practical example for a Node.js web application:

```bash
# AppArmor profile for a Node.js application
# Path: /etc/apparmor.d/opt.mywebapp.server.js

#include <tunables/global>

profile mywebapp /usr/bin/node /opt/mywebapp/server.js {
  # Base abstractions
  #include <abstractions/base>
  #include <abstractions/nameservice>
  #include <abstractions/ssl_certs>

  # Node.js binary access
  /usr/bin/node mrix,

  # Application directory - read and execute
  /opt/mywebapp/ r,
  /opt/mywebapp/** r,
  /opt/mywebapp/node_modules/** mr,
  /opt/mywebapp/node_modules/.bin/* rix,

  # NPM global modules
  /usr/lib/node_modules/** mr,

  # Data storage
  /var/lib/mywebapp/ rw,
  /var/lib/mywebapp/** rwk,

  # Upload directory with restricted permissions
  /var/lib/mywebapp/uploads/ rw,
  /var/lib/mywebapp/uploads/** rw,

  # Log files
  /var/log/mywebapp/ rw,
  /var/log/mywebapp/** w,

  # Temporary files for uploads and processing
  /tmp/mywebapp-* rw,
  owner /tmp/npm-* rw,

  # Process and runtime files
  /run/mywebapp.pid rw,
  /run/mywebapp.sock rw,

  # Network access for web server
  network inet stream,
  network inet6 stream,
  network unix stream,

  # Capabilities needed for binding to privileged ports
  capability net_bind_service,
  capability setgid,
  capability setuid,
  capability dac_override,

  # Proc filesystem access
  @{PROC}/@{pid}/fd/ r,
  @{PROC}/@{pid}/stat r,
  @{PROC}/@{pid}/status r,

  # Deny access to sensitive areas
  deny /etc/shadow r,
  deny /etc/gshadow r,
  deny /home/** rwx,
  deny /root/** rwx,

  # Local customizations
  #include <local/opt.mywebapp.server.js>
}
```

## Debugging Profile Issues

When applications don't work correctly under AppArmor, here's how to debug:

### Checking Audit Logs

```bash
# View recent AppArmor messages in the kernel log
sudo dmesg | grep -i apparmor | tail -50

# Or check the audit log directly
sudo cat /var/log/audit/audit.log | grep apparmor

# For systems using journald
sudo journalctl -k | grep -i apparmor
```

### Understanding Denial Messages

AppArmor denial messages contain valuable information:

```bash
# Example denial message breakdown:
# audit: type=1400 audit(1234567890.123:456):
#   apparmor="DENIED"
#   operation="open"
#   profile="/usr/bin/myapp"
#   name="/etc/secret.conf"
#   pid=1234
#   comm="myapp"
#   requested_mask="r"
#   denied_mask="r"
#   fsuid=1000
#   ouid=0

# Key fields:
# - apparmor: DENIED or ALLOWED
# - operation: What was attempted (open, read, write, exec)
# - profile: Which profile caught this
# - name: The resource being accessed
# - requested_mask: What access was requested
# - denied_mask: What was actually denied
```

### Using aa-logprof for Iterative Development

```bash
# Scan logs and suggest profile updates
sudo aa-logprof

# This interactive tool will:
# 1. Parse denial messages from logs
# 2. Suggest rules to add to profiles
# 3. Let you accept, deny, or modify suggestions
# 4. Update profiles automatically
```

### Common Issues and Solutions

```bash
# Issue: Application can't read its own binary
# Solution: Add memory map permission
/usr/bin/myapp mr,

# Issue: Application can't execute child processes
# Solution: Use appropriate execute mode
/usr/bin/helper px,  # Use child's own profile
/usr/bin/helper ix,  # Inherit parent's profile
/usr/bin/helper ux,  # Run unconfined (less secure)

# Issue: Application needs access to /proc
# Solution: Add proc filesystem rules
@{PROC}/@{pid}/ r,
@{PROC}/@{pid}/** r,

# Issue: Application uses Unix sockets
# Solution: Add network unix rules
network unix stream,
network unix dgram,

# Issue: Dynamic library loading fails
# Solution: Include the base abstraction
#include <abstractions/base>
```

### Testing Profiles Safely

```bash
# Test a profile in complain mode first
sudo aa-complain /etc/apparmor.d/usr.bin.myapp

# Run comprehensive tests on your application
# All violations will be logged but not blocked

# Review what would have been blocked
sudo cat /var/log/syslog | grep "apparmor.*ALLOWED"

# Once satisfied, switch to enforce mode
sudo aa-enforce /etc/apparmor.d/usr.bin.myapp

# Monitor for any issues in production
sudo tail -f /var/log/syslog | grep apparmor
```

## Docker and Container Integration

AppArmor is an essential security layer for containerized applications.

### Default Docker AppArmor Profile

Docker applies a default AppArmor profile called `docker-default` to all containers:

```bash
# View the default Docker AppArmor profile
cat /etc/apparmor.d/docker-default 2>/dev/null || \
  docker run --rm alpine cat /etc/apparmor.d/docker-default

# Check if Docker is using AppArmor
docker info | grep -i apparmor

# List containers with their AppArmor profiles
docker ps --format "table {{.Names}}\t{{.Status}}" && \
docker inspect --format='{{.Name}} - {{.AppArmorProfile}}' $(docker ps -q)
```

### Creating Custom Container Profiles

Create a custom profile for specific containers:

```bash
# Custom AppArmor profile for a web container
# Path: /etc/apparmor.d/docker-nginx-custom

#include <tunables/global>

profile docker-nginx-custom flags=(attach_disconnected,mediate_deleted) {
  # Include Docker default abstractions
  #include <abstractions/base>

  # Network access for web serving
  network inet stream,
  network inet6 stream,
  network unix stream,

  # File access patterns for nginx
  /etc/nginx/** r,
  /var/log/nginx/** w,
  /var/cache/nginx/** rw,
  /run/nginx.pid rw,
  /usr/share/nginx/** r,

  # Serve static content
  /var/www/html/** r,

  # Deny sensitive operations
  deny mount,
  deny umount,
  deny pivot_root,
  deny ptrace,

  # Deny access to sensitive paths
  deny /proc/sys/kernel/** wklx,
  deny /sys/firmware/** rwklx,
  deny /sys/kernel/** rwklx,

  # Capabilities - minimal set for nginx
  capability chown,
  capability dac_override,
  capability setgid,
  capability setuid,
  capability net_bind_service,
}
```

### Loading and Using Custom Container Profiles

```bash
# Load the custom profile
sudo apparmor_parser -r /etc/apparmor.d/docker-nginx-custom

# Verify the profile is loaded
sudo aa-status | grep docker-nginx-custom

# Run a container with the custom profile
docker run -d \
  --name secure-nginx \
  --security-opt apparmor=docker-nginx-custom \
  -p 80:80 \
  nginx:latest

# Verify the container is using the profile
docker inspect secure-nginx --format='{{.AppArmorProfile}}'
```

### Running Containers Without AppArmor (Not Recommended)

```bash
# Run a container without AppArmor (for debugging only)
docker run -d \
  --name unconfined-app \
  --security-opt apparmor=unconfined \
  myapp:latest

# Warning: This removes AppArmor protection from the container
# Only use for debugging purposes
```

### Kubernetes and AppArmor

For Kubernetes deployments, specify AppArmor profiles in pod annotations:

```yaml
# Kubernetes pod with custom AppArmor profile
# The profile must be loaded on all nodes where the pod might run
apiVersion: v1
kind: Pod
metadata:
  name: secure-nginx
  annotations:
    # Format: container.apparmor.security.beta.kubernetes.io/<container-name>: <profile>
    container.apparmor.security.beta.kubernetes.io/nginx: localhost/docker-nginx-custom
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80
```

### Loading Profiles Across Kubernetes Nodes

```bash
# Create a DaemonSet to load AppArmor profiles on all nodes
# Save this as apparmor-loader.yaml

# First, create a ConfigMap with your profiles
kubectl create configmap apparmor-profiles \
  --from-file=/etc/apparmor.d/docker-nginx-custom \
  --namespace=kube-system
```

```yaml
# DaemonSet to load AppArmor profiles on all nodes
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: apparmor-loader
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: apparmor-loader
  template:
    metadata:
      labels:
        name: apparmor-loader
    spec:
      containers:
      - name: apparmor-loader
        image: ubuntu:22.04
        command:
        - /bin/bash
        - -c
        - |
          cp /profiles/* /etc/apparmor.d/
          apparmor_parser -r /etc/apparmor.d/docker-*
          sleep infinity
        volumeMounts:
        - name: profiles
          mountPath: /profiles
        - name: apparmor
          mountPath: /etc/apparmor.d
        securityContext:
          privileged: true
      volumes:
      - name: profiles
        configMap:
          name: apparmor-profiles
      - name: apparmor
        hostPath:
          path: /etc/apparmor.d
```

## Advanced Profile Techniques

### Using Variables and Tunables

```bash
# Define custom variables in /etc/apparmor.d/tunables/myapp
@{MYAPP_HOME}=/opt/myapp
@{MYAPP_DATA}=/var/lib/myapp
@{MYAPP_LOGS}=/var/log/myapp

# Use variables in your profile
/etc/apparmor.d/usr.local.bin.myapp

#include <tunables/global>
#include <tunables/myapp>

/usr/local/bin/myapp {
  #include <abstractions/base>

  # Use variables for cleaner paths
  @{MYAPP_HOME}/ r,
  @{MYAPP_HOME}/** r,
  @{MYAPP_DATA}/ rw,
  @{MYAPP_DATA}/** rwk,
  @{MYAPP_LOGS}/** w,
}
```

### Conditional Rules with Hats

Hats allow different rule sets within the same profile:

```bash
# Profile with hats for different operation modes
/usr/bin/myapp {
  #include <abstractions/base>

  # Default rules apply to main process
  /usr/bin/myapp mr,
  /etc/myapp/main.conf r,

  # Hat for privileged operations
  ^admin {
    /etc/myapp/** rw,
    /var/lib/myapp/** rwk,
    capability sys_admin,
  }

  # Hat for read-only operations
  ^reader {
    /var/lib/myapp/** r,
    deny /var/lib/myapp/** w,
  }
}
```

### Signal Rules

Control which signals applications can send and receive:

```bash
# Signal rules in AppArmor profiles
/usr/bin/myapp {
  #include <abstractions/base>

  # Allow sending specific signals
  signal send set=(term, kill) peer=/usr/bin/helper,

  # Allow receiving signals from init system
  signal receive set=(term, hup) peer=unconfined,

  # Deny sending signals to other processes
  deny signal send peer=@{profile_name},
}
```

### Dbus Rules

Control D-Bus communication:

```bash
# D-Bus rules for desktop applications
/usr/bin/mydesktopapp {
  #include <abstractions/base>
  #include <abstractions/dbus-session>

  # Allow owning a specific bus name
  dbus (send, receive) bus=session
       path=/org/myapp/**
       interface=org.myapp.*,

  # Allow communication with specific services
  dbus send bus=session
       path=/org/freedesktop/Notifications
       interface=org.freedesktop.Notifications
       member=Notify,
}
```

## Profile Management Best Practices

### Version Control Your Profiles

```bash
# Create a git repository for your custom profiles
sudo mkdir -p /opt/apparmor-profiles
cd /opt/apparmor-profiles
sudo git init

# Copy custom profiles to the repository
sudo cp /etc/apparmor.d/local/* /opt/apparmor-profiles/local/
sudo cp /etc/apparmor.d/usr.local.* /opt/apparmor-profiles/

# Commit changes
sudo git add .
sudo git commit -m "Initial AppArmor profile commit"

# Create a deployment script
cat << 'EOF' | sudo tee /opt/apparmor-profiles/deploy.sh
#!/bin/bash
# Deploy AppArmor profiles to the system
cp -r /opt/apparmor-profiles/local/* /etc/apparmor.d/local/
cp /opt/apparmor-profiles/usr.local.* /etc/apparmor.d/
apparmor_parser -r /etc/apparmor.d/usr.local.*
EOF
sudo chmod +x /opt/apparmor-profiles/deploy.sh
```

### Automated Profile Testing

```bash
# Create a test script for AppArmor profiles
cat << 'EOF' | sudo tee /usr/local/bin/test-apparmor-profile
#!/bin/bash
# Test an AppArmor profile in complain mode

PROFILE=$1
if [ -z "$PROFILE" ]; then
    echo "Usage: $0 <profile-path>"
    exit 1
fi

# Enable complain mode
aa-complain "$PROFILE"

# Clear kernel ring buffer
dmesg -C

echo "Profile in complain mode. Run your application tests now."
echo "Press Enter when done to view results..."
read

# Show any complaints
echo "=== AppArmor Complaints ==="
dmesg | grep -i apparmor

# Prompt for enforce mode
echo ""
read -p "Switch to enforce mode? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    aa-enforce "$PROFILE"
    echo "Profile now in enforce mode"
fi
EOF
sudo chmod +x /usr/local/bin/test-apparmor-profile
```

### Monitoring and Alerting

```bash
# Create a monitoring script for AppArmor denials
cat << 'EOF' | sudo tee /usr/local/bin/monitor-apparmor
#!/bin/bash
# Monitor AppArmor denials in real-time

echo "Monitoring AppArmor denials... (Ctrl+C to stop)"
echo "=============================================="

# Use journalctl to follow kernel messages
journalctl -kf | grep --line-buffered -i "apparmor.*denied" | while read line; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line"

    # Optional: Send alert (uncomment and configure as needed)
    # echo "$line" | mail -s "AppArmor Denial Alert" admin@example.com
done
EOF
sudo chmod +x /usr/local/bin/monitor-apparmor
```

## Troubleshooting Common Issues

### Profile Won't Load

```bash
# Check for syntax errors in the profile
sudo apparmor_parser -Q /etc/apparmor.d/your.profile

# If there are errors, get detailed output
sudo apparmor_parser -d /etc/apparmor.d/your.profile

# Common syntax errors:
# - Missing comma at end of rules
# - Incorrect path patterns
# - Invalid permission flags
# - Missing closing brace
```

### Application Crashes Under AppArmor

```bash
# Step 1: Switch to complain mode
sudo aa-complain /path/to/executable

# Step 2: Run the application and reproduce the crash
/path/to/executable

# Step 3: Collect denial information
sudo dmesg | grep apparmor > /tmp/apparmor-denials.txt

# Step 4: Use aa-logprof to generate missing rules
sudo aa-logprof

# Step 5: Test again and iterate
```

### Profile Conflicts

```bash
# Check if multiple profiles match the same executable
sudo aa-status | grep -A5 "profiles in"

# Verify profile attachment
ps auxZ | grep your-process

# Check profile mode
cat /sys/kernel/security/apparmor/profiles | grep your-profile
```

## Conclusion

AppArmor provides a powerful yet accessible way to implement Mandatory Access Control on Ubuntu systems. By creating well-designed profiles, you can significantly reduce the attack surface of your applications and containers. Key takeaways include:

1. **Start in complain mode**: Always test profiles thoroughly before enforcing them
2. **Use aa-genprof**: Let the tool do the heavy lifting for initial profile creation
3. **Iterate with aa-logprof**: Refine profiles based on actual application behavior
4. **Version control your profiles**: Treat security configurations as code
5. **Monitor continuously**: Set up alerting for AppArmor denials in production
6. **Layer with containers**: Combine AppArmor with Docker/Kubernetes for defense in depth

With these practices, you can build a robust security posture that protects your Ubuntu systems and containerized workloads from both known and unknown threats.

## Further Reading

- [Ubuntu AppArmor Documentation](https://ubuntu.com/server/docs/security-apparmor)
- [AppArmor Wiki](https://gitlab.com/apparmor/apparmor/-/wikis/home)
- [Docker Security Documentation](https://docs.docker.com/engine/security/)
- [Kubernetes AppArmor Tutorial](https://kubernetes.io/docs/tutorials/security/apparmor/)

# How to Configure SELinux on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, SELinux, Security, MAC, Access Control, Tutorial

Description: Complete guide to installing and configuring SELinux mandatory access control on Ubuntu.

---

## Introduction

Security-Enhanced Linux (SELinux) is a powerful mandatory access control (MAC) security mechanism originally developed by the National Security Agency (NSA). While Ubuntu ships with AppArmor as its default MAC system, SELinux offers a more granular and comprehensive security framework that many enterprise environments prefer. This guide walks you through installing, configuring, and managing SELinux on Ubuntu systems.

## Understanding SELinux Concepts

### What is Mandatory Access Control?

Traditional Linux security relies on Discretionary Access Control (DAC), where file owners determine access permissions. Mandatory Access Control (MAC) adds an additional security layer where the system enforces policies regardless of file ownership.

### Core SELinux Components

**Security Contexts**: Every process and file in SELinux has a security context consisting of four parts:

```
user:role:type:level
```

- **User**: SELinux user identity (different from Linux users)
- **Role**: Defines what types a user can access
- **Type**: The primary mechanism for access control (also called domain for processes)
- **Level**: Used for Multi-Level Security (MLS)

**Type Enforcement (TE)**: The primary access control mechanism where rules define which types can access other types.

**Role-Based Access Control (RBAC)**: Controls which roles can transition to which domains.

**Multi-Level Security (MLS)**: Implements hierarchical security levels for classified environments.

## SELinux vs AppArmor on Ubuntu

Ubuntu uses AppArmor by default, but SELinux offers distinct advantages:

| Feature | SELinux | AppArmor |
|---------|---------|----------|
| Policy Model | Type Enforcement | Path-based |
| Granularity | Very fine-grained | Moderate |
| Complexity | Higher learning curve | Easier to learn |
| File Labeling | Persistent labels on files | No file labels |
| Default in | RHEL, Fedora, CentOS | Ubuntu, SUSE |
| MLS Support | Full support | Limited |

**When to Choose SELinux:**
- Enterprise environments requiring strict compliance
- Multi-tenant systems needing strong isolation
- Environments migrating from RHEL/CentOS
- Systems requiring MLS/MCS capabilities

## Installing SELinux on Ubuntu

### Step 1: Remove AppArmor (Optional but Recommended)

Running both MAC systems simultaneously can cause conflicts:

```bash
# Stop and disable AppArmor
sudo systemctl stop apparmor
sudo systemctl disable apparmor

# Remove AppArmor packages
sudo apt purge apparmor apparmor-utils -y

# Clean up AppArmor profiles
sudo rm -rf /etc/apparmor.d/*
```

### Step 2: Install SELinux Packages

```bash
# Update package lists
sudo apt update

# Install SELinux core packages
sudo apt install selinux-basics selinux-policy-default selinux-utils -y

# Install additional SELinux tools
sudo apt install policycoreutils policycoreutils-python-utils -y

# Install audit tools for troubleshooting
sudo apt install auditd audispd-plugins -y

# Install tools for policy development
sudo apt install setools selinux-policy-dev -y
```

### Step 3: Activate SELinux

```bash
# Activate SELinux (modifies GRUB configuration)
sudo selinux-activate

# Verify GRUB was updated
grep -i selinux /etc/default/grub
```

### Step 4: Configure Initial Labeling

```bash
# Create autorelabel file to trigger filesystem labeling on reboot
sudo touch /.autorelabel

# Reboot the system
sudo reboot
```

**Note**: The first boot after enabling SELinux takes significantly longer as the entire filesystem is labeled.

## SELinux Modes

SELinux operates in three modes:

### Enforcing Mode

All SELinux policies are enforced, and violations are blocked and logged:

```bash
# Set enforcing mode temporarily
sudo setenforce 1

# Verify current mode
getenforce
# Output: Enforcing

# Check detailed status
sestatus
```

### Permissive Mode

Policies are not enforced, but violations are logged. Ideal for testing and troubleshooting:

```bash
# Set permissive mode temporarily
sudo setenforce 0

# Verify current mode
getenforce
# Output: Permissive
```

### Disabled Mode

SELinux is completely disabled. Requires a reboot to change:

```bash
# Check if SELinux is disabled
sestatus
# Output: SELinux status: disabled
```

### Persistent Mode Configuration

Edit `/etc/selinux/config` to set the boot-time mode:

```bash
# /etc/selinux/config
#
# SELINUX= can take one of these three values:
#     enforcing  - SELinux security policy is enforced
#     permissive - SELinux prints warnings instead of enforcing
#     disabled   - No SELinux policy is loaded
#
SELINUX=enforcing

# SELINUXTYPE= specifies the policy type:
#     default    - Standard targeted policy
#     mls        - Multi-Level Security policy
#
SELINUXTYPE=default
```

To modify this configuration safely:

```bash
# Edit SELinux configuration
sudo nano /etc/selinux/config

# After editing, reboot for changes to take effect
sudo reboot
```

## Managing SELinux Contexts

### Viewing Security Contexts

```bash
# View file contexts
ls -Z /var/www/html/
# Output: unconfined_u:object_r:httpd_sys_content_t:s0 index.html

# View process contexts
ps -eZ | grep httpd
# Output: system_u:system_r:httpd_t:s0 1234 ? 00:00:00 httpd

# View user context
id -Z
# Output: unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023
```

### Changing File Contexts

#### Using chcon (Temporary)

```bash
# Change type context of a file
sudo chcon -t httpd_sys_content_t /var/www/html/myfile.html

# Change full context
sudo chcon -u system_u -r object_r -t httpd_sys_content_t /var/www/html/myfile.html

# Recursively change context
sudo chcon -R -t httpd_sys_content_t /var/www/html/

# Reference another file's context
sudo chcon --reference=/var/www/html/index.html /var/www/html/newfile.html
```

**Warning**: Changes made with `chcon` are temporary and will be lost during a filesystem relabel.

#### Using semanage fcontext (Persistent)

```bash
# Add a new file context rule
sudo semanage fcontext -a -t httpd_sys_content_t "/web(/.*)?"

# Apply the rule to existing files
sudo restorecon -Rv /web

# List all custom file context rules
sudo semanage fcontext -l -C

# Delete a custom file context rule
sudo semanage fcontext -d "/web(/.*)?"
```

### Managing Port Contexts

```bash
# List ports with their SELinux types
sudo semanage port -l | grep http
# Output: http_port_t tcp 80, 81, 443, 488, 8008, 8009, 8443, 9000

# Add a new port to an existing type
sudo semanage port -a -t http_port_t -p tcp 8080

# Modify an existing port assignment
sudo semanage port -m -t http_port_t -p tcp 8081

# Delete a port assignment
sudo semanage port -d -t http_port_t -p tcp 8080
```

## Boolean Settings

SELinux booleans allow runtime policy adjustments without modifying policy source:

### Viewing Booleans

```bash
# List all booleans with descriptions
sudo semanage boolean -l

# List all booleans and their current state
getsebool -a

# Check specific boolean
getsebool httpd_can_network_connect
# Output: httpd_can_network_connect --> off
```

### Setting Booleans

```bash
# Temporarily set a boolean (lost on reboot)
sudo setsebool httpd_can_network_connect on

# Permanently set a boolean
sudo setsebool -P httpd_can_network_connect on

# Set multiple booleans at once
sudo setsebool -P httpd_can_network_connect=on httpd_can_sendmail=on
```

### Common Useful Booleans

```bash
# Allow Apache to connect to network services
sudo setsebool -P httpd_can_network_connect on

# Allow Apache to connect to databases
sudo setsebool -P httpd_can_network_connect_db on

# Allow Apache to use home directories
sudo setsebool -P httpd_enable_homedirs on

# Allow Apache to execute scripts
sudo setsebool -P httpd_execmem on

# Allow Samba to share home directories
sudo setsebool -P samba_enable_home_dirs on

# Allow users to run executables from /tmp
sudo setsebool -P user_exec_content on
```

## File Labeling and Relabeling

### Understanding File Context Database

SELinux maintains file context definitions in `/etc/selinux/default/contexts/files/`:

```bash
# View default file contexts
cat /etc/selinux/default/contexts/files/file_contexts

# View local customizations
cat /etc/selinux/default/contexts/files/file_contexts.local
```

### Restoring Default Contexts

```bash
# Restore context for a single file
sudo restorecon -v /var/www/html/index.html

# Recursively restore contexts for a directory
sudo restorecon -Rv /var/www/

# Preview changes without applying (dry run)
sudo restorecon -Rvn /var/www/

# Force reset even if context appears correct
sudo restorecon -RFv /var/www/
```

### Full Filesystem Relabel

```bash
# Method 1: Create autorelabel trigger file
sudo touch /.autorelabel
sudo reboot

# Method 2: Relabel using fixfiles
sudo fixfiles -F relabel

# Method 3: Relabel specific mount point
sudo fixfiles -F relabel /home
```

### Checking for Mislabeled Files

```bash
# Find files that need relabeling in a directory
sudo restorecon -Rvn /var/www/ 2>&1 | grep -v "^$"

# Use matchpathcon to check expected vs actual context
matchpathcon /var/www/html/index.html
# Output: /var/www/html/index.html  system_u:object_r:httpd_sys_content_t:s0

ls -Z /var/www/html/index.html
# Compare the outputs
```

## Creating Custom Policies

### Policy Module Structure

A custom SELinux policy module consists of three files:

1. **Type Enforcement (.te)**: Contains rules and type definitions
2. **File Contexts (.fc)**: Defines file labeling rules
3. **Interface (.if)**: Defines interfaces for other modules (optional)

### Creating a Simple Custom Policy

Let's create a policy for a custom application called `myapp`:

#### Step 1: Create the Type Enforcement File

```bash
# Create directory for policy development
mkdir -p ~/selinux-policies
cd ~/selinux-policies

# Create myapp.te
cat > myapp.te << 'EOF'
# myapp.te - SELinux policy module for myapp
#
# This policy defines a confined domain for the myapp application
# that needs to read from /opt/myapp and write to /var/log/myapp

# Declare this as a policy module with version 1.0
policy_module(myapp, 1.0)

########################################
# Type Declarations
########################################

# Define the process type (domain)
type myapp_t;

# Define the executable type
type myapp_exec_t;

# Define types for data directories
type myapp_data_t;
type myapp_log_t;

# Mark myapp_t as a domain type
domain_type(myapp_t)

# Mark myapp_exec_t as an executable entry point
domain_entry_file(myapp_t, myapp_exec_t)

########################################
# Domain Transition Rules
########################################

# Allow transition from init (systemd) to myapp_t
init_daemon_domain(myapp_t, myapp_exec_t)

########################################
# Access Rules for myapp_t domain
########################################

# Allow myapp to read its configuration files
allow myapp_t myapp_data_t:dir list_dir_perms;
allow myapp_t myapp_data_t:file read_file_perms;

# Allow myapp to write to its log directory
allow myapp_t myapp_log_t:dir { create_dir_perms rw_dir_perms };
allow myapp_t myapp_log_t:file { create_file_perms rw_file_perms };

# Allow network access if needed
# Uncomment the following if myapp needs network access
# corenet_tcp_connect_http_port(myapp_t)

# Allow reading system configuration
files_read_etc_files(myapp_t)

# Allow using standard libraries
libs_use_ld_so(myapp_t)

# Allow logging to syslog
logging_send_syslog_msg(myapp_t)

# Allow reading locale files
miscfiles_read_localization(myapp_t)

########################################
# Booleans
########################################

## <desc>
## <p>
## Allow myapp to connect to the network
## </p>
## </desc>
gen_tunable(myapp_network_connect, false)

if (myapp_network_connect) {
    corenet_tcp_connect_all_ports(myapp_t)
    corenet_udp_sendrecv_all_ports(myapp_t)
}
EOF
```

#### Step 2: Create the File Contexts File

```bash
# Create myapp.fc
cat > myapp.fc << 'EOF'
# myapp.fc - File contexts for myapp
#
# Define the security contexts for myapp files

# Executable
/usr/bin/myapp                  --  gen_context(system_u:object_r:myapp_exec_t,s0)
/usr/sbin/myapp                 --  gen_context(system_u:object_r:myapp_exec_t,s0)

# Configuration and data directory
/opt/myapp(/.*)?                    gen_context(system_u:object_r:myapp_data_t,s0)
/etc/myapp(/.*)?                    gen_context(system_u:object_r:myapp_data_t,s0)

# Log directory
/var/log/myapp(/.*)?                gen_context(system_u:object_r:myapp_log_t,s0)

# PID file
/var/run/myapp\.pid             --  gen_context(system_u:object_r:myapp_var_run_t,s0)
EOF
```

#### Step 3: Compile and Install the Policy

```bash
# Compile the policy module
make -f /usr/share/selinux/devel/Makefile myapp.pp

# Install the policy module
sudo semodule -i myapp.pp

# Verify installation
sudo semodule -l | grep myapp
# Output: myapp 1.0

# Apply file contexts
sudo restorecon -Rv /opt/myapp /var/log/myapp /usr/bin/myapp
```

### Managing Policy Modules

```bash
# List all installed modules
sudo semodule -l

# List with priorities
sudo semodule -lfull

# Remove a module
sudo semodule -r myapp

# Disable a module temporarily
sudo semodule -d myapp

# Enable a disabled module
sudo semodule -e myapp

# Install module at specific priority (higher = takes precedence)
sudo semodule -i myapp.pp -X 400
```

## Troubleshooting with audit2why

When SELinux blocks an action, it logs an Access Vector Cache (AVC) denial to the audit log. The `audit2why` tool helps interpret these denials.

### Reading AVC Denials

```bash
# View recent AVC denials
sudo ausearch -m AVC -ts recent

# View denials for a specific process
sudo ausearch -m AVC -c httpd

# View denials from the last hour
sudo ausearch -m AVC -ts this-hour

# Format output more readably
sudo ausearch -m AVC -ts today | audit2why
```

### Understanding audit2why Output

```bash
# Pipe denial messages to audit2why
sudo ausearch -m AVC -ts recent | audit2why

# Example output:
# type=AVC msg=audit(1705123456.789:1234): avc:  denied  { read } for
#   pid=4567 comm="httpd" name="config.ini" dev="sda1" ino=789012
#   scontext=system_u:system_r:httpd_t:s0
#   tcontext=unconfined_u:object_r:default_t:s0 tclass=file permissive=0
#
#   Was caused by:
#   Missing type enforcement (TE) allow rule.
#
#   You can use audit2allow to generate a loadable module to allow this access.
```

### Common Denial Causes

```bash
# Check if a boolean could resolve the issue
sudo ausearch -m AVC -ts recent | audit2why

# Example output indicating boolean fix:
# Was caused by:
#   The boolean httpd_can_network_connect was set incorrectly.
#   Description:
#   Allow httpd to can network connect
#
#   Allow access by executing:
#   # setsebool -P httpd_can_network_connect 1
```

### Viewing All Audit Messages

```bash
# View complete audit log
sudo cat /var/log/audit/audit.log | grep AVC

# Use sealert for detailed analysis (if available)
sudo sealert -a /var/log/audit/audit.log

# Watch denials in real-time
sudo tail -f /var/log/audit/audit.log | grep --line-buffered AVC
```

## Generating Policies with audit2allow

The `audit2allow` tool generates policy rules from audit log denials. Use it carefully as it can create overly permissive policies.

### Basic Usage

```bash
# Generate rules from recent denials
sudo ausearch -m AVC -ts recent | audit2allow

# Output might look like:
# #============= httpd_t ==============
# allow httpd_t default_t:file read;
```

### Creating a Policy Module

```bash
# Generate a complete policy module
sudo ausearch -m AVC -ts today | audit2allow -M mypolicy

# This creates:
# mypolicy.te - Type enforcement rules
# mypolicy.pp - Compiled policy module

# Review the generated rules before installing
cat mypolicy.te

# Install the module if rules are acceptable
sudo semodule -i mypolicy.pp
```

### Using Reference Policy

```bash
# Generate rules using reference policy macros (cleaner)
sudo ausearch -m AVC -ts recent | audit2allow -R

# Output uses macros like:
# require {
#     type httpd_t;
# }
#
# #============= httpd_t ==============
# corenet_tcp_connect_http_port(httpd_t)
```

### Best Practices for audit2allow

```bash
# 1. Always run in permissive mode first to collect all denials
sudo setenforce 0

# 2. Exercise all application functionality
# (run your application through its normal operations)

# 3. Collect all denials
sudo ausearch -m AVC -ts boot | audit2allow -R > myapp_custom.te

# 4. Review generated rules carefully
cat myapp_custom.te

# 5. Remove overly permissive rules (like allow X self:file *)

# 6. Compile and install
sudo ausearch -m AVC -ts boot | audit2allow -M myapp_custom
sudo semodule -i myapp_custom.pp

# 7. Switch back to enforcing and test
sudo setenforce 1
```

### Incremental Policy Development

```bash
#!/bin/bash
# incremental_policy.sh - Script for iterative policy development

MODULE_NAME="myapp_policy"
LOG_FILE="/var/log/audit/audit.log"

# Function to generate and install policy from recent denials
update_policy() {
    echo "Collecting recent AVC denials..."

    # Generate new policy module
    sudo ausearch -m AVC -ts recent | audit2allow -M "${MODULE_NAME}_$(date +%s)"

    # Show generated rules for review
    echo "Generated rules:"
    cat "${MODULE_NAME}_"*.te

    read -p "Install this policy? (y/n) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo semodule -i "${MODULE_NAME}_"*.pp
        echo "Policy installed."
    else
        echo "Policy not installed."
        rm -f "${MODULE_NAME}_"*.{te,pp}
    fi
}

# Run the function
update_policy
```

## SELinux and Containers

### SELinux with Docker

Docker has native SELinux support that provides container isolation:

```bash
# Check if Docker is using SELinux
docker info | grep -i selinux

# Run container with SELinux enabled
docker run --security-opt label=enable nginx

# Run container with specific SELinux labels
docker run --security-opt label=type:container_runtime_t nginx

# Disable SELinux for a specific container (not recommended)
docker run --security-opt label=disable nginx
```

### Volume Mount Labeling

```bash
# Use :Z for private volume (relabels for single container)
docker run -v /host/path:/container/path:Z nginx

# Use :z for shared volume (relabels for multiple containers)
docker run -v /host/path:/container/path:z nginx
```

### SELinux with Podman

Podman has excellent SELinux integration:

```bash
# Run rootless container with SELinux
podman run --security-opt label=enable nginx

# Check container process labels
podman top container_name label

# Generate SELinux policy for container
podman generate systemd --new --name mycontainer > mycontainer.service
```

### Container SELinux Types

```bash
# Common container types
# container_t       - Standard container processes
# container_file_t  - Container data files
# container_var_lib_t - Container storage in /var/lib

# View container-related types
sudo seinfo -t | grep container
```

### Kubernetes and SELinux

```yaml
# Example Kubernetes Pod with SELinux context
# pod-selinux.yaml
apiVersion: v1
kind: Pod
metadata:
  name: selinux-pod
spec:
  securityContext:
    seLinuxOptions:
      level: "s0:c123,c456"
      type: "container_runtime_t"
  containers:
  - name: app
    image: nginx
    securityContext:
      seLinuxOptions:
        type: "container_runtime_t"
```

## Common Use Cases

### Use Case 1: Securing a Web Server

```bash
#!/bin/bash
# secure_webserver.sh - Configure SELinux for Apache/Nginx

# Ensure SELinux is enforcing
sudo setenforce 1

# Set proper contexts for web content
sudo semanage fcontext -a -t httpd_sys_content_t "/var/www/html(/.*)?"
sudo restorecon -Rv /var/www/html

# If web app needs to write to specific directory
sudo semanage fcontext -a -t httpd_sys_rw_content_t "/var/www/html/uploads(/.*)?"
sudo restorecon -Rv /var/www/html/uploads

# Enable common booleans for web servers
sudo setsebool -P httpd_can_network_connect on      # Connect to remote services
sudo setsebool -P httpd_can_network_connect_db on   # Connect to databases
sudo setsebool -P httpd_enable_cgi on               # Execute CGI scripts
sudo setsebool -P httpd_unified on                  # Unified handling

# If using non-standard port
sudo semanage port -a -t http_port_t -p tcp 8080

# Verify configuration
echo "Web server SELinux configuration:"
getsebool -a | grep httpd
ls -Zd /var/www/html
```

### Use Case 2: Securing a Database Server

```bash
#!/bin/bash
# secure_database.sh - Configure SELinux for MySQL/PostgreSQL

# For MySQL/MariaDB
sudo semanage fcontext -a -t mysqld_db_t "/var/lib/mysql(/.*)?"
sudo restorecon -Rv /var/lib/mysql

# Custom data directory
sudo semanage fcontext -a -t mysqld_db_t "/data/mysql(/.*)?"
sudo restorecon -Rv /data/mysql

# Allow MySQL to connect to network
sudo setsebool -P mysql_connect_any on

# For PostgreSQL
sudo semanage fcontext -a -t postgresql_db_t "/var/lib/postgresql(/.*)?"
sudo restorecon -Rv /var/lib/postgresql

# Custom port for PostgreSQL
sudo semanage port -a -t postgresql_port_t -p tcp 5433

# Verify
sestatus
```

### Use Case 3: Securing SSH and User Home Directories

```bash
#!/bin/bash
# secure_ssh.sh - Configure SELinux for SSH

# Ensure SSH uses standard contexts
sudo restorecon -Rv /etc/ssh
sudo restorecon -Rv ~/.ssh

# If using non-standard SSH port
sudo semanage port -a -t ssh_port_t -p tcp 2222

# Configure home directory contexts
sudo setsebool -P ssh_sysadm_login on     # Allow admin SSH login
sudo setsebool -P use_nfs_home_dirs on    # If using NFS home dirs
sudo setsebool -P use_samba_home_dirs on  # If using Samba home dirs

# For users with custom home directory location
sudo semanage fcontext -a -t user_home_dir_t "/custom/home/[^/]+"
sudo semanage fcontext -a -t user_home_t "/custom/home/[^/]+/.+"
sudo restorecon -Rv /custom/home
```

### Use Case 4: Multi-Tenant Application Isolation

```bash
#!/bin/bash
# multi_tenant.sh - Configure SELinux for tenant isolation

# Create tenant-specific types using MCS (Multi-Category Security)
# Each tenant gets a unique category

TENANT_ID="tenant001"
CATEGORY="c100"

# Create directory with specific category
sudo mkdir -p /data/${TENANT_ID}
sudo chcon -l s0:${CATEGORY} /data/${TENANT_ID}

# Set up file contexts with MCS
sudo semanage fcontext -a -t httpd_sys_content_t -r s0:${CATEGORY} "/data/${TENANT_ID}(/.*)?"
sudo restorecon -Rv /data/${TENANT_ID}

# Start application with specific category
# (Application must be launched with appropriate context)
runcon -l s0:${CATEGORY} /usr/bin/myapp
```

### Use Case 5: Protecting Sensitive Configuration Files

```bash
#!/bin/bash
# protect_configs.sh - Restrict access to sensitive files

# Create custom type for sensitive configs
cat > sensitive_config.te << 'EOF'
policy_module(sensitive_config, 1.0)

type sensitive_config_t;
files_type(sensitive_config_t)

# Only allow specific domains to read
# Deny all others by default
EOF

# Compile and install
make -f /usr/share/selinux/devel/Makefile sensitive_config.pp
sudo semodule -i sensitive_config.pp

# Apply to sensitive files
sudo semanage fcontext -a -t sensitive_config_t "/etc/secrets(/.*)?"
sudo restorecon -Rv /etc/secrets
```

## Complete Configuration Example

Here is a comprehensive example bringing together all concepts for a typical web application:

```bash
#!/bin/bash
#
# complete_selinux_setup.sh
#
# Complete SELinux configuration script for a web application stack
# consisting of Nginx, PHP-FPM, and MariaDB
#
# Prerequisites:
# - Ubuntu 20.04 or later
# - Root or sudo access
# - SELinux packages installed

set -e  # Exit on any error

echo "=========================================="
echo "SELinux Complete Configuration Script"
echo "=========================================="

# ---------------------------------------------
# Step 1: Verify SELinux Status
# ---------------------------------------------
echo "[1/10] Checking SELinux status..."

if ! command -v getenforce &> /dev/null; then
    echo "ERROR: SELinux not installed. Please install selinux-basics first."
    exit 1
fi

SELINUX_STATUS=$(getenforce)
echo "Current SELinux mode: ${SELINUX_STATUS}"

# Put in permissive mode during setup
sudo setenforce 0
echo "Switched to Permissive mode for setup..."

# ---------------------------------------------
# Step 2: Configure File Contexts for Web Root
# ---------------------------------------------
echo "[2/10] Configuring web root contexts..."

WEB_ROOT="/var/www/myapp"

# Read-only content (static files)
sudo semanage fcontext -a -t httpd_sys_content_t "${WEB_ROOT}/public(/.*)?"

# Read-write content (uploads, cache)
sudo semanage fcontext -a -t httpd_sys_rw_content_t "${WEB_ROOT}/storage(/.*)?"
sudo semanage fcontext -a -t httpd_sys_rw_content_t "${WEB_ROOT}/cache(/.*)?"

# Executable scripts
sudo semanage fcontext -a -t httpd_sys_script_exec_t "${WEB_ROOT}/scripts(/.*)?"

# Apply contexts
sudo restorecon -Rv ${WEB_ROOT}

# ---------------------------------------------
# Step 3: Configure Database Contexts
# ---------------------------------------------
echo "[3/10] Configuring database contexts..."

DB_DATA="/var/lib/mysql"
DB_CUSTOM="/data/mysql"

sudo semanage fcontext -a -t mysqld_db_t "${DB_DATA}(/.*)?"
sudo semanage fcontext -a -t mysqld_db_t "${DB_CUSTOM}(/.*)?"
sudo semanage fcontext -a -t mysqld_log_t "/var/log/mysql(/.*)?"

sudo restorecon -Rv ${DB_DATA} ${DB_CUSTOM} /var/log/mysql 2>/dev/null || true

# ---------------------------------------------
# Step 4: Configure Port Contexts
# ---------------------------------------------
echo "[4/10] Configuring port contexts..."

# Application server port
sudo semanage port -a -t http_port_t -p tcp 8080 2>/dev/null || \
    sudo semanage port -m -t http_port_t -p tcp 8080

# PHP-FPM port
sudo semanage port -a -t http_port_t -p tcp 9000 2>/dev/null || \
    sudo semanage port -m -t http_port_t -p tcp 9000

# Custom database port
sudo semanage port -a -t mysqld_port_t -p tcp 3307 2>/dev/null || \
    sudo semanage port -m -t mysqld_port_t -p tcp 3307

echo "Port contexts configured."

# ---------------------------------------------
# Step 5: Set Required Booleans
# ---------------------------------------------
echo "[5/10] Setting SELinux booleans..."

# Web server booleans
declare -A BOOLEANS=(
    ["httpd_can_network_connect"]="on"      # Connect to backend services
    ["httpd_can_network_connect_db"]="on"   # Connect to databases
    ["httpd_can_sendmail"]="on"             # Send emails
    ["httpd_execmem"]="off"                 # Disable unless needed (security)
    ["httpd_unified"]="on"                  # Unified content handling
    ["httpd_enable_cgi"]="on"               # CGI/FastCGI support
    ["httpd_setrlimit"]="on"                # Resource limits
    ["mysql_connect_any"]="off"             # Restrict DB connections
)

for bool in "${!BOOLEANS[@]}"; do
    echo "  Setting ${bool} = ${BOOLEANS[$bool]}"
    sudo setsebool -P ${bool} ${BOOLEANS[$bool]}
done

# ---------------------------------------------
# Step 6: Create Custom Policy Module
# ---------------------------------------------
echo "[6/10] Creating custom policy module..."

POLICY_DIR="/root/selinux-policies"
mkdir -p ${POLICY_DIR}
cd ${POLICY_DIR}

# Create custom policy for application-specific needs
cat > myapp.te << 'POLICY_EOF'
policy_module(myapp, 1.0)

# Allow httpd to read application-specific socket
type myapp_socket_t;
files_type(myapp_socket_t)

allow httpd_t myapp_socket_t:sock_file { read write getattr };
allow httpd_t myapp_socket_t:unix_stream_socket connectto;
POLICY_EOF

# Compile and install
make -f /usr/share/selinux/devel/Makefile myapp.pp
sudo semodule -i myapp.pp

echo "Custom policy module installed."

# ---------------------------------------------
# Step 7: Configure Logging
# ---------------------------------------------
echo "[7/10] Configuring audit logging..."

# Ensure auditd is running
sudo systemctl enable auditd
sudo systemctl start auditd

# Add audit rules for SELinux-related events
cat > /tmp/selinux-audit.rules << 'AUDIT_EOF'
# Log all SELinux AVC denials
-a always,exit -F arch=b64 -S all -F subj_type=httpd_t -k selinux_httpd
-a always,exit -F arch=b64 -S all -F subj_type=mysqld_t -k selinux_mysql
AUDIT_EOF

sudo cp /tmp/selinux-audit.rules /etc/audit/rules.d/selinux.rules
sudo augenrules --load

# ---------------------------------------------
# Step 8: Verify Configuration
# ---------------------------------------------
echo "[8/10] Verifying configuration..."

echo ""
echo "File Contexts:"
sudo semanage fcontext -l -C | head -20

echo ""
echo "Port Contexts:"
sudo semanage port -l | grep -E "(http_port|mysqld_port)"

echo ""
echo "Active Booleans:"
getsebool -a | grep -E "^httpd_|^mysql_" | grep " on$"

echo ""
echo "Installed Modules:"
sudo semodule -l | grep -E "(myapp|httpd|mysql)"

# ---------------------------------------------
# Step 9: Test in Permissive Mode
# ---------------------------------------------
echo "[9/10] Testing configuration in permissive mode..."

# Restart services to test
sudo systemctl restart nginx 2>/dev/null || echo "nginx not installed"
sudo systemctl restart php-fpm 2>/dev/null || echo "php-fpm not installed"
sudo systemctl restart mariadb 2>/dev/null || echo "mariadb not installed"

# Check for any denials
sleep 5
DENIALS=$(sudo ausearch -m AVC -ts recent 2>/dev/null | grep -c "denied" || echo "0")

if [ "${DENIALS}" -gt 0 ]; then
    echo "WARNING: ${DENIALS} AVC denials detected. Review with:"
    echo "  sudo ausearch -m AVC -ts recent | audit2why"
else
    echo "No AVC denials detected. Configuration appears correct."
fi

# ---------------------------------------------
# Step 10: Enable Enforcing Mode
# ---------------------------------------------
echo "[10/10] Ready to enable enforcing mode..."

read -p "Enable SELinux enforcing mode now? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo setenforce 1
    echo "SELinux is now in ENFORCING mode."

    # Make persistent
    sudo sed -i 's/^SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config
    echo "Configuration saved. SELinux will enforce on reboot."
else
    echo "SELinux remains in PERMISSIVE mode."
    echo "Run 'sudo setenforce 1' when ready to enforce."
fi

echo ""
echo "=========================================="
echo "SELinux Configuration Complete"
echo "=========================================="
echo ""
echo "Monitor for issues with:"
echo "  sudo ausearch -m AVC -ts recent | audit2why"
echo ""
echo "View current status:"
echo "  sestatus"
echo ""
```

## Quick Reference Commands

```bash
# Status and Mode
getenforce                          # Show current mode
sestatus                            # Detailed status
sudo setenforce 0|1                 # Set permissive|enforcing

# File Contexts
ls -Z /path                         # Show file contexts
sudo chcon -t type_t /path          # Temporary context change
sudo restorecon -Rv /path           # Restore default contexts
sudo semanage fcontext -l           # List all file contexts
sudo semanage fcontext -a -t type_t "/path(/.*)?"  # Add persistent rule

# Port Contexts
sudo semanage port -l               # List all port contexts
sudo semanage port -a -t type_t -p tcp PORT  # Add port context

# Booleans
getsebool -a                        # List all booleans
sudo setsebool -P boolean on|off    # Set boolean permanently

# Policy Modules
sudo semodule -l                    # List modules
sudo semodule -i module.pp          # Install module
sudo semodule -r module             # Remove module

# Troubleshooting
sudo ausearch -m AVC -ts recent     # Recent denials
sudo ausearch -m AVC | audit2why    # Explain denials
sudo ausearch -m AVC | audit2allow -M fix  # Generate fix
```

## Conclusion

SELinux provides robust mandatory access control that significantly enhances Ubuntu system security. While it has a steeper learning curve compared to AppArmor, the fine-grained control it offers makes it invaluable for enterprise environments, compliance requirements, and multi-tenant systems.

Key takeaways:
- Start in permissive mode to understand your system's behavior
- Use audit2why to understand denials before creating custom policies
- Apply the principle of least privilege when creating rules
- Regularly review and update policies as your applications evolve
- Maintain proper file contexts, especially after system updates

## Monitor Your SELinux-Protected Infrastructure with OneUptime

Implementing SELinux is just one part of maintaining a secure infrastructure. To ensure your SELinux-protected systems remain healthy and performing optimally, consider using [OneUptime](https://oneuptime.com) for comprehensive monitoring.

OneUptime provides:
- **Real-time monitoring** of system health and performance metrics
- **Alerting** when SELinux denials spike or services become unavailable
- **Log aggregation** to centralize and analyze audit logs from multiple systems
- **Uptime monitoring** to ensure your hardened services remain accessible
- **Incident management** to quickly respond to security-related events

With OneUptime, you can maintain visibility into your SELinux-enforcing systems and respond quickly to any security or availability issues that arise.

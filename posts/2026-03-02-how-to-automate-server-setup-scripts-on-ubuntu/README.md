# How to Automate Server Setup Scripts on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Automation, Bash Scripting, Server Administration, DevOps

Description: A practical guide to writing robust server setup automation scripts for Ubuntu, covering idempotency, error handling, logging, and real-world patterns for production use.

---

Manually configuring servers is error-prone and hard to reproduce. Whether you are provisioning five servers or five hundred, having a reliable setup script means every server is configured identically, can be rebuilt quickly, and configuration changes are tracked in version control.

This guide focuses on writing good automation scripts rather than just working ones. The difference matters when you need to run the script again on an already-configured server, or when it fails halfway through at 2am.

## Principles of Good Setup Scripts

**Idempotency** - Running the script multiple times should produce the same result. If a package is already installed, skip it. If a file already exists with the right content, do not overwrite it.

**Error handling** - The script should fail loudly and clearly when something goes wrong, not silently continue into a broken state.

**Logging** - You need to know what happened, especially when troubleshooting a failed deployment at odd hours.

**Parameterization** - Hardcoding values like hostnames and IPs makes scripts brittle. Use variables or configuration files.

## Script Template

Start every setup script with this foundation:

```bash
#!/bin/bash
# server_setup.sh - Ubuntu server base configuration
# Version: 1.0
# Usage: sudo ./server_setup.sh [--environment prod|staging|dev]

set -euo pipefail

# Script metadata
SCRIPT_VERSION="1.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/server_setup_$(date +%Y%m%d_%H%M%S).log"
LOCK_FILE="/var/run/server_setup.lock"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log() {
    local message="$1"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${GREEN}[${timestamp}] ${message}${NC}" | tee -a "$LOG_FILE"
}

warn() {
    local message="$1"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${YELLOW}[${timestamp}] WARNING: ${message}${NC}" | tee -a "$LOG_FILE"
}

error() {
    local message="$1"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${RED}[${timestamp}] ERROR: ${message}${NC}" | tee -a "$LOG_FILE"
}

# Exit handler
cleanup() {
    local exit_code=$?
    rm -f "$LOCK_FILE"
    if [ $exit_code -ne 0 ]; then
        error "Script failed with exit code $exit_code"
        error "Check log file: $LOG_FILE"
    else
        log "Script completed successfully"
    fi
}

trap cleanup EXIT

# Root check
require_root() {
    if [ "$(id -u)" -ne 0 ]; then
        error "This script must be run as root"
        exit 1
    fi
}

# Lock to prevent concurrent runs
acquire_lock() {
    if [ -f "$LOCK_FILE" ]; then
        error "Another instance is running (lock file: $LOCK_FILE)"
        exit 1
    fi
    echo $$ > "$LOCK_FILE"
}

require_root
acquire_lock
```

## Idempotent Package Installation

```bash
# Check if a package is installed before attempting to install
package_installed() {
    dpkg -l "$1" 2>/dev/null | grep -q "^ii"
}

install_packages() {
    local packages=("$@")
    local to_install=()

    for pkg in "${packages[@]}"; do
        if package_installed "$pkg"; then
            log "Package already installed: $pkg"
        else
            to_install+=("$pkg")
        fi
    done

    if [ ${#to_install[@]} -gt 0 ]; then
        log "Installing packages: ${to_install[*]}"
        apt-get install -y "${to_install[@]}" >> "$LOG_FILE" 2>&1
    fi
}

# Usage
apt-get update -qq >> "$LOG_FILE" 2>&1
install_packages \
    curl \
    wget \
    vim \
    htop \
    tmux \
    git \
    unzip \
    jq \
    fail2ban \
    ufw
```

## Configuration File Management

```bash
# Write a config file only if it differs from what's already there
write_config() {
    local file="$1"
    local content="$2"
    local backup_suffix=".bak.$(date +%Y%m%d_%H%M%S)"

    if [ -f "$file" ]; then
        local current_content
        current_content=$(cat "$file")
        if [ "$current_content" = "$content" ]; then
            log "Config already up to date: $file"
            return 0
        fi
        # Backup existing file before overwriting
        cp "$file" "${file}${backup_suffix}"
        warn "Backed up existing config to: ${file}${backup_suffix}"
    fi

    # Write the new content
    echo "$content" > "$file"
    log "Wrote config: $file"
}

# Example: write SSH daemon config
configure_sshd() {
    local sshd_config
    sshd_config=$(cat <<'EOF'
# Hardened SSH configuration
Port 22
Protocol 2
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
PrintMotd no
UseDNS no
EOF
)

    write_config /etc/ssh/sshd_config.d/hardened.conf "$sshd_config"

    # Validate the config before restarting
    if sshd -t >> "$LOG_FILE" 2>&1; then
        systemctl reload sshd
        log "SSH configuration applied"
    else
        error "SSH config validation failed - not restarting sshd"
        return 1
    fi
}
```

## User and Group Management

```bash
# Create a user if they do not already exist
create_service_user() {
    local username="$1"
    local home_dir="${2:-/home/$username}"
    local shell="${3:-/bin/bash}"

    if id "$username" &>/dev/null; then
        log "User already exists: $username"
        return 0
    fi

    useradd \
        --create-home \
        --home-dir "$home_dir" \
        --shell "$shell" \
        --system \
        "$username"

    log "Created user: $username"
}

# Add a user to a group safely
add_to_group() {
    local user="$1"
    local group="$2"

    if groups "$user" | grep -q "\b${group}\b"; then
        log "User $user already in group $group"
        return 0
    fi

    usermod -aG "$group" "$user"
    log "Added $user to group $group"
}

# Deploy SSH authorized keys for a user
deploy_authorized_keys() {
    local user="$1"
    local key="$2"
    local home_dir
    home_dir=$(getent passwd "$user" | cut -d: -f6)
    local ssh_dir="${home_dir}/.ssh"
    local auth_keys="${ssh_dir}/authorized_keys"

    mkdir -p "$ssh_dir"
    chmod 700 "$ssh_dir"
    chown "$user:$user" "$ssh_dir"

    if grep -qF "$key" "$auth_keys" 2>/dev/null; then
        log "SSH key already present for $user"
    else
        echo "$key" >> "$auth_keys"
        log "Added SSH key for $user"
    fi

    chmod 600 "$auth_keys"
    chown "$user:$user" "$auth_keys"
}
```

## Firewall Configuration

```bash
configure_firewall() {
    log "Configuring UFW firewall..."

    # UFW is idempotent - running these rules multiple times is safe
    ufw --force reset >> "$LOG_FILE" 2>&1
    ufw default deny incoming >> "$LOG_FILE" 2>&1
    ufw default allow outgoing >> "$LOG_FILE" 2>&1

    # Allow SSH
    ufw allow 22/tcp >> "$LOG_FILE" 2>&1

    # Allow additional ports passed as arguments
    for port in "$@"; do
        ufw allow "$port" >> "$LOG_FILE" 2>&1
        log "Opened port: $port"
    done

    # Enable without interactive prompt
    ufw --force enable >> "$LOG_FILE" 2>&1
    log "Firewall enabled"
    ufw status verbose | tee -a "$LOG_FILE"
}
```

## Systemd Service Deployment

```bash
deploy_service() {
    local service_name="$1"
    local service_content="$2"
    local service_file="/etc/systemd/system/${service_name}.service"

    write_config "$service_file" "$service_content"

    systemctl daemon-reload

    if systemctl is-enabled "$service_name" &>/dev/null; then
        log "Service already enabled: $service_name"
    else
        systemctl enable "$service_name"
        log "Enabled service: $service_name"
    fi

    systemctl restart "$service_name"
    log "Started service: $service_name"
}
```

## Putting It Together

```bash
# Main execution flow
main() {
    log "=== Server Setup Script v${SCRIPT_VERSION} ==="
    log "Hostname: $(hostname)"
    log "Ubuntu version: $(lsb_release -ds)"

    log "--- Updating package index ---"
    apt-get update -qq >> "$LOG_FILE" 2>&1

    log "--- Installing base packages ---"
    install_packages curl wget vim htop tmux git unzip jq fail2ban ufw

    log "--- Configuring SSH ---"
    configure_sshd

    log "--- Configuring firewall ---"
    configure_firewall 80/tcp 443/tcp

    log "--- Setting timezone ---"
    timedatectl set-timezone UTC
    log "Timezone set to UTC"

    log "--- Configuring automatic updates ---"
    install_packages unattended-upgrades
    dpkg-reconfigure -plow unattended-upgrades >> "$LOG_FILE" 2>&1

    log "=== Setup complete ==="
}

main "$@"
```

Store this script in version control, test it against a fresh Ubuntu install, and run it from cloud-init or your provisioning tool of choice. With idempotency built in, you can safely re-run it during maintenance to verify and reapply the intended configuration.

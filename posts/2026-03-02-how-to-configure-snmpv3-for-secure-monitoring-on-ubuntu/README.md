# How to Configure SNMPv3 for Secure Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SNMP, Security, Monitoring, Networking

Description: Configure SNMPv3 on Ubuntu with authentication and encryption for secure SNMP monitoring, covering user creation, security levels, and integration with monitoring tools.

---

SNMPv1 and v2c transmit community strings and all data in plaintext, making them unsuitable for anything other than isolated networks. SNMPv3 adds proper authentication and optional encryption, making it appropriate for production environments. This guide covers configuring SNMPv3 on Ubuntu for both the SNMP agent (snmpd) and client tools.

## SNMPv3 Security Models

SNMPv3 has three security levels:

- **noAuthNoPriv** - No authentication, no encryption. Like v2c but with a username. Use only for testing.
- **authNoPriv** - Authentication (MD5 or SHA), but data is not encrypted. Prevents spoofing but data is readable.
- **authPriv** - Authentication plus encryption (DES or AES). Full security. Use this in production.

Always use authPriv with SHA for authentication and AES for encryption. MD5 and DES are deprecated.

## Installing SNMP Packages

```bash
sudo apt update
sudo apt install snmpd snmp snmp-mibs-downloader

# Download MIBs for human-readable output
sudo download-mibs
```

## Creating SNMPv3 Users

The `net-snmp-create-v3-user` tool is the correct way to create users on Ubuntu. It handles the key derivation and writes to the right files.

**Stop snmpd before creating users** - the user database is only written at startup:

```bash
sudo systemctl stop snmpd

# Create a read-only user with SHA auth and AES privacy
sudo net-snmp-create-v3-user \
  -ro \
  -a SHA \
  -A "my_auth_passphrase_min32chars" \
  -x AES \
  -X "my_priv_passphrase_min32chars" \
  monitoruser

# Create another user for read-write access (use carefully)
sudo net-snmp-create-v3-user \
  -a SHA \
  -A "rw_auth_passphrase_here" \
  -x AES \
  -X "rw_priv_passphrase_here" \
  adminuser
```

This command adds entries to `/var/lib/snmp/snmpd.conf`. View them:

```bash
cat /var/lib/snmp/snmpd.conf
# Output contains hashed credentials:
# createUser monitoruser SHA "hashed..." AES "hashed..."
```

## Configuring snmpd for SNMPv3

```bash
sudo nano /etc/snmp/snmpd.conf
```

Replace the default configuration:

```text
###
# SNMPv3 Configuration for Ubuntu
###

# Agent listening address - bind to all interfaces or specific IP
agentaddress udp:161

# --- Access Control ---

# Read-only access for monitoruser
rouser monitoruser priv

# Read-write access for adminuser (restrict to specific OIDs in production)
rwuser adminuser priv

# --- SNMP v1/v2c (disable these in production) ---
# Comment out or remove community strings if you only want v3
# rocommunity public localhost

# --- System Information ---
sysLocation     "Primary Data Center - Rack 5"
sysContact      ops-team@example.com

# --- What to expose ---

# Standard MIBs
view all    included .1  80

# Or restrict to specific subtrees (better security)
view restricted    included .1.3.6.1.2.1.1       # System
view restricted    included .1.3.6.1.2.1.2       # Interfaces
view restricted    included .1.3.6.1.2.1.25      # Host resources
view restricted    included .1.3.6.1.4.1.2021    # UCD-SNMP (Linux metrics)

# Apply the view to the user (if not using default 'all')
# access monitorgroup "" usm priv prefix restricted none none

# --- Monitoring configuration ---

# Disk monitoring (alert if disk usage exceeds threshold)
disk /     10%
disk /var  15%
disk /tmp  5%

# Process monitoring (min and max process count)
proc nginx 10 1
proc sshd  5 1
proc cron  2 1

# Load average thresholds
load 15.0 10.0 5.0

# --- Performance tuning ---
# Reduce load from many simultaneous queries
agentXSocket /var/agentx/master
master agentx
```

Start snmpd:

```bash
sudo systemctl start snmpd
sudo systemctl enable snmpd
sudo systemctl status snmpd

# Verify it is listening
sudo ss -ulnp | grep 161
```

## Testing SNMPv3 Connectivity

```bash
# Test with noAuthNoPriv (no security - just verify the user exists)
snmpget -v 3 -u monitoruser -l noAuthNoPriv \
  localhost SNMPv2-MIB::sysDescr.0

# Test with authNoPriv (authentication only)
snmpget -v 3 \
  -u monitoruser \
  -l authNoPriv \
  -a SHA \
  -A "my_auth_passphrase_min32chars" \
  localhost SNMPv2-MIB::sysDescr.0

# Test with authPriv (full security - use this in production)
snmpget -v 3 \
  -u monitoruser \
  -l authPriv \
  -a SHA \
  -A "my_auth_passphrase_min32chars" \
  -x AES \
  -X "my_priv_passphrase_min32chars" \
  localhost SNMPv2-MIB::sysDescr.0

# Walk the system MIB with full v3 security
snmpwalk -v 3 \
  -u monitoruser \
  -l authPriv \
  -a SHA -A "my_auth_passphrase_min32chars" \
  -x AES -X "my_priv_passphrase_min32chars" \
  localhost system

# Walk Linux-specific metrics
snmpwalk -v 3 \
  -u monitoruser \
  -l authPriv \
  -a SHA -A "my_auth_passphrase_min32chars" \
  -x AES -X "my_priv_passphrase_min32chars" \
  localhost UCD-SNMP-MIB::laLoad
```

## Creating a Client Configuration File

Rather than typing credentials on every command, store them in a config file:

```bash
# Create user-specific config
mkdir -p ~/.snmp
nano ~/.snmp/snmp.conf
```

```text
# Default SNMPv3 credentials
defVersion 3
defSecurityName monitoruser
defSecurityLevel authPriv
defAuthType SHA
defAuthPassphrase my_auth_passphrase_min32chars
defPrivType AES
defPrivPassphrase my_priv_passphrase_min32chars
```

Now commands are much simpler:

```bash
# No need to specify credentials each time
snmpwalk localhost system
snmpget localhost SNMPv2-MIB::sysUpTime.0
```

## Firewall Configuration

Restrict SNMP access to only your monitoring server:

```bash
# Using ufw - allow SNMP only from the monitoring server
sudo ufw allow from 10.0.0.100 to any port 161 proto udp comment "SNMP monitoring"

# Block SNMP from everywhere else (if default policy is allow)
sudo ufw deny 161/udp

# Using iptables
sudo iptables -A INPUT -p udp --dport 161 -s 10.0.0.100 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 161 -j DROP
```

## Rotating SNMPv3 Credentials

When you need to change passphrases:

```bash
# Use snmpusm to change passphrases remotely
# Change authentication passphrase
snmpusm -v 3 -u monitoruser -l authPriv \
  -a SHA -A "old_auth_passphrase" \
  -x AES -X "old_priv_passphrase" \
  localhost passwd \
  "old_auth_passphrase" "new_auth_passphrase"

# Change privacy passphrase
snmpusm -v 3 -u monitoruser -l authPriv \
  -a SHA -A "new_auth_passphrase" \
  -x AES -X "old_priv_passphrase" \
  localhost passwd \
  -x "old_priv_passphrase" "new_priv_passphrase"
```

Or recreate the user entirely:

```bash
sudo systemctl stop snmpd

# Remove old user from /var/lib/snmp/snmpd.conf
sudo sed -i '/monitoruser/d' /var/lib/snmp/snmpd.conf

# Create new user with new credentials
sudo net-snmp-create-v3-user \
  -ro -a SHA -A "new_auth_pass" -x AES -X "new_priv_pass" \
  monitoruser

sudo systemctl start snmpd
```

## Configuring Nagios/Icinga for SNMPv3

Integration with Nagios-based monitoring:

```bash
# Install SNMP Nagios plugins
sudo apt install nagios-plugins-contrib monitoring-plugins-basic

# Test the SNMP plugin
/usr/lib/nagios/plugins/check_snmp \
  -H 192.168.1.10 \
  -P 3 \
  -U monitoruser \
  -L authPriv \
  -a SHA \
  -A "my_auth_passphrase_min32chars" \
  -x AES \
  -X "my_priv_passphrase_min32chars" \
  -o .1.3.6.1.4.1.2021.10.1.3.1 \
  -w 5.0 \
  -c 10.0
```

Nagios service definition for load monitoring:

```text
define service {
    host_name               web-server-01
    service_description     Load Average
    check_command           check_snmp_v3_load
    check_interval          5
    retry_interval          1
}

define command {
    command_name    check_snmp_v3_load
    command_line    $USER1$/check_snmp \
                    -H $HOSTADDRESS$ \
                    -P 3 \
                    -U monitoruser \
                    -L authPriv \
                    -a SHA -A $ARG1$ \
                    -x AES -X $ARG2$ \
                    -o .1.3.6.1.4.1.2021.10.1.3.1 \
                    -w 5.0 -c 10.0
}
```

## Configuring Prometheus SNMP Exporter

The Prometheus SNMP exporter translates SNMP data to the Prometheus format:

```bash
# Install snmp_exporter
wget https://github.com/prometheus/snmp_exporter/releases/download/v0.26.0/snmp_exporter-0.26.0.linux-amd64.tar.gz
tar -xzf snmp_exporter-0.26.0.linux-amd64.tar.gz
sudo mv snmp_exporter-0.26.0.linux-amd64/snmp_exporter /usr/local/bin/

# Configure with SNMPv3 credentials
sudo nano /etc/snmp_exporter/snmp.yml
```

```yaml
# snmp.yml snippet for SNMPv3
auths:
  public_v3:
    community: ""
    security_level: authPriv
    username: monitoruser
    password: my_auth_passphrase_min32chars
    auth_protocol: SHA
    priv_protocol: AES
    priv_password: my_priv_passphrase_min32chars
    version: 3
```

SNMPv3 is a significant improvement over earlier versions and should be the default for any new monitoring deployment. The extra configuration effort is worth it for the security benefits, especially in environments where SNMP traffic crosses network boundaries.

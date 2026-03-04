# How to Set Up SNMPv3 Authentication and Encryption on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SNMP, SNMPv3, Security, Encryption, Monitoring, Linux

Description: Configure SNMPv3 on RHEL with authentication and privacy (encryption) to secure SNMP communications between agents and monitoring systems.

---

SNMPv2c transmits community strings in cleartext, making it insecure for production networks. SNMPv3 adds authentication (verifying identity) and privacy (encrypting data) to SNMP communications.

## Install Net-SNMP

```bash
sudo dnf install -y net-snmp net-snmp-utils
```

## Create an SNMPv3 User

The snmpd service must be stopped when creating users:

```bash
# Stop snmpd
sudo systemctl stop snmpd

# Create an SNMPv3 user with authentication and encryption
# Format: createUser USERNAME AUTH_PROTOCOL AUTH_PASS PRIV_PROTOCOL PRIV_PASS
sudo net-snmp-create-v3-user -ro -A 'AuthPass123!secure' -a SHA -X 'PrivPass456!secure' -x AES monitoruser
```

This command:
- Creates a read-only (`-ro`) user named `monitoruser`
- Uses SHA for authentication (`-a SHA`) with password `AuthPass123!secure`
- Uses AES for encryption (`-x AES`) with password `PrivPass456!secure`

## Configure snmpd for SNMPv3

```bash
sudo tee /etc/snmp/snmpd.conf << 'CONF'
# System information
syslocation "Data Center, Rack 12"
syscontact "noc@example.com"

# Disable SNMPv1 and v2c (remove all rocommunity/rwcommunity lines)
# Only allow SNMPv3 access

# Define a read-only view
view allview included .1

# Map the SNMPv3 user to the view
# rouser USERNAME authpriv|auth|noauth
rouser monitoruser priv -V allview

# Disk and load monitoring
disk / 10%
load 8 6 4

# Logging
agentaddress udp:161
CONF
```

## Start snmpd

```bash
sudo systemctl start snmpd
sudo systemctl enable snmpd

# Verify it is listening
ss -ulnp | grep :161
```

## Test SNMPv3 Queries

```bash
# Query with authentication and privacy (authPriv - most secure)
snmpget -v3 -u monitoruser \
  -l authPriv \
  -a SHA -A 'AuthPass123!secure' \
  -x AES -X 'PrivPass456!secure' \
  localhost sysDescr.0

# Walk the system tree
snmpwalk -v3 -u monitoruser \
  -l authPriv \
  -a SHA -A 'AuthPass123!secure' \
  -x AES -X 'PrivPass456!secure' \
  localhost system

# Get interface statistics
snmpwalk -v3 -u monitoruser \
  -l authPriv \
  -a SHA -A 'AuthPass123!secure' \
  -x AES -X 'PrivPass456!secure' \
  localhost ifDescr
```

## SNMPv3 Security Levels

SNMPv3 supports three security levels:

```bash
# noAuthNoPriv - no authentication, no encryption (not recommended)
snmpget -v3 -u monitoruser -l noAuthNoPriv localhost sysDescr.0

# authNoPriv - authentication only (passwords verified but data not encrypted)
snmpget -v3 -u monitoruser -l authNoPriv \
  -a SHA -A 'AuthPass123!secure' \
  localhost sysDescr.0

# authPriv - authentication and encryption (recommended)
snmpget -v3 -u monitoruser -l authPriv \
  -a SHA -A 'AuthPass123!secure' \
  -x AES -X 'PrivPass456!secure' \
  localhost sysDescr.0
```

## Firewall Configuration

```bash
# Allow SNMP only from your monitoring network
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.0.0/24" port port="161" protocol="udp" accept'
sudo firewall-cmd --reload
```

## Create Additional Users

```bash
# Stop snmpd before creating new users
sudo systemctl stop snmpd

# Create a read-write user for management
sudo net-snmp-create-v3-user -A 'AdminAuth789!' -a SHA-256 -X 'AdminPriv789!' -x AES adminuser

# Add to snmpd.conf
echo 'rwuser adminuser priv -V allview' | sudo tee -a /etc/snmp/snmpd.conf

sudo systemctl start snmpd
```

## Verify Security

```bash
# Confirm v2c community strings no longer work
snmpget -v2c -c public localhost sysDescr.0
# Should fail with: Timeout

# Confirm v3 with wrong credentials fails
snmpget -v3 -u monitoruser -l authPriv \
  -a SHA -A 'wrongpassword' \
  -x AES -X 'wrongpassword' \
  localhost sysDescr.0
# Should fail with: Authentication failure
```

SNMPv3 with authPriv ensures that your monitoring data is both authenticated and encrypted in transit, meeting security compliance requirements.

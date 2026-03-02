# How to Set Up iDRAC/iLO Remote Access for Ubuntu Servers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, iDRAC, iLO, Remote Management, Server Administration

Description: A guide to configuring Dell iDRAC and HPE iLO for out-of-band remote access on Ubuntu servers, covering initial setup, network configuration, and common management tasks.

---

Dell iDRAC (Integrated Dell Remote Access Controller) and HPE iLO (Integrated Lights-Out) are vendor-specific implementations of out-of-band server management. They go beyond basic IPMI with richer web interfaces, virtual media (mounting ISOs remotely), virtual KVM, and vendor-specific hardware monitoring. If your servers are Dell or HPE, these tools are how you do real remote management.

This guide covers getting these interfaces set up and using them from an Ubuntu server running on the hardware.

## Dell iDRAC Setup

### Initial Configuration via BIOS

On first boot or after a BIOS reset:
1. Press F2 during POST to enter System Setup
2. Navigate to iDRAC Settings > Network
3. Set an IP address, subnet mask, and gateway for the iDRAC port
4. Enable IPMI over LAN if needed

Or configure via racadm from Ubuntu:

```bash
# Install Dell racadm tool
# Add Dell's repository first
wget -q -O - https://linux.dell.com/repo/pgp_pubkeys/0x1285491434D8786F.asc | \
    sudo apt-key add -

echo "deb [arch=amd64] https://linux.dell.com/repo/community/openmanage/960/focal focal main" | \
    sudo tee /etc/apt/sources.list.d/dell.list

sudo apt update
sudo apt install -y srvadmin-base srvadmin-idracadm8

# Start Dell services
sudo systemctl start dsm_sa_datamgrd dsm_sa_eventmgrd dsm_sa_shrsvcd

# Use racadm to configure iDRAC network
sudo racadm set iDRAC.IPv4.Address 192.168.100.60
sudo racadm set iDRAC.IPv4.Netmask 255.255.255.0
sudo racadm set iDRAC.IPv4.Gateway 192.168.100.1
sudo racadm set iDRAC.IPv4.DHCPEnable 0
sudo racadm set iDRAC.NIC.Enable 1

# Commit the changes
sudo racadm jobqueue create IDRAC.Embedded.1

# Verify
sudo racadm get iDRAC.IPv4
```

### Accessing iDRAC

Once configured, access the iDRAC web interface at `https://<idrac-ip>`:

Default credentials:
- Username: `root`
- Password: `calvin` (Dell default - change immediately)

```bash
# Change the root password via racadm
sudo racadm set iDRAC.Users.2.Password "NewStrongPassword123!"

# Create a new admin account
sudo racadm set iDRAC.Users.3.UserName "sysadmin"
sudo racadm set iDRAC.Users.3.Password "AnotherStrongPassword!"
sudo racadm set iDRAC.Users.3.Privilege 511
sudo racadm set iDRAC.Users.3.Enable 1
```

### iDRAC Command-Line Operations

```bash
# Power control
sudo racadm serveraction graceshutdown  # OS shutdown
sudo racadm serveraction powerdown      # Hard power off
sudo racadm serveraction powerup        # Power on
sudo racadm serveraction powercycle     # Power cycle
sudo racadm serveraction hardreset      # Hard reset

# Get server status
sudo racadm getsysinfo

# Get sensor readings
sudo racadm getsensorinfo

# Get hardware inventory
sudo racadm hwinventory

# View system event log
sudo racadm getsel

# Clear system event log
sudo racadm clrsel
```

### Remote racadm (from any machine)

You do not need to be on the server itself to use racadm:

```bash
# Run racadm remotely against iDRAC
racadm -r 192.168.100.60 -u root -p password getsysinfo

# Power operations from your workstation
racadm -r 192.168.100.60 -u root -p password serveraction powercycle
```

### Virtual Console and Virtual Media

Through the iDRAC web interface:
1. Log in at `https://<idrac-ip>`
2. Click "Launch Virtual Console" for keyboard/video/mouse access
3. For Virtual Media: Connect > Virtual Media > Map CD/DVD
4. Browse to an ISO file to mount it to the server remotely

This lets you install Ubuntu or boot from a rescue ISO without physically being at the server.

## HPE iLO Setup

### Initial Configuration via BIOS

1. Press F9 during POST to enter System Utilities
2. Navigate to iLO 5 Configuration Utility (or iLO 4)
3. Configure Network Options with a static IP
4. Set up user accounts

Or configure from Ubuntu using HPE's tools:

```bash
# Install HPE tools
# Add HPE repository
wget -q -O - https://downloads.linux.hpe.com/SDR/hpPublicKey2048_key1.pub | \
    sudo apt-key add -

echo "deb https://downloads.linux.hpe.com/SDR/repo/mcp focal/current non-free" | \
    sudo tee /etc/apt/sources.list.d/hpe.list

sudo apt update
sudo apt install -y ilo-utilities hp-health

# Use hponcfg to configure iLO
# First get the current config
sudo hponcfg -g -f /tmp/current_ilo_config.xml

# View it
cat /tmp/current_ilo_config.xml
```

### Configure iLO Network via hponcfg

Create an XML configuration file:

```xml
<!-- /tmp/ilo_network_config.xml -->
<RIBCL VERSION="2.0">
  <LOGIN USER_LOGIN="Administrator" PASSWORD="currentpassword">
    <RIB_INFO MODE="write">
      <MOD_NETWORK_SETTINGS>
        <SPEED_AUTOSELECT value="Yes"/>
        <NIC_SPEED value="Automatic"/>
        <FULL_DUPLEX value="Automatic"/>
        <DHCP_ENABLE value="No"/>
        <SHARED_NETWORK_PORT value="No"/>
        <VLAN_ENABLED value="No"/>
        <IP_ADDRESS value="192.168.100.70"/>
        <SUBNET_MASK value="255.255.255.0"/>
        <GATEWAY_IP_ADDRESS value="192.168.100.1"/>
        <DNS_NAME value="ilo-server1"/>
      </MOD_NETWORK_SETTINGS>
    </RIB_INFO>
  </LOGIN>
</RIBCL>
```

```bash
# Apply the configuration
sudo hponcfg -f /tmp/ilo_network_config.xml

# Change the administrator password
cat > /tmp/change_password.xml <<'EOF'
<RIBCL VERSION="2.0">
  <LOGIN USER_LOGIN="Administrator" PASSWORD="currentpassword">
    <USER_INFO MODE="write">
      <MOD_USER USER_LOGIN="Administrator">
        <PASSWORD value="NewStrongPassword123!"/>
      </MOD_USER>
    </USER_INFO>
  </LOGIN>
</RIBCL>
EOF

sudo hponcfg -f /tmp/change_password.xml
```

### iLO RESTful API (iLO 4 and 5)

HPE iLO 4 and 5 support a RESTful API, which is significantly more scriptable than XML-based hponcfg:

```bash
# Install the HPE Python library
pip install python-ilorest-library

# Or use curl directly
IDRAC_HOST="https://192.168.100.70"
USER="Administrator"
PASS="password"

# Get system overview
curl -k -u "$USER:$PASS" "$IDRAC_HOST/redfish/v1/Systems/1/" | python3 -m json.tool

# Get power state
curl -k -u "$USER:$PASS" "$IDRAC_HOST/redfish/v1/Systems/1/" | \
    python3 -c "import json,sys; d=json.load(sys.stdin); print(d['PowerState'])"

# Power reset
curl -k -u "$USER:$PASS" -X POST \
    -H "Content-Type: application/json" \
    -d '{"ResetType":"ForceRestart"}' \
    "$IDRAC_HOST/redfish/v1/Systems/1/Actions/ComputerSystem.Reset/"
```

### Using iLO RIBCL for Common Operations

```python
#!/usr/bin/env python3
# ilo_manager.py - HPE iLO management via RIBCL

import subprocess
import tempfile
import os

def ilo_command(ilo_host, username, password, xml_command):
    """Run an iLO RIBCL command."""
    xml_content = f"""
<RIBCL VERSION="2.0">
  <LOGIN USER_LOGIN="{username}" PASSWORD="{password}">
    {xml_command}
  </LOGIN>
</RIBCL>
"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.xml', delete=False) as f:
        f.write(xml_content)
        tmp_file = f.name

    try:
        result = subprocess.run(
            ['hponcfg', '-f', tmp_file],
            capture_output=True, text=True
        )
        return result.stdout, result.returncode
    finally:
        os.unlink(tmp_file)

# Get system health
health_xml = """
<SERVER_INFO MODE="read">
  <GET_ALL_FANS/>
  <GET_ALL_POWER_SUPPLIES/>
  <GET_EMBEDDED_HEALTH/>
</SERVER_INFO>
"""

output, rc = ilo_command("192.168.100.70", "Administrator", "password", health_xml)
print(output)
```

## Redfish API (Both Dell and HPE)

Both Dell iDRAC and HPE iLO support the Redfish API, a modern REST standard for server management:

```bash
# Common Redfish endpoints
BASE="https://192.168.100.60"  # Works for both iDRAC and iLO
CREDS="admin:password"

# System info
curl -k -u $CREDS "$BASE/redfish/v1/Systems/System.Embedded.1"

# Get all managers (BMC info)
curl -k -u $CREDS "$BASE/redfish/v1/Managers"

# Get chassis sensors
curl -k -u $CREDS "$BASE/redfish/v1/Chassis/System.Embedded.1/Sensors" | \
    python3 -m json.tool

# Power action
curl -k -u $CREDS -X POST \
    -H "Content-Type: application/json" \
    -d '{"ResetType":"GracefulRestart"}' \
    "$BASE/redfish/v1/Systems/System.Embedded.1/Actions/ComputerSystem.Reset"
```

## Security Best Practices

```bash
# Always change default credentials
# Configure dedicated VLAN for management traffic
# Enable SSL/TLS for all connections
# Restrict access by source IP where possible
# Keep iDRAC/iLO firmware updated

# For iDRAC - update firmware via racadm
sudo racadm update -f iDRAC_Firmware.exe -l /tmp/

# For iLO - update via web interface or hponcfg
# System Utilities > Embedded Applications > iLO 5 > Firmware Update
```

These vendor management interfaces are among the most powerful tools in a sysadmin's kit. Physical presence is rarely required when iDRAC or iLO is properly configured and accessible from your management network.

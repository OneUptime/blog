# How to Use MAAS (Metal as a Service) for Ubuntu Provisioning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MAAS, Provisioning, Bare Metal, Automation

Description: Deploy and configure MAAS (Metal as a Service) on Ubuntu to provision bare-metal servers at cloud speed, with PXE boot, commissioning, and deployment automation.

---

MAAS (Metal as a Service) is Canonical's bare-metal provisioning system. It treats physical servers the way cloud providers treat virtual machines - you can deploy, release, and reprovision machines through an API or web interface. MAAS handles PXE booting, hardware discovery, OS deployment, and network configuration automatically. It is the tool of choice when you need cloud-like agility over physical hardware.

## MAAS Architecture

MAAS has two components:
- **Region controller** - handles the database, API, and web UI
- **Rack controller** - manages DHCP, TFTP, and image caching for a physical rack or subnet

In small deployments, both run on the same machine. In larger environments, multiple rack controllers serve different network segments while all reporting to a central region controller.

## Installing MAAS

MAAS is distributed as a snap, which is the recommended installation method.

```bash
# Install MAAS snap (includes both region and rack controller)
sudo snap install maas

# Or install a specific channel
sudo snap install maas --channel=3.4/stable

# Check the installed version
sudo snap info maas
```

## Setting Up PostgreSQL

MAAS requires PostgreSQL as its database backend.

```bash
# Install PostgreSQL
sudo apt install postgresql

# Create the MAAS database and user
sudo -u postgres psql << 'EOF'
CREATE USER maas WITH PASSWORD 'your-secure-password';
CREATE DATABASE maas;
GRANT ALL PRIVILEGES ON DATABASE maas TO maas;
\q
EOF
```

## Initializing MAAS

```bash
# Initialize MAAS with the database connection
sudo maas init region+rack \
  --database-uri "postgres://maas:your-secure-password@localhost/maas" \
  --maas-url "http://192.168.1.10:5240/MAAS"

# Create the admin user
sudo maas createadmin \
  --username=admin \
  --password=your-admin-password \
  --email=admin@example.com

# Optionally import SSH keys from Launchpad for the admin
sudo maas createadmin \
  --username=admin \
  --password=admin-password \
  --email=admin@example.com \
  --ssh-import=lp:your-launchpad-id
```

## Accessing the MAAS Web UI

```bash
# The web interface is available at:
# http://192.168.1.10:5240/MAAS/

# Check MAAS status
sudo maas status
```

The first time you log in, MAAS walks you through initial setup: setting a DNS forwarder, choosing Ubuntu image sources, and configuring NTP.

## Downloading OS Images

MAAS needs to download OS images before it can deploy them.

```bash
# Login to the MAAS CLI
maas login admin http://192.168.1.10:5240/MAAS/ $(sudo maas apikey --username=admin)

# List available images
maas admin boot-sources read

# Import Ubuntu images (this downloads from Canonical's image servers)
# Usually done through the web UI: Settings > Images > Ubuntu
# Or via CLI:
maas admin boot-resources import

# Check download status
maas admin boot-resources read
```

Alternatively, from the web UI: go to **Images** in the left sidebar, select Ubuntu releases, and click **Update Selection**.

## Configuring DHCP in MAAS

MAAS manages its own DHCP server. Configure it from the web UI or CLI.

From the web UI:
1. Go to **Subnets** in the left sidebar.
2. Click on your subnet.
3. In the **Reserved Ranges** section, define a dynamic IP range for PXE booting.
4. Go to **VLAN** for the subnet and enable DHCP.

Via CLI:

```bash
# Get the fabric and VLAN ID
maas admin fabrics read
maas admin vlans read 0  # fabric ID 0

# Enable DHCP on a VLAN (VLAN ID 5001 in this example)
maas admin vlan update 1 untagged \
  dhcp_on=true \
  primary_rack=your-rack-controller-id
```

## Enrolling Machines (Commissioning)

When a machine PXE-boots into MAAS for the first time, it goes through a "commissioning" phase where MAAS discovers hardware details.

```bash
# Set PXE boot order on the physical machine (via iDRAC, iLO, or BIOS)
# then power on the machine

# The machine will appear in MAAS as "New"
# Commission it from the web UI or CLI:
maas admin machine commission system_id=abc123

# List all machines and their status
maas admin machines read | python3 -m json.tool | grep -E '"hostname"|"status_name"'
```

### Automatic Power Control

MAAS can power machines on and off automatically via BMC (IPMI, Redfish, DRAC, iLO).

```bash
# Configure power type for a machine (IPMI example)
maas admin machine update abc123 \
  power_type=ipmi \
  power_parameters='{"power_address": "192.168.2.101", "power_user": "admin", "power_pass": "password"}'
```

## Deploying an OS

Once a machine is commissioned (in "Ready" state), deploy Ubuntu to it.

```bash
# Deploy Ubuntu 24.04 to a specific machine
maas admin machine deploy abc123 \
  distro_series=noble  # Ubuntu 24.04 LTS codename

# Deploy with a specific kernel
maas admin machine deploy abc123 \
  distro_series=noble \
  hwe_kernel=hwe-24.04

# Deploy with cloud-init user data
maas admin machine deploy abc123 \
  distro_series=noble \
  user_data=$(base64 -w 0 /path/to/cloud-init.yaml)
```

From the web UI: click the machine, click **Deploy**, select the OS and release, and click **Start deployment**.

## Using Tags and Profiles

Tags help organize machines and can trigger automatic profile assignment.

```bash
# Create a tag
maas admin tags create name=webserver comment="Web server nodes"

# Apply a tag to a machine
maas admin tag update-nodes webserver add=abc123

# List machines with a specific tag
maas admin machines read | python3 -c "
import json, sys
machines = json.load(sys.stdin)
for m in machines:
    if 'webserver' in [t['name'] for t in m.get('tag_names', [])]:
        print(m['hostname'], m['status_name'])
"
```

## Cloud-Init Integration

MAAS passes cloud-init data to deployed machines, enabling post-deployment configuration.

```yaml
# cloud-init.yaml - runs after OS deployment
#cloud-config
package_update: true
package_upgrade: true

packages:
  - nginx
  - vim
  - htop

users:
  - name: deploy
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ssh-rsa AAAA...your-public-key...

runcmd:
  - systemctl enable nginx
  - systemctl start nginx
```

```bash
# Deploy with cloud-init configuration
maas admin machine deploy abc123 \
  distro_series=noble \
  user_data=$(base64 -w 0 cloud-init.yaml)
```

## Releasing Machines

When you are done with a machine, release it back to the pool.

```bash
# Release a deployed machine (wipes and returns to Ready state)
maas admin machine release abc123

# Erase the disk before releasing
maas admin machine release abc123 erase=true
```

## Monitoring MAAS

```bash
# Check MAAS service status
sudo snap services maas

# View MAAS logs
sudo journalctl -u snap.maas.regiond -f
sudo journalctl -u snap.maas.rackd -f

# MAAS API status endpoint
curl http://192.168.1.10:5240/MAAS/api/2.0/version/
```

MAAS is the most complete bare-metal provisioning solution for Ubuntu environments. Its integration with Juju (for application deployment) and its REST API make it well-suited for infrastructure-as-code workflows at any scale.

# How to Set Up Nagios NCPA Agent Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Nagios, NCPA, Agent Monitoring, REST API, Cross-Platform

Description: Install and configure the Nagios Cross-Platform Agent (NCPA) on RHEL for modern REST API-based monitoring with a built-in web GUI and both active and passive check support.

---

NCPA (Nagios Cross-Platform Agent) is a modern alternative to NRPE. It provides a REST API for querying metrics, a built-in web interface for live monitoring, and supports both active and passive checks. It runs on port 5693 by default.

## Install NCPA on the Remote RHEL Host

```bash
# Add the Nagios NCPA repository
sudo rpm -Uvh https://repo.nagios.com/nagios/7/nagios-repo-7-1.el9.noarch.rpm

# Install NCPA
sudo dnf install -y ncpa

# Start and enable the NCPA service
sudo systemctl enable --now ncpa_listener
```

## Configure NCPA

```bash
# The main configuration file
sudo vi /usr/local/ncpa/etc/ncpa.cfg

# Key settings:
# [listener]
# ip = 0.0.0.0
# port = 5693
#
# [api]
# community_string = mytoken123
#
# [passive checks]
# handlers = nrdp
# nrdp_url = http://nagios-server/nrdp
# nrdp_token = your_nrdp_token
```

Set a secure community string (token):

```bash
# Edit the config and change the community_string
sudo sed -i 's/community_string = .*/community_string = mySecureToken123/' \
    /usr/local/ncpa/etc/ncpa.cfg

# Restart NCPA
sudo systemctl restart ncpa_listener
```

## Open the Firewall

```bash
sudo firewall-cmd --permanent --add-port=5693/tcp
sudo firewall-cmd --reload
```

## Test the NCPA API

```bash
# Query from the Nagios server or any machine
# Get CPU usage
curl -k "https://192.168.1.50:5693/api/cpu/percent?token=mySecureToken123&aggregate=avg"

# Get memory usage
curl -k "https://192.168.1.50:5693/api/memory/virtual?token=mySecureToken123"

# Get disk usage
curl -k "https://192.168.1.50:5693/api/disk/logical?token=mySecureToken123"

# Get system uptime
curl -k "https://192.168.1.50:5693/api/system/uptime?token=mySecureToken123"

# List all available API endpoints
curl -k "https://192.168.1.50:5693/api/?token=mySecureToken123"
```

## Access the NCPA Web GUI

Open `https://192.168.1.50:5693` in a browser. Enter the community string token to access the built-in dashboard showing live system metrics.

## Install check_ncpa on the Nagios Server

```bash
# Download the check_ncpa plugin
cd /usr/local/nagios/libexec/
sudo wget https://raw.githubusercontent.com/NagiosEnterprises/ncpa/master/client/check_ncpa.py
sudo chmod +x check_ncpa.py

# Or use the packaged version
# sudo dnf install -y ncpa-plugin
```

## Define NCPA Commands in Nagios

```bash
# Add to /usr/local/nagios/etc/objects/commands.cfg
sudo tee -a /usr/local/nagios/etc/objects/commands.cfg << 'EOF'

define command {
    command_name    check_ncpa
    command_line    $USER1$/check_ncpa.py -H $HOSTADDRESS$ -t $ARG1$ -M $ARG2$ $ARG3$
}
EOF
```

## Define Host and Services Using NCPA

```bash
sudo tee /usr/local/nagios/etc/objects/rhel-ncpa.cfg << 'EOF'
define host {
    use                 linux-server
    host_name           rhel-ncpa-01
    alias               RHEL NCPA Host
    address             192.168.1.50
}

define service {
    use                 generic-service
    host_name           rhel-ncpa-01
    service_description CPU Usage
    check_command       check_ncpa!mySecureToken123!cpu/percent!-w 80 -c 90 --aggregate avg
}

define service {
    use                 generic-service
    host_name           rhel-ncpa-01
    service_description Memory Usage
    check_command       check_ncpa!mySecureToken123!memory/virtual!-w 80 -c 90 -u G
}

define service {
    use                 generic-service
    host_name           rhel-ncpa-01
    service_description Disk /
    check_command       check_ncpa!mySecureToken123!disk/logical/|!-w 80 -c 90
}

define service {
    use                 generic-service
    host_name           rhel-ncpa-01
    service_description Process Count
    check_command       check_ncpa!mySecureToken123!processes!-w 200 -c 300
}
EOF

echo 'cfg_file=/usr/local/nagios/etc/objects/rhel-ncpa.cfg' | \
    sudo tee -a /usr/local/nagios/etc/nagios.cfg

sudo /usr/local/nagios/bin/nagios -v /usr/local/nagios/etc/nagios.cfg
sudo systemctl reload nagios
```

NCPA is easier to set up than NRPE and provides a REST API that can be used by tools beyond Nagios. The built-in web GUI is particularly useful for quick on-host diagnostics.

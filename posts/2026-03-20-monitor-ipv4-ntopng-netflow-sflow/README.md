# How to Monitor IPv4 Traffic with ntopng Using NetFlow and sFlow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ntopng, NetFlow, sFlow, Traffic Monitoring, IPv4, Network Analytics

Description: Learn how to install ntopng and configure it to receive NetFlow and sFlow data for real-time IPv4 traffic monitoring and visualization.

## What Is ntopng?

ntopng is an open-source network traffic monitoring tool that provides a web-based dashboard for real-time and historical traffic analysis. It can receive NetFlow v5/v9, IPFIX, and sFlow data, as well as perform live packet capture via libpcap.

## Step 1: Install ntopng on Ubuntu/Debian

```bash
# Install prerequisites and the ntop repository package
# (replace 22.04 with 20.04 or 24.04 as appropriate for your release)
sudo apt-get install -y software-properties-common wget
wget https://packages.ntop.org/apt-stable/22.04/all/apt-ntop-stable.deb
sudo apt install -y ./apt-ntop-stable.deb

sudo apt-get clean all
sudo apt-get update
sudo apt-get install -y ntopng nprobe

# Start ntopng
sudo systemctl enable ntopng
sudo systemctl start ntopng
```

## Step 2: Configure ntopng to Receive NetFlow

ntopng does not collect NetFlow directly. nProbe acts as the flow collector and forwards
the data to ntopng over a ZMQ socket. Configure ntopng to consume that socket:

```bash
# Edit /etc/ntopng/ntopng.conf
cat > /etc/ntopng/ntopng.conf << 'EOF'
# Consume flows from nProbe over ZMQ (probe mode: nProbe connects to ntopng).
# The trailing 'c' tells ntopng to act as the ZMQ collector endpoint.
-i=tcp://*:5556c

# Web interface port
-w=3000

# Data directory for historical data
-d=/var/lib/ntopng

# Enable community edition features
--community

EOF

sudo systemctl restart ntopng
```

Then run nProbe as a NetFlow collector that forwards flows to ntopng via ZMQ:

```bash
# Listen for NetFlow v5/v9/IPFIX on UDP/2055 and forward to ntopng on tcp://*:5556
sudo nprobe -i none -n none --collector-port 2055 --zmq tcp://127.0.0.1:5556
```

## Step 3: Configure ntopng for sFlow

To receive sFlow instead of (or in addition to) NetFlow, run a second nProbe instance
that listens on the sFlow port (6343) and forwards to the same ntopng ZMQ endpoint:

```bash
# nProbe collecting sFlow on UDP/6343
sudo nprobe -i none -n none --collector-port 6343 --zmq tcp://127.0.0.1:5556
```

Because ntopng is started with `-i=tcp://*:5556c` (probe/collector mode), multiple
nProbe instances can connect to the same ntopng socket simultaneously, allowing both
NetFlow and sFlow data to be ingested at once.

## Step 4: Configure Network Devices to Send Flows to ntopng

On your Cisco router, configure NetFlow export to ntopng:

```bash
! Send NetFlow v5 to ntopng server
Router(config)# ip flow-export destination 192.168.1.200 2055
Router(config)# ip flow-export version 5
Router(config)# ip flow-export source Loopback0

! Enable on WAN interface
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip flow ingress
Router(config-if)# ip flow egress
```

## Step 5: Access the ntopng Dashboard

Open your browser and navigate to `http://server-ip:3000`. Login with the default credentials `admin` / `admin`; ntopng will prompt you to change the password on first login.

Key dashboard sections:
- **Top Talkers:** Hosts generating the most traffic
- **Flow Explorer:** Searchable real-time flow table
- **Alerts:** Configured network anomaly notifications
- **Traffic Analysis:** Protocol breakdown and trends

## Step 6: Set Up Traffic Alerts

Configure ntopng to alert on anomalous traffic via the web UI:

- **Notification endpoints** (webhook, email, syslog, Slack, etc.) are configured under
  **Settings > Notifications > Endpoints** and bound to a recipient under
  **Settings > Notifications > Recipients**.
- **Behavioural checks** (host, flow, interface, network, system) are enabled and tuned
  under **Settings > Checks**. For example, the per-host traffic threshold check fires
  when a host exceeds a configurable byte rate.

For custom logic, ntopng exposes a Lua-based check API. User checks for hosts live in
`/usr/share/ntopng/scripts/callbacks/checks/hosts/` and register hooks against the
host object. See the official Lua API guide for the current function signatures and
the `host.triggerAlert` / `alert_consts` helpers used to raise alerts.

## Step 7: Verify Data Is Flowing

```bash
# Confirm nProbe is listening on the NetFlow/sFlow UDP collector port
sudo ss -lunp | grep -E '2055|6343'

# Confirm ntopng is listening on the ZMQ socket (TCP/5556)
sudo ss -ltnp | grep 5556

# Check for incoming NetFlow on UDP/2055
sudo tcpdump -i any udp port 2055 -n -c 5

# View ntopng logs
sudo journalctl -u ntopng -f
```

The ntopng dashboard should show active flows and top talkers within a few seconds of starting the NetFlow/sFlow export.

## Conclusion

ntopng provides a powerful, free web dashboard for IPv4 traffic monitoring using NetFlow and sFlow data. Install ntopng and nProbe, run nProbe as the NetFlow/sFlow collector that forwards via ZMQ to ntopng, point your routers and switches at the nProbe collector ports, and use the web dashboard to analyze top talkers, protocols, and traffic trends. The community edition is free and sufficient for most monitoring needs.

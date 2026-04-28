# How to Use nfdump and nfsen to Analyze NetFlow Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NetFlow, Nfdump, Nfsen, Traffic Analysis, Network Monitoring, Linux

Description: Learn how to use nfdump to collect NetFlow data and nfsen to provide a web frontend for browsing and analyzing network flow records.

## What Are nfdump and nfsen?

**nfdump** is a command-line tool suite for collecting and analyzing NetFlow data:
- `nfcapd`: The NetFlow capture daemon (receives and stores flows)
- `nfdump`: The analysis tool (queries and filters stored flow files)

**nfsen** is a Perl-based web frontend for nfdump that provides graphs, reports, and a flow browser.

## Step 1: Install nfdump

```bash
# Install on Ubuntu/Debian

sudo apt-get install -y nfdump

# Verify installation
nfdump -V
nfcapd -h
```

## Step 2: Start nfcapd to Collect Flows

```bash
# Create storage directory
sudo mkdir -p /var/log/netflow/router1
sudo chown www-data:www-data /var/log/netflow/router1

# Start nfcapd to receive NetFlow on port 2055
# -t 300: rotate files every 300 seconds (5 minutes, the default)
# -D: run as daemon
# -l: storage directory
# -p: listening port
sudo nfcapd -t 300 -D -l /var/log/netflow/router1 -p 2055 -b 0.0.0.0

# Verify it's running
sudo netstat -lunp | grep 2055
```

Configure as a systemd service for persistence:

```bash
sudo tee /etc/systemd/system/nfcapd.service > /dev/null << 'EOF'
[Unit]
Description=NetFlow Capture Daemon
After=network.target

[Service]
ExecStart=/usr/bin/nfcapd -t 300 -l /var/log/netflow/router1 -p 2055 -b 0.0.0.0
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable nfcapd
sudo systemctl start nfcapd
```

## Step 3: Analyze Flows with nfdump

nfdump queries stored flow files with a powerful filter syntax:

```bash
# Show summary of the last 5 minutes (nfdump -t requires absolute timestamps)
nfdump -R /var/log/netflow/router1/ \
  -t "$(date -d '5 minutes ago' +%Y/%m/%d.%H:%M:%S)-$(date +%Y/%m/%d.%H:%M:%S)" \
  -s record/bytes -n 10

# Top 10 source IPs by bytes in the last hour
nfdump -R /var/log/netflow/router1/ \
  -t "$(date -d '1 hour ago' +%Y/%m/%d.%H:%M:%S)-$(date +%Y/%m/%d.%H:%M:%S)" \
  -s srcip/bytes -n 10

# Show specific protocol traffic (TCP port 80)
# nfdump filters are passed as the trailing positional argument
nfdump -R /var/log/netflow/router1/ \
  -s srcip/bytes -n 10 \
  'proto tcp and dst port 80'

# Show traffic to a specific destination
nfdump -R /var/log/netflow/router1/ \
  -o "fmt:%ts %sa %da %sp %dp %pkt %byt" \
  'dst host 8.8.8.8'
```

## Step 4: nfdump Output Format Options

```bash
# Show flows in default format (pipe-separated)
nfdump -R /var/log/netflow/router1/ -o line | head -20

# Show with timestamp, IPs, ports, bytes
nfdump -R /var/log/netflow/router1/ \
  -o "fmt:%ts %td %pr %sa %sp %da %dp %pkt %byt %fl"

# Generate CSV output for spreadsheet analysis
nfdump -R /var/log/netflow/router1/ -o csv > /tmp/flows.csv
```

## Step 5: Create Aggregate Reports

```bash
# Total bytes per source subnet
nfdump -R /var/log/netflow/router1/ \
  -A srcip4/16 -s srcip/bytes -n 10

# Traffic volume per protocol
nfdump -R /var/log/netflow/router1/ -s proto/bytes

# Port scan detection: hosts making many connections to different ports
nfdump -R /var/log/netflow/router1/ \
  -A srcip,dstport -s record/flows -n 20 \
  'proto tcp and flags S'
```

## Step 6: Install nfsen Web Frontend

```bash
# Install dependencies
sudo apt-get install -y apache2 php libapache2-mod-php \
  perl librrds-perl libmailtools-perl

# Download nfsen
wget https://sourceforge.net/projects/nfsen/files/stable/nfsen-1.3.8/nfsen-1.3.8.tar.gz
tar -xzf nfsen-1.3.8.tar.gz
cd nfsen-1.3.8

# Configure nfsen
cp etc/nfsen-dist.conf etc/nfsen.conf
# Edit nfsen.conf to set:
# $HTMLDIR = "/var/www/html/nfsen";
# $BACKEND_PLUGINDIR = "/var/lib/nfsen/plugins";
# Add your source:
# %sources = (
#     'router1' => { 'port' => '2055', 'col' => '#0000ff', 'type' => 'netflow' },
# );

sudo perl install.pl etc/nfsen.conf
sudo systemctl start nfsen
```

Access nfsen at `http://server-ip/nfsen/nfsen.php`

## Step 7: Automate Periodic Analysis

```bash
#!/bin/bash
# daily_netflow_report.sh
DATE=$(date -d 'yesterday' +%Y/%m/%d)
REPORT="/var/reports/netflow_${DATE//\//-}.txt"

echo "Daily NetFlow Report - $DATE" > "$REPORT"
echo "================================" >> "$REPORT"
echo "" >> "$REPORT"
echo "Top 10 Source IPs by Traffic Volume:" >> "$REPORT"
nfdump -R /var/log/netflow/router1/${DATE} -s srcip/bytes -n 10 >> "$REPORT"
echo "" >> "$REPORT"
echo "Top 10 Destination Ports:" >> "$REPORT"
nfdump -R /var/log/netflow/router1/${DATE} -s dstport/bytes -n 10 >> "$REPORT"
```

## Conclusion

nfdump and nfsen provide a proven open-source NetFlow analysis stack. Run nfcapd to collect and store flow files, use nfdump's flexible filter and aggregation syntax for ad-hoc analysis, and deploy nfsen for a web-based dashboard with graphs and a flow browser. nfdump's filter syntax is particularly powerful for security investigations-detecting port scans, large transfers, and unusual traffic patterns.

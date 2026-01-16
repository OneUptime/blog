# How to Install Suricata IDS/IPS on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Suricata, IDS, IPS, Network Security, Tutorial

Description: Complete guide to installing and configuring Suricata intrusion detection and prevention system on Ubuntu.

---

## Introduction

Suricata is a powerful, open-source network threat detection engine developed by the Open Information Security Foundation (OISF). It combines intrusion detection (IDS), intrusion prevention (IPS), network security monitoring (NSM), and offline packet capture (pcap) processing capabilities in a single tool. Unlike traditional signature-based systems, Suricata leverages multi-threading to achieve high-performance packet processing, making it suitable for enterprise-grade network security deployments.

In this comprehensive guide, you will learn how to install, configure, and optimize Suricata on Ubuntu for both IDS and IPS modes.

## Understanding Suricata Capabilities

Suricata offers a robust set of features that make it one of the most versatile network security tools available:

### Core Features

- **Multi-threaded Architecture**: Suricata can leverage multiple CPU cores for parallel packet processing, significantly improving throughput
- **Protocol Detection**: Automatic detection of protocols like HTTP, TLS, FTP, SMB, and DNS regardless of port
- **File Extraction**: Ability to extract files from network streams for further analysis
- **Lua Scripting**: Extend detection capabilities with custom Lua scripts
- **EVE JSON Logging**: Comprehensive JSON output for easy integration with SIEM solutions
- **Compatibility**: Full compatibility with Snort rules while supporting its own enhanced rule format

### Detection Capabilities

Suricata can detect and alert on:

- Malware communication and command-and-control traffic
- Exploit attempts and vulnerability scanning
- Policy violations and suspicious network behavior
- Data exfiltration attempts
- Protocol anomalies and evasion techniques

## IDS vs IPS Modes

Understanding the difference between IDS and IPS modes is crucial for proper deployment:

### Intrusion Detection System (IDS) Mode

In IDS mode, Suricata operates passively by monitoring a copy of network traffic (typically via port mirroring or a TAP device). It analyzes packets and generates alerts but does not interfere with traffic flow.

**Advantages:**
- No impact on network latency
- Safer for initial deployment and testing
- No risk of blocking legitimate traffic

**Use Cases:**
- Network visibility and threat monitoring
- Security research and forensics
- Initial deployment before moving to IPS

### Intrusion Prevention System (IPS) Mode

In IPS mode, Suricata operates inline, meaning all traffic passes through it. This allows Suricata to actively block malicious traffic by dropping packets that match threat signatures.

**Advantages:**
- Active threat prevention
- Real-time blocking of attacks
- Automated response to threats

**Use Cases:**
- Production environments requiring active protection
- Compliance requirements for threat prevention
- Critical infrastructure protection

## Prerequisites

Before installing Suricata, ensure your system meets these requirements:

```bash
# Check Ubuntu version (20.04 LTS or later recommended)
lsb_release -a

# Ensure system is updated
sudo apt update && sudo apt upgrade -y

# Install essential build tools
sudo apt install -y software-properties-common
```

### Hardware Recommendations

| Deployment Size | CPU Cores | RAM | Storage |
|----------------|-----------|-----|---------|
| Small (< 100 Mbps) | 2+ | 4 GB | 50 GB |
| Medium (100 Mbps - 1 Gbps) | 4+ | 8 GB | 100 GB |
| Large (> 1 Gbps) | 8+ | 16+ GB | 500+ GB |

## Installing Suricata

### Method 1: Install from Official PPA (Recommended)

The OISF maintains an official PPA with the latest stable releases:

```bash
# Add the OISF PPA repository
sudo add-apt-repository ppa:oisf/suricata-stable

# Update package lists
sudo apt update

# Install Suricata
sudo apt install -y suricata

# Verify installation
suricata --build-info
```

### Method 2: Install from Ubuntu Repositories

For a quick installation using Ubuntu's default repositories:

```bash
# Install Suricata from Ubuntu repos
sudo apt install -y suricata

# Note: This may not be the latest version
suricata -V
```

### Method 3: Compile from Source

For maximum control and the latest features, compile from source:

```bash
# Install build dependencies
sudo apt install -y \
    autoconf \
    automake \
    build-essential \
    cargo \
    cbindgen \
    libcap-ng-dev \
    libcap-ng0 \
    libevent-dev \
    libgeoip-dev \
    libhiredis-dev \
    libhtp-dev \
    libjansson-dev \
    liblua5.1-dev \
    liblz4-dev \
    libmagic-dev \
    libnet1-dev \
    libnetfilter-queue-dev \
    libnfnetlink-dev \
    libnss3-dev \
    libpcap-dev \
    libpcre2-dev \
    libpython3-dev \
    libyaml-dev \
    make \
    pkg-config \
    python3 \
    python3-pip \
    rustc \
    zlib1g-dev

# Download latest Suricata source
cd /tmp
wget https://www.openinfosecfoundation.org/download/suricata-7.0.3.tar.gz

# Extract and compile
tar -xzf suricata-7.0.3.tar.gz
cd suricata-7.0.3

# Configure with common options
./configure \
    --prefix=/usr \
    --sysconfdir=/etc \
    --localstatedir=/var \
    --enable-nfqueue \
    --enable-lua \
    --enable-geoip \
    --enable-rust

# Compile (use number of CPU cores)
make -j$(nproc)

# Install
sudo make install
sudo make install-conf
sudo make install-rules

# Update shared library cache
sudo ldconfig
```

## Network Interface Configuration

Proper network interface configuration is essential for Suricata to capture traffic effectively.

### Identify Your Network Interface

```bash
# List all network interfaces
ip link show

# Check interface details
ip addr show

# Common interface names:
# - eth0, eth1: Traditional naming
# - ens33, ens160: VMware virtual interfaces
# - enp0s3: VirtualBox interfaces
# - eno1, eno2: Onboard NICs
```

### Configure Interface for Packet Capture

For optimal packet capture, configure your network interface with these settings:

```bash
# Create a script to configure the capture interface
sudo tee /usr/local/bin/configure-suricata-interface.sh << 'EOF'
#!/bin/bash
# Suricata Network Interface Configuration Script
# This script optimizes the network interface for packet capture

INTERFACE="${1:-eth0}"

echo "Configuring interface: $INTERFACE"

# Disable hardware offloading features that can interfere with capture
# Generic Receive Offload (GRO)
sudo ethtool -K $INTERFACE gro off 2>/dev/null || echo "GRO not supported"

# Large Receive Offload (LRO)
sudo ethtool -K $INTERFACE lro off 2>/dev/null || echo "LRO not supported"

# TCP Segmentation Offload (TSO)
sudo ethtool -K $INTERFACE tso off 2>/dev/null || echo "TSO not supported"

# Generic Segmentation Offload (GSO)
sudo ethtool -K $INTERFACE gso off 2>/dev/null || echo "GSO not supported"

# Increase ring buffer sizes for better packet handling
sudo ethtool -G $INTERFACE rx 4096 2>/dev/null || echo "Could not set RX ring buffer"
sudo ethtool -G $INTERFACE tx 4096 2>/dev/null || echo "Could not set TX ring buffer"

# Verify settings
echo "Current offload settings:"
ethtool -k $INTERFACE | grep -E "(generic-receive-offload|large-receive-offload|tcp-segmentation-offload|generic-segmentation-offload)"

echo "Interface configuration complete"
EOF

# Make script executable
sudo chmod +x /usr/local/bin/configure-suricata-interface.sh

# Run the script (replace eth0 with your interface)
sudo /usr/local/bin/configure-suricata-interface.sh eth0
```

### Enable Promiscuous Mode

For IDS mode, the interface should be in promiscuous mode to capture all traffic:

```bash
# Enable promiscuous mode temporarily
sudo ip link set eth0 promisc on

# Verify promiscuous mode
ip link show eth0 | grep PROMISC

# To make it permanent, create a systemd service
sudo tee /etc/systemd/system/promisc-mode.service << 'EOF'
[Unit]
Description=Enable Promiscuous Mode on eth0
After=network.target

[Service]
Type=oneshot
ExecStart=/sbin/ip link set eth0 promisc on
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
sudo systemctl enable promisc-mode.service
sudo systemctl start promisc-mode.service
```

## Suricata.yaml Configuration

The main configuration file `/etc/suricata/suricata.yaml` controls all aspects of Suricata's behavior. Here is a comprehensive configuration with detailed comments:

```yaml
# /etc/suricata/suricata.yaml
# Main Suricata Configuration File
# This file controls all aspects of Suricata's operation

%YAML 1.1
---

# ===========================================
# GLOBAL SETTINGS
# ===========================================

# Define variables for network segments
# HOME_NET: Your internal network(s) - traffic TO these is monitored for attacks
# EXTERNAL_NET: External networks - typically everything not in HOME_NET
vars:
  # Define your protected network ranges
  # Examples: Single subnet, multiple subnets, or RFC1918 ranges
  address-groups:
    HOME_NET: "[192.168.0.0/16,10.0.0.0/8,172.16.0.0/12]"

    # External network (everything not HOME_NET)
    EXTERNAL_NET: "!$HOME_NET"

    # Define specific server groups for targeted rules
    HTTP_SERVERS: "$HOME_NET"
    SMTP_SERVERS: "$HOME_NET"
    SQL_SERVERS: "$HOME_NET"
    DNS_SERVERS: "$HOME_NET"
    TELNET_SERVERS: "$HOME_NET"
    AIM_SERVERS: "$EXTERNAL_NET"
    DC_SERVERS: "$HOME_NET"
    DNP3_SERVER: "$HOME_NET"
    DNP3_CLIENT: "$HOME_NET"
    MODBUS_CLIENT: "$HOME_NET"
    MODBUS_SERVER: "$HOME_NET"
    ENIP_CLIENT: "$HOME_NET"
    ENIP_SERVER: "$HOME_NET"

  # Define ports for various services
  port-groups:
    HTTP_PORTS: "80"
    SHELLCODE_PORTS: "!80"
    ORACLE_PORTS: 1521
    SSH_PORTS: 22
    DNP3_PORTS: 20000
    MODBUS_PORTS: 502
    FILE_DATA_PORTS: "[$HTTP_PORTS,110,143]"
    FTP_PORTS: 21
    GENEVE_PORTS: 6081
    VXLAN_PORTS: 4789
    TEREDO_PORTS: 3544

# ===========================================
# LOGGING CONFIGURATION
# ===========================================

# Default log directory
default-log-dir: /var/log/suricata/

# Configure various output formats
outputs:
  # Fast log - simple one-line alerts (good for quick monitoring)
  - fast:
      enabled: yes
      filename: fast.log
      append: yes

  # EVE JSON log - comprehensive JSON output (recommended for SIEM integration)
  - eve-log:
      enabled: yes
      filetype: regular
      filename: eve.json

      # Community ID for flow correlation across tools
      community-id: true
      community-id-seed: 0

      # Define which event types to log
      types:
        # Alert events - triggered when rules match
        - alert:
            # Include full packet payload in alerts
            payload: yes
            payload-buffer-size: 4kb
            payload-printable: yes

            # Include packet details
            packet: yes

            # Include metadata
            metadata: yes

            # Include HTTP request/response bodies
            http-body: yes
            http-body-printable: yes

            # Tag packets associated with alerts
            tagged-packets: yes

        # Anomaly events - protocol anomalies detected
        - anomaly:
            enabled: yes
            types:
              decode: yes
              stream: yes
              applayer: yes

        # HTTP logging - detailed HTTP transaction logs
        - http:
            extended: yes
            # Log request/response bodies
            dump-all-headers: both

        # DNS logging - DNS queries and responses
        - dns:
            version: 2
            # Log all DNS activity
            requests: yes
            responses: yes

        # TLS logging - SSL/TLS connection details
        - tls:
            extended: yes
            # Log certificate details
            session-resumption: yes

        # File logging - extracted file metadata
        - files:
            force-magic: yes
            force-hash: [md5, sha256]

        # SMTP logging
        - smtp:
            extended: yes

        # SSH logging
        - ssh

        # Flow logging - network flow records
        - flow

        # Netflow-style logging
        - netflow

        # Statistics logging
        - stats:
            totals: yes
            threads: no
            deltas: yes

  # Unified2 output (Snort format, legacy support)
  - unified2-alert:
      enabled: no
      filename: unified2.alert

  # Syslog output
  - syslog:
      enabled: no
      facility: local5
      level: info

  # Statistics output file
  - stats:
      enabled: yes
      filename: stats.log
      append: yes
      totals: yes
      threads: no

# ===========================================
# CAPTURE SETTINGS
# ===========================================

# AF_PACKET capture configuration (recommended for Linux)
af-packet:
  # Primary capture interface
  - interface: eth0

    # Number of threads for this interface
    # Set to number of CPU cores for optimal performance
    threads: auto

    # Cluster type for load balancing across threads
    # cluster_flow: Flows go to same thread (recommended)
    # cluster_cpu: Round-robin to CPUs
    # cluster_qm: Queue mapping
    cluster-type: cluster_flow
    cluster-id: 99

    # Defragment IP packets before processing
    defrag: yes

    # Use memory-mapped I/O for better performance
    use-mmap: yes
    mmap-locked: yes

    # Checksum handling
    # auto: Detect offloading and adjust
    checksum-checks: auto

    # Ring buffer settings
    ring-size: 200000
    block-size: 262144

    # Buffer size
    buffer-size: 32768

    # Disable promiscuous mode if handled externally
    # promisc: no

    # Copy mode for IPS (requires netfilter-queue)
    # copy-mode: ips
    # copy-iface: eth1

  # Additional interface example
  # - interface: eth1
  #   threads: auto
  #   cluster-type: cluster_flow
  #   cluster-id: 98

# PCAP capture configuration (alternative to AF_PACKET)
pcap:
  - interface: eth0
    # buffer-size: 16777216
    # bpf-filter: "tcp or udp"
    # checksum-checks: auto
    # promisc: yes
    # snaplen: 1518

# NFQueue configuration for IPS mode
nfqueue:
  mode: accept
  repeat-mark: 1
  repeat-mask: 1
  bypass-mark: 1
  bypass-mask: 1
  route-queue: 2
  # batchcount: 20
  fail-open: yes

# ===========================================
# THREADING CONFIGURATION
# ===========================================

# Threading mode
# autofp: Auto flow pinning (recommended)
# workers: All processing in capture threads
# single: Single-threaded mode
threading:
  set-cpu-affinity: no

  # CPU affinity configuration
  cpu-affinity:
    - management-cpu-set:
        cpu: [0]
    - receive-cpu-set:
        cpu: [0]
    - worker-cpu-set:
        cpu: ["all"]
        mode: "exclusive"
        prio:
          low: [0]
          medium: ["1-2"]
          high: [3]
          default: "medium"

# Detect engine threading
detect:
  profile: medium
  custom-values:
    toclient-groups: 3
    toserver-groups: 25

  # Signature grouping
  sgh-mpm-context: auto

  # Inspection recursion limit
  inspection-recursion-limit: 3000

  # Prefilter settings
  prefilter:
    default: mpm

# ===========================================
# APPLICATION LAYER SETTINGS
# ===========================================

# Application layer protocol detection
app-layer:
  protocols:
    # HTTP protocol settings
    http:
      enabled: yes
      libhtp:
        default-config:
          personality: IDS
          request-body-limit: 100kb
          response-body-limit: 100kb
          request-body-minimal-inspect-size: 32kb
          request-body-inspect-window: 4kb
          response-body-minimal-inspect-size: 40kb
          response-body-inspect-window: 16kb
          response-body-decompress-layer-limit: 2
          http-body-inline: auto

          # Double decode evasion detection
          double-decode-path: no
          double-decode-query: no

        # Server-specific configurations
        server-config:
          - apache:
              address: [192.168.1.0/24]
              personality: Apache_2

          - iis:
              address: [192.168.2.0/24]
              personality: IIS_7_0

    # TLS/SSL settings
    tls:
      enabled: yes
      detection-ports:
        dp: 443

      # JA3 fingerprinting
      ja3-fingerprints: yes

    # DNS settings
    dns:
      tcp:
        enabled: yes
        detection-ports:
          dp: 53
      udp:
        enabled: yes
        detection-ports:
          dp: 53

    # SMB settings
    smb:
      enabled: yes
      detection-ports:
        dp: 139, 445

    # SSH settings
    ssh:
      enabled: yes

    # FTP settings
    ftp:
      enabled: yes

    # SMTP settings
    smtp:
      enabled: yes
      raw-extraction: no
      mime:
        decode-mime: yes
        decode-base64: yes
        decode-quoted-printable: yes
        header-value-depth: 2000
        extract-urls: yes
        body-md5: yes
      inspected-tracker:
        content-limit: 100000
        content-inspect-min-size: 32768
        content-inspect-window: 24576

    # IMAP settings
    imap:
      enabled: detection-only

    # DCERPC settings
    dcerpc:
      enabled: yes

    # DHCP settings
    dhcp:
      enabled: yes

    # SIP settings
    sip:
      enabled: yes

    # RDP settings
    rdp:
      enabled: yes

    # HTTP2 settings
    http2:
      enabled: yes

    # MQTT settings
    mqtt:
      enabled: yes

    # Kerberos settings
    krb5:
      enabled: yes

    # NFS settings
    nfs:
      enabled: yes

    # IKE settings
    ike:
      enabled: yes

    # TFTP settings
    tftp:
      enabled: yes

    # SNMP settings
    snmp:
      enabled: yes

# ===========================================
# RULE MANAGEMENT
# ===========================================

# Default rule path
default-rule-path: /var/lib/suricata/rules

# Rule files to load
rule-files:
  - suricata.rules

# Classification configuration
classification-file: /etc/suricata/classification.config

# Reference configuration
reference-config-file: /etc/suricata/reference.config

# Threshold configuration
threshold-file: /etc/suricata/threshold.config

# ===========================================
# PERFORMANCE TUNING
# ===========================================

# Stream engine settings
stream:
  memcap: 256mb
  checksum-validation: yes
  inline: auto
  reassembly:
    memcap: 512mb
    depth: 1mb
    toserver-chunk-size: 2560
    toclient-chunk-size: 2560
    randomize-chunk-size: yes

# Defragmentation settings
defrag:
  memcap: 32mb
  hash-size: 65536
  trackers: 65535
  max-frags: 65535
  prealloc: yes
  timeout: 60

# Flow settings
flow:
  memcap: 256mb
  hash-size: 65536
  prealloc: 10000
  emergency-recovery: 30

# Flow timeout settings
flow-timeouts:
  default:
    new: 30
    established: 300
    closed: 0
    bypassed: 100
    emergency-new: 10
    emergency-established: 100
    emergency-closed: 0
    emergency-bypassed: 50
  tcp:
    new: 60
    established: 600
    closed: 60
    bypassed: 100
    emergency-new: 5
    emergency-established: 100
    emergency-closed: 10
    emergency-bypassed: 50
  udp:
    new: 30
    established: 300
    bypassed: 100
    emergency-new: 10
    emergency-established: 100
    emergency-bypassed: 50
  icmp:
    new: 30
    established: 300
    bypassed: 100
    emergency-new: 10
    emergency-established: 100
    emergency-bypassed: 50

# Host settings
host:
  hash-size: 4096
  prealloc: 1000
  memcap: 32mb

# Profiling (useful for performance tuning)
profiling:
  rules:
    enabled: yes
    filename: rule_perf.log
    append: yes
    limit: 10
    json: yes
  keywords:
    enabled: yes
    filename: keyword_perf.log
    append: yes
  prefilter:
    enabled: yes
    filename: prefilter_perf.log
    append: yes
  rulegroups:
    enabled: yes
    filename: rule_group_perf.log
    append: yes
  packets:
    enabled: yes
    filename: packet_stats.log
    append: yes
  locks:
    enabled: no
    filename: lock_stats.log
    append: yes

# ===========================================
# COREDUMP CONFIGURATION
# ===========================================

coredump:
  max-dump: unlimited

# ===========================================
# ACTION ORDER
# ===========================================

# Define the order of actions when multiple rules match
action-order:
  - pass
  - drop
  - reject
  - alert
```

### Apply Configuration Changes

After modifying the configuration, verify and restart:

```bash
# Test configuration syntax
sudo suricata -T -c /etc/suricata/suricata.yaml

# If test passes, restart Suricata
sudo systemctl restart suricata

# Check status
sudo systemctl status suricata

# View logs for any errors
sudo tail -f /var/log/suricata/suricata.log
```

## Rule Management with suricata-update

Suricata uses rules to detect threats. The `suricata-update` tool simplifies rule management:

### Initial Setup

```bash
# Install suricata-update (usually included with Suricata)
sudo apt install -y python3-pip
sudo pip3 install --upgrade suricata-update

# Create rule directories
sudo mkdir -p /var/lib/suricata/rules
sudo mkdir -p /var/lib/suricata/update

# Initialize suricata-update
sudo suricata-update update-sources

# List available rule sources
sudo suricata-update list-sources
```

### Managing Rule Sources

```bash
# Enable specific rule sources
# ET Open (Emerging Threats Open) - Free community rules
sudo suricata-update enable-source et/open

# Enable traffic identification rules
sudo suricata-update enable-source oisf/trafficid

# Enable SSL fingerprint blacklist
sudo suricata-update enable-source sslbl/ssl-fp-blacklist

# Enable abuse.ch URLhaus rules
sudo suricata-update enable-source abuse.ch/urlhaus

# List enabled sources
sudo suricata-update list-enabled-sources

# Update all rules
sudo suricata-update
```

### Update Configuration

Create a configuration file for suricata-update:

```bash
# Create suricata-update configuration
sudo tee /etc/suricata/update.yaml << 'EOF'
# /etc/suricata/update.yaml
# suricata-update configuration file

# Output directory for rules
output: /var/lib/suricata/rules

# Directory for rule source downloads
data-dir: /var/lib/suricata/update

# Suricata configuration file path
suricata-conf: /etc/suricata/suricata.yaml

# Suricata binary path
suricata: /usr/bin/suricata

# Disable rules by signature ID
disable:
  - 2100366  # GPL ATTACK_RESPONSE id check returned root
  - 2013028  # ET POLICY curl User-Agent Outbound

# Enable rules by signature ID (enable disabled rules)
enable:
  - 2019401
  - 2019403

# Modify rules
modify:
  # Change action from alert to drop
  - group: "emerging-dos"
    action: drop

# Rules to explicitly include even if they would be excluded
# include: []

# Output a single combined rules file
single-rule-file: suricata.rules

# Reload Suricata after update
reload-command: sudo systemctl reload suricata
EOF
```

### Automated Rule Updates

Set up automatic rule updates with cron:

```bash
# Create update script
sudo tee /usr/local/bin/suricata-rule-update.sh << 'EOF'
#!/bin/bash
# Suricata Rule Update Script
# Updates rules and reloads Suricata

LOG_FILE="/var/log/suricata/rule-update.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting rule update..." >> $LOG_FILE

# Update rules
/usr/bin/suricata-update >> $LOG_FILE 2>&1

if [ $? -eq 0 ]; then
    echo "[$DATE] Rule update successful" >> $LOG_FILE

    # Reload Suricata to apply new rules
    /bin/systemctl reload suricata >> $LOG_FILE 2>&1

    if [ $? -eq 0 ]; then
        echo "[$DATE] Suricata reloaded successfully" >> $LOG_FILE
    else
        echo "[$DATE] WARNING: Suricata reload failed" >> $LOG_FILE
    fi
else
    echo "[$DATE] ERROR: Rule update failed" >> $LOG_FILE
fi

echo "[$DATE] Rule update complete" >> $LOG_FILE
EOF

# Make script executable
sudo chmod +x /usr/local/bin/suricata-rule-update.sh

# Add cron job for daily updates at 3 AM
(sudo crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/suricata-rule-update.sh") | sudo crontab -
```

## ET Open Rules and Emerging Threats

Emerging Threats (ET) provides comprehensive threat intelligence rules:

### Understanding ET Rule Categories

```bash
# After updating rules, view available categories
ls /var/lib/suricata/rules/

# ET Open categories include:
# - emerging-attack_response: Responses indicating successful attacks
# - emerging-dos: Denial of service attacks
# - emerging-exploit: Exploit attempts
# - emerging-malware: Known malware traffic
# - emerging-policy: Policy violations
# - emerging-scan: Scanning activity
# - emerging-trojan: Trojan horse activity
# - emerging-web_client: Client-side attacks
# - emerging-web_server: Server-side attacks
```

### Viewing Rule Statistics

```bash
# Count rules by category
for file in /var/lib/suricata/rules/*.rules; do
    count=$(grep -c "^alert\|^drop\|^reject" "$file" 2>/dev/null || echo 0)
    echo "$(basename $file): $count rules"
done

# Count total enabled rules
grep -c "^alert\|^drop\|^reject" /var/lib/suricata/rules/suricata.rules
```

## Custom Rule Creation

Creating custom rules allows you to detect specific threats relevant to your environment:

### Rule Structure

```
action protocol source_ip source_port -> dest_ip dest_port (options)
```

### Basic Rule Examples

```bash
# Create custom rules directory
sudo mkdir -p /etc/suricata/rules/custom

# Create custom rules file
sudo tee /etc/suricata/rules/custom/local.rules << 'EOF'
# /etc/suricata/rules/custom/local.rules
# Custom Suricata Rules for Local Environment

# ============================================
# POLICY RULES - Detect policy violations
# ============================================

# Detect SSH connections to external hosts
alert tcp $HOME_NET any -> $EXTERNAL_NET 22 (
    msg:"LOCAL POLICY SSH Connection to External Host";
    flow:to_server,established;
    classtype:policy-violation;
    sid:1000001;
    rev:1;
)

# Detect TOR exit node traffic (example IP range)
alert ip any any -> any any (
    msg:"LOCAL POLICY Potential TOR Traffic Detected";
    content:"|00 00 00 00|";
    flow:established;
    classtype:policy-violation;
    sid:1000002;
    rev:1;
)

# Detect DNS queries for known malicious domain
alert dns any any -> any any (
    msg:"LOCAL MALWARE DNS Query for Known Bad Domain";
    dns.query;
    content:"malicious-domain.com";
    nocase;
    classtype:trojan-activity;
    sid:1000003;
    rev:1;
)

# ============================================
# NETWORK SECURITY RULES
# ============================================

# Detect potential port scanning (multiple ports in short time)
alert tcp $EXTERNAL_NET any -> $HOME_NET any (
    msg:"LOCAL SCAN Potential Port Scan Detected";
    flags:S;
    threshold: type both, track by_src, count 20, seconds 60;
    classtype:attempted-recon;
    sid:1000004;
    rev:1;
)

# Detect ICMP flood (DoS attempt)
alert icmp any any -> $HOME_NET any (
    msg:"LOCAL DOS ICMP Flood Detected";
    itype:8;
    threshold: type both, track by_src, count 100, seconds 10;
    classtype:attempted-dos;
    sid:1000005;
    rev:1;
)

# Detect SQL injection attempt in HTTP traffic
alert http any any -> $HOME_NET any (
    msg:"LOCAL WEB SQL Injection Attempt";
    flow:to_server,established;
    http.uri;
    content:"UNION";
    nocase;
    content:"SELECT";
    nocase;
    distance:0;
    classtype:web-application-attack;
    sid:1000006;
    rev:1;
)

# Alternative SQL injection detection
alert http any any -> $HOME_NET any (
    msg:"LOCAL WEB SQL Injection - Single Quote Attack";
    flow:to_server,established;
    http.uri;
    content:"'";
    content:"OR";
    nocase;
    distance:0;
    content:"'";
    distance:0;
    classtype:web-application-attack;
    sid:1000007;
    rev:1;
)

# ============================================
# APPLICATION MONITORING
# ============================================

# Detect HTTP traffic to specific sensitive endpoint
alert http $HOME_NET any -> any any (
    msg:"LOCAL POLICY Access to Admin Panel";
    flow:to_server,established;
    http.uri;
    content:"/admin";
    nocase;
    classtype:policy-violation;
    sid:1000008;
    rev:1;
)

# Detect large file uploads (potential data exfiltration)
alert http $HOME_NET any -> $EXTERNAL_NET any (
    msg:"LOCAL POLICY Large HTTP POST - Potential Data Exfiltration";
    flow:to_server,established;
    http.method;
    content:"POST";
    http.content_len;
    content:>"1000000";
    classtype:policy-violation;
    sid:1000009;
    rev:1;
)

# Detect specific user agent strings (potential malware)
alert http any any -> any any (
    msg:"LOCAL MALWARE Suspicious User Agent Detected";
    flow:to_server,established;
    http.user_agent;
    content:"suspicious-bot";
    nocase;
    classtype:trojan-activity;
    sid:1000010;
    rev:1;
)

# ============================================
# TLS/SSL MONITORING
# ============================================

# Detect expired SSL certificates
alert tls any any -> any any (
    msg:"LOCAL POLICY Expired SSL Certificate Detected";
    tls.cert_expired;
    classtype:policy-violation;
    sid:1000011;
    rev:1;
)

# Detect self-signed SSL certificates
alert tls any any -> any any (
    msg:"LOCAL POLICY Self-Signed SSL Certificate";
    tls.cert_issuer;
    content:"CN=";
    tls.cert_subject;
    content:"CN=";
    classtype:policy-violation;
    sid:1000012;
    rev:1;
)

# ============================================
# FILE DETECTION
# ============================================

# Detect Windows executable downloads
alert http any any -> $HOME_NET any (
    msg:"LOCAL FILE Windows Executable Download";
    flow:to_client,established;
    file.data;
    content:"MZ";
    offset:0;
    depth:2;
    classtype:policy-violation;
    sid:1000013;
    rev:1;
)

# Detect PDF file with JavaScript (potential malicious PDF)
alert http any any -> $HOME_NET any (
    msg:"LOCAL FILE PDF with JavaScript Detected";
    flow:to_client,established;
    file.data;
    content:"%PDF";
    content:"/JavaScript";
    distance:0;
    classtype:policy-violation;
    sid:1000014;
    rev:1;
)

EOF
```

### Include Custom Rules

Add custom rules to your configuration:

```bash
# Edit suricata.yaml to include custom rules
sudo tee -a /etc/suricata/suricata.yaml << 'EOF'

# Custom rule files
rule-files:
  - suricata.rules
  - /etc/suricata/rules/custom/local.rules
EOF

# Or add to suricata-update configuration
sudo tee -a /etc/suricata/update.yaml << 'EOF'

# Local rule files to include
local:
  - /etc/suricata/rules/custom/local.rules
EOF

# Test the configuration
sudo suricata -T -c /etc/suricata/suricata.yaml

# Reload Suricata
sudo systemctl reload suricata
```

### Rule Testing

Test rules against sample traffic:

```bash
# Generate test traffic to trigger rules
# Test SSH external detection
nc -zv external-host.com 22

# Test with a pcap file
sudo suricata -r /path/to/test.pcap -c /etc/suricata/suricata.yaml -l /tmp/suricata-test/

# Check alerts
cat /tmp/suricata-test/fast.log
```

## IPS Mode with NFQueue

To enable inline IPS mode, configure Suricata with NFQueue:

### Prerequisites

```bash
# Install required packages
sudo apt install -y libnetfilter-queue-dev iptables

# Verify NFQueue support in Suricata
suricata --build-info | grep NFQueue
```

### NFQueue Configuration

```bash
# Configure NFQueue in suricata.yaml
sudo tee /etc/suricata/suricata-ips.yaml << 'EOF'
%YAML 1.1
---

# IPS Mode Configuration
# Include main configuration
include: /etc/suricata/suricata.yaml

# Override for IPS mode
nfqueue:
  # Accept mode - default accept, drop on match
  mode: accept

  # Queue number (must match iptables rule)
  # Multiple queues for multi-threading
  queue-num: 0

  # Number of queues (for multi-threading)
  queue-count: 4

  # Mark to set for repeat processing
  repeat-mark: 1
  repeat-mask: 1

  # Mark to bypass further processing
  bypass-mark: 1
  bypass-mask: 1

  # Fail open - accept traffic if Suricata fails
  fail-open: yes

  # Batch processing count
  batchcount: 20

# Stream settings for IPS
stream:
  inline: yes

# Default action for rules without explicit action
action-order:
  - pass
  - drop
  - reject
  - alert

EOF
```

### IPTables Configuration

Set up iptables to redirect traffic to NFQueue:

```bash
# Create IPS iptables script
sudo tee /usr/local/bin/suricata-ips-iptables.sh << 'EOF'
#!/bin/bash
# Suricata IPS IPTables Configuration Script

# Define interfaces
EXTERNAL_IF="eth0"
INTERNAL_IF="eth1"

# NFQueue range (for multi-threading)
NFQUEUE_NUM="0:3"

# Function to setup IPS rules
setup_ips() {
    echo "Setting up Suricata IPS iptables rules..."

    # Enable IP forwarding
    echo 1 > /proc/sys/net/ipv4/ip_forward

    # Flush existing NFQUEUE rules
    iptables -F FORWARD

    # Forward all traffic through NFQueue
    # Use --queue-balance for multi-threaded processing
    iptables -I FORWARD -j NFQUEUE --queue-balance $NFQUEUE_NUM --queue-bypass

    # Alternative: Only process specific traffic
    # iptables -I FORWARD -p tcp -j NFQUEUE --queue-balance $NFQUEUE_NUM
    # iptables -I FORWARD -p udp -j NFQUEUE --queue-balance $NFQUEUE_NUM

    echo "IPS iptables rules configured"
    iptables -L FORWARD -n -v
}

# Function to remove IPS rules
teardown_ips() {
    echo "Removing Suricata IPS iptables rules..."

    iptables -D FORWARD -j NFQUEUE --queue-balance $NFQUEUE_NUM --queue-bypass 2>/dev/null

    echo "IPS iptables rules removed"
}

# Function to show status
status() {
    echo "Current FORWARD chain rules:"
    iptables -L FORWARD -n -v
}

case "$1" in
    start)
        setup_ips
        ;;
    stop)
        teardown_ips
        ;;
    restart)
        teardown_ips
        sleep 1
        setup_ips
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
EOF

sudo chmod +x /usr/local/bin/suricata-ips-iptables.sh
```

### Create IPS Systemd Service

```bash
# Create systemd service for IPS mode
sudo tee /etc/systemd/system/suricata-ips.service << 'EOF'
[Unit]
Description=Suricata IPS Service
After=network.target

[Service]
Type=simple
ExecStartPre=/usr/local/bin/suricata-ips-iptables.sh start
ExecStart=/usr/bin/suricata -c /etc/suricata/suricata-ips.yaml -q 0:3
ExecStopPost=/usr/local/bin/suricata-ips-iptables.sh stop
ExecReload=/bin/kill -USR2 $MAINPID
Restart=on-failure
RestartSec=10

# Security hardening
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_RAW CAP_SYS_NICE CAP_IPC_LOCK
LimitNOFILE=65536
LimitNPROC=4096
LimitCORE=infinity

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable suricata-ips.service
```

### Converting Rules for IPS

To actively block threats in IPS mode, convert alert rules to drop rules:

```bash
# Create a modification file for suricata-update
sudo tee /etc/suricata/modify.conf << 'EOF'
# Convert specific alert rules to drop for IPS mode

# Drop all emerging-trojan alerts
modifysid emerging-trojan.rules * "alert" | "drop"

# Drop all emerging-malware alerts
modifysid emerging-malware.rules * "alert" | "drop"

# Drop specific high-severity rules
modifysid * 2024792 "alert" | "drop"
modifysid * 2024793 "alert" | "drop"

# Keep some rules as alert only (for logging without blocking)
# modifysid emerging-policy.rules * "drop" | "alert"
EOF

# Update rules with modifications
sudo suricata-update --modify-conf /etc/suricata/modify.conf
```

## Logging and EVE JSON

Suricata's EVE JSON log provides comprehensive, structured logging:

### Understanding EVE JSON Output

```bash
# View recent alerts in EVE JSON
sudo tail -f /var/log/suricata/eve.json | jq 'select(.event_type=="alert")'

# View all event types
sudo cat /var/log/suricata/eve.json | jq -s 'group_by(.event_type) | map({type: .[0].event_type, count: length})'

# Extract specific alert information
sudo cat /var/log/suricata/eve.json | jq 'select(.event_type=="alert") | {
    timestamp: .timestamp,
    src_ip: .src_ip,
    dest_ip: .dest_ip,
    signature: .alert.signature,
    category: .alert.category,
    severity: .alert.severity
}'
```

### EVE JSON Event Types

| Event Type | Description |
|------------|-------------|
| alert | Rule matches (triggered alerts) |
| anomaly | Protocol anomalies |
| dns | DNS queries and responses |
| flow | Network flow records |
| http | HTTP transactions |
| fileinfo | Extracted file information |
| stats | Performance statistics |
| tls | TLS/SSL connection details |
| ssh | SSH connection information |
| smtp | Email transaction logs |

### Log Rotation Configuration

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/suricata << 'EOF'
/var/log/suricata/*.log /var/log/suricata/*.json {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 640 suricata suricata
    sharedscripts
    postrotate
        /bin/systemctl reload suricata > /dev/null 2>&1 || true
    endscript
}
EOF

# Test logrotate configuration
sudo logrotate -d /etc/logrotate.d/suricata
```

## Integration with ELK Stack

Integrate Suricata with Elasticsearch, Logstash, and Kibana for advanced visualization:

### Filebeat Configuration

```bash
# Install Filebeat
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt update && sudo apt install -y filebeat

# Configure Filebeat for Suricata
sudo tee /etc/filebeat/filebeat.yml << 'EOF'
# /etc/filebeat/filebeat.yml
# Filebeat configuration for Suricata EVE JSON logs

filebeat.inputs:
  # Suricata EVE JSON logs
  - type: log
    enabled: true
    paths:
      - /var/log/suricata/eve.json
    json.keys_under_root: true
    json.add_error_key: true
    json.overwrite_keys: true

    # Add fields for identification
    fields:
      log_type: suricata
    fields_under_root: true

# Processors for data enrichment
processors:
  # Add host metadata
  - add_host_metadata:
      when.not.contains.tags: forwarded

  # Add cloud metadata if applicable
  - add_cloud_metadata: ~

  # Decode GeoIP for source and destination
  - add_fields:
      target: ''
      fields:
        ecs.version: 1.12.0

# Output to Elasticsearch
output.elasticsearch:
  hosts: ["localhost:9200"]
  # Uncomment for authentication
  # username: "elastic"
  # password: "changeme"
  index: "suricata-%{+yyyy.MM.dd}"

# Alternative: Output to Logstash
# output.logstash:
#   hosts: ["localhost:5044"]

# Kibana configuration for dashboards
setup.kibana:
  host: "localhost:5601"

# Enable Suricata module
setup.dashboards.enabled: true
EOF

# Enable and configure Suricata module
sudo filebeat modules enable suricata

# Configure module settings
sudo tee /etc/filebeat/modules.d/suricata.yml << 'EOF'
- module: suricata
  eve:
    enabled: true
    var.paths: ["/var/log/suricata/eve.json"]
EOF

# Setup Filebeat (creates index templates and dashboards)
sudo filebeat setup

# Start Filebeat
sudo systemctl enable filebeat
sudo systemctl start filebeat
```

### Logstash Pipeline (Alternative)

```bash
# Create Logstash pipeline for Suricata
sudo tee /etc/logstash/conf.d/suricata.conf << 'EOF'
# /etc/logstash/conf.d/suricata.conf
# Logstash pipeline for Suricata EVE JSON logs

input {
  file {
    path => "/var/log/suricata/eve.json"
    codec => json
    type => "suricata"
    start_position => "end"
    sincedb_path => "/var/lib/logstash/sincedb-suricata"
  }
}

filter {
  if [type] == "suricata" {
    # Parse timestamp
    date {
      match => ["timestamp", "ISO8601"]
      target => "@timestamp"
    }

    # GeoIP enrichment for source IP
    if [src_ip] {
      geoip {
        source => "src_ip"
        target => "src_geoip"
        database => "/usr/share/GeoIP/GeoLite2-City.mmdb"
      }
    }

    # GeoIP enrichment for destination IP
    if [dest_ip] {
      geoip {
        source => "dest_ip"
        target => "dest_geoip"
        database => "/usr/share/GeoIP/GeoLite2-City.mmdb"
      }
    }

    # Add severity level for alerts
    if [event_type] == "alert" {
      if [alert][severity] == 1 {
        mutate { add_field => { "severity_label" => "High" } }
      } else if [alert][severity] == 2 {
        mutate { add_field => { "severity_label" => "Medium" } }
      } else {
        mutate { add_field => { "severity_label" => "Low" } }
      }
    }

    # Remove unnecessary fields
    mutate {
      remove_field => ["host", "path"]
    }
  }
}

output {
  if [type] == "suricata" {
    elasticsearch {
      hosts => ["localhost:9200"]
      index => "suricata-%{+YYYY.MM.dd}"
      # Uncomment for authentication
      # user => "elastic"
      # password => "changeme"
    }
  }
}
EOF
```

### Kibana Dashboard Queries

Common Kibana queries for Suricata data:

```
# View all alerts
event_type:alert

# High severity alerts only
event_type:alert AND alert.severity:1

# Alerts from specific source
event_type:alert AND src_ip:192.168.1.100

# Malware category alerts
event_type:alert AND alert.category:"A Network Trojan was detected"

# DNS queries for specific domain
event_type:dns AND dns.rrname:*example.com*

# HTTP requests to external hosts
event_type:http AND NOT dest_ip:192.168.*

# TLS connections with expired certificates
event_type:tls AND tls.notafter:<now
```

## Performance Tuning

Optimize Suricata for high-performance environments:

### CPU Affinity Configuration

```bash
# Determine available CPU cores
nproc
lscpu | grep "CPU(s)"

# Update suricata.yaml threading section
sudo tee -a /etc/suricata/suricata.yaml << 'EOF'
# Performance-optimized threading configuration
threading:
  set-cpu-affinity: yes

  cpu-affinity:
    # Management thread on CPU 0
    - management-cpu-set:
        cpu: [0]

    # Receive threads on CPUs 1-2
    - receive-cpu-set:
        cpu: [1, 2]

    # Worker threads on remaining CPUs
    - worker-cpu-set:
        cpu: [3, 4, 5, 6, 7]
        mode: exclusive
        prio:
          default: high
EOF
```

### Memory Optimization

```bash
# Calculate memory requirements based on traffic
# Rule of thumb: 1GB RAM per 100k concurrent flows

# Update memory settings in suricata.yaml
sudo tee /etc/suricata/performance-tuning.yaml << 'EOF'
# Memory optimization settings

# Stream reassembly memory
stream:
  memcap: 1gb
  reassembly:
    memcap: 2gb
    depth: 1mb

# Flow tracking memory
flow:
  memcap: 512mb
  hash-size: 131072
  prealloc: 100000

# Defragmentation memory
defrag:
  memcap: 64mb
  hash-size: 65536
  trackers: 65535

# Host tracking memory
host:
  memcap: 64mb
  hash-size: 4096
  prealloc: 1000

# Detection engine profile
detect:
  # high for more signatures, but more memory
  # medium for balanced
  # low for constrained environments
  profile: high

  # Custom inspection limits
  custom-values:
    toclient-groups: 50
    toserver-groups: 50
EOF
```

### Runmode Optimization

```bash
# Test different runmodes for your environment

# Workers mode - best for multi-core systems
# Each worker thread handles packets from capture to output
suricata -c /etc/suricata/suricata.yaml --runmode workers

# AutoFP mode - auto flow pinning
# Flows are pinned to specific threads
suricata -c /etc/suricata/suricata.yaml --runmode autofp

# Check current performance
sudo suricata -c /etc/suricata/suricata.yaml --dump-config | grep runmode
```

### Network Interface Tuning

```bash
# Create comprehensive interface tuning script
sudo tee /usr/local/bin/tune-network-interface.sh << 'EOF'
#!/bin/bash
# Network Interface Performance Tuning for Suricata

INTERFACE="${1:-eth0}"

echo "Tuning interface: $INTERFACE for Suricata"

# Increase ring buffer sizes
ethtool -G $INTERFACE rx 4096 tx 4096 2>/dev/null

# Disable offloading features
ethtool -K $INTERFACE gro off lro off tso off gso off 2>/dev/null
ethtool -K $INTERFACE rx-checksum off tx-checksum-ip-generic off 2>/dev/null

# Enable receive hashing for multi-queue NICs
ethtool -K $INTERFACE rxhash on 2>/dev/null

# Set interrupt coalescing for lower latency
ethtool -C $INTERFACE rx-usecs 0 rx-frames 0 2>/dev/null

# Increase socket buffer sizes
sysctl -w net.core.rmem_max=134217728
sysctl -w net.core.rmem_default=134217728
sysctl -w net.core.netdev_max_backlog=250000
sysctl -w net.core.netdev_budget=600
sysctl -w net.core.netdev_budget_usecs=8000

# Disable reverse path filtering
sysctl -w net.ipv4.conf.all.rp_filter=0
sysctl -w net.ipv4.conf.$INTERFACE.rp_filter=0

echo "Interface tuning complete"
ethtool -k $INTERFACE
ethtool -g $INTERFACE
EOF

sudo chmod +x /usr/local/bin/tune-network-interface.sh
```

### Monitoring Performance

```bash
# Enable stats logging for performance monitoring
# In suricata.yaml, ensure this is configured:

# View real-time statistics
sudo tail -f /var/log/suricata/stats.log

# Key metrics to monitor:
# - capture.kernel_packets: Total packets seen by kernel
# - capture.kernel_drops: Packets dropped by kernel (should be 0)
# - decoder.pkts: Packets decoded by Suricata
# - detect.alert: Number of alerts generated
# - flow.memuse: Current flow memory usage

# Create monitoring script
sudo tee /usr/local/bin/suricata-stats.sh << 'EOF'
#!/bin/bash
# Parse Suricata stats for monitoring

STATS_FILE="/var/log/suricata/stats.log"

# Get latest stats
tail -100 $STATS_FILE | grep -E "(kernel_packets|kernel_drops|decoder.pkts|detect.alert|flow.memuse)" | tail -5

# Calculate drop rate
PACKETS=$(tail -100 $STATS_FILE | grep "kernel_packets" | tail -1 | awk '{print $NF}')
DROPS=$(tail -100 $STATS_FILE | grep "kernel_drops" | tail -1 | awk '{print $NF}')

if [ ! -z "$PACKETS" ] && [ "$PACKETS" != "0" ]; then
    DROP_RATE=$(echo "scale=4; $DROPS / $PACKETS * 100" | bc)
    echo "Drop rate: ${DROP_RATE}%"
fi
EOF

sudo chmod +x /usr/local/bin/suricata-stats.sh
```

## Troubleshooting

Common issues and solutions:

### Suricata Won't Start

```bash
# Check configuration syntax
sudo suricata -T -c /etc/suricata/suricata.yaml

# Check for permission issues
ls -la /var/log/suricata/
ls -la /var/run/suricata/

# Fix permissions
sudo chown -R suricata:suricata /var/log/suricata/
sudo chown -R suricata:suricata /var/run/suricata/

# Check systemd logs
sudo journalctl -u suricata -f

# Check Suricata log
sudo tail -100 /var/log/suricata/suricata.log
```

### No Alerts Being Generated

```bash
# Verify rules are loaded
sudo suricata -c /etc/suricata/suricata.yaml --dump-config | grep rule-files

# Count loaded rules
grep -c "^alert\|^drop" /var/lib/suricata/rules/suricata.rules

# Test with a known trigger
# This should trigger ET OPEN test rule (if enabled)
curl http://testmynids.org/uid/index.html

# Check fast.log for alerts
sudo tail -f /var/log/suricata/fast.log

# Check EVE JSON
sudo tail -f /var/log/suricata/eve.json | jq 'select(.event_type=="alert")'
```

### High Packet Drops

```bash
# Check for kernel drops
grep "kernel_drops" /var/log/suricata/stats.log | tail -5

# Solutions:
# 1. Increase ring buffer size
sudo ethtool -G eth0 rx 4096

# 2. Increase af-packet ring-size in suricata.yaml
# ring-size: 200000

# 3. Add more worker threads
# threads: auto (or specify number matching CPU cores)

# 4. Increase system buffers
sudo sysctl -w net.core.rmem_max=134217728
sudo sysctl -w net.core.rmem_default=134217728

# 5. Check if interface is in promiscuous mode
ip link show eth0 | grep PROMISC
```

### Memory Issues

```bash
# Check current memory usage
ps aux | grep suricata
cat /proc/$(pgrep suricata)/status | grep -i mem

# Check Suricata memory stats
grep "memuse" /var/log/suricata/stats.log | tail -10

# Reduce memory usage:
# 1. Lower memcap values in suricata.yaml
# 2. Reduce flow timeout values
# 3. Use lower detect profile (low/medium)
# 4. Disable unnecessary protocol parsers

# Monitor memory over time
watch -n 5 'ps aux | grep suricata | grep -v grep'
```

### Rule Loading Errors

```bash
# Check for rule syntax errors
sudo suricata -T -c /etc/suricata/suricata.yaml 2>&1 | grep -i error

# Validate specific rule file
sudo suricata -T -S /etc/suricata/rules/custom/local.rules -c /etc/suricata/suricata.yaml

# Common rule issues:
# - Missing semicolon at end of rule
# - Invalid SID (must be unique)
# - Syntax errors in content matches
# - Invalid flow direction

# List rules with errors
sudo suricata -T -c /etc/suricata/suricata.yaml 2>&1 | grep "rule at line"
```

### Debugging Commands

```bash
# Enable debug logging temporarily
sudo suricata -c /etc/suricata/suricata.yaml -v  # verbose
sudo suricata -c /etc/suricata/suricata.yaml -vv # more verbose

# Dump flow information
sudo suricatasc -c "dump-flows"

# Reload rules without restart
sudo suricatasc -c "reload-rules"

# Check running status
sudo suricatasc -c "uptime"
sudo suricatasc -c "iface-stat eth0"

# List available commands
sudo suricatasc -c "help"
```

### Service Management

```bash
# View service status
sudo systemctl status suricata

# Restart service
sudo systemctl restart suricata

# Reload configuration (without dropping packets)
sudo systemctl reload suricata
# Or using suricatasc
sudo suricatasc -c "reload-rules"

# Enable on boot
sudo systemctl enable suricata

# View logs
sudo journalctl -u suricata --since "1 hour ago"
```

## Best Practices Summary

1. **Start in IDS Mode**: Begin with passive monitoring before enabling IPS to understand your traffic patterns

2. **Tune for Your Environment**: Adjust memory, threading, and detection profiles based on your traffic volume

3. **Keep Rules Updated**: Enable automatic rule updates with suricata-update

4. **Monitor Performance**: Regularly check stats for packet drops and memory usage

5. **Create Custom Rules**: Develop rules specific to your environment and threats

6. **Integrate with SIEM**: Use ELK Stack or similar for visualization and correlation

7. **Test Changes**: Always use `suricata -T` to validate configuration before applying

8. **Document Everything**: Keep records of custom rules, tuning changes, and configurations

## Monitoring Suricata with OneUptime

While Suricata provides excellent network security monitoring capabilities, you need comprehensive infrastructure monitoring to ensure Suricata itself remains operational and effective. [OneUptime](https://oneuptime.com) offers a complete observability platform that complements your Suricata deployment:

- **Service Uptime Monitoring**: Monitor Suricata service availability and get instant alerts if the service goes down
- **Log Management**: Centralize Suricata EVE JSON logs alongside other application logs for unified analysis
- **Performance Metrics**: Track CPU, memory, and network utilization on your Suricata sensors
- **Alert Integration**: Correlate Suricata security alerts with infrastructure events for faster incident response
- **Dashboard Visualization**: Create custom dashboards displaying Suricata statistics, alert trends, and performance metrics
- **On-Call Scheduling**: Ensure the right security team member is notified when critical alerts occur

By combining Suricata's network threat detection with OneUptime's infrastructure monitoring, you create a comprehensive security and observability solution that keeps your network protected and your monitoring systems reliable.

## Conclusion

Suricata is a powerful and flexible network security tool that provides enterprise-grade intrusion detection and prevention capabilities. By following this guide, you have learned how to:

- Install Suricata on Ubuntu using multiple methods
- Configure network interfaces for optimal packet capture
- Understand and customize the suricata.yaml configuration file
- Manage rules using suricata-update and Emerging Threats rulesets
- Create custom rules for your specific environment
- Enable IPS mode with NFQueue for active threat prevention
- Integrate with ELK Stack for advanced visualization
- Tune performance for high-traffic environments
- Troubleshoot common issues

Remember that network security is an ongoing process. Regularly update your rules, monitor performance metrics, and adjust configurations as your network evolves. With proper configuration and maintenance, Suricata will serve as a crucial component of your defense-in-depth security strategy.

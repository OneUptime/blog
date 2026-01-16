# How to Configure Snort Intrusion Detection on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Snort, IDS, Network Security, Intrusion Detection, Tutorial

Description: Complete guide to installing and configuring Snort network intrusion detection system on Ubuntu.

---

Network security is not optional. If you're running production systems, you need visibility into what's traversing your network. Snort is one of the most powerful open-source intrusion detection systems (IDS) available, and Snort 3 brings major architectural improvements over its predecessors.

## Understanding Snort 3 Architecture

Snort 3 represents a complete rewrite of the Snort engine. Unlike Snort 2.x which used a single-threaded architecture, Snort 3 is built from the ground up for modern multi-core systems.

### Key Architectural Changes

```
+------------------+     +------------------+
|   Snort 2.x      |     |   Snort 3        |
+------------------+     +------------------+
| Single-threaded  |     | Multi-threaded   |
| C-based config   |     | Lua-based config |
| Preprocessors    |     | Inspectors       |
| Limited modules  |     | Plugin system    |
+------------------+     +------------------+
```

**Snort 3 Components:**

- **Packet Acquisition (DAQ)**: Abstraction layer for packet capture from various sources
- **Decode**: Protocol decoding and normalization
- **Inspectors**: Deep packet inspection modules (replaced preprocessors)
- **Detection Engine**: Rule matching using multi-pattern search algorithms
- **Loggers/Alerters**: Output modules for alerts and packet logging
- **Actions**: Response actions when rules match

### Threading Model

Snort 3 uses a packet-thread model where each thread handles packets independently:

```
                    +------------------+
                    |   Main Thread    |
                    | (Configuration)  |
                    +--------+---------+
                             |
        +--------------------+--------------------+
        |                    |                    |
+-------v-------+    +-------v-------+    +-------v-------+
| Packet Thread |    | Packet Thread |    | Packet Thread |
|    (Core 0)   |    |    (Core 1)   |    |    (Core N)   |
+---------------+    +---------------+    +---------------+
        |                    |                    |
        v                    v                    v
   [DAQ -> Decode -> Inspect -> Detect -> Log/Alert]
```

## Installing Snort 3

### Prerequisites

First, install the required dependencies:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install build dependencies
sudo apt install -y build-essential autotools-dev libdumbnet-dev \
    libluajit-5.1-dev libpcap-dev zlib1g-dev pkg-config libhwloc-dev \
    cmake liblzma-dev openssl libssl-dev cpputest libsqlite3-dev \
    uuid-dev libcmocka-dev libnetfilter-queue-dev libmnl-dev \
    autoconf libtool git flex bison libfl-dev

# Install additional libraries for full functionality
sudo apt install -y libunwind-dev libpcre2-dev
```

### Install LibDAQ (Data Acquisition Library)

Snort 3 requires LibDAQ 3.x:

```bash
# Clone LibDAQ repository
cd /tmp
git clone https://github.com/snort3/libdaq.git
cd libdaq

# Build and install
./bootstrap
./configure
make -j$(nproc)
sudo make install

# Update library cache
sudo ldconfig
```

### Install Additional Dependencies

```bash
# Install gperftools for better memory allocation
sudo apt install -y libgoogle-perftools-dev

# Install flatbuffers (optional but recommended)
cd /tmp
git clone https://github.com/google/flatbuffers.git
cd flatbuffers
cmake -G "Unix Makefiles" -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
sudo make install

# Install hyperscan for high-performance pattern matching
sudo apt install -y libhyperscan-dev
```

### Build and Install Snort 3

```bash
# Clone Snort 3 repository
cd /tmp
git clone https://github.com/snort3/snort3.git
cd snort3

# Configure with common options
# --enable-tcmalloc: Use Google's TCMalloc for better performance
# --enable-debug-msgs: Enable debug messages (optional for production)
./configure_cmake.sh --prefix=/usr/local \
    --enable-tcmalloc \
    --enable-shell

# Build Snort 3
cd build
make -j$(nproc)

# Install
sudo make install

# Verify installation
snort -V
```

Expected output:

```
   ,,_     -*> Snort++ <*-
  o"  )~   Version 3.x.x.x
   ''''    By Martin Roesch & The Snort Team
           https://snort.org/snort3
```

### Post-Installation Setup

```bash
# Create snort user and group
sudo groupadd snort
sudo useradd snort -r -s /sbin/nologin -c "Snort IDS" -g snort

# Create necessary directories
sudo mkdir -p /etc/snort/rules
sudo mkdir -p /var/log/snort
sudo mkdir -p /usr/local/lib/snort_dynamicrules

# Set permissions
sudo chown -R snort:snort /var/log/snort
sudo chown -R snort:snort /etc/snort

# Create log directories for different output formats
sudo mkdir -p /var/log/snort/alerts
sudo mkdir -p /var/log/snort/pcap
```

## Snort Configuration (snort.lua)

Snort 3 uses Lua for configuration, providing a much more flexible and powerful configuration system than Snort 2.x's plain text config.

### Basic Configuration Structure

Create `/etc/snort/snort.lua`:

```lua
---------------------------------------------------------------------------
-- Snort 3 Configuration File
-- /etc/snort/snort.lua
--
-- This is the main configuration file for Snort 3 IDS/IPS
-- Modify paths and settings according to your environment
---------------------------------------------------------------------------

---------------------------------------------------------------------------
-- 1. Set paths and environment variables
---------------------------------------------------------------------------

-- Home network definition
-- CRITICAL: Define your internal networks accurately
HOME_NET = '192.168.1.0/24'

-- External network (everything not HOME_NET)
EXTERNAL_NET = '!$HOME_NET'

-- Define network zones for more granular rules
DNS_SERVERS = '$HOME_NET'
SMTP_SERVERS = '$HOME_NET'
HTTP_SERVERS = '$HOME_NET'
SQL_SERVERS = '$HOME_NET'
TELNET_SERVERS = '$HOME_NET'
SSH_SERVERS = '$HOME_NET'
FTP_SERVERS = '$HOME_NET'
SIP_SERVERS = '$HOME_NET'

-- Path variables
RULE_PATH = '/etc/snort/rules'
BUILTIN_RULE_PATH = '/etc/snort/builtin_rules'
PLUGIN_RULE_PATH = '/etc/snort/so_rules'
WHITE_LIST_PATH = '/etc/snort/lists'
BLACK_LIST_PATH = '/etc/snort/lists'

---------------------------------------------------------------------------
-- 2. Configure DAQ (Data Acquisition)
---------------------------------------------------------------------------

daq =
{
    -- Module to use: afpacket for Linux, pcap for general use
    module = 'afpacket',

    -- Input specification
    -- Can be interface name or pcap file
    input = 'eth0',

    -- Snapshot length (packet capture size)
    snaplen = 1518,

    -- Variables specific to DAQ module
    variables =
    {
        -- For afpacket: buffer size in MB
        -- Higher values = more memory, better packet handling under load
        ['buffer_size_mb'] = '256',

        -- Number of packet threads
        ['fanout_type'] = 'hash',
    },
}

---------------------------------------------------------------------------
-- 3. Decode settings
---------------------------------------------------------------------------

-- IP4 decoding options
decoding =
{
    -- Checksum modes: all, noip, notcp, noudp, noicmp, none
    checksum_mode = 'all',

    -- Maximum encapsulation depth
    max_encapsulation = 4,
}

---------------------------------------------------------------------------
-- 4. Detection engine configuration
---------------------------------------------------------------------------

detection =
{
    -- Hyperscan is much faster than the default AC-Full
    -- Requires libhyperscan
    search_engine = 'hyperscan',

    -- Split any-any port rules (performance optimization)
    split_any_any = true,

    -- Enable rule profiling (useful for tuning)
    enable_builtin_rules = true,
}

---------------------------------------------------------------------------
-- 5. Stream and flow tracking
---------------------------------------------------------------------------

-- TCP stream configuration
stream_tcp =
{
    -- Session tracking policy
    policy = 'linux',

    -- Timeouts (seconds)
    session_timeout = 180,

    -- Maximum sessions to track
    max_sessions = 262144,

    -- Track only established sessions
    track_only = false,

    -- Overlap handling policy
    overlap_policy = 'last',

    -- Reassembly options
    reassemble_async = true,

    -- Maximum queued bytes per session
    max_queued_bytes = 1048576,

    -- Maximum segments per session
    max_queued_segs = 2621,
}

-- UDP stream configuration
stream_udp =
{
    session_timeout = 180,
    max_sessions = 131072,
}

-- ICMP stream configuration
stream_icmp =
{
    session_timeout = 30,
    max_sessions = 65536,
}

-- IP fragmentation handling
stream_ip =
{
    max_frags = 65536,
    max_overlaps = 10,
    min_frag_length = 100,
    policy = 'linux',
    session_timeout = 60,
}

---------------------------------------------------------------------------
-- 6. Normalizers (protocol normalization)
---------------------------------------------------------------------------

-- IP4 normalizer
normalizer =
{
    ip4 =
    {
        df = true,
        rf = true,
        tos = true,
        trim = true,
    },
    tcp =
    {
        ips = true,
        rsv = true,
        pad = true,
        req_urg = true,
        req_pay = true,
        req_urp = true,
        urp = true,
        opts = true,
        allow_names = true,
    },
}

---------------------------------------------------------------------------
-- 7. Inspectors (Deep Packet Inspection)
---------------------------------------------------------------------------

-- HTTP inspector (replaces http_inspect preprocessor)
http_inspect =
{
    -- Request depth (bytes to inspect per request)
    request_depth = 65535,

    -- Response depth (bytes to inspect per response)
    response_depth = 65535,

    -- Enable JavaScript normalization
    normalize_javascript = true,

    -- Decompress gzip/deflate responses
    decompress_pdf = true,
    decompress_swf = true,

    -- Maximum number of header fields
    max_headers = 100,

    -- Maximum header field length
    max_header_length = 4096,

    -- Maximum URI length
    max_uri_length = 4096,

    -- Cookie extraction for logging
    extended_response_inspection = true,
}

-- SSL/TLS inspector
ssl =
{
    -- Trust servers on specific ports
    trust_servers = true,

    -- Maximum client hello length
    max_client_hello_length = 65535,
}

-- DNS inspector
dns =
{
    -- Enable DNS tunneling detection
    enable_rdata_overflow = true,
}

-- SSH inspector
ssh =
{
    max_encrypted_packets = 25,
    max_client_bytes = 19600,
}

-- FTP inspector
ftp_server =
{
    def_max_param_len = 100,

    -- FTP bounce detection
    check_encrypted = true,
}

-- SMTP inspector
smtp =
{
    -- Maximum command line length
    max_command_line_len = 512,

    -- Maximum header line length
    max_header_line_len = 1000,

    -- Maximum response line length
    max_response_line_len = 512,

    -- Normalize addresses
    normalize_cmds = true,

    -- Alt max command line length
    alt_max_command_line_len = 260,
}

-- SIP inspector
sip =
{
    max_uri_len = 512,
    max_call_id_len = 80,
    max_requestName_len = 20,
    max_from_len = 256,
    max_to_len = 256,
    max_via_len = 1024,
    max_contact_len = 256,
    max_content_len = 1024,
}

-- Modbus inspector (for SCADA/ICS environments)
modbus = { }

-- DNP3 inspector (for SCADA/ICS environments)
dnp3 = { }

---------------------------------------------------------------------------
-- 8. Reputation and IP lists
---------------------------------------------------------------------------

reputation =
{
    -- Path to IP blacklist
    blacklist = BLACK_LIST_PATH .. '/black_list.rules',

    -- Path to IP whitelist
    whitelist = WHITE_LIST_PATH .. '/white_list.rules',

    -- Memory cap for IP lists (MB)
    memcap = 500,

    -- Priority: whitelist or blacklist first
    priority = 'whitelist',

    -- What to do with repeat offenders
    nested_ip = 'inner',

    -- Scan local addresses
    scan_local = false,
}

---------------------------------------------------------------------------
-- 9. Event filtering
---------------------------------------------------------------------------

-- Suppress noisy events
suppress =
{
    -- Example: Suppress specific SID from specific IP
    -- { gid = 1, sid = 1234, track = 'by_src', ip = '10.0.0.1' },
}

-- Rate-based event filtering
event_filter =
{
    -- Example: Limit events to 1 per minute per source
    -- { gid = 1, sid = 1234, type = 'limit', track = 'by_src', count = 1, seconds = 60 },
}

---------------------------------------------------------------------------
-- 10. Rule files
---------------------------------------------------------------------------

-- IPS (Inline) mode rules
ips =
{
    -- Enable decoder and preprocessor rules
    enable_builtin_rules = true,

    -- Include rule files
    include = RULE_PATH,

    -- Rule variables (can override per-rule)
    variables =
    {
        nets =
        {
            HOME_NET = HOME_NET,
            EXTERNAL_NET = EXTERNAL_NET,
            DNS_SERVERS = DNS_SERVERS,
            SMTP_SERVERS = SMTP_SERVERS,
            HTTP_SERVERS = HTTP_SERVERS,
            SQL_SERVERS = SQL_SERVERS,
            TELNET_SERVERS = TELNET_SERVERS,
            SSH_SERVERS = SSH_SERVERS,
            FTP_SERVERS = FTP_SERVERS,
            SIP_SERVERS = SIP_SERVERS,
        },
        ports =
        {
            HTTP_PORTS = '80 81 311 383 591 593 901 1220 1414 1741 1830 2301 2381 2809 3037 3128 3702 4343 4848 5250 6988 7000 7001 7144 7145 7510 7777 7779 8000 8008 8014 8028 8080 8085 8088 8090 8118 8123 8180 8181 8222 8243 8280 8300 8500 8800 8888 8899 9000 9060 9080 9090 9091 9443 9999 11371 34443 34444 41080 50002 55555',
            SHELLCODE_PORTS = '!80',
            ORACLE_PORTS = '1024:',
            SSH_PORTS = '22',
            FTP_PORTS = '21 2100 3535',
            SIP_PORTS = '5060 5061 5600',
            FILE_DATA_PORTS = '$HTTP_PORTS 110 143',
            GTP_PORTS = '2123 2152 3386',
            SMTP_PORTS = '25 465 587 691',
        },
    },

    -- Rule states (enable/disable specific rules)
    states =
    {
        -- { gid = 1, sid = 1234, enable = false },
    },
}

---------------------------------------------------------------------------
-- 11. Output and logging
---------------------------------------------------------------------------

-- Alert output configuration
alert_fast =
{
    -- Output file path
    file = true,

    -- Include packet header
    packet = false,
}

-- Full alert with packet contents
alert_full =
{
    file = true,
}

-- CSV output for easy parsing
alert_csv =
{
    file = true,

    -- Fields to include
    fields = 'timestamp pkt_num proto pkt_gen pkt_len dir src_addr src_port dst_addr dst_port rule msg',
}

-- JSON output (recommended for SIEM integration)
alert_json =
{
    file = true,

    -- Limit output to these fields (empty = all)
    fields = 'timestamp msg src_addr src_port dst_addr dst_port proto action gid sid rev',

    -- Output to separate files by date
    multi = false,
}

-- Syslog output
alert_syslog =
{
    facility = 'auth',
    level = 'info',
}

-- Unified2 output (for Barnyard2)
unified2 =
{
    -- Limit file size (bytes)
    limit = 128,

    -- Include extra data
    nostamp = false,

    -- MPLS support
    mpls_event_types = true,

    -- VLAN support
    vlan_event_types = true,
}

-- Packet logging
log_pcap =
{
    -- Limit pcap file size (MB)
    limit = 100,
}

---------------------------------------------------------------------------
-- 12. Performance and tuning
---------------------------------------------------------------------------

-- Profile modules for performance analysis
profiler =
{
    modules =
    {
        -- Show module performance stats
        show = true,
    },
    rules =
    {
        -- Show rule performance stats
        show = true,

        -- Sort by: checks, matches, alerts, time
        sort = 'avg_check',

        -- Number of rules to show
        count = 10,
    },
}

-- Memory allocation settings
memory =
{
    -- Memory cap for packet processing (MB)
    cap = 1024,

    -- Enable memory profiling
    profile = false,
}

-- Packet processing threads
-- Set based on available CPU cores
process =
{
    -- Daemon mode
    daemon = false,

    -- Chroot directory (security hardening)
    -- chroot = '/var/snort',

    -- Run as user
    set_uid = 'snort',

    -- Run as group
    set_gid = 'snort',

    -- Directory for core dumps
    dirty_pig = false,

    -- PID file location
    pid_file = '/var/run/snort.pid',
}

---------------------------------------------------------------------------
-- 13. Include additional configuration files
---------------------------------------------------------------------------

-- Include local customizations
-- dofile('/etc/snort/local.lua')

-- Include classification config
-- dofile('/etc/snort/classification.lua')

-- Include reference config
-- dofile('/etc/snort/reference.lua')
```

## Network Variables and Port Groups

Proper network variable configuration is critical for accurate detection and performance.

### Defining Network Variables

Create `/etc/snort/networks.lua`:

```lua
---------------------------------------------------------------------------
-- Network Variables Configuration
-- /etc/snort/networks.lua
--
-- Define your network topology here for accurate rule matching
---------------------------------------------------------------------------

---------------------------------------------------------------------------
-- Home Network Definition
-- This is the MOST IMPORTANT variable - defines what Snort protects
---------------------------------------------------------------------------

-- Single subnet
-- HOME_NET = '192.168.1.0/24'

-- Multiple subnets (use brackets for lists)
-- HOME_NET = '[192.168.1.0/24,10.0.0.0/8,172.16.0.0/12]'

-- Exclude specific hosts from home network
-- HOME_NET = '[192.168.1.0/24,!192.168.1.100]'

-- Define by interface (Snort 3 can auto-detect)
-- HOME_NET = 'interface:eth0'

-- Common configurations:

-- Small office/home network
HOME_NET = '192.168.0.0/16'

-- Corporate network with multiple segments
-- HOME_NET = '[10.0.0.0/8,172.16.0.0/12,192.168.0.0/16]'

-- Cloud VPC
-- HOME_NET = '10.0.0.0/16'

---------------------------------------------------------------------------
-- External Network
-- Usually the inverse of HOME_NET
---------------------------------------------------------------------------

EXTERNAL_NET = '!$HOME_NET'

-- Or define explicitly if needed
-- EXTERNAL_NET = '0.0.0.0/0'

---------------------------------------------------------------------------
-- Server Groups
-- Define which hosts run specific services for targeted rules
---------------------------------------------------------------------------

-- DNS servers in your network
DNS_SERVERS = '[192.168.1.10,192.168.1.11]'

-- Web servers
HTTP_SERVERS = '[192.168.1.20/28]'

-- Database servers
SQL_SERVERS = '[192.168.1.50,192.168.1.51]'

-- Mail servers
SMTP_SERVERS = '[192.168.1.30]'

-- SSH bastion/jump hosts
SSH_SERVERS = '[192.168.1.5]'

-- FTP servers (hopefully none in production!)
FTP_SERVERS = '$HOME_NET'

-- Telnet servers (really shouldn't have these)
TELNET_SERVERS = '$HOME_NET'

-- VoIP/SIP servers
SIP_SERVERS = '[192.168.1.60/29]'

-- If you don't have specific servers, use HOME_NET as catch-all
-- DNS_SERVERS = '$HOME_NET'

---------------------------------------------------------------------------
-- Special Networks
---------------------------------------------------------------------------

-- AIM servers (legacy AOL Instant Messenger)
AIM_SERVERS = '[64.12.24.0/23,64.12.28.0/23,64.12.161.0/24,64.12.163.0/24,64.12.200.0/24,205.188.3.0/24,205.188.5.0/24,205.188.7.0/24,205.188.9.0/24,205.188.153.0/24,205.188.179.0/24,205.188.248.0/24]'

-- Public DNS servers (for DNS tunneling detection)
PUBLIC_DNS = '[8.8.8.8,8.8.4.4,1.1.1.1,1.0.0.1,9.9.9.9]'
```

### Defining Port Groups

Create `/etc/snort/ports.lua`:

```lua
---------------------------------------------------------------------------
-- Port Variables Configuration
-- /etc/snort/ports.lua
--
-- Define service ports for your environment
---------------------------------------------------------------------------

---------------------------------------------------------------------------
-- HTTP/Web Ports
-- Modern web apps use many non-standard ports
---------------------------------------------------------------------------

HTTP_PORTS = [[
    80 81 311 383 591 593 901 1220 1414 1741 1830 2301 2381 2809 3037
    3128 3702 4343 4848 5250 6988 7000 7001 7144 7145 7510 7777 7779
    8000 8008 8014 8028 8080 8085 8088 8090 8118 8123 8180 8181 8222
    8243 8280 8300 8500 8800 8888 8899 9000 9060 9080 9090 9091 9443
    9999 11371 34443 34444 41080 50002 55555
]]

-- Add custom ports for your applications
-- HTTP_PORTS = HTTP_PORTS .. ' 3000 5000 8443'

---------------------------------------------------------------------------
-- HTTPS/SSL Ports
---------------------------------------------------------------------------

SSL_PORTS = '443 465 563 636 989 990 992 993 994 995 2484 8443 9443'

---------------------------------------------------------------------------
-- Shell/Code Execution Ports
-- Used for shellcode detection rules
---------------------------------------------------------------------------

-- Exclude HTTP ports (shellcode in HTTP is handled separately)
SHELLCODE_PORTS = '!80'

---------------------------------------------------------------------------
-- Database Ports
---------------------------------------------------------------------------

-- Oracle ports (1521 is standard, but often uses high ports)
ORACLE_PORTS = '1024:'

-- MySQL
MYSQL_PORTS = '3306'

-- PostgreSQL
POSTGRES_PORTS = '5432'

-- MSSQL
MSSQL_PORTS = '1433 1434'

-- MongoDB
MONGO_PORTS = '27017 27018 27019'

-- Redis
REDIS_PORTS = '6379'

---------------------------------------------------------------------------
-- Mail Ports
---------------------------------------------------------------------------

SMTP_PORTS = '25 465 587 691 2525'
POP_PORTS = '109 110 995'
IMAP_PORTS = '143 220 993'

---------------------------------------------------------------------------
-- File Transfer Ports
---------------------------------------------------------------------------

FTP_PORTS = '21 2100 3535'
SSH_PORTS = '22'
SFTP_PORTS = '115 22'

-- SMB/CIFS
SMB_PORTS = '139 445'

-- NFS
NFS_PORTS = '111 2049'

---------------------------------------------------------------------------
-- VoIP Ports
---------------------------------------------------------------------------

SIP_PORTS = '5060 5061 5600'
RTP_PORTS = '5004 5005 10000:20000'

---------------------------------------------------------------------------
-- DNS Ports
---------------------------------------------------------------------------

DNS_PORTS = '53 5353'

-- DNS over HTTPS (DoH)
DOH_PORTS = '443'

-- DNS over TLS (DoT)
DOT_PORTS = '853'

---------------------------------------------------------------------------
-- Remote Access Ports
---------------------------------------------------------------------------

TELNET_PORTS = '23 2323'
RDP_PORTS = '3389'
VNC_PORTS = '5800 5900 5901'

---------------------------------------------------------------------------
-- Industrial/SCADA Ports
---------------------------------------------------------------------------

MODBUS_PORTS = '502'
DNP3_PORTS = '20000'
BACNET_PORTS = '47808'

---------------------------------------------------------------------------
-- GTP (GPRS Tunneling Protocol) Ports
---------------------------------------------------------------------------

GTP_PORTS = '2123 2152 3386'

---------------------------------------------------------------------------
-- File Data Ports
-- Ports where file transfers may occur (for file_data rules)
---------------------------------------------------------------------------

FILE_DATA_PORTS = '$HTTP_PORTS 110 143'
```

## Rule Management

### Rule Directory Structure

Set up a proper rule organization:

```bash
# Create rule directory structure
sudo mkdir -p /etc/snort/rules/{local,community,emerging,snort-registered}
sudo mkdir -p /etc/snort/lists
sudo mkdir -p /etc/snort/so_rules
sudo mkdir -p /etc/snort/preproc_rules

# Create base rule files
sudo touch /etc/snort/rules/local/local.rules
sudo touch /etc/snort/lists/white_list.rules
sudo touch /etc/snort/lists/black_list.rules

# Set permissions
sudo chown -R snort:snort /etc/snort/rules
sudo chmod -R 644 /etc/snort/rules/*
```

### Downloading Community Rules

```bash
# Download Snort 3 community rules
cd /tmp
wget https://www.snort.org/downloads/community/snort3-community-rules.tar.gz

# Extract rules
tar -xvzf snort3-community-rules.tar.gz

# Copy rules to snort directory
sudo cp snort3-community-rules/*.rules /etc/snort/rules/community/
sudo cp snort3-community-rules/sid-msg.map /etc/snort/

# Verify rules are readable
ls -la /etc/snort/rules/community/
```

### Downloading Registered Rules (Free with Registration)

```bash
# Register at snort.org and get your oinkcode
OINKCODE="your-oinkcode-here"

# Download registered rules
wget "https://www.snort.org/downloads/registered/snortrules-snapshot-31XXX.tar.gz?oinkcode=$OINKCODE" \
    -O snortrules.tar.gz

# Extract and install
tar -xvzf snortrules.tar.gz
sudo cp -r rules/* /etc/snort/rules/snort-registered/
```

### Creating Rule Include File

Create `/etc/snort/rules/snort.rules`:

```
# Main rule include file
# Include all rule categories you want to use

# Local custom rules (always first)
include $RULE_PATH/local/local.rules

# Community rules
include $RULE_PATH/community/snort3-community.rules

# Emerging Threats rules (if installed)
# include $RULE_PATH/emerging/emerging-all.rules

# Snort registered rules by category
# include $RULE_PATH/snort-registered/app-detect.rules
# include $RULE_PATH/snort-registered/attack-response.rules
# include $RULE_PATH/snort-registered/backdoor.rules
# include $RULE_PATH/snort-registered/bad-traffic.rules
# include $RULE_PATH/snort-registered/browser-chrome.rules
# include $RULE_PATH/snort-registered/browser-firefox.rules
# include $RULE_PATH/snort-registered/browser-ie.rules
# include $RULE_PATH/snort-registered/browser-webkit.rules
# include $RULE_PATH/snort-registered/chat.rules
# include $RULE_PATH/snort-registered/content-replace.rules
# include $RULE_PATH/snort-registered/ddos.rules
# include $RULE_PATH/snort-registered/dns.rules
# include $RULE_PATH/snort-registered/dos.rules
# include $RULE_PATH/snort-registered/exploit-kit.rules
# include $RULE_PATH/snort-registered/exploit.rules
# include $RULE_PATH/snort-registered/file-executable.rules
# include $RULE_PATH/snort-registered/file-flash.rules
# include $RULE_PATH/snort-registered/file-identify.rules
# include $RULE_PATH/snort-registered/file-image.rules
# include $RULE_PATH/snort-registered/file-java.rules
# include $RULE_PATH/snort-registered/file-multimedia.rules
# include $RULE_PATH/snort-registered/file-office.rules
# include $RULE_PATH/snort-registered/file-other.rules
# include $RULE_PATH/snort-registered/file-pdf.rules
# include $RULE_PATH/snort-registered/finger.rules
# include $RULE_PATH/snort-registered/ftp.rules
# include $RULE_PATH/snort-registered/icmp-info.rules
# include $RULE_PATH/snort-registered/icmp.rules
# include $RULE_PATH/snort-registered/imap.rules
# include $RULE_PATH/snort-registered/indicator-compromise.rules
# include $RULE_PATH/snort-registered/indicator-obfuscation.rules
# include $RULE_PATH/snort-registered/indicator-scan.rules
# include $RULE_PATH/snort-registered/indicator-shellcode.rules
# include $RULE_PATH/snort-registered/info.rules
# include $RULE_PATH/snort-registered/malware-backdoor.rules
# include $RULE_PATH/snort-registered/malware-cnc.rules
# include $RULE_PATH/snort-registered/malware-other.rules
# include $RULE_PATH/snort-registered/malware-tools.rules
# include $RULE_PATH/snort-registered/misc.rules
# include $RULE_PATH/snort-registered/multimedia.rules
# include $RULE_PATH/snort-registered/mysql.rules
# include $RULE_PATH/snort-registered/netbios.rules
# include $RULE_PATH/snort-registered/nntp.rules
# include $RULE_PATH/snort-registered/oracle.rules
# include $RULE_PATH/snort-registered/os-linux.rules
# include $RULE_PATH/snort-registered/os-other.rules
# include $RULE_PATH/snort-registered/os-windows.rules
# include $RULE_PATH/snort-registered/other-ids.rules
# include $RULE_PATH/snort-registered/p2p.rules
# include $RULE_PATH/snort-registered/phishing-spam.rules
# include $RULE_PATH/snort-registered/policy-multimedia.rules
# include $RULE_PATH/snort-registered/policy-other.rules
# include $RULE_PATH/snort-registered/policy-social.rules
# include $RULE_PATH/snort-registered/policy-spam.rules
# include $RULE_PATH/snort-registered/policy.rules
# include $RULE_PATH/snort-registered/pop3.rules
# include $RULE_PATH/snort-registered/protocol-dns.rules
# include $RULE_PATH/snort-registered/protocol-finger.rules
# include $RULE_PATH/snort-registered/protocol-ftp.rules
# include $RULE_PATH/snort-registered/protocol-icmp.rules
# include $RULE_PATH/snort-registered/protocol-imap.rules
# include $RULE_PATH/snort-registered/protocol-nntp.rules
# include $RULE_PATH/snort-registered/protocol-other.rules
# include $RULE_PATH/snort-registered/protocol-pop.rules
# include $RULE_PATH/snort-registered/protocol-rpc.rules
# include $RULE_PATH/snort-registered/protocol-scada.rules
# include $RULE_PATH/snort-registered/protocol-services.rules
# include $RULE_PATH/snort-registered/protocol-snmp.rules
# include $RULE_PATH/snort-registered/protocol-telnet.rules
# include $RULE_PATH/snort-registered/protocol-tftp.rules
# include $RULE_PATH/snort-registered/protocol-voip.rules
# include $RULE_PATH/snort-registered/pua-adware.rules
# include $RULE_PATH/snort-registered/pua-other.rules
# include $RULE_PATH/snort-registered/pua-p2p.rules
# include $RULE_PATH/snort-registered/pua-toolbars.rules
# include $RULE_PATH/snort-registered/rpc.rules
# include $RULE_PATH/snort-registered/rservices.rules
# include $RULE_PATH/snort-registered/scada.rules
# include $RULE_PATH/snort-registered/scan.rules
# include $RULE_PATH/snort-registered/server-apache.rules
# include $RULE_PATH/snort-registered/server-iis.rules
# include $RULE_PATH/snort-registered/server-mail.rules
# include $RULE_PATH/snort-registered/server-mssql.rules
# include $RULE_PATH/snort-registered/server-mysql.rules
# include $RULE_PATH/snort-registered/server-oracle.rules
# include $RULE_PATH/snort-registered/server-other.rules
# include $RULE_PATH/snort-registered/server-webapp.rules
# include $RULE_PATH/snort-registered/shellcode.rules
# include $RULE_PATH/snort-registered/smtp.rules
# include $RULE_PATH/snort-registered/snmp.rules
# include $RULE_PATH/snort-registered/specific-threats.rules
# include $RULE_PATH/snort-registered/spyware-put.rules
# include $RULE_PATH/snort-registered/sql.rules
# include $RULE_PATH/snort-registered/telnet.rules
# include $RULE_PATH/snort-registered/tftp.rules
# include $RULE_PATH/snort-registered/virus.rules
# include $RULE_PATH/snort-registered/voip.rules
# include $RULE_PATH/snort-registered/web-activex.rules
# include $RULE_PATH/snort-registered/web-attacks.rules
# include $RULE_PATH/snort-registered/web-cgi.rules
# include $RULE_PATH/snort-registered/web-client.rules
# include $RULE_PATH/snort-registered/web-coldfusion.rules
# include $RULE_PATH/snort-registered/web-frontpage.rules
# include $RULE_PATH/snort-registered/web-iis.rules
# include $RULE_PATH/snort-registered/web-misc.rules
# include $RULE_PATH/snort-registered/web-php.rules
# include $RULE_PATH/snort-registered/x11.rules
```

## Snort Rule Syntax

Understanding Snort rule syntax is essential for both reading existing rules and writing custom ones.

### Rule Structure

```
ACTION PROTOCOL SRC_IP SRC_PORT DIRECTION DST_IP DST_PORT (OPTIONS)
```

### Rule Components

```
alert tcp $EXTERNAL_NET any -> $HOME_NET 80 (msg:"Example Rule"; sid:1000001; rev:1;)
|     |   |            |   |  |         |   |
|     |   |            |   |  |         |   +-- Rule Options
|     |   |            |   |  |         +------ Destination Port
|     |   |            |   |  +---------------- Destination IP
|     |   |            |   +------------------- Direction
|     |   |            +----------------------- Source Port
|     |   +------------------------------------ Source IP
|     +---------------------------------------- Protocol
+---------------------------------------------- Action
```

### Actions

| Action | Description |
|--------|-------------|
| `alert` | Generate alert and log packet |
| `log` | Log packet without alert |
| `pass` | Ignore packet (whitelist) |
| `drop` | Block packet (IPS mode only) |
| `reject` | Block and send RST/ICMP unreachable |
| `sdrop` | Silent drop (no logging) |

### Direction Operators

| Operator | Description |
|----------|-------------|
| `->` | Unidirectional (source to destination) |
| `<>` | Bidirectional |

### Common Rule Options

```
# Message - what appears in alerts
msg:"SQL Injection Attempt";

# Signature ID - unique identifier for this rule
sid:1000001;

# Revision number - increment when updating rule
rev:1;

# Classification type
classtype:web-application-attack;

# Priority (1=high, 3=low)
priority:1;

# Reference to external documentation
reference:url,www.example.com/advisory;
reference:cve,2024-12345;

# GID - Generator ID (1=text rules, 3=so_rules)
gid:1;

# Metadata
metadata:service http, policy security-ips drop;
```

### Content Matching Options

```
# Basic content match (case-insensitive by default in Snort 3)
content:"GET";

# Case-sensitive match
content:"GET"; nocase;

# Negated content (alert if NOT present)
content:!"authorized";

# Content with position modifiers
content:"SELECT"; offset:0; depth:10;

# Relative content (relative to previous match)
content:"FROM"; distance:1; within:20;

# HTTP-specific content
http_uri; content:"/admin";
http_header; content:"X-Forwarded-For";
http_client_body; content:"password";
http_method; content:"POST";
http_cookie; content:"session=";
http_stat_code; content:"200";

# Multiple content matches (AND logic)
content:"SELECT"; content:"FROM"; content:"WHERE";
```

### Regular Expression Options

```
# PCRE - Perl Compatible Regular Expressions
pcre:"/SELECT\s+.*\s+FROM/i";

# PCRE modifiers
# i = case insensitive
# s = include newlines in . matches
# m = multiline (^ and $ match line boundaries)
# x = extended mode (whitespace ignored)
# A = anchor at start
# E = anchor at end
# G = global match
# R = relative (after previous content match)
# U = match in URI
# H = match in header
# P = match in body
# B = match in raw body
# I = match in raw header
# C = match in cookie
# D = match in raw cookie
# M = match in method
# S = match in stat_code
# K = match in stat_msg
```

### Flow Options

```
# Flow direction and state
flow:to_server,established;
flow:to_client,established;
flow:from_server,established;
flow:from_client,established;

# Only on established sessions
flow:established;

# Only on stateless packets
flow:stateless;

# Only match once per flow
flow:no_stream;

# Match on stream reassembled data
flow:only_stream;
```

### Threshold Options

```
# Limit alerts (1 per 60 seconds per source)
detection_filter:track by_src, count 1, seconds 60;

# Threshold in rule
threshold:type limit, track by_src, count 5, seconds 60;
threshold:type threshold, track by_dst, count 10, seconds 60;
threshold:type both, track by_src, count 1, seconds 3600;
```

### Byte Matching Options

```
# Byte test (compare bytes to value)
# byte_test:bytes_to_convert, operator, value, offset;
byte_test:2, >, 1024, 0;
byte_test:4, =, 0x41424344, 12, relative, big;

# Byte jump (read bytes and jump)
# byte_jump:bytes_to_convert, offset;
byte_jump:2, 0, relative, multiplier 2;

# Byte extract (read bytes into variable)
byte_extract:2, 0, len_var, relative;
content:"data"; within:len_var;
```

## Writing Custom Rules

### Example 1: Detect SQL Injection Attempts

```
# /etc/snort/rules/local/sql-injection.rules

# Detect basic SQL injection in HTTP requests
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS (
    msg:"LOCAL SQL Injection - UNION SELECT detected";
    flow:to_server,established;
    http_uri;
    content:"union"; nocase;
    content:"select"; nocase; distance:0; within:20;
    classtype:web-application-attack;
    sid:1000001;
    rev:1;
    metadata:service http;
)

# Detect SQL injection with comments
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS (
    msg:"LOCAL SQL Injection - Comment sequence detected";
    flow:to_server,established;
    http_uri;
    pcre:"/(\%27)|(')|(\-\-)|(\%23)|(#)/i";
    classtype:web-application-attack;
    sid:1000002;
    rev:1;
    metadata:service http;
)

# Detect blind SQL injection timing attacks
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS (
    msg:"LOCAL SQL Injection - Sleep/Benchmark function detected";
    flow:to_server,established;
    http_uri;
    pcre:"/(sleep|benchmark|waitfor\s+delay|pg_sleep)\s*\(/i";
    classtype:web-application-attack;
    sid:1000003;
    rev:1;
    metadata:service http;
)
```

### Example 2: Detect Command Injection

```
# /etc/snort/rules/local/command-injection.rules

# Detect command injection via pipe
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS (
    msg:"LOCAL Command Injection - Pipe character in parameter";
    flow:to_server,established;
    http_uri;
    content:"|";
    pcre:"/\|[\s]*[a-zA-Z]/";
    classtype:web-application-attack;
    sid:1000010;
    rev:1;
)

# Detect command injection via backticks
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS (
    msg:"LOCAL Command Injection - Backtick execution attempt";
    flow:to_server,established;
    http_uri;
    content:"`";
    pcre:"/`[^`]+`/";
    classtype:web-application-attack;
    sid:1000011;
    rev:1;
)

# Detect command injection via $() substitution
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS (
    msg:"LOCAL Command Injection - Subshell execution attempt";
    flow:to_server,established;
    http_uri;
    content:"$(";
    classtype:web-application-attack;
    sid:1000012;
    rev:1;
)
```

### Example 3: Detect Reconnaissance Activity

```
# /etc/snort/rules/local/recon.rules

# Detect Nmap SYN scan
alert tcp $EXTERNAL_NET any -> $HOME_NET any (
    msg:"LOCAL SCAN - Possible Nmap SYN Scan";
    flow:stateless;
    flags:S,12;
    detection_filter:track by_src, count 30, seconds 10;
    classtype:attempted-recon;
    sid:1000020;
    rev:1;
)

# Detect Nmap NULL scan
alert tcp $EXTERNAL_NET any -> $HOME_NET any (
    msg:"LOCAL SCAN - Nmap NULL Scan";
    flow:stateless;
    flags:0;
    classtype:attempted-recon;
    sid:1000021;
    rev:1;
)

# Detect Nmap XMAS scan
alert tcp $EXTERNAL_NET any -> $HOME_NET any (
    msg:"LOCAL SCAN - Nmap XMAS Scan";
    flow:stateless;
    flags:FPU;
    classtype:attempted-recon;
    sid:1000022;
    rev:1;
)

# Detect directory enumeration
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS (
    msg:"LOCAL RECON - Directory enumeration detected";
    flow:to_server,established;
    http_stat_code;
    content:"404";
    detection_filter:track by_src, count 20, seconds 30;
    classtype:attempted-recon;
    sid:1000023;
    rev:1;
)
```

### Example 4: Detect Data Exfiltration

```
# /etc/snort/rules/local/exfiltration.rules

# Detect large DNS TXT responses (possible DNS tunneling)
alert udp $DNS_SERVERS 53 -> $HOME_NET any (
    msg:"LOCAL EXFIL - Large DNS TXT response";
    flow:to_client;
    byte_test:2, >, 500, 0;
    content:"|00 10|";  # TXT record type
    detection_filter:track by_src, count 10, seconds 60;
    classtype:policy-violation;
    sid:1000030;
    rev:1;
)

# Detect ICMP tunnel (large ICMP packets)
alert icmp $HOME_NET any -> $EXTERNAL_NET any (
    msg:"LOCAL EXFIL - Possible ICMP Tunnel";
    dsize:>100;
    detection_filter:track by_src, count 50, seconds 60;
    classtype:policy-violation;
    sid:1000031;
    rev:1;
)

# Detect Base64 encoded data in HTTP
alert http $HOME_NET any -> $EXTERNAL_NET any (
    msg:"LOCAL EXFIL - Large Base64 data in HTTP POST";
    flow:to_server,established;
    http_method;
    content:"POST";
    http_client_body;
    pcre:"/[A-Za-z0-9+\/]{1000,}={0,2}/";
    classtype:policy-violation;
    sid:1000032;
    rev:1;
)
```

### Example 5: Detect Malware Indicators

```
# /etc/snort/rules/local/malware.rules

# Detect potential reverse shell
alert tcp $HOME_NET any -> $EXTERNAL_NET any (
    msg:"LOCAL MALWARE - Potential Reverse Shell";
    flow:established;
    content:"/bin/sh";
    pcre:"/\/bin\/(sh|bash|zsh|csh|ksh)/";
    classtype:trojan-activity;
    sid:1000040;
    rev:1;
)

# Detect PowerShell download cradle
alert http $HOME_NET any -> $EXTERNAL_NET any (
    msg:"LOCAL MALWARE - PowerShell Download Cradle";
    flow:to_server,established;
    content:"powershell"; nocase;
    pcre:"/(IEX|Invoke-Expression|downloadstring|webclient)/i";
    classtype:trojan-activity;
    sid:1000041;
    rev:1;
)

# Detect suspicious User-Agent
alert http $HOME_NET any -> $EXTERNAL_NET any (
    msg:"LOCAL MALWARE - Suspicious User-Agent";
    flow:to_server,established;
    http_header;
    content:"User-Agent|3a|";
    pcre:"/User-Agent:\s*(curl|wget|python-requests|Go-http-client)/i";
    classtype:policy-violation;
    sid:1000042;
    rev:1;
)
```

### Example 6: Custom Application Rules

```
# /etc/snort/rules/local/custom-app.rules

# Monitor access to sensitive API endpoint
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS (
    msg:"LOCAL APP - Access to admin API endpoint";
    flow:to_server,established;
    http_uri;
    content:"/api/v1/admin";
    classtype:policy-violation;
    sid:1000050;
    rev:1;
    metadata:service http;
)

# Detect failed login attempts
alert http $HTTP_SERVERS $HTTP_PORTS -> $EXTERNAL_NET any (
    msg:"LOCAL APP - Multiple failed login attempts";
    flow:to_client,established;
    http_stat_code;
    content:"401";
    detection_filter:track by_src, count 5, seconds 60;
    classtype:unsuccessful-user;
    sid:1000051;
    rev:1;
)

# Detect access to backup files
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS (
    msg:"LOCAL APP - Backup file access attempt";
    flow:to_server,established;
    http_uri;
    pcre:"/\.(bak|backup|old|orig|copy|tmp|temp|swp)(\?|$)/i";
    classtype:web-application-attack;
    sid:1000052;
    rev:1;
)
```

## Running Snort in Different Modes

### Packet Sniffer Mode

Display packets on screen (useful for testing):

```bash
# Basic packet sniffing
sudo snort -i eth0

# Verbose mode with packet data
sudo snort -i eth0 -v

# Show data link layer info
sudo snort -i eth0 -d

# Show application layer data
sudo snort -i eth0 -e

# Combine all verbose options
sudo snort -i eth0 -vde
```

### Packet Logger Mode

Log packets to disk:

```bash
# Log packets in tcpdump format
sudo snort -i eth0 -l /var/log/snort

# Log in ASCII format
sudo snort -i eth0 -K ascii -l /var/log/snort

# Log specific network only
sudo snort -i eth0 -l /var/log/snort -h 192.168.1.0/24

# Read from pcap file instead of interface
sudo snort -r capture.pcap -l /var/log/snort
```

### Network Intrusion Detection Mode

Run as IDS with configuration:

```bash
# Run with configuration file
sudo snort -c /etc/snort/snort.lua -i eth0 -A alert_fast -l /var/log/snort

# Run in daemon mode
sudo snort -c /etc/snort/snort.lua -i eth0 -D -l /var/log/snort

# Test configuration without running
sudo snort -c /etc/snort/snort.lua --warn-all -T

# Validate rules only
sudo snort -c /etc/snort/snort.lua --rule-path /etc/snort/rules -T

# Run with specific alert mode
sudo snort -c /etc/snort/snort.lua -i eth0 -A alert_json -l /var/log/snort

# Run with multiple threads
sudo snort -c /etc/snort/snort.lua -i eth0 -z 4 -l /var/log/snort
```

### Inline/IPS Mode

Run as IPS (requires appropriate DAQ module):

```bash
# Run in inline mode with NFQ (netfilter queue)
sudo snort -c /etc/snort/snort.lua --daq nfq -Q -l /var/log/snort

# Run with afpacket inline
sudo snort -c /etc/snort/snort.lua --daq afpacket --daq-var device=eth0:eth1 -Q

# Configure iptables for NFQ
sudo iptables -A FORWARD -j NFQUEUE --queue-num 1
```

### Read Mode (Offline Analysis)

Analyze pcap files:

```bash
# Analyze single pcap
sudo snort -c /etc/snort/snort.lua -r /path/to/capture.pcap -l /var/log/snort

# Analyze multiple pcap files
sudo snort -c /etc/snort/snort.lua --pcap-list "/path/to/*.pcap" -l /var/log/snort

# Analyze with performance stats
sudo snort -c /etc/snort/snort.lua -r capture.pcap --enable-profiler

# Analyze specific packets
sudo snort -c /etc/snort/snort.lua -r capture.pcap -n 1000  # First 1000 packets
```

### Creating a Systemd Service

Create `/etc/systemd/system/snort3.service`:

```ini
[Unit]
Description=Snort 3 Network Intrusion Detection System
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=snort
Group=snort

# Main execution
ExecStart=/usr/local/bin/snort -c /etc/snort/snort.lua -i eth0 -l /var/log/snort -D -A alert_fast

# Reload configuration
ExecReload=/bin/kill -HUP $MAINPID

# Stop gracefully
ExecStop=/bin/kill -TERM $MAINPID

# Restart on failure
Restart=on-failure
RestartSec=10

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/snort /var/run
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_RAW CAP_SYS_NICE
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_RAW CAP_SYS_NICE

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable at boot
sudo systemctl enable snort3

# Start the service
sudo systemctl start snort3

# Check status
sudo systemctl status snort3

# View logs
sudo journalctl -u snort3 -f
```

## PulledPork for Rule Updates

PulledPork is the standard tool for managing Snort rule updates.

### Installing PulledPork 3

```bash
# Clone PulledPork repository
cd /opt
sudo git clone https://github.com/shirkdog/pulledpork3.git
cd pulledpork3

# Install dependencies
sudo apt install -y python3 python3-pip
pip3 install requests

# Create symlink for easy execution
sudo ln -s /opt/pulledpork3/pulledpork.py /usr/local/bin/pulledpork
```

### Configuring PulledPork

Create `/etc/snort/pulledpork.conf`:

```ini
# PulledPork 3 Configuration
# /etc/snort/pulledpork.conf

# Snort installation settings
[snort]
# Path to Snort executable
snort_path = /usr/local/bin/snort

# Path to Snort configuration
config_path = /etc/snort/snort.lua

# Snort version (3 for Snort 3)
version = 3

# Rule sources
[rules]
# Community rules (free)
community_rules = true

# Registered rules (requires oinkcode)
registered_rules = true
oinkcode = YOUR_OINKCODE_HERE

# Snort Subscriber rules (paid)
# subscriber_rules = true
# subscriber_oinkcode = YOUR_SUBSCRIBER_OINKCODE

# Emerging Threats rules
# et_rules = true
# et_oinkcode = YOUR_ET_OINKCODE

# Output settings
[output]
# Output directory for processed rules
rule_path = /etc/snort/rules/pulledpork

# Combined rules file
combined_rules = /etc/snort/rules/pulledpork/snort.rules

# Backup old rules
backup_rules = true
backup_path = /etc/snort/rules/backup

# Processing options
[processing]
# Enable blocklist management
blocklist = true
blocklist_path = /etc/snort/lists/black_list.rules

# Enable SID management (enable/disable specific rules)
sid_management = true
enablesid_path = /etc/snort/enablesid.conf
disablesid_path = /etc/snort/disablesid.conf
dropsid_path = /etc/snort/dropsid.conf
modifysid_path = /etc/snort/modifysid.conf

# IP blocklist URLs
[blocklist_urls]
# Emerging Threats blocklist
et_blocklist = https://rules.emergingthreats.net/fwrules/emerging-Block-IPs.txt

# Abuse.ch blocklists
abuse_botcc = https://sslbl.abuse.ch/blacklist/sslipblacklist.txt
```

### Running PulledPork

```bash
# Download and process rules
sudo pulledpork -c /etc/snort/pulledpork.conf

# Force update (ignore timestamps)
sudo pulledpork -c /etc/snort/pulledpork.conf -f

# Test configuration
sudo pulledpork -c /etc/snort/pulledpork.conf -T

# Verbose output
sudo pulledpork -c /etc/snort/pulledpork.conf -v
```

### Automating Rule Updates with Cron

```bash
# Add cron job for daily updates
sudo crontab -e

# Add this line (update rules at 3 AM daily)
0 3 * * * /usr/local/bin/pulledpork -c /etc/snort/pulledpork.conf && /usr/bin/systemctl reload snort3
```

### Managing Rules with SID Files

Create `/etc/snort/disablesid.conf`:

```
# Disable specific rules
# Format: gid:sid  # comment
# or: pcre:regular_expression

# Disable noisy rules
1:2000001  # Disable specific SID
1:2000002
1:2000003

# Disable rules by pcre pattern
pcre:chat
pcre:p2p
pcre:games

# Disable rules by category
# Note: Use category name from rule file path
# emerging-chat.rules -> pcre:emerging-chat
```

Create `/etc/snort/enablesid.conf`:

```
# Enable rules that are disabled by default
# Same format as disablesid.conf

1:3000001  # Enable specific SID
pcre:deleted  # Enable rules from deleted.rules
```

Create `/etc/snort/dropsid.conf`:

```
# Change alert to drop for IPS mode
# Only works when running in inline mode

1:4000001  # Change to drop
pcre:exploit  # Drop all exploit rules
pcre:malware  # Drop all malware rules
```

## Logging and Alerting

### Alert Output Formats

Configure in `snort.lua`:

```lua
---------------------------------------------------------------------------
-- Logging and Alert Configuration
---------------------------------------------------------------------------

-- Fast alerts (one line per alert)
alert_fast =
{
    file = true,  -- Output to file
    packet = false,  -- Include packet header
}

-- Full alerts with packet contents
alert_full =
{
    file = true,
}

-- JSON output (recommended for SIEM integration)
alert_json =
{
    file = true,
    limit = 100,  -- File size limit in MB

    -- Fields to include (empty = all)
    fields = 'timestamp msg src_addr src_port dst_addr dst_port proto action gid sid rev',
}

-- CSV output for custom parsing
alert_csv =
{
    file = true,
    fields = 'timestamp pkt_num proto pkt_gen pkt_len dir src_addr src_port dst_addr dst_port rule msg',
}

-- Syslog output
alert_syslog =
{
    facility = 'local1',
    level = 'alert',
    options = 'pid',
}

-- Unified2 output (for Barnyard2)
unified2 =
{
    limit = 128,  -- File size limit in MB
    nostamp = false,  -- Include timestamps
}

-- PCAP logging
log_pcap =
{
    limit = 100,  -- File size limit in MB
}
```

### Log File Locations and Management

```bash
# Default log locations
/var/log/snort/alert_fast.txt     # Fast alerts
/var/log/snort/alert_full.txt     # Full alerts
/var/log/snort/alert_json.txt     # JSON alerts
/var/log/snort/unified2.log.*     # Unified2 binary logs
/var/log/snort/snort.log.*        # PCAP logs

# Create log rotation configuration
sudo nano /etc/logrotate.d/snort

# Content:
/var/log/snort/*.txt /var/log/snort/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 snort snort
    postrotate
        /bin/kill -HUP $(cat /var/run/snort.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
```

### Real-time Alert Monitoring

```bash
# Monitor fast alerts in real-time
tail -f /var/log/snort/alert_fast.txt

# Monitor JSON alerts with jq
tail -f /var/log/snort/alert_json.txt | jq .

# Filter specific alerts
tail -f /var/log/snort/alert_fast.txt | grep -i "sql injection"

# Count alerts by SID
cat /var/log/snort/alert_fast.txt | awk -F'[][]' '{print $2}' | sort | uniq -c | sort -rn | head -20
```

### Sending Alerts to External Systems

Create `/etc/snort/alert_script.sh`:

```bash
#!/bin/bash
# Script to send Snort alerts to external systems
# Called by Snort with alert information

ALERT_MSG="$1"
SRC_IP="$2"
DST_IP="$3"
SID="$4"

# Send to Slack webhook
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"Snort Alert: $ALERT_MSG\nSource: $SRC_IP -> $DST_IP\nSID: $SID\"}" \
    "$SLACK_WEBHOOK"

# Send email
echo "$ALERT_MSG" | mail -s "Snort Alert: $SID" security@example.com

# Log to external syslog server
logger -n syslog.example.com -P 514 -p local1.alert "Snort: $ALERT_MSG src=$SRC_IP dst=$DST_IP sid=$SID"
```

## Integration with Barnyard2

Barnyard2 processes Snort's unified2 output and writes to databases.

### Installing Barnyard2

```bash
# Install dependencies
sudo apt install -y libmysqlclient-dev libpcap-dev

# Clone Barnyard2
cd /tmp
git clone https://github.com/firnsy/barnyard2.git
cd barnyard2

# Build
./autogen.sh
./configure --with-mysql --with-mysql-libraries=/usr/lib/x86_64-linux-gnu
make
sudo make install
```

### Configuring Barnyard2

Create `/etc/snort/barnyard2.conf`:

```
# Barnyard2 Configuration
# /etc/snort/barnyard2.conf

# Set work paths
config reference_file:      /etc/snort/reference.config
config classification_file: /etc/snort/classification.config
config gen_file:           /etc/snort/gen-msg.map
config sid_file:           /etc/snort/sid-msg.map

# Configure alert output formats
config logdir: /var/log/barnyard2
config interface: eth0
config hostname: snort-sensor

# Set output plugins

# MySQL output
output database: log, mysql, user=snort password=snortpass dbname=snort host=localhost sensor_name=snort01

# Syslog output
output alert_syslog: LOG_AUTH LOG_ALERT

# CSV output
output alert_csv: /var/log/barnyard2/alert.csv timestamp,msg,proto,src,srcport,dst,dstport

# Continue processing from where we left off
config waldo_file: /var/log/barnyard2/barnyard2.waldo
```

### Setting Up MySQL Database

```bash
# Login to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE snort;
CREATE USER 'snort'@'localhost' IDENTIFIED BY 'snortpass';
GRANT ALL PRIVILEGES ON snort.* TO 'snort'@'localhost';
FLUSH PRIVILEGES;

# Import schema
USE snort;
SOURCE /tmp/barnyard2/schemas/create_mysql;
EXIT;
```

### Running Barnyard2

```bash
# Run Barnyard2
sudo barnyard2 -c /etc/snort/barnyard2.conf \
    -d /var/log/snort \
    -f unified2.log \
    -w /var/log/barnyard2/barnyard2.waldo

# Run as daemon
sudo barnyard2 -c /etc/snort/barnyard2.conf \
    -d /var/log/snort \
    -f unified2.log \
    -D
```

### Barnyard2 Systemd Service

Create `/etc/systemd/system/barnyard2.service`:

```ini
[Unit]
Description=Barnyard2 Snort Output Processor
After=snort3.service mysql.service
Requires=snort3.service

[Service]
Type=simple
User=snort
Group=snort
ExecStart=/usr/local/bin/barnyard2 -c /etc/snort/barnyard2.conf -d /var/log/snort -f unified2.log -w /var/log/barnyard2/barnyard2.waldo
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Performance Tuning

### System-Level Tuning

```bash
# Create /etc/sysctl.d/99-snort.conf
sudo nano /etc/sysctl.d/99-snort.conf

# Content:
# Increase network buffer sizes
net.core.rmem_max = 134217728
net.core.rmem_default = 16777216
net.core.wmem_max = 134217728
net.core.wmem_default = 16777216
net.core.netdev_max_backlog = 65536
net.core.optmem_max = 65536

# Increase socket buffer
net.ipv4.udp_rmem_min = 8192
net.ipv4.udp_wmem_min = 8192
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# Disable reverse path filtering (for IPS bridge mode)
net.ipv4.conf.all.rp_filter = 0
net.ipv4.conf.default.rp_filter = 0

# Apply changes
sudo sysctl -p /etc/sysctl.d/99-snort.conf
```

### Interface Tuning

```bash
# Increase ring buffer size
sudo ethtool -G eth0 rx 4096 tx 4096

# Disable offloading features that interfere with Snort
sudo ethtool -K eth0 gro off lro off gso off tso off

# Make changes persistent
# Add to /etc/network/interfaces or create a script in /etc/network/if-up.d/
```

### Snort Configuration Tuning

```lua
-- Performance tuning in snort.lua

-- DAQ tuning for high-speed networks
daq =
{
    module = 'afpacket',
    input = 'eth0',
    snaplen = 1518,
    variables =
    {
        -- Increase buffer size for high traffic
        ['buffer_size_mb'] = '1024',

        -- Use kernel-level load balancing
        ['fanout_type'] = 'hash',
        ['fanout_flag'] = 'defrag',
    },
}

-- Stream tuning
stream_tcp =
{
    -- Reduce session timeout for faster memory release
    session_timeout = 60,

    -- Increase max sessions for high-connection environments
    max_sessions = 1048576,

    -- Reduce reassembly depth for performance
    max_queued_bytes = 524288,
}

-- Detection engine tuning
detection =
{
    -- Use hyperscan for best performance
    search_engine = 'hyperscan',

    -- Enable rule optimization
    split_any_any = true,

    -- Disable unused rule categories
    enable_builtin_rules = false,
}

-- Memory limits
memory =
{
    -- Set appropriate cap based on available RAM
    cap = 4096,  -- 4GB
}

-- Thread configuration
-- Set based on available CPU cores
-- snort -z <num_threads>
```

### Rule Optimization

```bash
# Use PulledPork to optimize rules
# Disable noisy/unused rule categories

# Create /etc/snort/disablesid.conf with categories to disable:
pcre:deleted
pcre:chat
pcre:games
pcre:p2p
pcre:info

# Profile rules to find slow ones
sudo snort -c /etc/snort/snort.lua -r test.pcap --rule-profiler

# Output shows rules sorted by processing time
# Consider disabling or optimizing slow rules
```

### Monitoring Snort Performance

```bash
# Check packet drops
cat /proc/net/dev | grep eth0

# Monitor Snort stats
sudo snort -c /etc/snort/snort.lua -i eth0 --stats-period 10

# Use hyperscan-tools to verify hyperscan is working
hs_valid_platform

# Check memory usage
ps aux | grep snort
cat /proc/$(pgrep snort)/status | grep -i mem
```

## Troubleshooting

### Configuration Validation

```bash
# Test configuration for errors
sudo snort -c /etc/snort/snort.lua -T

# Test with warnings enabled
sudo snort -c /etc/snort/snort.lua --warn-all -T

# Test specific rule file
sudo snort -c /etc/snort/snort.lua --rule-path /etc/snort/rules/local -T

# Verbose test output
sudo snort -c /etc/snort/snort.lua -T -v
```

### Common Errors and Solutions

**Error: Cannot open interface**

```bash
# Check interface exists
ip link show

# Check permissions
sudo setcap cap_net_raw,cap_net_admin=eip /usr/local/bin/snort

# Or run with sudo
sudo snort -c /etc/snort/snort.lua -i eth0
```

**Error: Rule parse error**

```bash
# Test rules individually
sudo snort -c /etc/snort/snort.lua --rule "alert tcp any any -> any any (msg:\"Test\"; sid:9999999; rev:1;)" -T

# Check rule syntax
# Common issues:
# - Missing semicolons
# - Unmatched quotes
# - Invalid options
# - Wrong option order
```

**Error: DAQ module not found**

```bash
# List available DAQ modules
snort --list-modules | grep daq

# Verify DAQ library path
ldconfig -p | grep daq

# Rebuild libdaq if needed
cd /tmp/libdaq
./configure
make clean && make
sudo make install
sudo ldconfig
```

**Error: Out of memory**

```bash
# Reduce memory usage in snort.lua
memory = { cap = 2048 }  -- Reduce to 2GB

# Reduce session tracking
stream_tcp = { max_sessions = 131072 }

# Disable unused inspectors
-- Comment out unused inspectors in snort.lua
```

**Error: No alerts generated**

```bash
# Verify rules are loaded
sudo snort -c /etc/snort/snort.lua -T 2>&1 | grep "rules loaded"

# Test with known-bad traffic
# Download test pcap from Snort.org or create test traffic

# Check HOME_NET is configured correctly
grep HOME_NET /etc/snort/snort.lua

# Run in verbose mode
sudo snort -c /etc/snort/snort.lua -i eth0 -A console -v
```

### Debug Mode

```bash
# Enable debug output
sudo snort -c /etc/snort/snort.lua -i eth0 --debug

# Debug specific modules
sudo snort -c /etc/snort/snort.lua -i eth0 --debug-modules http_inspect

# Trace packet processing
sudo snort -c /etc/snort/snort.lua -i eth0 --trace
```

### Checking Snort is Working

```bash
# Generate test alert with known signature
# The following should trigger ICMP rules
ping -c 1 -p "4f4e4555505449" 192.168.1.1

# Or use Snort's built-in test
sudo snort -c /etc/snort/snort.lua --rule "alert icmp any any -> any any (msg:\"ICMP Test\"; sid:9999999; rev:1;)" -i eth0 -A console

# Then ping the interface
ping localhost

# Check log files
tail -f /var/log/snort/alert_fast.txt
```

### Log Analysis Script

Create `/usr/local/bin/snort-analyze.sh`:

```bash
#!/bin/bash
# Snort Log Analysis Script

LOG_DIR="/var/log/snort"
ALERT_FILE="$LOG_DIR/alert_fast.txt"

echo "=== Snort Alert Analysis ==="
echo "Log file: $ALERT_FILE"
echo "Analysis time: $(date)"
echo ""

# Total alerts
TOTAL=$(wc -l < "$ALERT_FILE")
echo "Total alerts: $TOTAL"
echo ""

# Top 10 alert types
echo "=== Top 10 Alert Types ==="
grep -oP '\[\*\*\].*?\[\*\*\]' "$ALERT_FILE" | sort | uniq -c | sort -rn | head -10
echo ""

# Top 10 source IPs
echo "=== Top 10 Source IPs ==="
grep -oP '\d+\.\d+\.\d+\.\d+:\d+\s+->' "$ALERT_FILE" | cut -d':' -f1 | sort | uniq -c | sort -rn | head -10
echo ""

# Top 10 destination IPs
echo "=== Top 10 Destination IPs ==="
grep -oP '->\s+\d+\.\d+\.\d+\.\d+' "$ALERT_FILE" | awk '{print $2}' | cut -d':' -f1 | sort | uniq -c | sort -rn | head -10
echo ""

# Alerts by hour
echo "=== Alerts by Hour (Last 24h) ==="
grep "$(date +%m/%d)" "$ALERT_FILE" | cut -d':' -f1 | cut -d'-' -f3 | sort | uniq -c
echo ""

# Priority distribution
echo "=== Priority Distribution ==="
grep -oP 'Priority:\s+\d+' "$ALERT_FILE" | sort | uniq -c | sort -rn
```

## Complete Working Configuration Example

Here is a complete, well-commented configuration file:

Create `/etc/snort/snort.lua`:

```lua
---------------------------------------------------------------------------
-- SNORT 3 COMPLETE CONFIGURATION
-- /etc/snort/snort.lua
--
-- This configuration is suitable for a small to medium network
-- Customize network variables, paths, and enabled inspectors
-- for your specific environment
---------------------------------------------------------------------------

---------------------------------------------------------------------------
-- SECTION 1: ENVIRONMENT VARIABLES AND PATHS
---------------------------------------------------------------------------

-- Define your network - CRITICAL for accurate detection
-- Use CIDR notation, multiple networks in brackets
HOME_NET = '192.168.1.0/24'

-- Everything not HOME_NET
EXTERNAL_NET = '!$HOME_NET'

-- Server definitions (customize for your network)
DNS_SERVERS = '$HOME_NET'
SMTP_SERVERS = '$HOME_NET'
HTTP_SERVERS = '$HOME_NET'
SQL_SERVERS = '$HOME_NET'
SSH_SERVERS = '$HOME_NET'
FTP_SERVERS = '$HOME_NET'
SIP_SERVERS = '$HOME_NET'
TELNET_SERVERS = '$HOME_NET'

-- Path definitions
RULE_PATH = '/etc/snort/rules'
WHITE_LIST_PATH = '/etc/snort/lists'
BLACK_LIST_PATH = '/etc/snort/lists'

---------------------------------------------------------------------------
-- SECTION 2: DATA ACQUISITION (DAQ)
---------------------------------------------------------------------------

daq =
{
    -- Module: afpacket (Linux), pcap (cross-platform)
    module = 'afpacket',

    -- Network interface to monitor
    -- Change to your primary interface
    input = 'eth0',

    -- Snapshot length (max packet size to capture)
    snaplen = 1518,

    -- Module-specific variables
    variables =
    {
        -- Buffer size in MB (increase for high-traffic networks)
        ['buffer_size_mb'] = '256',
    },
}

---------------------------------------------------------------------------
-- SECTION 3: STREAM PROCESSING
---------------------------------------------------------------------------

-- TCP stream reassembly
stream_tcp =
{
    -- OS policy for TCP reassembly
    -- Options: bsd, first, last, linux, old_linux, solaris, windows, vista, hpux, hpux10, irix, macos
    policy = 'linux',

    -- Session timeout in seconds
    session_timeout = 180,

    -- Maximum concurrent sessions (tune based on RAM)
    max_sessions = 262144,

    -- Maximum data queued per session
    max_queued_bytes = 1048576,

    -- Handle overlapping segments
    overlap_policy = 'last',
}

-- UDP session tracking
stream_udp =
{
    session_timeout = 60,
    max_sessions = 131072,
}

-- ICMP session tracking
stream_icmp =
{
    session_timeout = 30,
    max_sessions = 65536,
}

-- IP fragment reassembly
stream_ip =
{
    max_frags = 65536,
    policy = 'linux',
    session_timeout = 60,
}

---------------------------------------------------------------------------
-- SECTION 4: NORMALIZERS
---------------------------------------------------------------------------

normalizer =
{
    ip4 =
    {
        df = true,       -- Normalize don't fragment flag
        rf = true,       -- Normalize reserved flag
        tos = true,      -- Normalize TOS field
        trim = true,     -- Trim to datagram length
    },
    tcp =
    {
        ips = true,      -- Normalize for IPS
        rsv = true,      -- Clear reserved bits
        pad = true,      -- Clear padding
        opts = true,     -- Normalize options
    },
}

---------------------------------------------------------------------------
-- SECTION 5: INSPECTORS (Deep Packet Inspection)
---------------------------------------------------------------------------

-- HTTP/HTTPS traffic inspector
http_inspect =
{
    request_depth = 65535,
    response_depth = 65535,
    max_headers = 100,
    max_header_length = 4096,
    max_uri_length = 4096,
    normalize_javascript = true,
    decompress_pdf = true,
    decompress_swf = true,
    extended_response_inspection = true,
}

-- SSL/TLS inspector
ssl =
{
    trust_servers = true,
    max_client_hello_length = 65535,
}

-- DNS inspector
dns =
{
    enable_rdata_overflow = true,
}

-- SSH inspector
ssh =
{
    max_encrypted_packets = 25,
    max_client_bytes = 19600,
}

-- FTP inspector
ftp_server =
{
    def_max_param_len = 100,
    check_encrypted = true,
}

-- SMTP inspector
smtp =
{
    max_command_line_len = 512,
    max_header_line_len = 1000,
    max_response_line_len = 512,
    normalize_cmds = true,
}

-- SIP/VoIP inspector
sip =
{
    max_uri_len = 512,
    max_call_id_len = 80,
}

-- Enable telnet inspector (comment out if not needed)
telnet = { }

---------------------------------------------------------------------------
-- SECTION 6: DETECTION ENGINE
---------------------------------------------------------------------------

detection =
{
    -- Use hyperscan for best performance (requires libhyperscan)
    search_engine = 'hyperscan',

    -- Enable built-in decoder/preprocessor rules
    enable_builtin_rules = true,

    -- Performance optimization
    split_any_any = true,
}

---------------------------------------------------------------------------
-- SECTION 7: IPS RULES
---------------------------------------------------------------------------

ips =
{
    enable_builtin_rules = true,

    -- Include all rules from this directory
    include = RULE_PATH .. '/snort.rules',

    -- Network and port variables for rules
    variables =
    {
        nets =
        {
            HOME_NET = HOME_NET,
            EXTERNAL_NET = EXTERNAL_NET,
            DNS_SERVERS = DNS_SERVERS,
            SMTP_SERVERS = SMTP_SERVERS,
            HTTP_SERVERS = HTTP_SERVERS,
            SQL_SERVERS = SQL_SERVERS,
            SSH_SERVERS = SSH_SERVERS,
            FTP_SERVERS = FTP_SERVERS,
            SIP_SERVERS = SIP_SERVERS,
            TELNET_SERVERS = TELNET_SERVERS,
        },
        ports =
        {
            HTTP_PORTS = '80 81 8080 8081 8443 443 3128 9080',
            SHELLCODE_PORTS = '!80',
            SSH_PORTS = '22',
            FTP_PORTS = '21',
            SMTP_PORTS = '25 465 587',
            DNS_PORTS = '53',
            SQL_PORTS = '1433 1521 3306 5432',
            SIP_PORTS = '5060 5061',
            FILE_DATA_PORTS = '80 81 8080 8443 443 110 143',
            ORACLE_PORTS = '1024:',
            GTP_PORTS = '2123 2152 3386',
        },
    },
}

---------------------------------------------------------------------------
-- SECTION 8: OUTPUT AND LOGGING
---------------------------------------------------------------------------

-- Fast one-line alerts (human readable)
alert_fast =
{
    file = true,
    packet = false,
}

-- JSON alerts (for SIEM integration)
alert_json =
{
    file = true,
    limit = 100,
    fields = 'timestamp msg src_addr src_port dst_addr dst_port proto action gid sid rev',
}

-- Unified2 binary output (for Barnyard2)
unified2 =
{
    limit = 128,
}

-- Syslog output (optional - uncomment if needed)
-- alert_syslog =
-- {
--     facility = 'local1',
--     level = 'alert',
-- }

-- Packet capture logging
log_pcap =
{
    limit = 100,
}

---------------------------------------------------------------------------
-- SECTION 9: PERFORMANCE SETTINGS
---------------------------------------------------------------------------

-- Memory cap (MB) - adjust based on available RAM
memory =
{
    cap = 1024,
}

-- Profiling (enable for troubleshooting, disable for production)
-- profiler =
-- {
--     modules = { show = true },
--     rules = { show = true, sort = 'avg_check', count = 10 },
-- }

---------------------------------------------------------------------------
-- SECTION 10: PROCESS SETTINGS
---------------------------------------------------------------------------

process =
{
    daemon = false,            -- Set true for production
    set_uid = 'snort',         -- Run as this user
    set_gid = 'snort',         -- Run as this group
    pid_file = '/var/run/snort.pid',
}

---------------------------------------------------------------------------
-- END OF CONFIGURATION
---------------------------------------------------------------------------
```

---

Network intrusion detection is a critical component of any security infrastructure. Snort 3 provides enterprise-grade detection capabilities with significant performance improvements over its predecessors. The key to effective IDS deployment is proper tuning - knowing your network, understanding your traffic patterns, and continuously refining your rule set to reduce false positives while catching real threats.

Remember that Snort is a detection tool, not a replacement for proper security practices. Layer it with firewalls, proper access controls, vulnerability management, and incident response procedures for a comprehensive security posture.

For comprehensive monitoring of your network infrastructure, consider using [OneUptime](https://oneuptime.com). OneUptime provides real-time monitoring, alerting, and incident management that complements your Snort IDS deployment. You can integrate Snort alerts with OneUptime's incident management workflow to create a unified security operations center, track incident response times, and maintain visibility across your entire infrastructure. With OneUptime's status pages and alert routing, your team can respond to security events faster and keep stakeholders informed throughout the incident lifecycle.

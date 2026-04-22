# How to Configure Snort IDS for IPv6 Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Snort, IDS, IPv6, Network Security, Intrusion Detection, Linux

Description: Configure Snort intrusion detection system to monitor and detect threats in IPv6 network traffic, including installation, network variables, and IPv6-specific rules.

---

Snort is one of the most widely deployed network intrusion detection systems. Snort 3 supports IPv6 natively, enabling detection of threats in both IPv4 and IPv6 traffic with unified rule syntax.

## Installing Snort 3

```bash
# Ubuntu/Debian - build from source
sudo apt install build-essential cmake flex g++ git autoconf automake \
  libtool libpcap-dev libpcre2-dev libdnet-dev libhwloc-dev \
  libluajit-5.1-dev libssl-dev libhyperscan-dev zlib1g-dev \
  pkg-config wget -y

# Build and install LibDAQ
git clone https://github.com/snort3/libdaq.git
cd libdaq
./bootstrap
./configure --prefix=/usr/local
make -j "$(nproc)"
sudo make install

# Build and install Snort 3
cd ..
git clone https://github.com/snort3/snort3.git
cd snort3
./configure_cmake.sh --prefix=/usr/local
cd build
make -j "$(nproc)"
sudo make install
sudo ldconfig

# Prepare /etc/snort paths used below
sudo mkdir -p /etc/snort/rules /var/log/snort
sudo cp /usr/local/etc/snort/snort.lua /etc/snort/snort.lua
sudo cp /usr/local/etc/snort/snort_defaults.lua /etc/snort/snort_defaults.lua
wget -O /tmp/snort3-community-rules.tar.gz \
  https://www.snort.org/downloads/community/snort3-community-rules.tar.gz
sudo tar xzf /tmp/snort3-community-rules.tar.gz -C /etc/snort/rules
sudo touch /etc/snort/rules/local.rules
```

## Configuring Snort for IPv6

```lua
-- /etc/snort/snort.lua

-- Network variables including IPv6
IPV6_HOME_NET = '[2001:db8::/32,fd00::/8]'
HOME_NET = '[192.168.0.0/16,10.0.0.0/8,2001:db8::/32,fd00::/8]'
EXTERNAL_NET = '!$HOME_NET'

include 'snort_defaults.lua'
RULE_PATH = '/etc/snort/rules'

-- IPv6 specific network groups
IPV6_LOOPBACK = '::1'
IPV6_LINK_LOCAL = 'fe80::/10'

-- Server definitions
HTTP_SERVERS = HOME_NET
DNS_SERVERS = '[8.8.8.8, 8.8.4.4, 2001:4860:4860::8888]'

-- Keep Snort rule variables in sync with the Lua values above
default_variables.nets.HOME_NET = HOME_NET
default_variables.nets.EXTERNAL_NET = EXTERNAL_NET
default_variables.nets.DNS_SERVERS = DNS_SERVERS
default_variables.nets.IPV6_HOME_NET = IPV6_HOME_NET
default_variables.nets.IPV6_LOOPBACK = IPV6_LOOPBACK
default_variables.nets.IPV6_LINK_LOCAL = IPV6_LINK_LOCAL
default_variables.paths.RULE_PATH = RULE_PATH

-- Detection engine configuration
search_engine = { search_method = "hyperscan" }

detection = {
  hyperscan_literals = true,
  pcre_to_regex = true
}

-- Include rule files
ips =
{
  enable_builtin_rules = true,
  variables = default_variables,
  rules = [[
    include $RULE_PATH/snort3-community-rules/snort3-community.rules
    include $RULE_PATH/local.rules
  ]]
}

-- Log settings
alert_csv =
{
  file = true,
  fields = 'timestamp src_addr src_port dst_addr dst_port proto action msg'
}
```

## IPv6-Specific Detection Rules

```snort
# /etc/snort/rules/local.rules

# Detect ICMPv6 router advertisement (possible rogue router)
alert icmp $IPV6_LINK_LOCAL any -> any any (
  msg:"ICMPv6 Router Advertisement - Possible Rogue Router";
  ip_proto:58;
  itype:134;
  sid:1000001; rev:1;
)

# Detect ICMPv6 redirect (possible MITM)
alert icmp any any -> any any (
  msg:"ICMPv6 Redirect Message - Possible Route Hijack";
  ip_proto:58;
  itype:137;
  sid:1000002; rev:1;
)

# Detect IPv6 tunneling over DNS
alert udp any any -> $DNS_SERVERS 53 (
  msg:"Large DNS AAAA Query - Possible IPv6 DNS Tunneling";
  dsize:>200;
  content:"|00 1c 00 01|";
  sid:1000003; rev:1;
)

# Detect potential IPv6 address scanning
alert tcp any any -> $IPV6_HOME_NET 22 (
  msg:"SSH Connection Attempt from IPv6";
  flags:S;
  flow:to_server;
  sid:1000004; rev:1;
)
```

## Running Snort on IPv6 Interface

```bash
# Create log directory
sudo mkdir -p /var/log/snort

# Test configuration
sudo snort -c /etc/snort/snort.lua -T

# Run in detection mode on eth0
sudo snort -c /etc/snort/snort.lua -i eth0 -A alert_csv -l /var/log/snort/

# Capture to PCAP for analysis
sudo snort -c /etc/snort/snort.lua -i eth0 -L pcap -l /var/log/snort/

# Read from PCAP file
sudo snort -c /etc/snort/snort.lua -r /path/to/capture.pcap -A alert_csv -l /var/log/snort/
```

## Systemd Service

```ini
# /etc/systemd/system/snort.service
[Unit]
Description=Snort IDS
After=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/snort -c /etc/snort/snort.lua \
  -i eth0 -A alert_csv \
  -l /var/log/snort/ \
  --daq-dir /usr/local/lib/daq

Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Analyzing IPv6 Alerts

```bash
# View Snort alert log
sudo cat /var/log/snort/alert_csv.txt

# Filter IPv6 alerts
sudo awk -F, '$2 ~ /:/ || $4 ~ /:/' /var/log/snort/alert_csv.txt | head -20

# Use u2spewfoo to inspect unified2 output if enabled with -A unified2
sudo u2spewfoo /var/log/snort/snort.u2.* | grep -A3 "IPv6"
```

Snort 3's unified rule syntax handles IPv6 addresses natively. Traditional rule headers use `ip`, `icmp`, `tcp`, and `udp`; use IPv6 address variables, `ip_proto`, and built-in IPv6 decoder alerts for IPv6-specific detection and tuning.

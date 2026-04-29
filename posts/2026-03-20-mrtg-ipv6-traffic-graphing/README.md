# How to Configure MRTG for IPv6 Traffic Graphing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MRTG, IPv6, Traffic Graphing, SNMP, Network Monitoring, Bandwidth

Description: Configure MRTG (Multi Router Traffic Grapher) to collect and graph traffic statistics from IPv6-addressed devices using SNMP over IPv6 transport.

---

MRTG generates traffic graphs from SNMP-polled interface data. Configuring MRTG for IPv6 devices requires using the IPv6 address in bracket notation and ensuring the underlying Net-SNMP libraries support IPv6 transport.

## Installing MRTG

```bash
# Ubuntu/Debian

sudo apt install mrtg -y

# Verify installation
mrtg --version

# Create directories
sudo mkdir -p /var/www/html/mrtg
sudo chown www-data:www-data /var/www/html/mrtg
```

## Generating MRTG Configuration for IPv6 Device

```bash
# Generate config for IPv6 device
cfgmaker \
  --global "WorkDir: /var/www/html/mrtg" \
  --global "Options[_]: bits,growright" \
  --output /etc/mrtg/mrtg.cfg \
  --ifdesc=descr \
  public@[2001:db8::router1]

# View generated config
cat /etc/mrtg/mrtg.cfg
```

## Manual MRTG Configuration for IPv6

```text
# /etc/mrtg/mrtg.cfg

# Global options
WorkDir: /var/www/html/mrtg
Options[_]: bits,growright,unknaszero

# IPv6 Router - Interface eth0
# Target uses [IPv6address] notation
Target[router1_eth0]: 2:public@[2001:db8::router1]:
MaxBytes[router1_eth0]: 125000000
Title[router1_eth0]: Router1 eth0 Traffic
PageTop[router1_eth0]: <H1>Router1 eth0 - IPv6</H1>

# IPv6 Router - Interface eth1 (using ifIndex)
Target[router1_eth1]: 3:public@[2001:db8::router1]:
MaxBytes[router1_eth1]: 125000000
Title[router1_eth1]: Router1 eth1 Traffic

# Custom SNMP OID over IPv6 (e.g., IPv6 packet counter)
Target[ipv6_pkts]: `snmpget -v2c -c public udp6:[2001:db8::router1]:161 \
  1.3.6.1.2.1.4.31.1.1.3.2 | awk '{print $NF}'`:`snmpget -v2c -c public \
  udp6:[2001:db8::router1]:161 1.3.6.1.2.1.4.31.1.1.30.2 | awk '{print $NF}'`
MaxBytes[ipv6_pkts]: 10000000
Title[ipv6_pkts]: IPv6 Packets In/Out
```

## Running MRTG

```bash
# First run (may show errors, normal)
sudo mrtg /etc/mrtg/mrtg.cfg
sudo mrtg /etc/mrtg/mrtg.cfg
sudo mrtg /etc/mrtg/mrtg.cfg

# Create index page
indexmaker \
  --title "IPv6 Network Traffic" \
  --output /var/www/html/mrtg/index.html \
  /etc/mrtg/mrtg.cfg
```

## Scheduling MRTG with Cron

```bash
# /etc/cron.d/mrtg - Run every 5 minutes
*/5 * * * * root env LANG=C /usr/bin/mrtg /etc/mrtg/mrtg.cfg \
  --lock-file /var/lock/mrtg/mrtg.lock \
  --log-file /var/log/mrtg/mrtg.log

# Create required directories
sudo mkdir -p /var/lock/mrtg /var/log/mrtg
sudo chown root:root /var/lock/mrtg /var/log/mrtg
```

## MRTG with SNMPv3 over IPv6

```text
# /etc/mrtg/mrtg-snmpv3.cfg

# SNMPv3 syntax for MRTG
# Use external command for SNMPv3
Target[secure_device]: `snmpget -v3 -l authPriv \
  -u monitorv3 -a SHA -A "AuthPass" -x AES -X "PrivPass" \
  udp6:[2001:db8::device]:161 1.3.6.1.2.1.31.1.1.1.6.1 | awk '{print $NF}'`:\
`snmpget -v3 -l authPriv -u monitorv3 -a SHA -A "AuthPass" -x AES -X "PrivPass" \
  udp6:[2001:db8::device]:161 1.3.6.1.2.1.31.1.1.1.10.1 | awk '{print $NF}'`
MaxBytes[secure_device]: 125000000
Title[secure_device]: Secure IPv6 Device Traffic
```

## Viewing MRTG Graphs

```bash
# Serve via Nginx
cat > /etc/nginx/sites-available/mrtg << 'EOF'
server {
    listen [::]:80;
    server_name mrtg.example.com;
    root /var/www/html/mrtg;
    index index.html;
    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/mrtg /etc/nginx/sites-enabled/
sudo systemctl reload nginx

# Check MRTG log for errors
sudo tail -f /var/log/mrtg/mrtg.log
```

MRTG's bracket notation for IPv6 addresses (`public@[2001:db8::router]`) enables straightforward IPv6 traffic graphing, with `cfgmaker` able to auto-discover and configure interfaces on IPv6 devices just as it does for IPv4.

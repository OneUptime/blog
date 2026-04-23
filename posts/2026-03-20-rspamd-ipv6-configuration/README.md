# How to Configure Rspamd with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rspamd, IPv6, Email, Spam Filtering, Postfix, Mail Security

Description: Configure Rspamd spam filtering daemon to work correctly with IPv6 connections, including trusted IP whitelisting and proper milter socket configuration.

## Introduction

Rspamd is a high-performance spam filtering system used with Postfix, Exim, and other MTAs. When your mail server accepts connections from IPv6 clients or uses IPv6 for outbound delivery, Rspamd's configuration may need adjustment to properly handle IPv6 addresses in whitelists, local network definitions, and milter bindings.

## Installing Rspamd

```bash
# Add Rspamd repository and install on Ubuntu

curl -fsSL https://rspamd.com/apt-stable/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/rspamd.gpg
echo "deb [signed-by=/usr/share/keyrings/rspamd.gpg] https://rspamd.com/apt-stable/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/rspamd.list
sudo apt update && sudo apt install -y rspamd redis-server

# On RHEL/CentOS/Rocky Linux/AlmaLinux 8+
curl -sSL https://rspamd.com/rpm-stable/centos-8/rspamd.repo | sudo tee /etc/yum.repos.d/rspamd.repo
sudo dnf install -y rspamd redis
```

## Configuring Rspamd to Listen on IPv6

By default, Rspamd listens on localhost. If Postfix or other clients need to reach Rspamd over IPv6, configure the worker to bind to IPv6:

```bash
sudo nano /etc/rspamd/local.d/worker-normal.inc
```

```ucl
# Bind to both IPv4 and IPv6
bind_socket = "*:11333";
# Or bind to specific addresses
# bind_socket = ["127.0.0.1:11333", "[::1]:11333"];
```

For the proxy worker (milter):

```bash
sudo nano /etc/rspamd/local.d/worker-proxy.inc
```

```ucl
# Bind milter to both protocols
bind_socket = "*:11332";
milter = yes;
upstream "local" {
  default = yes;
  self_scan = yes;
}
```

## Configuring Postfix to Use the Rspamd Milter

```bash
# Configure Postfix to use Rspamd milter over TCP
sudo postconf -e 'smtpd_milters = inet:localhost:11332'
sudo postconf -e 'non_smtpd_milters = inet:localhost:11332'
sudo postconf -e 'milter_default_action = accept'
sudo systemctl reload postfix
```

## Whitelisting IPv6 Internal Networks

Configure Rspamd to treat internal IPv6 networks as local networks:

```bash
sudo tee /etc/rspamd/local.d/options.inc << 'EOF'
# Define local networks including IPv6
local_networks = [
  "127.0.0.0/8",
  "::1/128",
  "10.0.0.0/8",
  "192.168.0.0/16",
  "172.16.0.0/12",
  "2001:db8::/32",
  "fd00::/8"
];
EOF
```

## Configuring IP Whitelist for IPv6

Create a local IP whitelist to reduce the spam score for known IPv6 senders:

```bash
sudo tee /etc/rspamd/local.d/ip_whitelist.map << 'EOF'
# Trusted IPv6 addresses (one per line)
2001:db8::10
2001:db8::11
2001:db8:cafe::/64
EOF

# Reference the map in Rspamd configuration
sudo tee /etc/rspamd/local.d/multimap.conf << 'EOF'
WHITELISTED_IP {
  type = "ip";
  map = "/etc/rspamd/local.d/ip_whitelist.map";
  score = -10.0;
  description = "Whitelisted IP/IPv6 address";
}
EOF
```

## Configuring IPv6 DNSBL Checks

Some DNSBLs support IPv6. Configure Rspamd to check them:

```bash
sudo tee /etc/rspamd/local.d/rbl.conf << 'EOF'
rbls {
  # IPv6-capable DNSBL
  spamhaus_xbl {
    symbol = "RBL_SPAMHAUS_XBL";
    rbl = "xbl.spamhaus.org";
    checks = ["from"];
    ipv6 = true;
    # IPv6 DNSBL uses nibble format automatically
  }

  spamhaus_sbl {
    symbol = "RBL_SPAMHAUS_SBL";
    rbl = "sbl.spamhaus.org";
    checks = ["from"];
    ipv6 = true;
  }
}
EOF
```

## Restarting and Testing

```bash
# Restart Rspamd
sudo systemctl restart rspamd

# Check Rspamd is listening on IPv6
sudo ss -tlnp | grep -E '11332|11333'
# Should show listeners on *:11332/*:11333 or [::]:11332/[::]:11333

# Test Rspamd processing via rspamc with a saved RFC 5322 message
rspamc symbols < test_message.eml 2>/dev/null | head -20

# Check Rspamd logs for IPv6 connections
sudo journalctl -u rspamd -f | grep "::"
```

## Accessing the Rspamd Web Interface over IPv6

```bash
sudo tee /etc/rspamd/local.d/worker-controller.inc << 'EOF'
# Bind web UI to IPv6
bind_socket = "*:11334";
# Set password for the web interface
password = "$2$yourhashedpassword";
EOF

sudo systemctl restart rspamd
# Access at http://[2001:db8::10]:11334
```

## Conclusion

Rspamd services can listen on IPv6 by binding worker sockets to `*` or explicit IPv6 addresses, defining IPv6 subnets in `local_networks`, and configuring IPv6-compatible DNSBL checks. These changes help spam filtering work correctly for both IPv4 and IPv6 SMTP connections without false positives for internal IPv6 mail.

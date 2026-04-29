# How to Configure LiteSpeed HTTP/3 with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LiteSpeed, HTTP/3, QUIC, IPv6, Web Server

Description: Configure LiteSpeed Web Server to enable HTTP/3 and QUIC over IPv6 addresses for improved performance and lower latency.

## Overview

LiteSpeed Web Server (LSWS) and OpenLiteSpeed support QUIC/HTTP/3. Configuration is done through the WebAdmin console or configuration files.

## Installing OpenLiteSpeed

```bash
# Install OpenLiteSpeed on Ubuntu

sudo wget -O - https://repo.litespeed.sh | sudo bash
sudo apt-get -y install openlitespeed

# Start and enable
sudo systemctl enable lsws
sudo systemctl start lsws

# Access WebAdmin at https://YOUR-IP:7080
```

## Step 1: Create or Update an HTTPS Listener for IPv6 in WebAdmin

If you already have an HTTPS listener on port 443, edit it instead of creating a second listener. Navigate to **Configuration → Listeners**:

```text
Listener Name: HTTPS
IP Address:    [ANY] (all IPv4 and IPv6 interfaces), or your specific IPv6 address in brackets
Port:          443
Secure:        Yes (SSL)
```

Then under **Listeners → HTTPS → SSL**, make sure **Protocol Version** includes **TLS v1.2** and **TLS v1.3**, **ALPN** includes **HTTP/2** and **HTTP/3** (or leave the default), and **Open HTTP3/QUIC (UDP) Port** is set to **Yes**.

Or via the configuration file at `/usr/local/lsws/conf/httpd_config.conf`:

```text
listener HTTPS{
  # Bind to all IPv4 and IPv6 addresses
  address               [ANY]:443
  secure                1

  # Open the HTTP/3/QUIC UDP port for this listener
  enableQuic            1

  # SSL settings
  keyFile               /etc/letsencrypt/live/example.com/privkey.pem
  certFile              /etc/letsencrypt/live/example.com/fullchain.pem
  certChain             1
}
```

## Step 2: Configure QUIC Parameters

```text
# In the existing tuning block
tuning{
  quicEnable            1
  quicShmDir            /dev/shm

  # Optional QUIC tuning
  quicMaxStreams        100
  quicHandshakeTimeout  10
  quicIdleTimeout       30

  # Leave quicVersions unset unless you need to restrict versions
}
```

## Step 3: Virtual Host Configuration

```text
virtualHost example.com {
  vhRoot                /var/www/example.com/
  configFile            $SERVER_ROOT/conf/vhosts/example.com/vhconf.conf
  allowSymbolLink       1
  enableScript          1
  restrained            1

  # Map listener to virtual host
  # (done in Listeners section)
}
```

## Step 4: Alt-Svc Advertisement

LiteSpeed automatically advertises supported HTTP/3 versions in the `Alt-Svc` response header when QUIC/HTTP/3 is enabled, so you usually do not need to set it manually.

## Step 5: Firewall Rules

```bash
# Allow UDP 443 for QUIC/HTTP3
sudo ufw allow 443/udp
sudo ufw allow 443/tcp

# ip6tables rules
sudo ip6tables -I INPUT -p udp --dport 443 -j ACCEPT
sudo ip6tables -I INPUT -p tcp --dport 443 -j ACCEPT

# For the WebAdmin console
sudo ip6tables -I INPUT -p tcp --dport 7080 -j ACCEPT
```

After saving your listener and QUIC changes, restart OpenLiteSpeed:

```bash
sudo systemctl restart lsws
```

## Verification

```bash
# Check OpenLiteSpeed is listening on port 443
sudo ss -luntp | grep ':443'

# Test HTTP/3 over IPv6 (requires a curl build with HTTP/3 support)
curl -6 --http3 https://example.com/ -v 2>&1 | grep -E "HTTP/3|using HTTP/3"

# Check response headers include Alt-Svc
curl -6 -I https://example.com | grep -i alt-svc

# Check OpenLiteSpeed configuration syntax
sudo /usr/local/lsws/bin/openlitespeed -t
```

## Troubleshooting Common Issues

```bash
# Check LiteSpeed error log
tail -f /usr/local/lsws/logs/error.log | grep --line-buffered -i quic

# Verify SSL certificate supports TLS 1.3
openssl s_client -connect example.com:443 -servername example.com -tls1_3 -6

# Force HTTP/3 only to rule out HTTP/2 fallback (requires curl with HTTP/3 support)
curl -6 --http3-only https://example.com/ -v
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to continuously monitor LiteSpeed availability over IPv6. Configure HTTP monitors that check the Alt-Svc header value and alert if HTTP/3 support is unexpectedly dropped.

## Conclusion

LiteSpeed makes HTTP/3 over IPv6 straightforward through its WebAdmin interface or configuration files. Key steps are: configure an HTTPS listener that serves IPv6 with QUIC enabled, ensure TLS 1.3, verify the Alt-Svc header is present, and open UDP 443 in your firewall.

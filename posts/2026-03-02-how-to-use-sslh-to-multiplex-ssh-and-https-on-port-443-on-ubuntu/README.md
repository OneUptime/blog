# How to Use sslh to Multiplex SSH and HTTPS on Port 443 on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, SSH, HTTPS, Security

Description: Learn how to use sslh on Ubuntu to share a single port 443 between SSH, HTTPS, and OpenVPN, enabling connections through restrictive firewalls that only allow outbound HTTPS traffic.

---

Many corporate and hotel networks block all outbound connections except HTTP (80) and HTTPS (443). This makes SSH access impossible from such networks. sslh solves this by running on port 443 and sniffing the first bytes of each incoming connection to determine the protocol, then routing to the appropriate backend service - SSH, HTTPS, OpenVPN, or others.

From the client's perspective, connecting on port 443 looks like any other HTTPS connection to network-level monitoring. sslh peeks at the application protocol layer to route correctly.

## How sslh Works

When a connection arrives on port 443, sslh:
1. Reads the first few bytes of the connection
2. Compares them against known protocol patterns (TLS ClientHello, SSH banner, OpenVPN, etc.)
3. Forwards the connection to the appropriate backend

For SSH, the protocol starts with `SSH-2.0-` which sslh recognizes. For HTTPS/TLS, it looks for the TLS ClientHello byte sequence. The original connection data is preserved and forwarded intact to the backend.

## Installing sslh

```bash
# Install sslh from Ubuntu repositories
sudo apt update
sudo apt install sslh

# The installer will ask if you want to run it as a standalone daemon or from inetd
# Choose "standalone" for better performance
```

## Architecture: sslh Takes Port 443

The key constraint is that sslh must own port 443, which means your existing HTTPS server (nginx, Apache) needs to move to a different port (typically 4443) that's only accessible locally:

```
Internet -> Port 443 -> sslh -> Port 22 (SSH daemon)
                             -> Port 4443 (HTTPS/nginx)
                             -> Port 1194 (OpenVPN)
```

## Reconfiguring nginx to Listen on a Different Port

Before configuring sslh, move your web server off port 443:

```bash
# Edit nginx configuration
sudo nano /etc/nginx/sites-available/your-site.conf
```

Change the listen directives:

```nginx
server {
    # Change from 443 ssl to 4443 ssl (local only)
    listen 127.0.0.1:4443 ssl;
    listen [::1]:4443 ssl;

    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Rest of config unchanged
    location / {
        # ...
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx

# Verify nginx is now on 4443
ss -tlnp | grep nginx
```

## Configuring sslh

The main configuration file:

```bash
sudo nano /etc/sslh/sslh.cfg
```

Here's a complete configuration that multiplexes SSH, HTTPS, and OpenVPN:

```
# sslh configuration file
# /etc/sslh/sslh.cfg

# Listen on all interfaces on port 443
listen:
(
    { host: "0.0.0.0"; port: "443"; },
    { host: "[::]"; port: "443"; }
);

# Protocol definitions - sslh tries each in order
protocols:
(
    # SSH - detected by the SSH banner
    {
        name: "ssh";
        service: "ssh";
        host: "127.0.0.1";
        port: "22";
        probe: "builtin";
    },

    # OpenVPN - detected by the OpenVPN header byte (0x38)
    {
        name: "openvpn";
        host: "127.0.0.1";
        port: "1194";
        probe: "builtin";
    },

    # HTTP (plain) - for HTTP/2 cleartext or other HTTP
    {
        name: "http";
        host: "127.0.0.1";
        port: "80";
        probe: "builtin";
    },

    # HTTPS/TLS - must be last among TLS protocols as it's a catch-all
    {
        name: "tls";
        host: "127.0.0.1";
        port: "4443";
        probe: "builtin";
    },

    # Catch-all: send unknown protocols to SSH (or another service)
    # This handles cases where the probe can't determine the protocol
    {
        name: "anyprot";
        host: "127.0.0.1";
        port: "22";
        probe: "builtin";
    }
);

# User/group to run as
user: "sslh";
group: "sslh";

# PID file location
pidfile: "/var/run/sslh/sslh.pid";

# Log to syslog
syslog_facility: "auth";
```

## Enabling sslh to Listen on Port 443

By default, sslh may need the binary to have the right capabilities to bind to port 443 as a non-root user:

```bash
# Grant the capability to bind to privileged ports without root
sudo setcap 'cap_net_bind_service=+ep' /usr/sbin/sslh
sudo setcap 'cap_net_bind_service=+ep' /usr/sbin/sslh-fork

# Check the capabilities were set
getcap /usr/sbin/sslh
```

Alternatively, check `/etc/default/sslh` to configure the daemon:

```bash
sudo nano /etc/default/sslh
```

Set the `DAEMON_OPTS` variable:

```
# Set to "yes" to start sslh on boot
RUN=yes

# Daemon options
DAEMON_OPTS="--user sslh --listen 0.0.0.0:443 --ssh 127.0.0.1:22 --tls 127.0.0.1:4443 --pidfile /var/run/sslh/sslh.pid"
```

Note: The command-line format (`--ssh`, `--tls`, etc.) is an older/simpler way to configure. The config file approach above is more flexible.

## Starting and Testing sslh

```bash
# Enable and start sslh
sudo systemctl enable --now sslh

# Check status
systemctl status sslh

# Verify sslh is listening on port 443
ss -tlnp | grep 443

# Test SSH through port 443
ssh -p 443 user@your-server.com

# Test HTTPS through port 443 (should still work normally)
curl https://your-server.com

# Test with verbose output to see the TLS handshake
curl -v https://your-server.com 2>&1 | grep "SSL connection"
```

## Handling Transparent Mode for Real IP Logging

By default, sslh proxies connections and your backend services see sslh's loopback address as the client IP. For nginx access logs to show real client IPs, use sslh's transparent mode:

```bash
# Transparent mode requires specific kernel configuration
# First, add the necessary routing rules

# Create a custom routing table for sslh
echo "100 sslh" | sudo tee -a /etc/iproute2/rt_tables

# Add routing rules (these need to be persistent - add to a startup script)
sudo ip rule add fwmark 0x1 lookup sslh
sudo ip route add local 0.0.0.0/0 dev lo table sslh

# Set iptables rules to mark packets from sslh
sudo iptables -t mangle -A PREROUTING -i lo -p tcp -m multiport \
    --dports 22,4443 -j MARK --set-mark 0x1

# Enable transparent mode in sslh config
# Set the 'transparent: true;' option in /etc/sslh/sslh.cfg
```

Then in `/etc/sslh/sslh.cfg`, add to each protocol block:

```
protocols:
(
    {
        name: "tls";
        host: "127.0.0.1";
        port: "4443";
        probe: "builtin";
        transparent: true;  # Pass through real client IP
    }
);
```

Make the routing rules persistent with a systemd service or by adding them to `/etc/rc.local`.

## Firewall Rules

```bash
# Allow port 443 (sslh handles the rest internally)
sudo ufw allow 443/tcp

# SSH on port 22 is now optional since we route it through 443
# You might keep 22 open for backup access from trusted IPs
sudo ufw allow from 10.0.0.0/8 to any port 22

# Check firewall status
sudo ufw status
```

## Verifying Protocol Detection

```bash
# Check sslh logs
journalctl -u sslh -f

# The logs show which protocol was detected for each connection
# Example log lines:
# sslh[1234]: connection from 1.2.3.4 -> ssh -> 127.0.0.1:22
# sslh[1234]: connection from 5.6.7.8 -> tls -> 127.0.0.1:4443

# If a connection is being misrouted, increase log verbosity
# Add to /etc/sslh/sslh.cfg:
# syslog_facility: "auth";
# verbose: 3;
```

## Troubleshooting

```bash
# If SSH doesn't work through port 443, check sslh is detecting it
# Test manually with netcat
echo "SSH-2.0-OpenSSH" | nc -w1 localhost 443

# If HTTPS breaks, verify nginx is listening on 4443
ss -tlnp | grep 4443

# Check if sslh has permission issues with port 443
journalctl -u sslh | grep "Permission denied"

# Restart services in order
sudo systemctl restart nginx
sudo systemctl restart sslh
```

## Using OpenSSH Through Port 443 from a Client

On the client side, configure SSH to use port 443 for specific hosts:

```
# In ~/.ssh/config on the client machine
Host my-server
    HostName your-server.com
    Port 443
    User ubuntu
    IdentityFile ~/.ssh/id_rsa
```

Now `ssh my-server` connects on port 443 and sslh routes it to the SSH daemon. This works from networks that block port 22 but allow outbound 443.

sslh is mature, lightweight, and does its job without fanfare. Once configured, it's transparent - you SSH normally, HTTPS works normally, and connections just work from previously blocked networks.

# How to Configure Darkstat for Network Statistics on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Monitoring, Network Statistics

Description: Learn how to install, configure, and use Darkstat to collect and visualize network traffic statistics on Ubuntu systems with a built-in web interface.

---

Darkstat is a lightweight network traffic analyzer that captures packets from a network interface and presents statistics through a built-in HTTP server. Unlike heavier monitoring solutions, it runs as a daemon, uses minimal resources, and provides a clean web interface showing per-host traffic breakdowns, protocol distribution, and historical graphs.

This guide walks through installing and configuring Darkstat on Ubuntu, including setting it up as a systemd service, locking down the web interface, and reading the statistics it provides.

## Installing Darkstat

Darkstat is available in the Ubuntu repositories:

```bash
sudo apt update
sudo apt install darkstat -y
```

During installation, you may be prompted to configure it. If you skip this step, the configuration file at `/etc/darkstat/init.cfg` still needs to be reviewed before starting the service.

## Configuring Darkstat

The main configuration file is `/etc/darkstat/init.cfg`. Open it with your editor:

```bash
sudo nano /etc/darkstat/init.cfg
```

Here is a typical configuration for a server with a primary interface called `eth0`:

```bash
# Enable or disable darkstat
START_DARKSTAT=yes

# Network interface to monitor
INTERFACE="-i eth0"

# Directory to store darkstat's database
DIR="-d /var/lib/darkstat"

# Port for the built-in HTTP server
PORT="-p 667"

# Bind to localhost only for security
BINDADDR="-b 127.0.0.1"

# Local network definition for proper host grouping
LOCAL="-l 192.168.1.0/24"

# Chroot directory for privilege separation
CHROOT="--chroot /var/lib/darkstat"
```

Key options explained:

- `-i eth0` - specifies which interface to sniff. Check your interface name with `ip link show`.
- `-b 127.0.0.1` - binds the web server to localhost, preventing external access. This is important if the server is internet-facing.
- `-l 192.168.1.0/24` - tells Darkstat which subnet is "local." Traffic to and from hosts in this range gets labeled as local.
- `--chroot` - runs Darkstat in a chroot jail for additional security.

### Finding the Correct Interface Name

On modern Ubuntu systems, interfaces have names like `ens3`, `enp0s3`, or `eno1` rather than `eth0`:

```bash
# List all network interfaces
ip link show

# Or use this to find the default route interface
ip route get 1.1.1.1 | awk '{print $5; exit}'
```

Update the `INTERFACE` line in the config file with the correct interface name.

## Starting and Enabling the Service

Enable and start the Darkstat service:

```bash
sudo systemctl enable darkstat
sudo systemctl start darkstat

# Check service status
sudo systemctl status darkstat
```

If the service fails to start, check the journal for errors:

```bash
sudo journalctl -u darkstat -n 50
```

## Accessing the Web Interface

Since Darkstat is bound to localhost on port 667, you access it differently depending on whether you are on the local machine or a remote server.

### Local Access

Open a browser and navigate to:

```
http://localhost:667
```

### Remote Access via SSH Tunnel

If the server is remote and the web interface is bound to localhost, use SSH port forwarding:

```bash
# Forward local port 8080 to the server's localhost:667
ssh -L 8080:localhost:667 user@yourserver.example.com

# Then open in browser
# http://localhost:8080
```

This keeps the web interface inaccessible from the internet while still allowing you to view it from your workstation.

## Reading Darkstat Statistics

The web interface has several sections worth understanding:

### Hosts View

The main page lists all hosts seen on the monitored interface. For each host you see:

- **In** - bytes received from this host
- **Out** - bytes sent to this host
- **Total** - combined traffic
- **Last seen** - timestamp of last packet

Clicking on a host reveals protocol-level breakdowns and port statistics, which helps pinpoint what services a machine is communicating with most.

### Graphs

The Graphs section shows traffic over time using hourly and daily views. The data is stored in the directory specified by `-d`, allowing historical analysis without an external database.

### Dump Statistics

You can export raw statistics via the built-in URL:

```
http://localhost:667/hosts.html?full=1
```

Or pull data in machine-readable form:

```bash
# Fetch the stats page and parse with a browser or script
curl -s http://localhost:667/hosts.html | grep -i "bytes"
```

## Securing the Web Interface with Nginx Reverse Proxy

If you need remote access without SSH tunneling, place Nginx in front of Darkstat with basic authentication:

```bash
# Install nginx and apache2-utils for htpasswd
sudo apt install nginx apache2-utils -y

# Create a password file
sudo htpasswd -c /etc/nginx/.darkstat_htpasswd admin
```

Create an Nginx server block:

```nginx
server {
    listen 80;
    server_name monitor.example.com;

    # Enforce basic auth
    auth_basic "Network Stats";
    auth_basic_user_file /etc/nginx/.darkstat_htpasswd;

    location / {
        # Proxy to darkstat
        proxy_pass http://127.0.0.1:667;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Save this to `/etc/nginx/sites-available/darkstat` and enable it:

```bash
sudo ln -s /etc/nginx/sites-available/darkstat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Add HTTPS via Certbot for production use:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d monitor.example.com
```

## Persistent Data and Restarts

Darkstat saves its database to the directory specified by `-d`. This means statistics survive daemon restarts. The database file is typically named `darkstat.db` and is updated periodically.

To reset all collected statistics:

```bash
sudo systemctl stop darkstat
sudo rm /var/lib/darkstat/darkstat.db
sudo systemctl start darkstat
```

## Adjusting Logging and Verbosity

By default Darkstat runs quietly. To enable more detailed logging during troubleshooting, add the `--verbose` flag to the configuration:

```bash
# In /etc/darkstat/init.cfg
EXTRA="--verbose"
```

Then restart the service:

```bash
sudo systemctl restart darkstat
```

## Firewall Considerations

If you decide to expose the Darkstat port directly (not recommended for production), allow it through UFW:

```bash
# Allow only from a specific management IP
sudo ufw allow from 10.0.0.5 to any port 667

# Check rules
sudo ufw status numbered
```

For most setups, keeping the bind address at `127.0.0.1` and using SSH tunnels or a reverse proxy is the safer approach.

## Summary

Darkstat is a solid choice when you need per-host traffic visibility without the operational overhead of a full monitoring stack. The setup is quick: install the package, point it at the right interface, bind the web server to localhost, and enable the systemd service. From there you get a persistent view of which hosts are generating traffic, what protocols they use, and how that changes over time. Pair it with an SSH tunnel or Nginx proxy for secure remote access, and you have a practical network statistics tool running on a minimal footprint.

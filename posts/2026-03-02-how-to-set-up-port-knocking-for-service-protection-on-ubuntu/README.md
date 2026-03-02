# How to Set Up Port Knocking for Service Protection on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Firewall, Port Knocking, Networking

Description: Learn how to configure port knocking on Ubuntu using knockd to hide SSH and other services from port scanners while maintaining legitimate access.

---

Port knocking is a method of opening ports on a firewall by sending a predefined sequence of connection attempts to specific closed ports. Until that sequence is received, the protected service appears completely closed to outside observers - a port scanner sees nothing listening on that port. Once the correct knock sequence is delivered, the firewall temporarily opens the port for your IP address.

It's not a replacement for strong authentication, but it's an excellent additional layer. An attacker who can't see your SSH port can't attempt a brute-force login or exploit a zero-day in the SSH daemon. Combined with key-based authentication, it makes a server significantly harder to attack opportunistically.

## How Port Knocking Works

The `knockd` daemon monitors the firewall log (via libpcap) for connection attempts matching your sequence. When it sees the correct sequence in order, it runs a command - typically an `iptables` or `ufw` rule to open the target port for the requesting IP. After a timeout or a close sequence, it removes that rule again.

The knock sequence is never acknowledged by the server. From the client's perspective, each knock looks like a connection to a closed port - it just times out or gets refused. The sequence is validated entirely server-side.

## Installing knockd

```bash
# Update package lists
sudo apt update

# Install the knockd daemon
sudo apt install -y knockd

# Verify installation
knockd --version
```

## Configuring knockd

The main configuration file is `/etc/knockd.conf`. Here's a complete working configuration:

```bash
sudo nano /etc/knockd.conf
```

```ini
[options]
    # Network interface to listen on
    Interface = eth0
    # Log to syslog
    UseSyslog

[openSSH]
    # The knock sequence: ports and protocols in order
    sequence    = 7000,8000,9000
    seq_timeout = 10
    command     = /sbin/iptables -A INPUT -s %IP% -p tcp --dport 22 -j ACCEPT
    tcpflags    = syn

[closeSSH]
    sequence    = 9000,8000,7000
    seq_timeout = 10
    command     = /sbin/iptables -D INPUT -s %IP% -p tcp --dport 22 -j ACCEPT
    tcpflags    = syn
```

Key configuration fields:
- `sequence` - comma-separated list of ports to knock in order
- `seq_timeout` - seconds within which the full sequence must complete
- `command` - shell command to run when sequence is matched (`%IP%` is replaced with the source IP)
- `tcpflags` - which TCP flag to detect (SYN for standard connection attempts)
- `Interface` - which network interface to monitor

## Setting the Network Interface

The interface name depends on your system. Find the correct one:

```bash
# List network interfaces
ip link show

# Or check which interface has your public IP
ip addr show
```

Common names are `eth0`, `ens3`, `enp0s3`, or `ens160`. Update `Interface` in `knockd.conf` accordingly.

## Configuring the Firewall

Before starting knockd, you need SSH blocked by default. Here's how to set that up with `iptables`:

```bash
# Allow established connections (so existing sessions don't break)
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow loopback
sudo iptables -A INPUT -i lo -j ACCEPT

# Close SSH by default - knockd will open it per-IP
sudo iptables -A INPUT -p tcp --dport 22 -j DROP

# Allow HTTP/HTTPS if you're running a web server
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

**Critical warning**: Before closing SSH, make sure you have an active session open or console access. If you lock yourself out on a cloud VM, you'll need the provider's emergency console.

### Using UFW Instead

If you prefer UFW:

```bash
# Enable UFW with SSH blocked
sudo ufw enable
sudo ufw deny 22/tcp

# Allow other services
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

Then configure knockd commands to use `ufw` instead:

```ini
[openSSH]
    sequence    = 7000,8000,9000
    seq_timeout = 10
    command     = /usr/sbin/ufw allow from %IP% to any port 22
    tcpflags    = syn

[closeSSH]
    sequence    = 9000,8000,7000
    seq_timeout = 10
    command     = /usr/sbin/ufw delete allow from %IP% to any port 22
    tcpflags    = syn
```

## Enabling the knockd Service

The default install has knockd disabled. Enable it in `/etc/default/knockd`:

```bash
sudo nano /etc/default/knockd
```

Change `START_KNOCKD=0` to `START_KNOCKD=1`:

```
# Set to 1 to start knockd on boot
START_KNOCKD=1

# Specify the config file (optional)
KNOCKD_OPTS="-i eth0"
```

Now start the service:

```bash
sudo systemctl enable knockd
sudo systemctl start knockd
sudo systemctl status knockd
```

## Testing the Knock Sequence

From a client machine, use the `knock` command (install with `apt install knockd` on the client) or use `nmap`:

```bash
# Install knock client on your local machine
sudo apt install knockd  # on client

# Send the opening knock sequence
knock -v <server-ip> 7000 8000 9000

# Now try SSH - the port should be open for your IP
ssh user@<server-ip>

# When done, close the port with the close sequence
knock -v <server-ip> 9000 8000 7000
```

Without the `knock` client, use nmap or even failed telnet connections:

```bash
# Using nmap to send knocks (each scan attempt counts as a knock)
nmap -Pn --host-timeout 201 --max-retries 0 -p 7000 <server-ip>
nmap -Pn --host-timeout 201 --max-retries 0 -p 8000 <server-ip>
nmap -Pn --host-timeout 201 --max-retries 0 -p 9000 <server-ip>
```

## Automating the Knock from Client Scripts

Create a simple wrapper script on your client machines:

```bash
# Create a knock-and-connect script
cat > ~/bin/ssh-knock << 'EOF'
#!/bin/bash
# Usage: ssh-knock <server-ip> [ssh-user]

SERVER="$1"
USER="${2:-$(whoami)}"
KNOCK_PORTS="7000 8000 9000"
CLOSE_PORTS="9000 8000 7000"

if [ -z "$SERVER" ]; then
    echo "Usage: $0 <server-ip> [user]"
    exit 1
fi

echo "Sending knock sequence to $SERVER..."
knock -v "$SERVER" $KNOCK_PORTS

# Small delay to let iptables rule take effect
sleep 1

echo "Connecting..."
ssh "$USER@$SERVER"

echo "Closing port..."
knock -v "$SERVER" $CLOSE_PORTS
EOF

chmod +x ~/bin/ssh-knock
```

## Using Mixed Protocol Sequences

For stronger security, you can mix TCP and UDP ports in the sequence:

```ini
[openSSH]
    sequence    = 7000:tcp,8000:udp,9000:tcp
    seq_timeout = 15
    command     = /sbin/iptables -A INPUT -s %IP% -p tcp --dport 22 -j ACCEPT
```

Mixed protocols make the sequence harder to replay even if someone captures your traffic, since UDP and TCP packets look different.

## Choosing a Good Knock Sequence

Your sequence is a shared secret. A few guidelines:

- Use at least 3-4 ports in the sequence
- Use high port numbers (above 1024) to avoid conflicts with common services
- Avoid sequences that might be triggered by legitimate scanning activity
- Consider using a longer `seq_timeout` if clients have high latency
- Document your sequence somewhere secure - losing it means you can't get in without console access

## Persisting iptables Rules

The iptables rules for blocking SSH by default need to survive reboots:

```bash
# Install iptables-persistent
sudo apt install -y iptables-persistent

# Save current rules
sudo netfilter-persistent save
```

This saves rules to `/etc/iptables/rules.v4` and restores them at boot.

## Verifying knockd is Working

Watch knockd's log output in real time:

```bash
# Follow knockd activity in syslog
sudo journalctl -u knockd -f

# Or watch syslog directly
sudo tail -f /var/log/syslog | grep knockd
```

When a correct knock sequence arrives, you'll see log entries for each stage and the command execution.

Port knocking adds meaningful obscurity to your exposed services. Combined with key-based SSH authentication, strong firewall rules, and monitoring, it substantially reduces the attack surface of a publicly reachable server.

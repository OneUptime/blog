# How to Configure SSH Port Knocking on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Security, Firewall

Description: Learn how to set up SSH port knocking on Ubuntu using knockd to hide your SSH port from scanners and require a secret sequence of connection attempts before opening access.

---

Port knocking is a security technique where your SSH port is firewalled by default and only opens temporarily when a client sends a specific sequence of connection attempts to other ports in order. A port scanner sees no open ports, and automated attacks never get far enough to attempt a login. It is security through obscurity, but it adds a meaningful layer on top of key-based authentication.

## How Port Knocking Works

1. Your SSH port is blocked by the firewall - `nmap` shows it as closed or filtered
2. You send connection attempts to a secret sequence of ports (e.g., 7000, 8000, 9000)
3. `knockd` monitors these connection attempts and recognizes the sequence
4. `knockd` temporarily opens the firewall rule for your IP on port 22
5. You connect to SSH
6. Optionally, you send a "close" sequence to re-block the port

## Installing knockd

```bash
# Install knockd
sudo apt update
sudo apt install knockd

# Verify installation
knock --version
```

## Configuring the Firewall

Before setting up knockd, block SSH completely in UFW:

```bash
# Check current firewall status
sudo ufw status

# Remove any existing SSH allow rules
sudo ufw delete allow ssh
sudo ufw delete allow 22/tcp

# Verify SSH is now blocked (you need another way to access the server!)
sudo ufw status
```

**Important**: Do this from a console/out-of-band connection, not an existing SSH session. Blocking port 22 will immediately terminate your SSH session.

## Configuring knockd

The knockd configuration file defines the knock sequences:

```bash
sudo nano /etc/knockd.conf
```

```ini
[options]
    # Network interface to monitor
    Interface = eth0
    # Log file for connection attempts
    logfile = /var/log/knockd.log

[openSSH]
    # The sequence of ports to knock (in order)
    # Use ports that don't conflict with real services
    sequence = 7000,8000,9000
    # Each knock must arrive within this time window (seconds)
    seq_timeout = 10
    # Command to run when sequence is detected
    # %IP% is replaced with the client's IP address
    command = ufw allow from %IP% to any port 22
    # Use TCP, UDP, or both per port: 7000:tcp,8000:udp,9000:tcp
    tcpflags = syn

[closeSSH]
    # Different sequence to close the port again
    sequence = 9000,8000,7000
    seq_timeout = 10
    command = ufw delete allow from %IP% to any port 22
    tcpflags = syn
```

Replace `eth0` with your actual network interface:

```bash
# Find your network interface name
ip link show
# Common names: eth0, ens3, enp0s3, ens5
```

## Enabling knockd

Edit the knockd defaults file to enable the daemon:

```bash
sudo nano /etc/default/knockd
```

```
# Set to 1 to enable knockd
START_KNOCKD=1

# Specify the interface (matches your knockd.conf)
KNOCKD_OPTS="-i eth0"
```

```bash
# Enable and start knockd
sudo systemctl enable knockd
sudo systemctl start knockd

# Check status
sudo systemctl status knockd
```

## Creating the Knock Script

On your client machine, create a script to send the knock sequence:

```bash
# Install the knock client on Ubuntu/Debian
sudo apt install knockd

# Basic knock command
# Syntax: knock -v [host] [port1] [port2] [port3]
knock -v server.example.com 7000 8000 9000
```

Create a convenient script:

```bash
# ~/bin/ssh-knock.sh
#!/bin/bash

SERVER="server.example.com"
OPEN_SEQUENCE="7000 8000 9000"
CLOSE_SEQUENCE="9000 8000 7000"

open_ssh() {
    echo "Sending knock sequence to open SSH..."
    knock -v "$SERVER" $OPEN_SEQUENCE
    # Wait briefly for the firewall rule to be applied
    sleep 1
    echo "Connecting to SSH..."
    ssh ubuntu@"$SERVER"
}

close_ssh() {
    echo "Sending sequence to close SSH port..."
    knock -v "$SERVER" $CLOSE_SEQUENCE
}

case "$1" in
    open)  open_ssh ;;
    close) close_ssh ;;
    *)
        # Default: open, connect, then close
        knock -v "$SERVER" $OPEN_SEQUENCE
        sleep 1
        ssh -o "ForwardAgent no" ubuntu@"$SERVER"
        echo "Connection closed. Closing SSH port..."
        knock -v "$SERVER" $CLOSE_SEQUENCE
        ;;
esac
```

```bash
chmod +x ~/bin/ssh-knock.sh

# Use it:
~/bin/ssh-knock.sh
```

## Using UDP Knocks for Stealth

TCP knocks are more reliable but leave traces in firewall logs. UDP knocks are less visible:

```ini
[openSSH]
    sequence    = 7000:udp,8000:tcp,9000:udp
    seq_timeout = 15
    command     = ufw allow from %IP% to any port 22
```

On the client:

```bash
# Send a mix of UDP and TCP knocks
knock -v -u server.example.com 7000  # UDP knock
knock -v server.example.com 8000     # TCP knock
knock -v -u server.example.com 9000  # UDP knock
```

## One-Time Sequences with nftables

For more advanced setups using nftables instead of UFW:

```ini
[options]
    Interface = eth0
    logfile = /var/log/knockd.log

[openSSH]
    sequence = 7000,8000,9000
    seq_timeout = 10
    # Use nftables commands
    start_command = nft add rule inet filter input ip saddr %IP% tcp dport 22 accept
    stop_command  = nft delete rule inet filter input handle $(nft -a list chain inet filter input | grep "%IP%" | grep -o 'handle [0-9]*' | awk '{print $2}')
    cmd_timeout   = 60
```

## Viewing knockd Logs

```bash
# Real-time log monitoring
sudo tail -f /var/log/knockd.log

# Example log entries:
# Mar 02 10:15:30 : 203.0.113.5: openSSH: Stage 1
# Mar 02 10:15:31 : 203.0.113.5: openSSH: Stage 2
# Mar 02 10:15:32 : 203.0.113.5: openSSH: Stage 3
# Mar 02 10:15:32 : 203.0.113.5: openSSH: OPEN SESAME
# Mar 02 10:15:32 : 203.0.113.5: running command: ufw allow from 203.0.113.5 to any port 22
```

## Handling Dynamic IP Addresses

If your client IP changes frequently, the firewall rules from previous sessions may accumulate. Add cleanup logic:

```ini
[openSSH]
    sequence = 7000,8000,9000
    seq_timeout = 10
    command = ufw allow from %IP% to any port 22
    cmd_timeout = 30

[closeSSH]
    sequence = 9000,8000,7000
    seq_timeout = 10
    command = ufw delete allow from %IP% to any port 22
```

Add a cron job to clean up old allow rules daily:

```bash
# /etc/cron.daily/cleanup-ssh-knock-rules
#!/bin/bash
# Remove all temporary SSH knock allow rules (be careful with this)
# This assumes your permanent SSH rules look different from the knock rules
ufw status numbered | grep "ALLOW IN.*22" | grep -v "Anywhere" | awk '{print $2}' | sort -rn | while read num; do
    ufw --force delete "$num"
done
```

## Security Considerations

Port knocking adds obscurity but is not a replacement for proper SSH security:

- Use key-based authentication in addition to port knocking
- Choose a long, non-sequential knock sequence (more than 3 ports)
- Vary the port numbers - avoid common ports
- Consider using timestamps in sequences (some knockd alternatives support this)
- The knock sequence travels over the network unencrypted - it is observable by network sniffers on your path
- Combine with a VPN for the highest security: require VPN connection before knocking becomes possible

## Testing the Setup

```bash
# From another machine, verify SSH is blocked before knocking
nmap -p 22 server.example.com
# Should show: 22/tcp  filtered ssh

# Send the knock sequence
knock -v server.example.com 7000 8000 9000
sleep 1

# Now verify SSH is open
nmap -p 22 server.example.com
# Should show: 22/tcp  open ssh

# Connect
ssh ubuntu@server.example.com

# When done, close the port
knock -v server.example.com 9000 8000 7000
```

## Summary

Port knocking with knockd hides your SSH port behind a firewall, opening it only for IPs that send the correct sequence of connection attempts. Set up the knock sequences in `/etc/knockd.conf`, block SSH in UFW, create a client-side knock script for convenience, and verify the sequence opens and closes the port correctly. Combined with key-based authentication and other hardening measures, port knocking eliminates automated scanning as a threat vector for your SSH service.

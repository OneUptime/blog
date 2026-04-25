# How to Configure Port Knocking for SSH Access on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, Port Knocking, Linux, Security, iptables, Knockd

Description: Set up port knocking using knockd and iptables to hide SSH behind a secret sequence of port packets, dramatically reducing SSH brute-force exposure.

Port knocking keeps SSH from appearing open on port scans - port 22 is filtered until you send a secret sequence of packets to a series of ports. Only a client that knows the sequence can open the firewall for their IP.

## How Port Knocking Works

```text
1. SSH port 22 is FILTERED by default (iptables DROP)
2. Client sends packets to port 7000, then 8000, then 9000
3. knockd detects the sequence from the client IP
4. knockd runs iptables to OPEN port 22 for that IP
5. Client connects to SSH normally
6. After a reverse knock, port 22 is filtered again
```

## Install knockd

```bash
# Debian/Ubuntu

sudo apt install knockd -y

# RHEL 9
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
sudo dnf install knock-server -y

# CentOS Stream 9
sudo dnf config-manager --set-enabled crb
sudo dnf install epel-release epel-next-release -y
sudo dnf install knock-server -y
```

## Configure knockd

```conf
# /etc/knockd.conf

[options]
    UseSyslog
    interface = eth0   # The public-facing interface

[openSSH]
    sequence    = 7000,8000,9000
    seq_timeout = 10           # Must complete sequence in 10 seconds
    command     = /usr/sbin/iptables -I INPUT 1 -s %IP% -p tcp --dport 22 -j ACCEPT
    tcpflags    = syn

[closeSSH]
    sequence    = 9000,8000,7000   # Reverse sequence to close
    seq_timeout = 10
    command     = /usr/sbin/iptables -D INPUT -s %IP% -p tcp --dport 22 -j ACCEPT
    tcpflags    = syn
```

## Close SSH by Default

Before starting knockd, block SSH for all IPs:

```bash
# Block SSH by default
sudo iptables -A INPUT -p tcp --dport 22 -j DROP

# Allow localhost (so you don't lock yourself out locally)
sudo iptables -I INPUT 1 -i lo -j ACCEPT

# Keep established connections working
sudo iptables -I INPUT 2 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Verify
sudo iptables -L INPUT -n
```

## Enable and Start knockd

```bash
# Enable knockd to start on boot
# Debian/Ubuntu only: edit /etc/default/knockd first:
# START_KNOCKD=1

sudo systemctl enable knockd
sudo systemctl start knockd
sudo systemctl status knockd
```

## Knock from the Client Side

Use the `knock` client or nmap to send the sequence:

```bash
# Using the knock client
knock server-ip 7000 8000 9000

# Using nmap (if knock not available)
nmap -Pn --host-timeout 201ms --max-retries 0 -p 7000 server-ip
nmap -Pn --host-timeout 201ms --max-retries 0 -p 8000 server-ip
nmap -Pn --host-timeout 201ms --max-retries 0 -p 9000 server-ip

# Then connect SSH
ssh user@server-ip

# Close the port when done
knock server-ip 9000 8000 7000

# Or with nmap
nmap -Pn --host-timeout 201ms --max-retries 0 -p 9000 server-ip
nmap -Pn --host-timeout 201ms --max-retries 0 -p 8000 server-ip
nmap -Pn --host-timeout 201ms --max-retries 0 -p 7000 server-ip
```

## Automate with a Script

```bash
#!/bin/bash
# ssh-knock.sh - knock and connect

SERVER="$1"
USER="${2:-ubuntu}"

knock "$SERVER" 7000 8000 9000
sleep 1
ssh "${USER}@${SERVER}"
knock "$SERVER" 9000 8000 7000
```

## Using UDP Knocks for Stealth

TCP SYN knocks may appear in logs on some systems; UDP may be quieter:

```conf
# /etc/knockd.conf - UDP sequence
[openSSH]
    sequence    = 7000:udp,8000:udp,9000:udp
    seq_timeout = 15
    command     = /usr/sbin/iptables -I INPUT 1 -s %IP% -p tcp --dport 22 -j ACCEPT

[closeSSH]
    sequence    = 9000:udp,8000:udp,7000:udp
    seq_timeout = 15
    command     = /usr/sbin/iptables -D INPUT -s %IP% -p tcp --dport 22 -j ACCEPT
```

```bash
# Knock with UDP using netcat
nc -zu server-ip 7000
nc -zu server-ip 8000
nc -zu server-ip 9000

# Close with UDP using netcat
nc -zu server-ip 9000
nc -zu server-ip 8000
nc -zu server-ip 7000
```

## Verify Knocking Works

```bash
# Watch knockd log in real time
sudo journalctl -u knockd -f

# Or syslog
sudo tail -f /var/log/syslog | grep knockd

# Example output after knock:
# Mar 19 10:05:01 host knockd: 1.2.3.4: openSSH: Stage 1
# Mar 19 10:05:01 host knockd: 1.2.3.4: openSSH: Stage 2
# Mar 19 10:05:01 host knockd: 1.2.3.4: openSSH: Stage 3
# Mar 19 10:05:01 host knockd: 1.2.3.4: openSSH: OPEN SESAME
```

Port knocking is an effective secondary security layer - an attacker scanning your server does not see SSH as open, which reduces routine SSH brute-force exposure.

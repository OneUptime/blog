# How to Configure Network Services for the RHCSA Exam on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Certification, Networking

Description: Step-by-step guide on configure network services for the rhcsa exam on rhel with practical examples and commands.

---

Network service configuration is a core RHCSA exam objective. This guide covers the networking tasks you must be able to perform on RHEL 9.

## Configure Static IP Addresses

```bash
# Using nmcli
sudo nmcli con mod "Wired connection 1" \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "8.8.8.8 8.8.4.4" \
  ipv4.method manual

sudo nmcli con up "Wired connection 1"
```

## Configure Hostname

```bash
sudo hostnamectl set-hostname examhost.example.com
hostnamectl status
```

## Configure DNS Resolution

```bash
# Verify resolver configuration
cat /etc/resolv.conf

# Add DNS via nmcli
sudo nmcli con mod "Wired connection 1" ipv4.dns "10.0.0.1 10.0.0.2"
sudo nmcli con up "Wired connection 1"
```

## Configure /etc/hosts

```bash
sudo tee -a /etc/hosts <<EOF
192.168.1.10 server1.example.com server1
192.168.1.20 server2.example.com server2
EOF
```

## Firewall Configuration

```bash
# Check firewall status
sudo firewall-cmd --state

# Add services
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Add ports
sudo firewall-cmd --permanent --add-port=8080/tcp

# Reload firewall
sudo firewall-cmd --reload

# List all rules
sudo firewall-cmd --list-all
```

## Configure NTP with Chrony

```bash
sudo vi /etc/chrony.conf
# Add: server ntp.example.com iburst

sudo systemctl restart chronyd
chronyc sources
chronyc tracking
```

## SSH Configuration

```bash
# Generate SSH keys
ssh-keygen -t rsa -b 4096

# Copy key to remote host
ssh-copy-id user@server2

# Test passwordless login
ssh user@server2
```

## Network Troubleshooting Commands

```bash
# Check connectivity
ping -c 4 192.168.1.1
traceroute 8.8.8.8

# Check open ports
ss -tlnp

# Check routes
ip route show

# DNS lookup
dig example.com
nslookup example.com
```

## Practice Exercises

1. Configure a static IP, gateway, and DNS on a network interface
2. Set a hostname and verify resolution
3. Allow HTTP and a custom port through the firewall
4. Configure chrony to sync time from a specific NTP server

## Conclusion

Network configuration is tested extensively on the RHCSA exam. Practice these commands on a lab environment until you can configure networking without referring to documentation.


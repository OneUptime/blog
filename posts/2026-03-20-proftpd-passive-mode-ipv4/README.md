# How to Configure ProFTPD Passive Mode for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ProFTPD, FTP, Passive Mode, IPv4, NAT, MasqueradeAddress

Description: Enable and configure ProFTPD passive mode with MasqueradeAddress and PassivePorts for IPv4, ensuring proper NAT traversal and firewall compatibility.

## Introduction

ProFTPD passive mode uses `MasqueradeAddress` (equivalent to vsftpd's `pasv_address`) to tell clients the public IP to connect to for data transfers. Without this setting on a server behind NAT, clients often cannot complete directory listings or file transfers.

## Passive Mode Configuration

```bash
# /etc/proftpd/proftpd.conf

ServerName    "FTP Server"
ServerType    standalone
UseIPv6       off
DefaultAddress 10.0.0.5
Port          21

# Passive mode: public IP clients connect to for data

MasqueradeAddress 203.0.113.10

# Passive port range
PassivePorts  30000 31000

# Authentication
DefaultRoot   ~
AuthOrder     mod_auth_pam.c mod_auth_unix.c
```

## Dynamic IP with DNS Resolution

```bash
# /etc/proftpd/proftpd.conf

# Resolve hostname for MasqueradeAddress (useful for dynamic IPs)
# ProFTPD resolves this at startup, so update DNS and restart ProFTPD if the IP changes

# Option: Use a dynamic DNS hostname
MasqueradeAddress ftp.example.com
```

## Firewall Rules

```bash
# Open FTP command port and passive data range
sudo ufw allow 21/tcp
sudo ufw allow 30000:31000/tcp
sudo ufw reload

# iptables equivalent
sudo iptables -A INPUT -p tcp --dport 21 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 30000:31000 -j ACCEPT

# For the NAT gateway, forward FTP control port and passive range:
sudo iptables -t nat -A PREROUTING -d 203.0.113.10 -p tcp \
  --dport 21 -j DNAT --to-destination 10.0.0.5
sudo iptables -t nat -A PREROUTING -d 203.0.113.10 -p tcp \
  --dport 30000:31000 -j DNAT --to-destination 10.0.0.5
```

## Connection Tracking for FTP

```bash
# Load the FTP connection tracking module only if your firewall relies on
# RELATED FTP data connections (common with active mode)
sudo modprobe nf_conntrack_ftp

# Make it persistent
echo "nf_conntrack_ftp" | sudo tee -a /etc/modules

# Verify the module is loaded
lsmod | grep conntrack_ftp
```

## Testing Passive Mode

```bash
# Test with lftp in passive mode
lftp -e "set ftp:passive-mode yes; ls; bye" \
  -u username,password 203.0.113.10

# Test with curl (passive by default)
curl -v ftp://username:password@203.0.113.10/

# Manual FTP session - test PASV command
ftp 203.0.113.10
> PASV
# 227 Entering Passive Mode (203,0,113,10,117,49)
# IP should be 203.0.113.10, not an internal address!

# Check ProFTPD debug output
sudo proftpd -nd5 --nofork 2>&1 | grep -i "masquerade\|passive\|pasv"
```

## Troubleshooting

```bash
# Issue: Passive connection times out
# Check: Is port range open in firewall?
sudo iptables -L INPUT -n | grep 30000

# Issue: MasqueradeAddress wrong (shows internal IP in PASV response)
# Fix: Set MasqueradeAddress to public/external IP
grep MasqueradeAddress /etc/proftpd/proftpd.conf

# Issue: Config error or unsupported directive
# Check: Validate the ProFTPD configuration
sudo proftpd --configtest

# View active IPv4 control/data connections and their state
sudo ss -4 -tanp '( sport = :21 or ( sport >= :30000 and sport <= :31000 ) )'
```

## Conclusion

ProFTPD passive mode requires `MasqueradeAddress` set to your public IPv4 and `PassivePorts` defining a restricted range. Open the passive port range in your firewall and forward it through NAT if ProFTPD is behind a router. Test with an FTP client in passive mode and verify the PASV response advertises the correct public IP.

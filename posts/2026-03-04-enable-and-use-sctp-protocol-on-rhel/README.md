# How to Enable and Use SCTP Protocol on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SCTP, Networking, Protocol, Linux

Description: Enable the SCTP (Stream Control Transmission Protocol) kernel module on RHEL and test it with practical examples for telecom and multi-homed network applications.

---

SCTP (Stream Control Transmission Protocol) combines the reliability of TCP with message-oriented delivery like UDP. It supports multi-homing (multiple IP addresses per endpoint) and multi-streaming, making it essential for telecom (SS7, Diameter) and high-availability applications.

## Load the SCTP Kernel Module

```bash
# Load the SCTP module
sudo modprobe sctp

# Verify it is loaded
lsmod | grep sctp

# Make it persistent across reboots
echo "sctp" | sudo tee /etc/modules-load.d/sctp.conf
```

## Install SCTP Development Tools

```bash
# Install the lksctp-tools package for utilities and libraries
sudo dnf install -y lksctp-tools lksctp-tools-devel

# Verify installation
sctp_test -h
```

## Test SCTP Connectivity

Use the `sctp_test` utility to verify SCTP works between two hosts:

On the server:

```bash
# Start an SCTP server listening on port 5000
sctp_test -H 192.168.1.10 -P 5000 -l
```

On the client:

```bash
# Connect to the SCTP server
sctp_test -H 192.168.1.20 -h 192.168.1.10 -p 5000 -s
```

## Configure Firewall for SCTP

```bash
# Allow SCTP traffic on a specific port
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" port port="5000" protocol="sctp" accept'
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-rich-rules
```

## SCTP Kernel Parameters

Tune SCTP behavior through sysctl:

```bash
# View current SCTP parameters
sysctl -a | grep sctp

# Set commonly tuned parameters
sudo sysctl -w net.sctp.rto_min=100
sudo sysctl -w net.sctp.rto_max=200
sudo sysctl -w net.sctp.max_init_retransmits=8

# Make persistent
cat << 'EOF' | sudo tee /etc/sysctl.d/sctp.conf
net.sctp.rto_min = 100
net.sctp.rto_max = 200
net.sctp.max_init_retransmits = 8
net.sctp.hb_interval = 5000
EOF

sudo sysctl -p /etc/sysctl.d/sctp.conf
```

## Write a Simple SCTP Application

A basic SCTP server in C using lksctp:

```c
/* sctp_server.c - compile with: gcc -o sctp_server sctp_server.c -lsctp */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/sctp.h>

int main() {
    int sock, client;
    struct sockaddr_in addr;
    char buffer[1024];

    /* Create an SCTP socket */
    sock = socket(AF_INET, SOCK_STREAM, IPPROTO_SCTP);

    addr.sin_family = AF_INET;
    addr.sin_port = htons(5000);
    addr.sin_addr.s_addr = INADDR_ANY;

    bind(sock, (struct sockaddr *)&addr, sizeof(addr));
    listen(sock, 5);

    printf("SCTP server listening on port 5000\n");
    client = accept(sock, NULL, NULL);
    sctp_recvmsg(client, buffer, sizeof(buffer), NULL, 0, NULL, 0);
    printf("Received: %s\n", buffer);

    close(client);
    close(sock);
    return 0;
}
```

## Verify SCTP Associations

```bash
# View active SCTP associations
cat /proc/net/sctp/assocs

# View SCTP endpoints
cat /proc/net/sctp/eps
```

SCTP on RHEL is ready to use once the kernel module is loaded and the appropriate firewall rules are in place.

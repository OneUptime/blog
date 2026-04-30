# How to Configure GRE over IPsec for Encrypted Tunneling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, GRE, IPsec, strongSwan, Tunnel, VPN, Encryption, Networking

Description: Combine GRE tunnels with IPsec transport mode to create encrypted GRE tunnels that provide both multi-protocol encapsulation and cryptographic security.

## Introduction

GRE tunnels carry traffic efficiently but provide no encryption. IPsec in transport mode can encrypt GRE traffic, combining GRE's protocol flexibility with IPsec's security. This is a common enterprise VPN pattern: GRE handles routing and encapsulation, IPsec provides authentication and encryption.

## Architecture

```text
Plaintext Layer:  [IP][GRE][Inner IP][Payload]
IPsec Transport:  [IP][ESP][GRE][Inner IP][Payload]
```

## Prerequisites

- StrongSwan with the current `swanctl` backend installed on both hosts (`apt install charon-systemd strongswan-swanctl`)
- GRE tunnel planned between hosts (10.0.0.1 and 10.0.0.2)

## Step 1: Configure IPsec (StrongSwan)

### /etc/swanctl/swanctl.conf on Host A

```text
connections {
    gre-ipsec {
        version = 2
        local_addrs = 10.0.0.1
        remote_addrs = 10.0.0.2
        proposals = aes256-sha256-modp2048

        local {
            auth = psk
            id = 10.0.0.1
        }
        remote {
            auth = psk
            id = 10.0.0.2
        }

        children {
            gre {
                mode = transport
                local_ts = dynamic[gre]
                remote_ts = dynamic[gre]
                esp_proposals = aes256-sha256
            }
        }
    }
}

secrets {
    ike-gre {
        id-a = 10.0.0.1
        id-b = 10.0.0.2
        secret = "your-strong-preshared-key-here"
    }
}
```

Apply the same configuration on Host B with the local/remote addresses and IDs swapped.

## Step 2: Start IPsec

```bash
# Start charon-systemd
systemctl start strongswan

# Load the connection and secret from /etc/swanctl/swanctl.conf
swanctl --load-all

# Initiate the GRE-protecting CHILD_SA from one host (for example, Host A)
swanctl --initiate --child gre

# Check status
swanctl --list-conns
swanctl --list-sas
```

## Step 3: Create the GRE Tunnel

After IPsec is established, create the GRE tunnel as normal:

```bash
# Host A
ip tunnel add ipsec0 mode gre local 10.0.0.1 remote 10.0.0.2 ttl 255
ip addr add 172.16.0.1/30 dev ipsec0
ip link set ipsec0 up

# Host B
ip tunnel add ipsec0 mode gre local 10.0.0.2 remote 10.0.0.1 ttl 255
ip addr add 172.16.0.2/30 dev ipsec0
ip link set ipsec0 up
```

## Step 4: Verify Encryption

```bash
# Generate tunnel traffic
ping -c 5 172.16.0.2

# Verify IPsec is encrypting GRE traffic
swanctl --list-sas

# Capture on the underlay interface - should see ESP packets (not plain GRE)
tcpdump -i <underlay-interface> esp -n
# Should show: ESP encrypted packets, not readable GRE content
```

## Add Routes Through the Encrypted Tunnel

```bash
# On both hosts, if routing traffic for other subnets, enable forwarding first
sysctl -w net.ipv4.ip_forward=1

# On Host A: route to Host B's LAN
ip route add 192.168.2.0/24 via 172.16.0.2

# On Host B: route to Host A's LAN
ip route add 192.168.1.0/24 via 172.16.0.1
```

## Conclusion

GRE over IPsec combines GRE's routing flexibility with IPsec's encryption. Use IPsec transport mode (`mode = transport` in the `CHILD_SA`) to encrypt only the GRE protocol traffic between the two hosts. The GRE tunnel is configured exactly as a normal unencrypted tunnel, but all GRE packets are automatically encrypted by the IPsec SA. This is a proven VPN architecture used in enterprise networks.

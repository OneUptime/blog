# How to Set Up IPsec Transport Mode Between Two Linux Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPsec, Transport Mode, Linux, strongSwan, Host-to-Host, Security

Description: Configure IPsec transport mode using strongSwan to encrypt traffic between two specific Linux hosts without the overhead of a full VPN tunnel.

IPsec transport mode encrypts the payload of IP packets between two hosts while preserving the original IP headers. This is ideal for host-to-host encryption where you don't need to connect entire subnets.

The examples below use strongSwan's legacy `ipsec.conf`/`ipsec.secrets` backend and the `ipsec` command, which current strongSwan documentation deprecates in favor of `swanctl.conf` and `swanctl`.

## Transport Mode vs. Tunnel Mode

```text
Tunnel Mode:  [New IP Header][ESP Header][Original IP Header + Payload]
Transport Mode: [Original IP Header][ESP Header][Payload]

Transport mode is lighter and used for:
- Host-to-host encryption
- Protecting specific connections (e.g., database replication)
- Securing tunneling protocols like L2TP or GRE
```

## Configuration on Host A (10.0.0.1)

```conf
# /etc/ipsec.conf on Host A

config setup
    charondebug="ike 1, knl 1, esp 1"

conn host-to-host
    type=transport       # Transport mode (not tunnel)
    keyexchange=ikev2
    auto=start
    left=10.0.0.1       # This host's IP
    leftid=10.0.0.1
    leftauth=psk
    right=10.0.0.2      # Remote host IP
    rightid=10.0.0.2
    rightauth=psk
    ike=aes256-sha256-modp2048!
    esp=aes256-sha256!
    # Omitting leftsubnet/rightsubnet defaults the selectors to the host IPs
```

```conf
# /etc/ipsec.secrets on Host A

10.0.0.1 10.0.0.2 : PSK "SharedSecretForTransportMode"
```

## Configuration on Host B (10.0.0.2)

```conf
# /etc/ipsec.conf on Host B

conn host-to-host
    type=transport
    keyexchange=ikev2
    auto=start
    left=10.0.0.2
    leftid=10.0.0.2
    leftauth=psk
    right=10.0.0.1
    rightid=10.0.0.1
    rightauth=psk
    ike=aes256-sha256-modp2048!
    esp=aes256-sha256!
```

```conf
# /etc/ipsec.secrets on Host B
10.0.0.2 10.0.0.1 : PSK "SharedSecretForTransportMode"
```

## Start and Verify

```bash
# On both hosts
sudo ipsec restart

# If the connection does not come up automatically, initiate it manually from one host
sudo ipsec up host-to-host

# Check status
sudo ipsec status
# Expected: host-to-host{1}: INSTALLED, TRANSPORT mode

# Verify XFRM states (kernel crypto state)
sudo ip xfrm state list
# Shows: src 10.0.0.1 dst 10.0.0.2 proto esp ...

# Verify XFRM policies
sudo ip xfrm policy list
# Shows: src 10.0.0.1/32 dst 10.0.0.2/32 dir out ...
```

## Verifying Encryption is Active

```bash
# Capture traffic between the hosts - it should show ESP (not plaintext)
sudo tcpdump -i eth0 host 10.0.0.2 -n

# Expected: packets show as ESP protocol, not TCP/UDP directly
# 10.0.0.1 > 10.0.0.2: ESP(spi=0x1234, seq=0x1), length 100

# Test connectivity
ssh 10.0.0.2      # Connection should work normally
ping 10.0.0.2     # ICMP will be encrypted in transit
```

## Protecting Only Specific Traffic

To encrypt only database traffic between hosts:

```conf
conn db-transport
    type=transport
    keyexchange=ikev2
    auto=start
    left=10.0.0.1
    right=10.0.0.2
    # Restrict the traffic selectors to PostgreSQL on both hosts
    leftsubnet=10.0.0.1/32[tcp/5432]
    rightsubnet=10.0.0.2/32[tcp/5432]
    leftauth=psk
    rightauth=psk
```

Transport mode is commonly used for host-to-host protection and for securing specific protocols between endpoints, such as L2TP or GRE.

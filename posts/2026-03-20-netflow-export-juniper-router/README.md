# How to Configure NetFlow Export on a Juniper Router

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NetFlow, Juniper, Junos, Traffic Analysis, Flow Monitoring

Description: Learn how to configure active flow monitoring and NetFlow/IPFIX export on Juniper routers running Junos OS for network traffic visibility.

## Juniper Flow Monitoring Architecture

Juniper Junos uses a different configuration model from Cisco IOS. Flow templates are configured under `[edit services flow-monitoring]`, while sampling instances and the flow-server (collector) are configured under `[edit forwarding-options sampling]`. Juniper supports sampling-based flow export and inline active flow monitoring (Inline J-Flow).

## Step 1: Define the NetFlow v9 Template

Templates live under `services flow-monitoring` and define timeouts, refresh rates, and the record type (IPv4, IPv6, or MPLS):

```bash
# Junos configuration hierarchy

set services flow-monitoring version9 template IPV4_TEMPLATE flow-active-timeout 60
set services flow-monitoring version9 template IPV4_TEMPLATE flow-inactive-timeout 30
set services flow-monitoring version9 template IPV4_TEMPLATE template-refresh-rate packets 1000
set services flow-monitoring version9 template IPV4_TEMPLATE option-refresh-rate packets 1000
set services flow-monitoring version9 template IPV4_TEMPLATE ipv4-template
```

## Step 2: Configure the Sampling Instance and Flow Server

The collector destination is configured inside the sampling instance via `output flow-server`. There is no separate `flow-export-destination` stanza in Junos:

```text
# Configure 1-in-1000 packet sampling
set forwarding-options sampling instance NETFLOW_SAMPLE input rate 1000
set forwarding-options sampling instance NETFLOW_SAMPLE input run-length 0

# Define the collector and bind the v9 template
set forwarding-options sampling instance NETFLOW_SAMPLE family inet output flow-server 192.168.1.200 port 2055
set forwarding-options sampling instance NETFLOW_SAMPLE family inet output flow-server 192.168.1.200 version9 template IPV4_TEMPLATE

# Inline J-Flow source address (used for export packets)
set forwarding-options sampling instance NETFLOW_SAMPLE family inet output inline-jflow source-address 10.0.0.1
```

On platforms that use Inline J-Flow (MX, EX9200, etc.), bind the sampling instance to the FPC and reserve flow-table memory:

```text
set chassis fpc 0 sampling-instance NETFLOW_SAMPLE
set chassis fpc 0 inline-services flow-table-size ipv4-flow-table-size 7
```

## Step 3: Apply Sampling to Interfaces

```text
# Apply to the WAN interface (ingress and egress)
set interfaces ge-0/0/0 unit 0 family inet sampling input
set interfaces ge-0/0/0 unit 0 family inet sampling output

# Apply to LAN interface
set interfaces ge-0/0/1 unit 0 family inet sampling input
```

## Step 4: Alternative - Selective Sampling Using a Firewall Filter

To restrict which traffic is fed into the sampling instance, use a firewall filter with the `sample` action. The configured sampling rate still applies; the filter just controls which packets are eligible:

```bash
# Match selected protocols and mark them for sampling
set firewall family inet filter NETFLOW_EXPORT term all-traffic from protocol [ tcp udp icmp ]
set firewall family inet filter NETFLOW_EXPORT term all-traffic then sample
set firewall family inet filter NETFLOW_EXPORT term all-traffic then accept

set firewall family inet filter NETFLOW_EXPORT term default then accept

# Apply to interface
set interfaces ge-0/0/0 unit 0 family inet filter input NETFLOW_EXPORT
set interfaces ge-0/0/0 unit 0 family inet filter output NETFLOW_EXPORT
```

## Step 5: Configure IPFIX Export

To export using IPFIX (NetFlow v10) format, define a `version-ipfix` template and reference it from the sampling instance flow-server:

```text
# Define an IPFIX template
set services flow-monitoring version-ipfix template IPV4_IPFIX flow-active-timeout 60
set services flow-monitoring version-ipfix template IPV4_IPFIX flow-inactive-timeout 30
set services flow-monitoring version-ipfix template IPV4_IPFIX template-refresh-rate packets 1000
set services flow-monitoring version-ipfix template IPV4_IPFIX ipv4-template

# Point the sampling instance at an IPFIX collector
set forwarding-options sampling instance NETFLOW_SAMPLE family inet output flow-server 192.168.1.200 port 4739
set forwarding-options sampling instance NETFLOW_SAMPLE family inet output flow-server 192.168.1.200 version-ipfix template IPV4_IPFIX
```

## Step 6: Verify Flow Export

```bash
# Show inline J-Flow status and statistics for the FPC
show services accounting status inline-jflow fpc-slot 0
show services accounting flow inline-jflow fpc-slot 0
show services accounting errors inline-jflow fpc-slot 0

# Show the configured sampling instance
show forwarding-options sampling instance NETFLOW_SAMPLE

# Verify on the collector side
sudo tcpdump -i any udp port 2055 -n -c 5
```

## Step 7: View Configuration as Full Hierarchy

```text
# Show complete flow monitoring configuration
show configuration forwarding-options sampling
show configuration services flow-monitoring
```

## Juniper vs Cisco NetFlow Configuration Comparison

| Aspect | Cisco IOS | Juniper Junos |
|---|---|---|
| Enable on interface | `ip flow ingress` | `family inet sampling input` |
| Export destination | `ip flow-export destination X` | `forwarding-options sampling instance ... output flow-server` |
| Version | `ip flow-export version 9` | `version9` / `version-ipfix` template |
| Sampling rate | `ip flow-sampler-map` | `sampling instance ... input rate 1000` |

## Conclusion

NetFlow export on Juniper Junos uses the `services flow-monitoring` hierarchy for templates and the `forwarding-options sampling` hierarchy for the sampling instance and collector. Define the v9 or IPFIX template, configure the sampling instance with `output flow-server`, then apply sampling to interfaces using `family inet sampling input/output`. Verify inline J-Flow operation with `show services accounting status inline-jflow fpc-slot <n>` and confirm the collector is receiving data.

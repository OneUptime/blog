# How to Set Up IPFIX Export on Network Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPFIX, NetFlow, Traffic Analysis, Cisco IOS, Open Standards, Flow Monitoring

Description: Learn how to configure IPFIX (IP Flow Information Export) on network devices as a standards-based alternative to NetFlow v9, and how to collect and analyze the exported data.

## What Is IPFIX?

IPFIX (RFC 7011) is the IETF standard for IP flow export, based on NetFlow v9's template architecture. While NetFlow v9 is Cisco-proprietary, IPFIX is vendor-neutral and supported by Juniper, Palo Alto, F5, Open vSwitch, and others alongside Cisco.

Common distinctions from typical NetFlow v9 deployments:
- IANA-assigned information element IDs (standardized field definitions)
- IANA-assigned service port 4739 for IPFIX export
- Enterprise-specific extensions possible
- Broader vendor support

## Step 1: Configure IPFIX on Cisco IOS XE

On Cisco IOS XE (ASR, ISR 4K, Catalyst 9K), configure IPFIX via Flexible NetFlow:

```text
! Create a flow record with IPFIX-compatible fields
flow record IPFIX_RECORD
 match ipv4 source address
 match ipv4 destination address
 match transport source-port
 match transport destination-port
 match ip protocol
 match interface input
 collect counter bytes long
 collect counter packets long
 collect timestamp absolute first
 collect timestamp absolute last
 collect transport tcp flags
 collect routing source as
 collect routing destination as

! Create exporter with IPFIX protocol
flow exporter IPFIX_EXPORTER
 destination 192.168.1.200
 transport udp 4739               ! IANA-assigned IPFIX port
 export-protocol ipfix            ! Use IPFIX instead of NetFlow v9
 source Loopback0
 template data timeout 300
 option exporter-stats timeout 300

! Create and apply monitor
flow monitor IPFIX_MONITOR
 record IPFIX_RECORD
 exporter IPFIX_EXPORTER
 cache timeout active 60
 cache timeout inactive 30

! Apply to interfaces
interface GigabitEthernet0/0
 ip flow monitor IPFIX_MONITOR input
 ip flow monitor IPFIX_MONITOR output
```

## Step 2: Configure IPFIX on Juniper Junos

```text
# Junos inline active flow monitoring example (MX/vMX/T/EX/NFX/SRX)

set services flow-monitoring version-ipfix template IPV4_TEMPLATE flow-active-timeout 60
set services flow-monitoring version-ipfix template IPV4_TEMPLATE flow-inactive-timeout 60
set services flow-monitoring version-ipfix template IPV4_TEMPLATE template-refresh-rate packets 1000
set services flow-monitoring version-ipfix template IPV4_TEMPLATE template-refresh-rate seconds 30
set services flow-monitoring version-ipfix template IPV4_TEMPLATE option-refresh-rate packets 500
set services flow-monitoring version-ipfix template IPV4_TEMPLATE option-refresh-rate seconds 60
set services flow-monitoring version-ipfix template IPV4_TEMPLATE ipv4-template

set chassis fpc 0 sampling-instance IPFIX
set forwarding-options sampling instance IPFIX input rate 1
set forwarding-options sampling instance IPFIX input run-length 0
set forwarding-options sampling instance IPFIX family inet output flow-server 192.168.1.200 port 4739
set forwarding-options sampling instance IPFIX family inet output flow-server 192.168.1.200 version-ipfix template IPV4_TEMPLATE
set forwarding-options sampling instance IPFIX family inet output inline-jflow source-address 192.168.1.1
set forwarding-options sampling instance IPFIX family inet output inline-jflow flow-export-rate 2

set interfaces ge-0/0/0 unit 0 family inet sampling input
set interfaces ge-0/0/0 unit 0 family inet sampling output
```

## Step 3: Configure IPFIX on Open vSwitch (Linux)

```bash
# Enable IPFIX export on OVS bridge
ovs-vsctl set bridge br0 ipfix=@ipfix \
  -- --id=@ipfix create ipfix \
  targets="192.168.1.200:4739" \
  sampling=64 \
  obs_domain_id=1 \
  obs_point_id=1 \
  cache_max_flows=10000 \
  cache_active_timeout=60

# Verify IPFIX configuration
ovs-vsctl list ipfix
```

## Step 4: Set Up an IPFIX Collector (GoFlow2)

GoFlow2 is a modern open-source flow collector supporting IPFIX, NetFlow, and sFlow:

```bash
# Run GoFlow2 and listen for IPFIX/NetFlow on UDP 4739
docker run -d \
  --name goflow2 \
  -p 4739:4739/udp \
  -v "$(pwd)/goflow2-data:/data" \
  netsampler/goflow2:latest \
  -listen 'netflow://:4739' \
  -transport.file /data/flows.log

# Or with Kafka output
docker run -d \
  --name goflow2 \
  -p 4739:4739/udp \
  netsampler/goflow2:latest \
  -listen 'netflow://:4739' \
  -transport=kafka \
  -transport.kafka.brokers=kafka:9092 \
  -transport.kafka.topic=network-flows \
  -format=bin
```

## Step 5: Collect IPFIX with nfdump

nfdump supports IPFIX in addition to NetFlow v5/v9:

```bash
# Start nfcapd listener for IPFIX on port 4739
sudo nfcapd -w /var/log/ipfix -D -p 4739 -b 0.0.0.0

# Analyze captured IPFIX data
nfdump -r /var/log/ipfix -s srcip/bytes -n 10

# Show top flows in the last hour
nfdump -r /var/log/ipfix \
  -t "$(date -d '1 hour ago' +%Y/%m/%d.%H:%M:%S)-$(date +%Y/%m/%d.%H:%M:%S)" \
  -s proto/bytes -n 5
```

## Step 6: Verify IPFIX Export

```text
! Cisco IOS - verify export is working
Router# show flow exporter name IPFIX_EXPORTER statistics

! Check packets sent
! Successfully sent: 5000 (growing number indicates success)

! Test collector is receiving on port 4739
# On the collector:
sudo tcpdump -i any udp port 4739 -n -c 10
```

## Conclusion

IPFIX is the vendor-neutral standard for flow export, based on NetFlow v9's template architecture. On Cisco IOS XE, configure it by specifying `export-protocol ipfix` in the flow exporter. Port 4739 is the IANA-assigned IPFIX port, although many collectors can also be configured to receive IPFIX on other ports such as 2055. IPFIX works with standards-compliant collectors including nfdump, GoFlow2, and ElastiFlow.

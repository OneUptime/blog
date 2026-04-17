# How to Write Suricata Rules for IPv6 Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Suricata, IPv6, IDS Rules, Network Security, Intrusion Detection, PCRE

Description: Write effective Suricata detection rules targeting IPv6 traffic, covering rule syntax, IPv6-specific keywords, address matching, and extension header detection.

---

Writing Suricata rules for IPv6 traffic requires understanding IPv6-specific protocol elements including extension headers, ICMPv6 types, and address notation. Suricata's rule language handles IPv6 natively with dedicated keywords.

## Suricata Rule Syntax for IPv6

```text
# Basic rule structure

action proto src_ip src_port direction dst_ip dst_port (options)

# IPv6-specific example
alert ipv6 2001:db8::/32 any -> any any \
  (msg:"IPv6 traffic from documentation range"; sid:100; rev:1;)

# Use $HOME_NET variable (defined in suricata.yaml)
alert tcp $HOME_NET any -> $EXTERNAL_NET 80 \
  (msg:"HTTP from IPv6 home network"; sid:101; rev:1;)

# IPv6 with specific port
alert udp any any -> 2001:4860:4860::8888 53 \
  (msg:"DNS to Google IPv6"; sid:102; rev:1;)
```

## Detecting IPv6 Extension Headers

```text
# Detect unknown options in Hop-by-Hop header (often used for attacks)
alert ipv6 $EXTERNAL_NET any -> $HOME_NET any \
  (msg:"IPv6 Hop-by-Hop Unknown Option from External"; \
   decode-event:ipv6.hopopts_unknown_opt; \
   sid:200; rev:1;)

# Detect routing header type 0 (deprecated, security risk - RFC 5095)
alert ipv6 any any -> $HOME_NET any \
  (msg:"IPv6 Routing Header Type 0 - Security Risk"; \
   decode-event:ipv6.rh_type_0; \
   sid:201; rev:1;)

# Detect overlapping IPv6 fragments (fragmentation attack)
alert ipv6 $EXTERNAL_NET any -> $HOME_NET any \
  (msg:"IPv6 Fragmentation Overlap from External"; \
   decode-event:ipv6.frag_overlap; \
   sid:202; rev:1;)
```

## ICMPv6 Detection Rules

```text
# Detect ICMPv6 type and code
# Type 133 = Router Solicitation
# Type 134 = Router Advertisement
# Type 135 = Neighbor Solicitation
# Type 136 = Neighbor Advertisement
# Type 137 = Redirect

# Detect rogue Router Advertisements
alert icmpv6 $EXTERNAL_NET any -> $HOME_NET any \
  (msg:"Rogue Router Advertisement from External Network"; \
   itype:134; \
   sid:300; rev:1;)

# Detect ICMPv6 echo flood
alert icmpv6 any any -> $HOME_NET any \
  (msg:"ICMPv6 Echo Request Flood"; \
   itype:128; \
   threshold:type threshold,track by_src,count 50,seconds 5; \
   sid:301; rev:1;)

# Detect Neighbor Discovery scanning
alert icmpv6 any any -> $HOME_NET any \
  (msg:"IPv6 Neighbor Discovery Scan"; \
   itype:135; \
   threshold:type threshold,track by_src,count 30,seconds 10; \
   sid:302; rev:1;)
```

## Application Protocol Rules over IPv6

```yaml
# Detect SQL injection over IPv6
alert http any any -> $HTTP_SERVERS $HTTP_PORTS \
  (msg:"SQL Injection Attempt over IPv6"; \
   flow:to_server,established; \
   content:"UNION"; nocase; \
   content:"SELECT"; nocase; within:20; \
   metadata:tag ipv6-webapp; \
   sid:400; rev:1;)

# Detect SSH brute force from IPv6
alert tcp any any -> $HOME_NET 22 \
  (msg:"SSH Brute Force from IPv6"; \
   flags:S; \
   threshold:type threshold,track by_src,count 10,seconds 60; \
   sid:401; rev:1;)

# Detect HTTPS to known malicious IPv6 range
alert tls any any -> [2001:db8:bad::/48] any \
  (msg:"TLS Connection to Suspicious IPv6 Range"; \
   flow:to_server,established; \
   sid:402; rev:1;)
```

## Testing and Validating Rules

```bash
# Validate rule syntax
suricata -T -c /etc/suricata/suricata.yaml \
  -S /etc/suricata/rules/local.rules

# Test rule against a PCAP file
suricata -c /etc/suricata/suricata.yaml \
  -r /path/to/ipv6-capture.pcap \
  -S /etc/suricata/rules/local.rules \
  -l /tmp/test-output/

# Check for alerts
cat /tmp/test-output/fast.log

# Generate test IPv6 traffic
ping6 -c 10 2001:db8::target
```

## Managing Rules with suricata-update

```bash
# Update all rulesets (includes IPv6 rules)
sudo suricata-update

# Enable specific ruleset with IPv6 rules
sudo suricata-update enable-source et/open
sudo suricata-update enable-source ptresearch/attackdetection

# Reload rules without restart
sudo kill -USR2 $(cat /var/run/suricata.pid)
```

Writing effective Suricata IPv6 rules requires knowing the protocol-specific keywords like `decode-event` for IPv6 anomalies and `itype` for ICMPv6, with threshold-based rules being particularly useful for detecting IPv6 scanning and flooding attacks that differ from their IPv4 counterparts.

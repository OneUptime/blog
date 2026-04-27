# How to Configure OSSEC for IPv6 Log Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSSEC, IPv6, Log Analysis, HIDS, Security Monitoring, Linux

Description: Configure OSSEC host-based intrusion detection system to analyze and alert on IPv6-related events in system logs, including custom decoders and rules for IPv6 addresses.

---

OSSEC is a host-based intrusion detection system (HIDS) that analyzes log files. Configuring it for IPv6 requires updating decoders and rules to recognize IPv6 address formats in log entries.

## Installing OSSEC

```bash
# Download and install OSSEC

wget https://github.com/ossec/ossec-hids/archive/refs/tags/3.7.0.tar.gz
tar xf 3.7.0.tar.gz
cd ossec-hids-3.7.0
sudo ./install.sh

# Choose installation type: server, agent, or local
# Follow prompts, enable email alerts

# Start OSSEC
sudo /var/ossec/bin/ossec-control start

# Check status
sudo /var/ossec/bin/ossec-control status
```

## Configuring OSSEC for IPv6 Log Monitoring

```xml
<!-- /var/ossec/etc/ossec.conf -->

<ossec_config>
  <!-- Log analysis targets -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/syslog</location>
  </localfile>

  <localfile>
    <log_format>apache</log_format>
    <location>/var/log/apache2/access.log</location>
  </localfile>

  <localfile>
    <log_format>nginx</log_format>
    <location>/var/log/nginx/access.log</location>
  </localfile>

  <!-- Custom log with IPv6 source IPs -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/auth.log</location>
  </localfile>

  <!-- IPv6 firewall logs -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/kern.log</location>
  </localfile>
</ossec_config>
```

## Custom IPv6 Decoder

```xml
<!-- /var/ossec/etc/decoders/ipv6_decoder.xml -->

<!-- Decoder for IPv6 SSH login attempts -->
<decoder name="ssh-ipv6">
  <parent>sshd</parent>
  <prematch>Failed password for </prematch>
  <regex>Failed password for (\S+) from ([0-9a-fA-F:]+) port</regex>
  <order>user, srcip</order>
</decoder>

<!-- Decoder for nginx IPv6 access -->
<decoder name="nginx-ipv6-access">
  <program_name>nginx</program_name>
  <regex>([0-9a-fA-F:]+) - (\S+) \[</regex>
  <order>srcip, user</order>
</decoder>

<!-- Decoder for ip6tables log entries -->
<decoder name="ip6tables">
  <prematch>ip6tables\p</prematch>
  <regex>SRC=([0-9a-fA-F:]+) DST=([0-9a-fA-F:]+) </regex>
  <order>srcip, dstip</order>
</decoder>
```

## Custom IPv6 Detection Rules

```xml
<!-- /var/ossec/etc/rules/local_rules.xml -->

<group name="local,syslog,">

  <!-- Alert on SSH brute force from IPv6 -->
  <rule id="100001" level="10" frequency="5" timeframe="120">
    <if_matched_sid>5716</if_matched_sid>
    <description>SSH brute force attack from IPv6 address.</description>
    <group>authentication_failures,</group>
  </rule>

  <!-- Alert on new IPv6 connection to server -->
  <rule id="100002" level="5">
    <if_sid>5501</if_sid>
    <match>from [0-9a-fA-F:]+:[0-9a-fA-F:]</match>
    <description>SSH login from IPv6 address.</description>
    <group>authentication_success,</group>
  </rule>

  <!-- ip6tables BLOCK alert -->
  <rule id="100003" level="7">
    <decoded_as>ip6tables</decoded_as>
    <match>BLOCK</match>
    <description>ip6tables blocked IPv6 traffic.</description>
    <group>firewall,</group>
  </rule>

</group>
```

## Active Response for IPv6 Threats

```xml
<!-- /var/ossec/etc/ossec.conf - Active Response -->

<active-response>
  <command>firewall-drop</command>
  <location>local</location>
  <rules_id>100001</rules_id>
  <timeout>3600</timeout>
</active-response>

<!-- Custom IPv6 block command -->
<!-- /var/ossec/active-response/bin/ip6tables-block.sh -->
```

```bash
#!/bin/bash
# /var/ossec/active-response/bin/ip6tables-block.sh
ACTION=$1
IP=$2

if [ "$ACTION" = "add" ]; then
  sudo ip6tables -I INPUT -s "$IP" -j DROP
elif [ "$ACTION" = "delete" ]; then
  sudo ip6tables -D INPUT -s "$IP" -j DROP
fi
```

## Viewing OSSEC IPv6 Alerts

```bash
# View recent alerts
sudo cat /var/ossec/logs/alerts/alerts.log | grep -i "ipv6\|2001:\|fd00:"

# Check active block list
sudo cat /var/ossec/active-response/active-responses.log

# Test rule matching
sudo /var/ossec/bin/ossec-logtest

# Monitor in real time
sudo tail -f /var/ossec/logs/alerts/alerts.log
```

OSSEC's decoder and rule framework can be extended with custom XML patterns to recognize IPv6 address formats in log files, enabling the same intrusion detection capabilities for IPv6-originating threats as for traditional IPv4 attacks.

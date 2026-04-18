# How to Configure Wazuh for IPv6 Security Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wazuh, IPv6, Security Monitoring, SIEM, HIDS, XDR, Linux

Description: Configure Wazuh security platform to monitor IPv6 network activity, analyze IPv6-related events, and create detection rules for IPv6 threats and anomalies.

---

Wazuh is an open-source security platform combining SIEM, HIDS, and XDR capabilities. It supports IPv6 for agent-manager communication and can analyze logs containing IPv6 addresses with custom decoders and rules.

## Installing Wazuh Manager

```bash
# Install Wazuh repository

curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | \
  gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg \
  --import

echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] \
  https://packages.wazuh.com/4.x/apt/ stable main" | \
  sudo tee /etc/apt/sources.list.d/wazuh.list

sudo apt update && sudo apt install wazuh-manager -y
sudo systemctl enable --now wazuh-manager
```

## Configuring Wazuh Manager for IPv6

```xml
<!-- /var/ossec/etc/ossec.conf -->

<ossec_config>
  <global>
    <!-- Manager can bind to IPv6 -->
    <jsonout_output>yes</jsonout_output>
    <alerts_log>yes</alerts_log>
    <logall>no</logall>
    <logall_json>no</logall_json>
    <email_notification>no</email_notification>
  </global>

  <!-- Listen on IPv6 for agent connections -->
  <remote>
    <connection>secure</connection>
    <port>1514</port>
    <protocol>tcp</protocol>
    <ipv6>yes</ipv6>
  </remote>

  <!-- Syslog collection over IPv6 -->
  <remote>
    <connection>syslog</connection>
    <port>514</port>
    <protocol>udp</protocol>
    <ipv6>yes</ipv6>
    <allowed-ips>2001:db8::/32</allowed-ips>
  </remote>
</ossec_config>
```

## Connecting Wazuh Agents over IPv6

```bash
# On the agent, configure manager address
# /var/ossec/etc/ossec.conf (agent)
# <client>
#   <server>
#     <address>2001:db8::10</address>
#     <port>1514</port>
#     <protocol>tcp</protocol>
#   </server>
# </client>

# Register agent to manager
sudo /var/ossec/bin/agent-auth \
  -m 2001:db8::10 \
  -A "agent-hostname"

# Start agent
sudo systemctl start wazuh-agent
```

## Custom IPv6 Decoders for Wazuh

```xml
<!-- /var/ossec/etc/decoders/0080-ipv6_decoders.xml -->

<!-- Decode nginx access logs with IPv6 addresses -->
<decoder name="nginx-ipv6">
  <parent>nginx</parent>
  <regex>^([0-9a-fA-F:]{3,39}) - (\S+) \[(\d+/\w+/\d{4}:\d+:\d+:\d+ [+-]\d{4})\]</regex>
  <order>srcip, user, timestamp</order>
</decoder>

<!-- Decode ip6tables dropped packets -->
<decoder name="ip6tables-drop">
  <prematch>kernel: \[</prematch>
  <regex>ip6tables.*SRC=(\S+) DST=(\S+) .* DPT=(\d+)</regex>
  <order>srcip, dstip, dstport</order>
</decoder>

<!-- Decode SSH auth from IPv6 -->
<decoder name="sshd-ipv6-auth">
  <parent>sshd</parent>
  <regex>from ([0-9a-fA-F:]+) port (\d+) ssh</regex>
  <order>srcip, srcport</order>
</decoder>
```

## Custom Wazuh Rules for IPv6

```xml
<!-- /var/ossec/etc/rules/0400-local_ipv6_rules.xml -->

<!-- Detect IPv6 SSH brute force -->
<rule id="100100" level="10" frequency="8" timeframe="120">
  <if_matched_sid>5760</if_matched_sid>
  <same_source_ip />
  <description>SSH brute force from IPv6 address.</description>
  <mitre>
    <id>T1110</id>
  </mitre>
  <group>authentication_failures,pci_dss_11.4,</group>
</rule>

<!-- Alert on connections from specific IPv6 ranges -->
<rule id="100101" level="8">
  <if_sid>5501</if_sid>
  <srcip>2001:db8:bad::/48</srcip>
  <description>SSH connection from known malicious IPv6 range.</description>
  <group>authentication_success,</group>
</rule>

<!-- Detect ip6tables blocks -->
<rule id="100102" level="5">
  <decoded_as>ip6tables-drop</decoded_as>
  <description>ip6tables dropped IPv6 packet.</description>
  <group>firewall,</group>
</rule>
```

## Viewing IPv6 Security Events in Wazuh Dashboard

```bash
# Search for IPv6 events in CLI
sudo cat /var/ossec/logs/alerts/alerts.json | \
  python3 -c "
import sys, json
for line in sys.stdin:
    try:
        e = json.loads(line)
        ip = e.get('data', {}).get('srcip', '')
        if ':' in ip:
            print(json.dumps(e, indent=2))
    except: pass
" | head -100

# Monitor active threats
sudo /var/ossec/bin/manage_agents -l

# Verify shared agent.conf syntax
sudo /var/ossec/bin/verify-agent-conf
```

Wazuh's extensible decoder and rule system supports IPv6 address patterns in log analysis, with the manager able to accept agent connections over IPv6 for unified security monitoring across both IPv4 and IPv6 network segments.

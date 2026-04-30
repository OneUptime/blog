# How to Configure FreeSWITCH with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FreeSWITCH, IPv6, PBX, VoIP, SIP, Telephony, Linux

Description: Configure FreeSWITCH telephony platform to accept SIP connections over IPv6, including SIP profile IPv6 binding, media transport configuration, and firewall setup.

---

FreeSWITCH is a scalable open-source PBX/VoIP platform. Enabling IPv6 support requires configuring SIP profiles to bind to IPv6 addresses and ensuring the media (RTP) subsystem uses IPv6 for media streams. If you need to change the RTP port range, configure `rtp-start-port` and `rtp-end-port` in `autoload_configs/switch.conf.xml` rather than in the SIP profile.

## FreeSWITCH SIP Profile for IPv6

```xml
<!-- /etc/freeswitch/sip_profiles/internal-ipv6.xml -->

<profile name="internal-ipv6">
  <aliases></aliases>

  <gateways>
  </gateways>

  <domains>
    <domain name="all" alias="true" parse="false"/>
  </domains>

  <settings>
    <!-- Bind to the server's IPv6 address -->
    <param name="sip-ip" value="$${local_ip_v6}"/>
    <param name="sip-port" value="5060"/>

    <!-- RTP settings -->
    <param name="rtp-ip" value="$${local_ip_v6}"/>

    <param name="force-register-domain" value="$${domain}"/>

    <!-- SIP options -->
    <param name="apply-inbound-acl" value="ipv6-internal"/>
    <param name="user-agent-string" value="FreeSWITCH-IPv6"/>
  </settings>
</profile>
```

## Dual-Stack FreeSWITCH Profile

```xml
<!-- Configure both IPv4 and IPv6 profiles -->

<!-- IPv4 profile: /etc/freeswitch/sip_profiles/internal.xml -->
<param name="sip-ip" value="$${local_ip_v4}"/>
<param name="rtp-ip" value="$${local_ip_v4}"/>

<!-- IPv6 profile: /etc/freeswitch/sip_profiles/internal-ipv6.xml -->
<param name="sip-ip" value="$${local_ip_v6}"/>
<param name="rtp-ip" value="$${local_ip_v6}"/>
```

## FreeSWITCH vars.xml for IPv6

```xml
<!-- /etc/freeswitch/vars.xml -->

<!-- If the host has multiple IPv6 addresses, pin the one FreeSWITCH should use -->
<X-PRE-PROCESS cmd="set" data="force_local_ip_v6=2001:db8::10"/>
<X-PRE-PROCESS cmd="set" data="local_ip_v6=$${force_local_ip_v6}"/>

<!-- Use in profiles -->
<!-- <param name="sip-ip" value="$${local_ip_v6}"/> -->
```

## Dialplan for IPv6 Routing

```xml
<!-- /etc/freeswitch/dialplan/default.xml -->

<extension name="route-to-ipv6-gateway">
  <condition field="destination_number" expression="^(\d+)$">
    <action application="bridge"
      data="sofia/internal-ipv6/$1@[2001:db8::20]"/>
  </condition>
</extension>

<extension name="receive-ipv6-calls">
  <condition field="${sip_received_ip}" expression="^2001:db8:">
    <action application="answer"/>
    <action application="bridge" data="user/1001@$${domain}"/>
  </condition>
</extension>
```

## ACL Configuration for IPv6

```xml
<!-- /etc/freeswitch/autoload_configs/acl.conf.xml -->

<configuration name="acl.conf" description="Network Lists">
  <network-lists>

    <!-- Allow IPv6 internal network -->
    <list name="ipv6-internal" default="deny">
      <node type="allow" cidr="2001:db8:100::/48"/>
      <node type="allow" cidr="::1/128"/>
    </list>

    <!-- Trusted SIP IPv6 peers -->
    <list name="ipv6-trusted-peers" default="deny">
      <node type="allow" cidr="2001:db8::20/128"/>
      <node type="allow" cidr="2001:db8:200::/48"/>
    </list>

  </network-lists>
</configuration>
```

## Firewall Rules for FreeSWITCH IPv6

```bash
# SIP over IPv6

sudo ip6tables -A INPUT -p udp --dport 5060 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 5060 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 5061 -j ACCEPT  # SIP TLS

# RTP media range (match autoload_configs/switch.conf.xml if you change it)
sudo ip6tables -A INPUT -p udp --dport 16384:32768 -j ACCEPT

# FreeSWITCH Event Socket on localhost
sudo ip6tables -A INPUT -p tcp -s ::1 --dport 8021 -j ACCEPT

# Save persistently on Debian/Ubuntu systems using iptables-persistent
sudo ip6tables-save > /etc/ip6tables/rules.v6
```

## Testing FreeSWITCH IPv6

```bash
# Verify SIP profile is listening on IPv6
fs_cli -x "sofia status"

# Check IPv6 profile status
fs_cli -x "sofia status profile internal-ipv6"

# Check registrations from IPv6 clients
fs_cli -x "sofia status profile internal-ipv6 reg"

# Monitor SIP over IPv6
fs_cli -x "sofia global siptrace on"
sudo tail -f /var/log/freeswitch/freeswitch.log | grep "2001:"

# Test call from IPv6 endpoint
fs_cli -x "originate sofia/internal-ipv6/1001@[2001:db8::30] &echo()"
```

FreeSWITCH's IPv6 support is typically configured by binding `sip-ip` and `rtp-ip` to `$${local_ip_v6}`. In FreeSWITCH's shipped IPv6 profile, `ext-sip-ip` and `ext-rtp-ip` are normally left unset, because the profile is expected to advertise a directly routable IPv6 address rather than rely on IPv4-style NAT traversal.

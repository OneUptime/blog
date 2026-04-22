# How to Configure SIP over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SIP, IPv6, VoIP, Telephony, SIP Proxy, Networking

Description: Configure Session Initiation Protocol (SIP) to work over IPv6 networks, covering SIP registration, invite messaging, and the important differences in SIP over IPv4 vs IPv6.

---

SIP (Session Initiation Protocol) requires specific configuration for IPv6 because SIP messages contain IP addresses in headers and SDP bodies. IPv6 literals in SIP URIs and Via sent-by values must be enclosed in brackets as defined by RFC 3261 and illustrated by RFC 5118.

## SIP IPv6 Address Notation

```text
RFC 3261 / RFC 5118 SIP IPv6 Address Notation:
- IPv6 literals in SIP URIs and Via sent-by values MUST use brackets: [2001:db8::1]
- SIP URI format: sip:user@[2001:db8::1]:5060

Example SIP REGISTER over IPv6:
REGISTER sip:example.com SIP/2.0
Via: SIP/2.0/UDP [2001:db8::20]:5060;branch=z9hG4bK776asdhds
Max-Forwards: 70
To: sip:user@example.com
From: sip:user@example.com;tag=1928301774
Call-ID: a84b4c76e66710@client.example.com
CSeq: 314159 REGISTER
Contact: <sip:user@[2001:db8::20]:5060>
Content-Length: 0
```

## Testing SIP over IPv6 with netcat

```bash
# Install OpenBSD netcat

sudo apt install netcat-openbsd -y

# Send OPTIONS to SIP server over IPv6 from a specific local IPv6 address
printf '%s\r\n' \
  'OPTIONS sip:[2001:db8::10] SIP/2.0' \
  'Via: SIP/2.0/UDP [2001:db8::20]:5060;branch=z9hG4bK776asdhds' \
  'Max-Forwards: 70' \
  'To: <sip:[2001:db8::10]>' \
  'From: <sip:test@[2001:db8::20]>;tag=1928301774' \
  'Call-ID: options-1@example.com' \
  'CSeq: 1 OPTIONS' \
  'Contact: <sip:test@[2001:db8::20]:5060>' \
  'Content-Length: 0' \
  '' | nc -6 -u -s 2001:db8::20 -p 5060 -w 5 2001:db8::10 5060
```

## SIP Proxy Configuration for IPv6

```bash
# OpenSIPS dual-stack configuration
# /etc/opensips/opensips.cfg

# Listen on both IPv4 and IPv6
socket=udp:0.0.0.0:5060
socket=udp:[::]:5060
socket=tcp:0.0.0.0:5060
socket=tcp:[::]:5060
socket=tls:0.0.0.0:5061
socket=tls:[::]:5061

# Route SIP over IPv6
route {
    if (is_method("REGISTER")) {
        save("location");
        exit;
    }

    # NAT helpers are optional; IPv6 transport alone does not require Contact rewriting.
    if (nat_uac_test("diff-ip-src-contact,diff-port-src-contact")) {
        fix_nated_contact();
    }
}
```

## SIP SDP with IPv6 Addresses

```text
SDP in SIP INVITE body must specify IPv6:

v=0
o=- 123456789 123456789 IN IP6 2001:db8::20
s=IPv6 SIP Call
c=IN IP6 2001:db8::20
t=0 0
m=audio 10000 RTP/AVP 0 8 101
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:101 telephone-event/8000
a=fmtp:101 0-15

Key changes from IPv4:
- "IN IP6" instead of "IN IP4" in o= and c= lines
- IPv6 address NOT in brackets in SDP (unlike SIP URIs and Via sent-by values)
```

## Firewall Rules for SIP over IPv6

```bash
# Allow SIP signaling over IPv6
sudo ip6tables -A INPUT -p udp --dport 5060 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 5060 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 5061 -j ACCEPT  # TLS

# Allow RTP media range
sudo ip6tables -A INPUT -p udp --dport 10000:20000 -j ACCEPT

sudo ip6tables-save -f /etc/ip6tables/rules.v6
```

## Testing SIP Registration and Calls

```bash
# Use linphone-cli for testing
sudo apt install linphone-cli -y

linphonecsh init
linphonecsh register --username 1001 \
  --password pass \
  --host "[2001:db8::10]"

# Check registration status
linphonecsh status register

# Make test call over IPv6
linphonecsh dial "sip:1002@[2001:db8::10]"
```

SIP over IPv6 requires careful attention to bracket notation in SIP URIs and Via sent-by values while SDP connection fields use IPv6 addresses without brackets, with NAT traversal often becoming simpler because end-to-end IPv6 deployments usually do not require address translation.

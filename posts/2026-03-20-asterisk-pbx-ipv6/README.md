# How to Configure Asterisk PBX with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Asterisk, IPv6, PBX, VoIP, SIP, Telephony, Linux

Description: Configure Asterisk PBX to accept SIP registrations, make and receive calls, and connect to SIP trunks over IPv6 networks.

---

Asterisk is a leading open-source PBX. Configuring it for IPv6 requires updating the SIP channel driver (PJSIP, or chan_sip on Asterisk 20 and earlier) to listen on IPv6 interfaces and configuring endpoints to use IPv6 addresses.

## Asterisk with PJSIP over IPv6

```ini
# /etc/asterisk/pjsip.conf

; Transport - listen on all IPv6 interfaces
[transport-udp-ipv6]
type=transport
protocol=udp
bind=::
local_net=2001:db8::/32

; Also bind to IPv4 (dual-stack)
[transport-udp-ipv4]
type=transport
protocol=udp
bind=0.0.0.0

; TLS transport over IPv6
[transport-tls-ipv6]
type=transport
protocol=tls
bind=::
cert_file=/etc/asterisk/keys/asterisk.crt
priv_key_file=/etc/asterisk/keys/asterisk.key

; IPv6 endpoint
[1001]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw,g729
auth=1001-auth
aors=1001-aor
transport=transport-udp-ipv6

[1001-auth]
type=auth
auth_type=userpass
password=userpassword
username=1001

[1001-aor]
type=aor
max_contacts=5

; IPv6 SIP trunk
[sip-trunk-ipv6]
type=endpoint
transport=transport-udp-ipv6
context=from-external
disallow=all
allow=ulaw,alaw
aors=sip-trunk-ipv6-aor
direct_media=no

[sip-trunk-ipv6-aor]
type=aor
contact=sip:[2001:db8::20]:5060

[sip-trunk-ipv6-identify]
type=identify
endpoint=sip-trunk-ipv6
match=2001:db8::20
```

## Asterisk with chan_sip (Legacy, Asterisk 20 and Earlier) over IPv6

```ini
# /etc/asterisk/sip.conf

[general]
bindaddr=[::]:5060

; SIP domain
domain=pbx.example.com

; NAT settings (usually not needed for IPv6)
nat=no

; Transport
transport=udp,tcp

; Codec settings
disallow=all
allow=ulaw,alaw

; Register to IPv6 SIP trunk
register => user:password@[2001:db8::20]/1001

; IPv6 SIP trunk peer
[sip-trunk-ipv6]
type=peer
host=2001:db8::20
port=5060
fromdomain=example.com
disallow=all
allow=ulaw,alaw
insecure=invite
```

## Asterisk Dialplan for IPv6

```ini
# /etc/asterisk/extensions.conf

; Use PJSIP/... for res_pjsip endpoints, or SIP/... if you are using chan_sip.

[from-internal]
; Dial internal extension
exten => _1XXX,1,Dial(PJSIP/${EXTEN})
exten => _1XXX,n,Hangup()

; Dial via IPv6 trunk
exten => _NXXNXXXXXX,1,Dial(PJSIP/${EXTEN}@sip-trunk-ipv6)
exten => _NXXNXXXXXX,n,Hangup()

[from-external]
; Receive calls from IPv6 trunk
exten => 1001,1,Answer()
exten => 1001,n,Dial(PJSIP/1001,30)
exten => 1001,n,Voicemail(1001@default)
exten => 1001,n,Hangup()
```

## RTP Configuration for IPv6

```ini
# /etc/asterisk/rtp.conf

[general]
rtpstart=10000
rtpend=20000
```

With `res_pjsip`, no separate IPv6 RTP bind is required in `rtp.conf`; Asterisk selects IPv4 or IPv6 RTP based on the address family used for SIP signaling.

## Firewall Rules for Asterisk over IPv6

```bash
# SIP over IPv6

sudo ip6tables -A INPUT -p udp --dport 5060 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 5060 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 5061 -j ACCEPT  # SIP TLS

# RTP media ports
sudo ip6tables -A INPUT -p udp --dport 10000:20000 -j ACCEPT

sudo ip6tables-save > /etc/ip6tables/rules.v6
```

## Testing Asterisk IPv6

```bash
# Verify Asterisk is listening on IPv6
ss -6 -ulnp | grep 5060

# Check PJSIP transport
asterisk -rx "pjsip show transports"

# Check SIP peer/endpoint status
asterisk -rx "pjsip show endpoints"
asterisk -rx "sip show peers"  # For chan_sip on Asterisk 20 and earlier

# Test SIP registration from client
# Configure Linphone/MicroSIP to register to IPv6:
# Domain: [2001:db8::10]:5060
# Username: 1001
# Password: userpassword

# Check registration
asterisk -rx "pjsip show contacts"

# Debug SIP messages
asterisk -rx "pjsip set logger on"
sudo tail -f /var/log/asterisk/messages | grep "INVITE\|REGISTER\|2001:"
```

Asterisk's PJSIP driver supports IPv6 through `bind=::` or a specific IPv6 bind address in the transport configuration. When you need both IPv4 and IPv6, define separate transport objects rather than relying on a single wildcard IPv6 transport for dual-stack signaling.

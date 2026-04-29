# How to Handle IPv6 in Video Conferencing Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Video Conferencing, WebRTC, SIP, Jitsi, Zoom, Enterprise

Description: Configure and troubleshoot IPv6 support in video conferencing platforms, covering WebRTC-based systems, SIP video endpoints, and enterprise conferencing infrastructure.

---

Video conferencing systems use various signaling and media protocols (including WebRTC, SIP, and H.323). IPv6 support varies significantly by platform and requires careful configuration of signaling, media, and TURN/STUN infrastructure.

## WebRTC-Based Video Conferencing (Jitsi Meet)

```text
# Install Jitsi Meet with IPv6 support

# After adding the official Jitsi package repository and running apt update:
sudo apt install jitsi-meet -y

# During installation, enter your FQDN: meet.example.com
# Ensure DNS has both A and AAAA records:
# meet.example.com. IN A 203.0.113.1
# meet.example.com. IN AAAA 2001:db8::20

# Configure Nginx for IPv6
# /etc/nginx/sites-available/meet.example.com
server {
    listen 80;
    listen [::]:80;
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name meet.example.com;
    ...
}
```

```text
# Configure Jitsi TURN server (coturn) for IPv6
# /etc/turnserver.conf
listening-ip=::
# If the TURN server is behind NAT, map public-to-local addresses:
# external-ip=2001:db8::20/2001:db8::10

# Prosody XMPP for Jitsi
# Network listen settings are global in Prosody:
# /etc/prosody/prosody.cfg.lua
interfaces = { "*", "::" }
```

## SIP Video Endpoints over IPv6

```text
SIP video phones and endpoints:
- Many modern SIP endpoints support IPv6, but verify support in the vendor's current firmware documentation
- Configure IPv6 in endpoint settings:
  - Network > IPv6 Mode: Dual-Stack or IPv6 Only
  - Proxy/Registrar: sip:[2001:db8::10]:5060

SIP REGISTER over IPv6:
REGISTER sip:example.com SIP/2.0
Via: SIP/2.0/UDP [2001:db8::101]:5060;branch=z9hG4bK74bf9
Contact: <sip:user@[2001:db8::101]:5060>
```

## Cisco Webex and Enterprise Video over IPv6

```text
Cisco Webex IPv6:
- Webex Suite Meetings platform documents IPv6 support for Webex App and RoomOS devices on IPv6 networks using customer-provided DNS64 and NAT64
- Verify your DNS64/NAT64 infrastructure and Webex network requirements before assuming native end-to-end IPv6 reachability

Cisco Video Infrastructure:
- Cisco Meeting Server (CMS): Cisco's IPv6 Deployment Guide notes CMS conferencing remains in a traditional IPv4 stack, but IPv4 and IPv6 endpoints are supported in a cluster
- Cisco Expressway: supports IPv4, IPv6, or Both; in dual-stack mode it can interwork between IPv4 and IPv6 endpoints
```

## Zoom IPv6 Considerations

```text
Zoom IPv6 Support:
- Zoom publishes IPv6 IP ranges for Zoom Meetings and Zoom Phone in its firewall documentation
- Allow the published IPv6 ranges for the Zoom services you use
- If you use Zoom Rooms, apply the separate Zoom Rooms firewall guidance

Verify Zoom IPv6 connectivity:
- During a meeting or phone call, open the Statistics view in the Zoom desktop app
- Look for IPv6 addresses and connection details in the statistics view
```

## H.323 Video Conferencing over IPv6

```text
H.323 over IPv6 configuration:
- Gatekeeper (GnuGk): enable IPv6 listener
  # GnuGk.ini
  [Gatekeeper::Main]
  EnableIPv6=1

- H.323 endpoint settings:
  - Gatekeeper address: [2001:db8::30]:1719
- In mixed IPv4/IPv6 deployments, GnuGk can proxy IPv4-to-IPv6 calls when needed
```

## Jitsi Videobridge (SFU) with IPv6

```text
# Jitsi Videobridge IPv6 configuration
# /etc/jitsi/videobridge/jvb.conf
ice4j {
  harvest {
    use-ipv6 = true
    use-link-local-addresses = false
  }
}

# Restart Jitsi Videobridge
sudo systemctl restart jitsi-videobridge2
```

## Troubleshooting IPv6 Video Conferencing

```bash
# Check if STUN/TURN is providing IPv6 candidates
# Use browser console during WebRTC call:
# chrome://webrtc-internals/ (Chrome)
# about:webrtc (Firefox)

# Check ICE candidates:
# Look for "typ host" candidates with IPv6 addresses
# Look for "typ relay" from IPv6 TURN server

# Test TURN server IPv6 allocation
turnutils_uclient -x -u user -w pass -v turn.example.com

# Verify media path uses IPv6
sudo tcpdump -i eth0 -nn ip6 and udp

# Check DTLS/SRTP over IPv6
sudo tcpdump -i eth0 -nn ip6 and "udp portrange 10000-60000"
```

IPv6 in video conferencing requires STUN/TURN infrastructure with IPv6 support for ICE candidate gathering, with modern WebRTC-based systems like Jitsi handling IPv6 through standard ICE mechanisms, while legacy H.323/SIP systems may require explicit IPv6 configuration on each component.

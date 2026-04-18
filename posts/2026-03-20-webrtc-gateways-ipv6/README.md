# How to Configure WebRTC Gateways with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WebRTC, IPv6, Gateway, SIP, Janus, Mediasoup, VoIP, Real-Time

Description: Configure WebRTC media gateways to bridge IPv6 WebRTC clients with SIP/VoIP infrastructure, including Janus Gateway and Mediasoup IPv6 configuration.

---

WebRTC gateways bridge browser-based WebRTC clients with traditional SIP/VoIP systems. Configuring them for IPv6 enables WebRTC clients on IPv6 networks to communicate with SIP infrastructure and vice versa.

## Janus WebRTC Gateway IPv6

```text
Janus is a popular open-source WebRTC gateway.
Configuration: /etc/janus/janus.cfg
```

```ini
# /etc/janus/janus.cfg

[general]
# Admin API

admin_secret=janusoverride

[nat]
# ICE candidates
stun_server=turn.example.com
stun_port=3478

# TURN server for IPv6 relay
turn_server=turn.example.com
turn_port=3478
turn_type=udp
turn_user=janus
turn_pwd=januspass

# Enable IPv6 ICE candidates
ice_ipv6=true

[media]
# RTP port range
rtp_port_range=10000-60000
```

```text
# /etc/janus/janus.transport.http.cfg
[general]
# HTTPS with IPv6
https=true
secure_port=8089
server_pem=/etc/ssl/certs/janus.crt
server_key=/etc/ssl/private/janus.key

# IPv6 binding
interface=::
```

## Mediasoup IPv6 Configuration

```javascript
// mediasoup server configuration
const mediasoup = require('mediasoup');

async function startMediasoup() {
    const worker = await mediasoup.createWorker({
        rtcMinPort: 10000,
        rtcMaxPort: 60000,
        logLevel: 'warn',
    });

    const router = await worker.createRouter({
        mediaCodecs: [
            { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
            { kind: 'video', mimeType: 'video/VP8', clockRate: 90000 },
        ],
    });

    // WebRTC transport with IPv6 support
    const transport = await router.createWebRtcTransport({
        // ICE candidates from both IPv4 and IPv6
        listenIps: [
            { ip: '0.0.0.0', announcedIp: '203.0.113.1' },  // IPv4
            { ip: '::', announcedIp: '2001:db8::face' },   // IPv6
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        enableSctp: false,
    });

    console.log('WebRTC transport created:', transport.id);
    console.log('ICE candidates:', transport.iceCandidates);
    // ICE candidates will include both IPv4 and IPv6 addresses
}
```

## Coturn for WebRTC IPv6 TURN

```bash
# /etc/turnserver.conf - coturn for WebRTC/IPv6

# Listening
listening-port=3478
tls-listening-port=5349

# IPv6 support
listening-ip=::
listening-ip=0.0.0.0

# External IPv6 address
external-ip=2001:db8::cafe/2001:db8::cafe
relay-ip=2001:db8::cafe

realm=example.com

# Auth
user=webrtc:webrtcpassword
lt-cred-mech

# Fingerprint required for WebRTC
fingerprint

# DTLS/TLS (omit no-tls/no-dtls to keep them enabled)
cert=/etc/ssl/certs/turn.crt
pkey=/etc/ssl/private/turn.key
```

```bash
sudo systemctl enable --now coturn
ss -6 -ulnp | grep 3478
```

## JavaScript WebRTC with IPv6 TURN

```javascript
// WebRTC configuration with IPv6 TURN server
const iceConfig = {
    iceServers: [
        {
            urls: [
                'turn:turn.example.com:3478',
                'turn:[2001:db8::cafe]:3478',
                'turns:turn.example.com:5349'
            ],
            username: 'webrtc',
            credential: 'webrtcpassword'
        },
        {
            urls: 'stun:stun.example.com:3478'
        }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
};

const pc = new RTCPeerConnection(iceConfig);

// Log IPv6 ICE candidates for debugging
pc.onicecandidate = (event) => {
    if (event.candidate) {
        const cand = event.candidate.candidate;
        // The connection-address is the 5th whitespace-separated field of the
        // candidate attribute (RFC 5245/8445). IPv6 addresses contain ':'.
        const address = event.candidate.address || cand.split(' ')[4];
        const type = address && address.includes(':') ? 'IPv6' : 'IPv4';
        console.log(`${type} ICE candidate:`, cand);
    }
};
```

## Firewall for WebRTC Gateway IPv6

```bash
# WebRTC signaling (WebSocket over HTTPS)
sudo ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 8443 -j ACCEPT

# Janus admin API (restrict)
sudo ip6tables -A INPUT -p tcp -s ::1 --dport 7088 -j ACCEPT

# TURN/STUN over IPv6
sudo ip6tables -A INPUT -p udp --dport 3478 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 3478 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 5349 -j ACCEPT

# Media ports (RTP/SRTP over IPv6)
sudo ip6tables -A INPUT -p udp --dport 10000:60000 -j ACCEPT

sudo ip6tables-save > /etc/iptables/rules.v6
```

WebRTC gateway IPv6 support requires configuring ICE candidate announcement with the gateway's IPv6 address, ensuring the TURN server (coturn) allocates IPv6 relay addresses, and having the media server listen on IPv6 for incoming SRTP streams from ICE-selected IPv6 paths.

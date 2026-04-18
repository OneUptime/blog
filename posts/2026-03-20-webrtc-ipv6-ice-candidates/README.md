# How to Configure WebRTC with IPv6 ICE Candidates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WebRTC, IPv6, ICE, STUN, TURN, Real-Time Communication, Networking

Description: Configure WebRTC to properly gather and use IPv6 ICE candidates for peer-to-peer media connections, including STUN/TURN server setup and IPv6 candidate filtering.

---

WebRTC uses Interactive Connectivity Establishment (ICE) to discover network paths between peers. IPv6 ICE candidates are automatically gathered on IPv6-capable hosts and can significantly improve connectivity, especially for peers with IPv6-only connections.

## Understanding IPv6 ICE Candidates

```text
ICE Candidate Types for IPv6:
- host: Direct IPv6 addresses (link-local and global)
  e.g., "candidate:1 1 UDP 2122252543 2001:db8::client 50000 typ host"
- srflx: Server-reflexive (from STUN over IPv6)
  e.g., "candidate:2 1 UDP 1686052607 2001:db8::public 50000 typ srflx"
- relay: From TURN server (IPv6 allocation)
  e.g., "candidate:3 1 UDP 16777215 2001:db8::turn 50000 typ relay"

Note: Link-local (fe80::) candidates are gathered but rarely useful for
peer-to-peer connections across different networks.
```

## STUN Server with IPv6 Support

```bash
# Install coturn STUN/TURN server

sudo apt install coturn -y

# /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349

# Listen on both IPv4 and IPv6
listening-ip=0.0.0.0
listening-ip=::

# External IPv6 address
external-ip=2001:db8::turn-server

# Enable IPv6 relay
relay-ip=2001:db8::turn-server

realm=example.com
server-name=turn.example.com

# Credentials
user=webrtcuser:SecurePassword123
lt-cred-mech

# Log level
log-file=/var/log/coturn/coturn.log
verbose
```

```bash
sudo systemctl enable --now coturn

# Firewall for STUN/TURN over IPv6
sudo ip6tables -A INPUT -p udp --dport 3478 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 3478 -j ACCEPT
sudo ip6tables -A INPUT -p udp --dport 5349 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 5349 -j ACCEPT
# Relay port range
sudo ip6tables -A INPUT -p udp --dport 49152:65535 -j ACCEPT
sudo ip6tables-save > /etc/iptables/rules.v6
```

## WebRTC ICE Configuration in JavaScript

```javascript
// WebRTC ICE configuration with IPv6 STUN/TURN
const iceConfig = {
    iceServers: [
        {
            urls: [
                // IPv6 STUN server
                'stun:turn.example.com:3478',
                'stun:[2001:db8::turn-server]:3478'
            ]
        },
        {
            urls: [
                // IPv6 TURN server
                'turn:turn.example.com:3478',
                'turn:[2001:db8::turn-server]:3478',
                'turns:turn.example.com:5349'  // TLS
            ],
            username: 'webrtcuser',
            credential: 'SecurePassword123'
        }
    ],
    // Pre-gather ICE candidates (IPv6 candidates are gathered automatically
    // on IPv6-capable hosts; this setting only controls prefetch)
    iceCandidatePoolSize: 10
};

// Create peer connection
const pc = new RTCPeerConnection(iceConfig);

// Log IPv6 ICE candidates
pc.onicecandidate = (event) => {
    if (event.candidate) {
        const cand = event.candidate.candidate;
        // event.candidate.address is the raw IP; IPv6 addresses contain ':'
        // while IPv4 addresses do not
        if (event.candidate.address && event.candidate.address.includes(':')) {
            console.log('IPv6 ICE candidate:', cand);
        }
        // Send candidate to remote peer via signaling
        sendToSignalingServer({ candidate: event.candidate });
    }
};
```

## Filtering and Prioritizing IPv6 Candidates

```javascript
// Filter ICE candidates to control IPv6 usage
function filterCandidates(candidate) {
    const cand = candidate.candidate;

    // Skip link-local IPv6 (fe80::)
    if (cand.includes(' fe80::')) {
        return false;
    }

    // Only use global IPv6 candidates
    if (cand.includes(' 2001:') || cand.includes(' fd')) {
        console.log('Using IPv6 candidate:', cand);
        return true;
    }

    return true;  // Accept all others
}

pc.onicecandidate = (event) => {
    if (event.candidate && filterCandidates(event.candidate)) {
        sendToSignalingServer({ candidate: event.candidate });
    }
};
```

## Testing IPv6 ICE Connectivity

```bash
# Test STUN server over IPv6 (pass an IPv6 literal, or rely on AAAA resolution)
turnutils_stunclient turn.example.com

# Test TURN server and request an IPv6 relay allocation (-x, per RFC 6156)
turnutils_uclient \
  -x \
  -u webrtcuser \
  -w SecurePassword123 \
  turn.example.com

# Check coturn is listening on IPv6
ss -6 -ulnp | grep 3478
ss -6 -tlnp | grep 3478

# Monitor TURN allocations
sudo tail -f /var/log/coturn/coturn.log | grep "IPv6\|2001:"
```

WebRTC's ICE framework gathers IPv6 candidates automatically on IPv6-capable endpoints, with coturn STUN/TURN servers listening on `::` providing both IPv6-native connectivity for direct peer connections and IPv6 relay paths when NAT traversal is required.

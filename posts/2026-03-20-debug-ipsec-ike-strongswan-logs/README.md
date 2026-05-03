# How to Debug IPsec IKE Negotiation with strongSwan Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPsec, IKE, strongSwan, Debugging, Linux, VPN

Description: Use strongSwan's logging system to capture detailed IKE negotiation traces for diagnosing IPsec VPN connection failures.

strongSwan has a flexible logging system with per-subsystem verbosity levels. Increasing IKE logging reveals the exact point of negotiation failure.

## strongSwan Log Subsystems

| Subsystem | Description | Recommended Debug Level |
|---|---|---|
| `ike` | IKE protocol messages | 3-4 for debugging |
| `knl` | Kernel network/XFRM operations | 2 |
| `cfg` | Configuration loading | 2 |
| `enc` | Encryption operations | 1 |
| `net` | Network socket operations | 1 |
| `esp` | ESP decryption issues | 2 |
| `asn` | ASN.1 parsing (certificates) | 2 |

## Enabling Debug Logging

### Method 1: ipsec stroke (live, no restart)

```bash
# Set IKE debug level to 4 (most verbose)

sudo ipsec stroke loglevel ike 4
sudo ipsec stroke loglevel knl 2
sudo ipsec stroke loglevel cfg 2

# View logs immediately
sudo journalctl -u strongswan -f
```

### Method 2: Configuration File (persistent)

```conf
# /etc/strongswan.d/charon.conf
charon {
    filelog {
        charon {
            path = /var/log/charon.log
            default = 1
            ike = 3
            knl = 2
            cfg = 2
            esp = 1
            asn = 2
        }
    }

    syslog {
        daemon {
            default = 1
            ike = 3
        }
    }
}
```

```bash
sudo systemctl restart strongswan
tail -f /var/log/charon.log
```

## Triggering and Capturing a Negotiation

```bash
# Start watching logs before attempting connection
sudo journalctl -u strongswan -f &

# Bring up the tunnel
sudo ipsec up site-to-site

# Or force a re-initiation
sudo ipsec down site-to-site
sudo ipsec up site-to-site
```

## Interpreting IKE Log Messages

### Successful IKEv2 Negotiation

```text
# Stage 1: IKE_SA_INIT
"initiating IKE_SA site-to-site[1] to 5.6.7.8"
"sending packet: from 1.2.3.4[500] to 5.6.7.8[500]"
"received packet: from 5.6.7.8[500] to 1.2.3.4[500]"
"local  host is behind NAT, sending keep alives"
"selected proposal: IKE:AES_CBC_256/HMAC_SHA2_256_128/PRF..."

# Stage 2: IKE_AUTH
"authentication of '...' with RSA signature successful"
"authentication of '...' with PSK successful"
"IKE_SA site-to-site[1] established between ..."
"CHILD_SA site-to-site{1} established"
"installing inbound ESP SPI ..."
```

### Failed Negotiation - Algorithm Mismatch

```text
"no IKE proposal found"
"received NO_PROPOSAL_CHOSEN notify"
→ Fix: align ike= parameter with peer's capabilities
```

### Failed Negotiation - Authentication Failure

```text
"authentication of '...' with PSK failed"
"authentication failed, invalid certificate signature"
→ Fix: verify PSK matches exactly, or check certificate chain
```

### Failed Negotiation - Timeout

```text
"retransmit 5 of request with message ID 0"
"giving up after 5 retransmits"
→ Fix: peer not reachable; check firewall for UDP 500
```

## Comparing Proposed vs. Accepted Algorithms

```bash
# When debugging algorithm mismatches:
sudo journalctl -u strongswan | grep -E "proposal|selected|rejected"

# Check what the remote peer sent vs what you proposed
# "sending IKE_SA_INIT request ..."
# "received IKE_SA_INIT response ..."
# "selected proposal ..." ← This is what was agreed upon
```

## Getting a Clean Debug Log

```bash
# Clear old logs, restart strongSwan, and capture fresh
sudo journalctl --rotate
sudo journalctl --vacuum-time=1s

sudo systemctl restart strongswan
sudo ipsec up site-to-site 2>&1 | tee ipsec-debug.log

sudo journalctl -u strongswan --since "1 minute ago" > ipsec-logs.txt
```

With IKE verbosity at level 3-4, every message exchange is logged including the exact cryptographic parameters, making virtually all negotiation failures diagnosable from the logs alone.

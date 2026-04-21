# How to Troubleshoot IPsec IPv6 Connection Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPsec, Troubleshooting, strongSwan, Debugging

Description: Systematic guide to diagnosing and resolving IPv6 IPsec connection failures, covering IKEv2 negotiation errors, authentication failures, and traffic flow issues.

## Overview

IPv6 IPsec troubleshooting follows a systematic process: verify network reachability, check IKEv2 negotiation, validate authentication, confirm SA installation, and test traffic flow. This guide provides a diagnostic flowchart and solutions for the most common failure modes.

## Troubleshooting Flowchart

```mermaid
flowchart TD
    A[IPsec tunnel not working] --> B{Can you ping remote gateway?}
    B -- No --> C[Fix routing/firewall\nbefore IPsec]
    B -- Yes --> D{UDP 500 reachable?}
    D -- No --> E[Open UDP 500 and 4500\non perimeter firewall]
    D -- Yes --> F{IKE SA ESTABLISHED?}
    F -- No --> G[Check: PSK mismatch?\nCert not trusted?\nProposal mismatch?]
    F -- Yes --> H{CHILD SA INSTALLED?}
    H -- No --> I[Check: Traffic selector mismatch?\nProposal mismatch?]
    H -- Yes --> J{Traffic flowing?}
    J -- No --> K[Check: Routing?\nForwarding enabled?\nFirewall blocking?]
    J -- Yes --> L[Working!]
```

## Step 1: Verify Network Reachability

```bash
# Can you reach the remote gateway?

ping6 -c 3 2001:db8:100::1

# Is UDP 500 (IKE) reachable? Use netcat or nmap
nmap -6 -sU -p 500,4500 2001:db8:100::1

# Check for blocking firewalls
tcpdump -i eth0 'udp port 500 and host 2001:db8:100::1' &
swanctl --initiate conn:my-vpn
# Should see outbound packet - if no response, the path, remote firewall, or responder may be blocking
```

## Step 2: Analyze IKEv2 Negotiation

```bash
# Enable IKEv2 debugging in strongSwan
# /etc/strongswan.d/charon.conf or /etc/strongswan.conf
charon {
    filelog {
        charon-log {
            path = /var/log/charon.log
            default = 1
            ike = 3
            cfg = 2
            net = 2
        }
    }
}

# Restart and monitor
systemctl restart strongswan
tail -f /var/log/charon.log

# Initiate tunnel
swanctl --initiate conn:my-vpn

# Key messages to look for:
# "IKE_SA_INIT request 0 sent to 2001:db8:100::1"  ← Request sent
# "received IKE_SA_INIT response"                    ← Response received
# "authentication of 'gw2.example.com' with RSA signature successful"  ← Auth OK
# "CHILD_SA site1-site2 established"                ← Tunnel up
```

## Common Failure: NO_PROPOSAL_CHOSEN

```text
Error in log:
"received NO_PROPOSAL_CHOSEN notify error"
→ Cipher suite mismatch between initiator and responder

Diagnosis:
# Enable detailed logging and look for:
# "no acceptable PROPOSAL found"

Fix: Ensure both sides have compatible proposals
# GW1:
proposals = aes256-sha256-ecp256
esp_proposals = aes256gcm16-ecp256

# GW2 must have at least one compatible proposal
# Test with a broader proposal set first to identify accepted ciphers:
proposals = aes256-sha256-ecp256,aes256-sha256-modp2048
```

## Common Failure: AUTHENTICATION_FAILED

```text
Error in log:
"received AUTHENTICATION_FAILED notify error"

Possible causes:
1. PSK mismatch
   → Verify identical PSK on both ends
   → Check for whitespace or encoding differences

2. Certificate not trusted
   → Verify CA cert is in /etc/swanctl/x509ca/ on both sides
   → Check certificate validity dates
   openssl x509 -in gw2.crt -noout -dates

3. ID mismatch
   → Check that 'id' in local/remote blocks matches certificate CN or SubjectAltName
   → Or for PSK: check that 'id' in secrets block matches
```

```bash
# Debug certificate validation
# Run with extra certificate debugging
charon {
    filelog {
        charon-log {
            path = /var/log/charon.log
            # Extra ASN.1/X.509 certificate parsing logs
            asn = 2
            cfg = 2
        }
    }
}
```

## Common Failure: CHILD_SA Installation Fails

```text
IKE SA established but CHILD_SA fails:
"TS_UNACCEPTABLE: traffic selectors didn't match"
→ local_ts/remote_ts don't match between peers

# GW1 expects:
local_ts  = 2001:db8:1::/48
remote_ts = 2001:db8:2::/48

# GW2 must have the MIRROR:
local_ts  = 2001:db8:2::/48
remote_ts = 2001:db8:1::/48
```

## Common Failure: SA Installed But No Traffic

```bash
# SA is UP, but traffic not flowing

# 1. Check forwarding is enabled
sysctl net.ipv6.conf.all.forwarding
# Must be 1

# 2. Check routing - does a route exist to remote site?
ip -6 route | grep "2001:db8:2::/48"

# 3. Check if traffic matches IPsec policy
# Use ip xfrm to test policy lookup
ip xfrm policy get src 2001:db8:1::10 dst 2001:db8:2::10 proto tcp dir out

# 4. Check firewall forwarding rules
ip6tables -L FORWARD -n -v | grep "2001:db8:2::/48"

# 5. Check if traffic is being encrypted
ip -s xfrm state list | grep bytes
# The byte counters should increase when you send traffic
```

## Common Failure: MTU / Fragmentation

```bash
# Symptom: Large transfers fail, small packets work
# Cause: IPsec adds overhead, often 50-100+ bytes depending on mode, cipher, and encapsulation

# Test with explicit packet sizes
ping6 -c 3 -s 1400 2001:db8:2::1   # Should work
ping6 -c 3 -s 1450 2001:db8:2::1   # May fail

# Fix: Reduce MTU on client interfaces or adjust TCP MSS
ip6tables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -m tcp -j TCPMSS --set-mss 1360

# Or set lower MTU on VPN hosts
ip link set eth0 mtu 1400
```

## Quick Diagnostic Commands

```bash
# All in one diagnostic snapshot
echo "=== IKE SAs ==="
swanctl --list-sas

echo "=== XFRM States ==="
ip xfrm state list

echo "=== XFRM Policies ==="
ip xfrm policy list

echo "=== IPv6 Routes ==="
ip -6 route

echo "=== Forwarding ==="
sysctl net.ipv6.conf.all.forwarding

echo "=== Recent strongSwan logs ==="
journalctl -u strongswan --since "5 minutes ago" | tail -50
```

## Summary

IPv6 IPsec troubleshooting proceeds in order: network reachability → IKE negotiation → authentication → CHILD SA installation → traffic flow. The most common failures are: NO_PROPOSAL_CHOSEN (mismatched cipher suites - verify both sides have compatible `proposals`/`esp_proposals`), AUTHENTICATION_FAILED (wrong PSK or untrusted certificate), TS_UNACCEPTABLE (traffic selector mismatch - `local_ts`/`remote_ts` must mirror on each side), and MTU issues (large transfers fail due to ESP overhead). Enable `ike = 3` in charon.conf for detailed negotiation logs.

# How to Analyze IPv6 IPsec Traffic in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv6, IPsec, ESP, AH, VPN, Packet Analysis

Description: A guide to analyzing IPv6 IPsec traffic in Wireshark, including identifying ESP and AH headers, decrypting ESP with keys, and diagnosing IKEv2 exchanges.

IPv6 IPsec uses the same protocol as IPv4 IPsec - ESP (Encapsulating Security Payload, protocol 50) and AH (Authentication Header, protocol 51) - but with IPv6 as the transport layer. Wireshark can decode and optionally decrypt IPsec traffic.

## Display Filters for IPv6 IPsec

```wireshark
# Show all ESP-encapsulated IPv6 traffic (protocol 50)

ipv6 && esp

# Show all AH-protected IPv6 traffic (protocol 51)
ipv6 && ah

# Show both ESP and AH
ipv6 && (esp || ah)

# Show IKEv2 key exchange (UDP port 500 or 4500)
ipv6 && (udp.port == 500 || udp.port == 4500)

# Show ESP from a specific IPv6 host
esp && ipv6.src == 2001:db8::gateway1

# Show IPsec traffic between two specific peers
(ipv6.src == 2001:db8::gw1 && ipv6.dst == 2001:db8::gw2) ||
(ipv6.src == 2001:db8::gw2 && ipv6.dst == 2001:db8::gw1)
```

## Identifying IPsec Protocol Headers

IPv6 extension headers carry ESP and AH:
- `next header = 50` in the IPv6 header → ESP follows
- `next header = 51` in the IPv6 header → AH follows

```wireshark
# Filter by IPv6 next header value
ipv6.nxt == 50    # ESP
ipv6.nxt == 51    # AH
```

## IKEv2 Key Exchange Analysis

```wireshark
# Show IKEv2 messages (UDP port 500)
isakmp && ipv6

# Show IKEv2 Initial Exchange (SA_INIT)
isakmp.exchtype == 34  # IKE_SA_INIT

# Show IKEv2 Authentication Exchange
isakmp.exchtype == 35  # IKE_AUTH

# Show IKEv2 Create Child SA
isakmp.exchtype == 36  # CREATE_CHILD_SA

# Show IKEv2 Informational messages
isakmp.exchtype == 37  # INFORMATIONAL

# Show IKEv2 over NAT-T (UDP 4500)
udp.port == 4500 && ipv6
```

## Decrypting ESP Traffic in Wireshark

If you have the encryption keys, Wireshark can decrypt ESP:

1. Go to **Edit → Preferences → Protocols → ESP**
2. Check **Attempt to detect/decode encrypted ESP payloads**
3. Click **Edit** under **ESP SAs**
4. Add a new entry:
   - **Protocol**: IPv6
   - **Source Address**: `2001:db8::gw1`
   - **Destination Address**: `2001:db8::gw2`
   - **SPI**: (from the ESP header, in hex)
   - **Encryption Algorithm**: (e.g., AES-CBC-256)
   - **Encryption Key**: (hex or ASCII)
   - **Authentication Algorithm**: (e.g., HMAC-SHA-256)
   - **Authentication Key**: (hex or ASCII)

After entering keys, Wireshark will display decrypted payloads.

## Analyzing AH-Protected Traffic

AH provides authentication without encryption - the payload is still visible:

```wireshark
# Show AH-protected IPv6 packets
ipv6.nxt == 51

# Expand AH header to see:
# - Next Header (what's protected)
# - Sequence Number
# - Integrity Check Value (ICV)
```

## Troubleshooting IPsec Issues

### IKEv2 Not Completing

```wireshark
# Check if IKE_SA_INIT response is received
isakmp && ipv6.dst == 2001:db8::initiator && isakmp.exchtype == 34

# Look for INFORMATIONAL messages with DELETE payloads (SA being torn down)
isakmp.exchtype == 37 && isakmp.delete.spi

# Check for NOTIFY payloads (error codes)
isakmp.notify.msgtype
```

### ESP Traffic Present But Decryption Failing

```wireshark
# Verify ESP SPI matches your key configuration
esp
# Expand → SPI: compare with your key table

# Check if replay counter is wrapping (ESP Sequence Number)
esp.sequence > 0xFFFFF000   # Getting close to wraparound
```

## Extract IPsec Statistics

```bash
# Count ESP packets per peer pair
tshark -r capture.pcap -Y "esp && ipv6" \
  -T fields -e ipv6.src -e ipv6.dst | \
  sort | uniq -c | sort -rn
```

Wireshark's IPsec decryption capability combined with IKEv2 and ESP analysis makes it a powerful tool for diagnosing VPN tunnel issues, verifying SA establishment, and confirming that IPv6 traffic is properly protected.

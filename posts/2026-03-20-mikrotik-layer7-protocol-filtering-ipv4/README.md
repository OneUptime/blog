# How to Configure Layer 7 Protocol Filtering for IPv4 on MikroTik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MikroTik, RouterOS, Layer 7, Protocol Filtering, IPv4, Deep Packet Inspection

Description: Configure MikroTik RouterOS Layer 7 protocol matching to identify and block or prioritize specific applications like BitTorrent, YouTube, or custom protocols in IPv4 traffic.

## Introduction

MikroTik Layer 7 protocol matching uses regular expressions to inspect the first 10 packets (or first 2KB) of a TCP/UDP connection - whichever limit is reached first - identifying application protocols by payload patterns. It enables application-aware filtering without a separate DPI appliance.

## Define Layer 7 Protocols

```mikrotik
# Block BitTorrent

/ip firewall layer7-protocol add \
  name=BITTORRENT \
  regexp="^(\\x13bittorrent protocol|azver\\x01\$|get /scrape\\\?info_hash=get /announce\\\?info_hash=|get /client\\\?peerid=|\\.torrent|announce\\.php\\\?passkey=)" \
  comment="BitTorrent detection"

# Detect YouTube
/ip firewall layer7-protocol add \
  name=YOUTUBE \
  regexp="(youtube\\.com|googlevideo\\.com)" \
  comment="YouTube traffic"

# Custom application
/ip firewall layer7-protocol add \
  name=MY-APP \
  regexp="^\\x00\\x01\\x02MY_APP_MAGIC" \
  comment="Internal app identification"
```

## Block BitTorrent in Forward Chain

```mikrotik
# Match and drop BitTorrent
/ip firewall filter add \
  chain=forward \
  layer7-protocol=BITTORRENT \
  action=drop \
  comment="Block BitTorrent"
```

## Prioritize YouTube with Mangle

```mikrotik
# Mark YouTube connections for lower priority queue
/ip firewall mangle add \
  chain=prerouting \
  layer7-protocol=YOUTUBE \
  action=mark-connection \
  new-connection-mark=YOUTUBE-CONN \
  passthrough=yes

/ip firewall mangle add \
  chain=prerouting \
  connection-mark=YOUTUBE-CONN \
  action=mark-packet \
  new-packet-mark=YOUTUBE-PACKET \
  passthrough=no

/queue tree add \
  name=YOUTUBE-LIMIT \
  parent=global \
  packet-mark=YOUTUBE-PACKET \
  max-limit=5M \
  priority=8 \
  comment="Limit YouTube to 5 Mbps"
```

## Time-Based L7 Blocking

```mikrotik
# Block social media during work hours
/ip firewall layer7-protocol add \
  name=SOCIAL-MEDIA \
  regexp="(facebook\\.com|twitter\\.com|instagram\\.com|tiktok\\.com)"

/ip firewall filter add \
  chain=forward \
  layer7-protocol=SOCIAL-MEDIA \
  time=8h-18h,mon,tue,wed,thu,fri \
  action=drop \
  comment="Block social media 8-18 weekdays"
```

## Per-Address Filtering

```mikrotik
# Allow YouTube only for specific hosts
/ip firewall filter add \
  chain=forward \
  layer7-protocol=YOUTUBE \
  src-address=!192.168.1.50 \
  action=drop \
  comment="Only PC at .50 can use YouTube"
```

## Performance Considerations

```text
Layer 7 matching is CPU-intensive:
  - Inspect only necessary chains (not global)
  - Apply L7 rules after basic IP/port filters
  - Use connection marks to limit L7 to new connections only
  - Limit total L7 rules to < 20 for acceptable performance
  - Consider DNS-based blocking for high-traffic sites
```

## Conclusion

MikroTik Layer 7 protocol filtering provides application-layer traffic control using regex patterns against packet payloads. It is powerful but CPU-intensive - apply it only after lighter IP/port filters and use connection marking so the regex runs only on the first packet exchange, not every subsequent packet.

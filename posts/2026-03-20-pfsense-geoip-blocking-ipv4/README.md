# How to Configure GeoIP Blocking for IPv4 on pfSense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: pfSense, GeoIP, IPv4, Firewall, Security, PfBlockerNG

Description: Configure GeoIP-based IPv4 blocking on pfSense using the pfBlockerNG package to automatically block or allow traffic from specific countries using regularly updated IP lists.

## Introduction

GeoIP blocking prevents inbound connections from specific countries by maintaining lists of IPv4 CIDR ranges assigned to each country. pfBlockerNG automates the download, update, and enforcement of these lists as pfSense firewall rules.

## Install pfBlockerNG

Navigate to **System > Package Manager > Available Packages**:
- Install: `pfBlockerNG-devel`

## Initial Setup Wizard

Navigate to **Firewall > pfBlockerNG > General**:
- Enable pfBlockerNG: checked
- Keep Settings: checked

Run the wizard: **Firewall > pfBlockerNG > Wizard**

## Configure IPv4 GeoIP

Navigate to **Firewall > pfBlockerNG > IP > IPv4**:

### Add GeoIP Feed

```text
Name:     GeoIP_Block
Action:   Deny Both (inbound + outbound)
Format:   Auto
State:    Enabled

Sources:
  MaxMind GeoLite2 (requires free API key from maxmind.com)
  OR
  IPdeny country files (no registration required)
```

### Select Countries to Block

Navigate to **Firewall > pfBlockerNG > IP > GeoIP**:

```sql
Country:    Select countries to block
  [x] CN  China
  [x] RU  Russia
  [x] KP  North Korea
  [ ] US  (leave unchecked to allow)

Action:     Deny Inbound
Interface:  WAN

Alert Suppression: checked
```

## Custom IP Feed (Manual CIDR List)

Navigate to **Firewall > pfBlockerNG > IP > IPv4 > Add**:

```text
Name:   CustomBlockList
Format: CIDR
State:  Enabled
Action: Deny Inbound

List URLs:
  https://www.ipdeny.com/ipblocks/data/aggregated/cn-aggregated.zone
  https://www.ipdeny.com/ipblocks/data/aggregated/ru-aggregated.zone
```

## Update Schedule

Navigate to **Firewall > pfBlockerNG > Update**:
- CRON: Run **Every day at 03:00**
- Click **Run** to force immediate update

## Whitelist (Exceptions)

Navigate to **Firewall > pfBlockerNG > IP > Suppress**:

```text
Add IPs or CIDRs that should never be blocked:
  203.0.113.5   (trusted partner IP in blocked country)
  198.51.100.0/24
```

## Verify GeoIP Blocking

Navigate to **Firewall > pfBlockerNG > Reports > Alerts**:
- Shows recent blocks with country code, source IP, destination

```bash
# pfSense CLI - check generated tables

pfctl -t pfB_GeoIP_Block_v4 -T show | head -20

# Count blocked IPs
pfctl -t pfB_GeoIP_Block_v4 -T show | wc -l
```

## Conclusion

pfBlockerNG GeoIP blocking automatically maintains IPv4 blocklists organized by country. After installing the package, configure MaxMind GeoLite2 credentials or use IPdeny feeds, select countries to block, and schedule daily updates. Whitelist known partner IPs that may fall within blocked country CIDRs.

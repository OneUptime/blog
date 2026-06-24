# How to Configure DHCP Server Integration with IPAM Tools for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, IPAM, NetBox, phpIPAM, IPv4, Automation, Network Management

Description: Integrate ISC DHCP or Kea DHCP server with NetBox or phpIPAM to automatically track IPv4 lease allocations in your IPAM database.

## Introduction

DHCP servers allocate IP addresses dynamically, but those assignments are often invisible to IPAM tools unless integrated. By connecting your DHCP server to your IPAM, every lease becomes a tracked record - giving you real-time visibility into which devices hold which IPs.

## Approach 1: DHCP Hooks to Call phpIPAM API

ISC DHCP supports `on commit`, `on release`, and `on expiry` statements that can execute scripts when lease events occur, although ISC DHCP itself is now end-of-life.

### ISC DHCP Configuration

```text
# /etc/dhcp/dhcpd.conf - add at the end

# Hook script called when a lease is committed

on commit {
    set clientIP = binary-to-ascii(10, 8, ".", leased-address);
    set clientMAC = binary-to-ascii(16, 8, ":", substring(hardware, 1, 6));
    set clientHostname = pick-first-value(option fqdn.hostname, option host-name,
                          host-decl-name, "unknown");
    execute("/etc/dhcp/scripts/update-ipam.sh", "add",
            clientIP, clientMAC, clientHostname);
}

on release {
    set clientIP = binary-to-ascii(10, 8, ".", leased-address);
    execute("/etc/dhcp/scripts/update-ipam.sh", "delete", clientIP, "", "");
}

on expiry {
    set clientIP = binary-to-ascii(10, 8, ".", leased-address);
    execute("/etc/dhcp/scripts/update-ipam.sh", "delete", clientIP, "", "");
}
```

### IPAM Update Script

```bash
#!/bin/bash
# /etc/dhcp/scripts/update-ipam.sh
# Called by ISC DHCP on lease events

set -euo pipefail

ACTION=$1
IP=$2
MAC=$3
HOSTNAME=$4

PHPIPAM_URL="http://phpipam.example.com/api/myapp"
TOKEN=$(curl -fsS -X POST "${PHPIPAM_URL}/user/" -u "dhcp-api:dhcp-password" | jq -er '.data.token')

case "${ACTION}" in
  add)
    # Search for existing record
    RECORD_ID=$(curl -sS "${PHPIPAM_URL}/addresses/search/${IP}/" \
      -H "phpipam-token: ${TOKEN}" | jq -r '.data[0].id // empty')

    if [[ -n "${RECORD_ID}" ]]; then
      # Update existing record
      curl -fsS -X PATCH "${PHPIPAM_URL}/addresses/${RECORD_ID}/" \
        -H "Content-Type: application/json" \
        -H "phpipam-token: ${TOKEN}" \
        -d "{\"hostname\": \"${HOSTNAME}\", \"mac\": \"${MAC}\", \"tag\": 2}"
    else
      # Create new record (find subnet ID for this IP first)
      curl -fsS -X POST "${PHPIPAM_URL}/addresses/" \
        -H "Content-Type: application/json" \
        -H "phpipam-token: ${TOKEN}" \
        -d "{\"subnetId\": 5, \"ip\": \"${IP}\", \"hostname\": \"${HOSTNAME}\", \"mac\": \"${MAC}\", \"tag\": 2}"
    fi
    ;;

  delete)
    RECORD_ID=$(curl -sS "${PHPIPAM_URL}/addresses/search/${IP}/" \
      -H "phpipam-token: ${TOKEN}" | jq -r '.data[0].id // empty')
    [[ -n "${RECORD_ID}" ]] && \
      curl -fsS -X DELETE "${PHPIPAM_URL}/addresses/${RECORD_ID}/" -H "phpipam-token: ${TOKEN}"
    ;;
esac
```

Make the script executable:

```bash
sudo chmod 0755 /etc/dhcp/scripts/update-ipam.sh
```

## Approach 2: Kea DHCP with Run Script Hooks

Kea DHCP (the modern replacement for ISC DHCP) ships an open-source `run_script` hook library that can call an external script on lease hook points:

```json
// /etc/kea/kea-dhcp4.conf
{
  "Dhcp4": {
    "hooks-libraries": [
      {
        "library": "/path/to/libdhcp_run_script.so",
        "parameters": {
          "name": "/path/to/kea/scripts/update-ipam.sh",
          "sync": false
        }
      }
    ]
  }
}
```

Store the script in Kea's hook-scripts directory, or set `KEA_HOOK_SCRIPTS_PATH` before starting Kea. Unlike ISC DHCP's `execute`, Kea passes the hook-point name as the only command-line argument and exports lease fields through environment variables, so the script must be adapted for Kea rather than reused unchanged from the ISC DHCP example.

## Approach 3: Periodic DHCP Lease Scanning

For simpler setups, periodically parse the DHCP lease file and upsert active leases into IPAM:

```python
#!/usr/bin/env python3
# sync-dhcp-to-ipam.py - Parse ISC DHCP leases and sync to phpIPAM

import re

import requests

LEASES_FILE = "/var/lib/dhcp/dhcpd.leases"
PHPIPAM_URL = "http://phpipam.example.com/api/myapp"
TOKEN = "your-token"

# dhcpd.leases is append-only, so the last declaration for an IP is the current one.
lease_start_pattern = re.compile(r"lease (\d+\.\d+\.\d+\.\d+) \{")
mac_pattern = re.compile(r"hardware ethernet ([0-9a-f:]+);", re.IGNORECASE)
hostname_pattern = re.compile(r'client-hostname "([^"]*)";')
state_pattern = re.compile(r"binding state (\w+);")

with open(LEASES_FILE) as f:
    content = f.read()

active_leases = {}
current_ip = None
current_block = []
brace_depth = 0

for line in content.splitlines():
    if current_ip is None:
        start_match = lease_start_pattern.match(line.strip())
        if start_match:
            current_ip = start_match.group(1)
            current_block = []
            brace_depth = line.count("{") - line.count("}")
        continue

    current_block.append(line)
    brace_depth += line.count("{") - line.count("}")

    if brace_depth == 0:
        block = "\n".join(current_block)
        state_match = state_pattern.search(block)
        if not state_match or state_match.group(1) != "active":
            active_leases.pop(current_ip, None)
        else:
            mac_match = mac_pattern.search(block)
            hostname_match = hostname_pattern.search(block)

            active_leases[current_ip] = {
                "mac": mac_match.group(1) if mac_match else "",
                "hostname": hostname_match.group(1) if hostname_match else "unknown",
            }

        current_ip = None
        current_block = []

headers = {"phpipam-token": TOKEN, "Content-Type": "application/json"}

for ip, lease in active_leases.items():
    print(f"Syncing: {ip} ({lease['hostname']} / {lease['mac']})")

    existing = requests.get(
        f"{PHPIPAM_URL}/addresses/search/{ip}/",
        headers=headers,
        timeout=10,
    ).json()

    records = existing.get("data") or []
    record_id = records[0]["id"] if records else None

    if record_id:
        requests.patch(
            f"{PHPIPAM_URL}/addresses/{record_id}/",
            headers=headers,
            json={"hostname": lease["hostname"], "mac": lease["mac"], "tag": 2},
            timeout=10,
        )
    else:
        requests.post(
            f"{PHPIPAM_URL}/addresses/",
            headers=headers,
            json={
                "subnetId": 5,
                "ip": ip,
                "hostname": lease["hostname"],
                "mac": lease["mac"],
                "tag": 2,
            },
            timeout=10,
        )
```

## Conclusion

Integrating your DHCP server with an IPAM tool gives you automatic, near-real-time IP address tracking. The hook-based approach with ISC DHCP or Kea gives the most timely updates because lease events can trigger IPAM changes as they occur, while periodic lease-file scanning trades immediacy for simplicity.

# How to Configure Time Synchronization for IPv6-Only Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NTP, IPv6, Time Synchronization, IPv6-Only, Chrony, Network Design

Description: Design and configure time synchronization infrastructure for pure IPv6-only networks, including upstream source selection, internal NTP hierarchy, and client configuration.

---

IPv6-only networks - those with no IPv4 connectivity whatsoever - require time synchronization infrastructure that works entirely over IPv6. This involves selecting IPv6-capable NTP sources, building an internal NTP hierarchy, and ensuring all clients are configured for IPv6.

## Assessing IPv6-Only NTP Requirements

```bash
# Verify there is no IPv4 connectivity

ping -4 -c 3 8.8.8.8 2>&1
# Should fail: "Network is unreachable" or "No route to host"

# Verify IPv6 works
ping -6 -c 3 2001:4860:4860::8888
# Should succeed

# Check if your NTP pool has IPv6
dig AAAA 2.pool.ntp.org +short
```

## Designing the NTP Hierarchy

For IPv6-only networks, build a three-tier hierarchy:

```text
Tier 1: IPv6-capable public NTP servers (internet)
    ↓
Tier 2: Internal NTP masters (your network, synced from Tier 1)
    ↓
Tier 3: All client machines (sync from Tier 2)
```

This reduces external traffic and provides redundancy.

## Configuring Tier 2: Internal NTP Master Server

```bash
# /etc/chrony.conf (Internal IPv6-only NTP master)

# Sync from IPv6-capable public NTP servers
server time.cloudflare.com iburst ipv6
pool 2.pool.ntp.org iburst maxsources 3 ipv6

# Fall back to the server's local clock if all upstream sources fail
# (keeps clients on a common time source while isolated)
local stratum 10

# Allow all internal IPv6 clients to sync from this server
allow 2001:db8::/32

# Log directory
logdir /var/log/chrony
driftfile /var/lib/chrony/drift
```

```bash
# Start and enable the master NTP server
sudo systemctl enable --now chronyd

# Verify it's serving NTP
ss -ulnp | grep :123
chronyc sources
```

## Configuring Tier 3: Client Machines

```bash
# /etc/chrony.conf (IPv6-only client)

# Point to internal NTP master (IPv6 address)
server 2001:db8:100::10 iburst prefer
server 2001:db8:100::11 iburst

# No fallback to IPv4 NTP - this is IPv6-only
# Set makestep to handle large initial drift
makestep 1.0 3

logdir /var/log/chrony
driftfile /var/lib/chrony/drift
```

## Configuring systemd-timesyncd for IPv6-Only Clients

For lightweight clients:

```bash
# /etc/systemd/timesyncd.conf
[Time]
# Internal IPv6 NTP server addresses
NTP=2001:db8:100::10 2001:db8:100::11
FallbackNTP=2.pool.ntp.org
```

```bash
sudo systemctl restart systemd-timesyncd
timedatectl status
```

## Handling Container and VM Time Sync in IPv6-Only Networks

Containers in IPv6-only environments often rely on the host's time:

```bash
# For Docker containers, the container clock is synced to the host
# Ensure the host is synchronized
docker run --rm alpine date
# Should match host time

# For VMs, configure NTP in the guest
# pointing to the IPv6 NTP master:
# /etc/chrony.conf in the VM
# server 2001:db8:100::10 iburst
```

## Kubernetes Pod Time Sync in IPv6-Only Cluster

```yaml
# NTP client DaemonSet for IPv6-only cluster
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ntp-sync
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: ntp-sync
  template:
    metadata:
      labels:
        name: ntp-sync
    spec:
      hostNetwork: true
      tolerations:
        - effect: NoSchedule
          operator: Exists
      containers:
        - name: chrony
          image: publicpepper/chrony
          securityContext:
            privileged: true
          volumeMounts:
            - name: chrony-config
              mountPath: /etc/chrony.conf
              subPath: chrony.conf
      volumes:
        - name: chrony-config
          configMap:
            name: chrony-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: chrony-config
  namespace: kube-system
data:
  chrony.conf: |
    server 2001:db8:100::10 iburst
    makestep 1.0 3
    driftfile /var/lib/chrony/drift
```

## Testing IPv6-Only Time Sync

```bash
#!/bin/bash
# Verify all hosts sync over IPv6 only

HOSTS=(
  "2001:db8:100::10"
  "2001:db8:100::11"
  "2001:db8:100::12"
)

for host in "${HOSTS[@]}"; do
  echo -n "NTP check on [$host]: "
  # SSH and check sync status
  result=$(ssh -6 "root@$host" "chronyc tracking 2>/dev/null")
  if echo "$result" | grep -q "Leap status" && ! echo "$result" | grep -q "Leap status.*Not synchronised"; then
    echo "SYNCED - $(echo "$result" | grep 'Reference ID')"
  else
    echo "NOT SYNCHRONIZED"
  fi
done
```

Designing a proper IPv6-only NTP hierarchy with internal masters ensures reliable time synchronization across your entire infrastructure without any dependency on IPv4 connectivity.

# How to Monitor for IPv6 Privacy Extension Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Monitoring, Privacy, Compliance, Linux, Security

Description: Monitor Linux systems and networks for IPv6 privacy extension compliance, detecting EUI-64 addresses and ensuring temporary or stable-privacy addresses are in use.

## Introduction

Ensuring IPv6 privacy extensions are configured is one thing; monitoring that they remain compliant across a fleet of systems is another. This guide covers automated compliance checking approaches from simple scripts to integration with monitoring platforms.

## What to Monitor

A compliant system should:
1. Have `addr_gen_mode` set to 2 (stable-privacy) or 3 (random)
2. Have `use_tempaddr` set to 1 or 2 if temporary addresses are required
3. NOT have any global-scope IPv6 addresses with EUI-64 derived IIDs
4. Have temporary addresses with reasonable lifetimes if RFC 4941 is configured

## Script: Local Compliance Check

```bash
#!/bin/bash
# check_ipv6_privacy.sh

# Check IPv6 privacy extension compliance on a local system

PASS=0
FAIL=0

check() {
    local desc="$1"
    local result="$2"
    if [ "$result" -eq 1 ]; then
        echo "[PASS] $desc"
        PASS=$((PASS + 1))
    else
        echo "[FAIL] $desc"
        FAIL=$((FAIL + 1))
    fi
}

# Check addr_gen_mode is not EUI-64
for iface in $(ip -6 link show | awk -F: '/^[0-9]/ {print $2}' | tr -d ' '); do
    [ "$iface" = "lo" ] && continue
    mode=$(cat /proc/sys/net/ipv6/conf/"$iface"/addr_gen_mode 2>/dev/null)
    if [ "$mode" = "2" ] || [ "$mode" = "3" ]; then
        check "addr_gen_mode on $iface ($mode)" 1
    else
        check "addr_gen_mode on $iface ($mode, expected 2 or 3)" 0
    fi
done

# Check global addresses are not EUI-64
for addr in $(ip -6 addr show scope global | awk '/inet6/ {print $2}' | cut -d/ -f1); do
    iid=$(echo "$addr" | awk -F: '{print $(NF-3)":"$(NF-2)":"$(NF-1)":"$NF}')
    if echo "$iid" | grep -qiE "^[0-9a-f]{1,4}:[0-9a-f]{0,2}ff:fe[0-9a-f]{2}:[0-9a-f]{1,4}$"; then
        check "Address $addr is NOT EUI-64" 0
    else
        check "Address $addr is NOT EUI-64" 1
    fi
done

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && exit 0 || exit 1
```

Make it executable and run it:

```bash
chmod +x check_ipv6_privacy.sh
sudo ./check_ipv6_privacy.sh
```

## Ansible Playbook for Fleet Compliance

```yaml
# check_ipv6_compliance.yml
# Run against a group of hosts to audit IPv6 privacy settings

- name: Audit IPv6 privacy extension compliance
  hosts: all
  gather_facts: yes
  tasks:

    - name: Get addr_gen_mode for all non-loopback interfaces
      shell: |
        for iface in /proc/sys/net/ipv6/conf/*; do
          name=$(basename "$iface")
          [ "$name" = "lo" ] && continue
          [ "$name" = "all" ] && continue
          [ "$name" = "default" ] && continue
          mode=$(cat "$iface/addr_gen_mode" 2>/dev/null)
          echo "$name:$mode"
        done
      register: addr_gen_modes
      changed_when: false

    - name: Report non-compliant interfaces
      debug:
        msg: "NON-COMPLIANT: Interface {{ item.split(':')[0] }} has addr_gen_mode={{ item.split(':')[1] }}"
      when: item.split(':')[1] not in ['2', '3']
      loop: "{{ addr_gen_modes.stdout_lines }}"

    - name: Get use_tempaddr setting
      shell: sysctl -n net.ipv6.conf.all.use_tempaddr
      register: tempaddr
      changed_when: false

    - name: Report tempaddr status
      debug:
        msg: "use_tempaddr={{ tempaddr.stdout }} (0=disabled, 1=enabled, 2=preferred)"
```

Run the playbook:

```bash
ansible-playbook -i inventory.ini check_ipv6_compliance.yml
```

## Prometheus Custom Metric

Expose IPv6 privacy compliance as a Prometheus metric using the Node Exporter textfile collector:

```bash
#!/bin/bash
# /usr/local/bin/ipv6_privacy_metrics.sh
# Generate Prometheus metrics for IPv6 privacy compliance

OUTPUT_FILE="/var/lib/node_exporter/textfile_collector/ipv6_privacy.prom"

{
echo "# HELP ipv6_addr_gen_mode IPv6 address generation mode (2=stable-privacy)"
echo "# TYPE ipv6_addr_gen_mode gauge"

for iface in $(ls /proc/sys/net/ipv6/conf/); do
    [ "$iface" = "lo" ] && continue
    mode=$(cat /proc/sys/net/ipv6/conf/"$iface"/addr_gen_mode 2>/dev/null || echo "-1")
    echo "ipv6_addr_gen_mode{interface=\"$iface\"} $mode"
done

echo "# HELP ipv6_use_tempaddr IPv6 use_tempaddr setting"
echo "# TYPE ipv6_use_tempaddr gauge"
tempaddr=$(sysctl -n net.ipv6.conf.all.use_tempaddr 2>/dev/null || echo "-1")
echo "ipv6_use_tempaddr $tempaddr"
} > "$OUTPUT_FILE"
```

Schedule this via cron:

```bash
# /etc/cron.d/ipv6-privacy-metrics
*/5 * * * * root /usr/local/bin/ipv6_privacy_metrics.sh
```

## Alerting Rule for Grafana/Prometheus

```yaml
# alert_ipv6_privacy.yml
groups:
  - name: ipv6_privacy
    rules:
      - alert: IPv6EUI64AddressDetected
        expr: ipv6_addr_gen_mode{interface!~"lo|all|default"} == 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "IPv6 EUI-64 address generation detected"
          description: "Interface {{ $labels.interface }} on {{ $labels.instance }} is using EUI-64 (mode 0)"
```

## Conclusion

Monitoring IPv6 privacy extension compliance requires checking both kernel sysctl values and the actual addresses assigned to interfaces. The approaches above - from a standalone shell script to a full Prometheus/Alertmanager pipeline - can be layered based on the size and complexity of your environment. Regular compliance auditing ensures that system updates or configuration drift do not silently revert your privacy settings.

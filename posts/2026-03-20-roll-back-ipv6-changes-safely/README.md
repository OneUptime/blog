# How to Roll Back IPv6 Changes Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Rollback, Migration, Change Management, DNS

Description: Plan and execute safe rollback procedures for IPv6 migration changes including DNS record removal, socket binding reversion, and firewall rule restoration.

## Introduction

IPv6 migration rollback requires removing IPv6 enablement without disrupting the existing IPv4 service. The key design principle is that all IPv6 changes should be additive (adding AAAA records, adding IPv6 listeners alongside existing IPv4 listeners) rather than replacing IPv4 configurations, so rollback simply removes the additions.

## Rollback Planning Principles

1. **Keep IPv4 running throughout** - never remove IPv4 configuration before IPv6 is validated
2. **Use low DNS TTL** - set TTL to 60 seconds before publishing AAAA records
3. **Document every change** - log what was changed, when, and by whom
4. **Test rollback in staging** - practice the rollback procedure before production

## DNS Rollback (Most Common)

DNS is usually the first thing to roll back - removing AAAA records stops new DNS-based IPv6 connection attempts after cached answers expire:

```bash
#!/bin/bash
# rollback_dns_ipv6.sh - Remove AAAA records

DNS_ZONE="example.com"
DNS_SERVER="ns1.example.com"

echo "Rolling back IPv6 DNS changes..."
echo "Start time: $(date)"

# Remove AAAA records for public-facing services

# (adjust hostnames and addresses for your environment)
HOSTNAMES=(
    "www.example.com"
    "api.example.com"
    "mail.example.com"
)

for hostname in "${HOSTNAMES[@]}"; do
    # Get current AAAA records
    CURRENT_AAAA=$(dig "$hostname" AAAA +short)
    if [ -n "$CURRENT_AAAA" ]; then
        echo "Removing AAAA for $hostname:"
        echo "$CURRENT_AAAA"
        # With nsupdate (for BIND with dynamic DNS)
        nsupdate << EOF
server ${DNS_SERVER}
zone ${DNS_ZONE}
update delete ${hostname} AAAA
send
EOF
    else
        echo "No AAAA record for $hostname - skipping"
    fi
done

echo "DNS rollback complete."
echo "Wait 60 seconds for TTL expiry before verifying..."
sleep 60

# Verify AAAA records are gone
for hostname in "${HOSTNAMES[@]}"; do
    REMAINING=$(dig "$hostname" AAAA +short)
    if [ -z "$REMAINING" ]; then
        echo "[OK] $hostname: AAAA removed"
    else
        echo "[WARN] $hostname: AAAA still present: $REMAINING"
    fi
done
```

## Application Rollback

If an application was updated to bind only to `::`, roll back to `0.0.0.0`:

```bash
#!/bin/bash
# rollback_app_ipv6.sh

APP_NAME="my-service"
ROLLBACK_IMAGE="my-service:v1.2.3-ipv4"  # Last known good IPv4 image

echo "Rolling back $APP_NAME to IPv4-only configuration..."

# Docker
docker stop "$APP_NAME"
docker rm "$APP_NAME"
docker run -d --name "$APP_NAME" \
    -e LISTEN_ADDR=0.0.0.0 \
    -e LISTEN_PORT=8080 \
    "$ROLLBACK_IMAGE"

# Kubernetes
kubectl rollout undo deployment/"$APP_NAME"
# Or set a specific image instead:
# kubectl set image deployment/"$APP_NAME" app="$ROLLBACK_IMAGE"
kubectl rollout status deployment/"$APP_NAME"
```

## Firewall Rollback

```bash
#!/bin/bash
# rollback_ipv6_firewall.sh

IP6TABLES_BACKUP="/etc/ip6tables.backup"

# Restore previous ip6tables rules (if saved)
echo "Restoring previous IPv6 firewall rules..."
if [ -f "$IP6TABLES_BACKUP" ]; then
    ip6tables-restore < "$IP6TABLES_BACKUP"
    echo "Restored ip6tables from $IP6TABLES_BACKUP"
else
    echo "[WARN] No $IP6TABLES_BACKUP found"
    echo "[WARN] Delete only the IPv6 rules added during migration; do not flush all IPv6 firewall rules unless opening IPv6 traffic is intended."
fi

echo "Firewall rollback complete"
```

## Pre-Change Backup Procedure

Always create backups before making changes:

```bash
#!/bin/bash
# pre_change_backup.sh - Run BEFORE any IPv6 change

BACKUP_DIR="/var/backup/ipv6-migration/$(date +%Y%m%d-%H%M%S)"
IP6TABLES_BACKUP="/etc/ip6tables.backup"
mkdir -p "$BACKUP_DIR"

# Save current DNS records
dig www.example.com AAAA +short > "$BACKUP_DIR/dns-aaaa-before.txt"
dig www.example.com A +short > "$BACKUP_DIR/dns-a-before.txt"

# Save firewall rules
iptables-save  > "$BACKUP_DIR/iptables-before.rules"
ip6tables-save > "$BACKUP_DIR/ip6tables-before.rules"
cp "$BACKUP_DIR/ip6tables-before.rules" "$IP6TABLES_BACKUP"

# Save running container config
docker inspect my-service > "$BACKUP_DIR/container-config-before.json" 2>/dev/null

# Save Kubernetes deployments
kubectl get deployment -o yaml > "$BACKUP_DIR/k8s-deployments-before.yaml" 2>/dev/null

echo "Backup created: $BACKUP_DIR"
ls -la "$BACKUP_DIR"
```

## Rollback Runbook Template

```markdown
# IPv6 Rollback Runbook: [Service Name]

## Trigger Conditions
Roll back if any of the following occur:
- IPv6 error rate > 5% for 5 minutes
- IPv6 service completely unreachable
- User complaints about connectivity exceeding threshold

## Rollback Steps

1. **DNS** (2 minutes)
   - Command: `./rollback_dns_ipv6.sh`
   - Verify: `dig www.example.com AAAA +short` returns empty

2. **Application** (3 minutes, if needed)
   - Command: `kubectl rollout undo deployment/my-service`
   - Verify: `kubectl rollout status deployment/my-service`

3. **Firewall** (1 minute, if needed)
   - Command: `ip6tables-restore < /etc/ip6tables.backup`

4. **Communication**
   - Notify: #ops-channel, #on-call
   - Update status page if customer-facing

## Post-Rollback
- File incident report
- Capture logs from the failure window
- Identify root cause before next migration attempt
```

## Conclusion

Safe IPv6 rollback relies on additive-only changes (AAAA records added on top of A records, IPv6 listeners added alongside `0.0.0.0` listeners) and low DNS TTLs during migration. Create backups before every change. The fastest rollback is DNS - removing AAAA records stops new DNS-based IPv6 connection attempts after cached AAAA answers expire when TTL is set low. Design rollback runbooks before starting each migration phase, and practice them in staging to ensure they work correctly under pressure.

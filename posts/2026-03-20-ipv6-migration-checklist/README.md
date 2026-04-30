# How to Create an IPv6 Migration Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Migration, Checklist, Project Management, DevOps

Description: A comprehensive IPv6 migration checklist covering pre-migration, per-service, and post-migration tasks with pass/fail criteria for each item.

## Introduction

A migration checklist provides a shared source of truth for all teams involved in IPv6 enablement. It transforms the abstract roadmap into actionable tasks with clear completion criteria. This guide presents a reusable checklist organized by phase and team.

## Pre-Migration Checklist

### Address Planning
- [ ] IPv6 address block allocated from RIR or ISP (document the actual allocation size; commonly /32 for ISPs/LIRs and /48–/56 for end sites)
- [ ] Hierarchical addressing scheme designed (region → site → VLAN → host)
- [ ] Subnets assigned: all VLANs have /64 assignments
- [ ] Loopback addresses assigned to all routers and key servers
- [ ] Management network assigned a dedicated IPv6 /64
- [ ] IPAM system (NetBox or equivalent) populated with the address plan

### Network Equipment
- [ ] All core routers support IPv6 hardware forwarding
- [ ] All switches support IPv6 RA Guard and DHCPv6 snooping
- [ ] Firewalls support IPv6 stateful inspection
- [ ] Load balancers support IPv6 virtual IPs
- [ ] DNS servers support AAAA record creation and DNSSEC signing

### Security
- [ ] IPv6 firewall default policies reviewed (deny all, allow established)
- [ ] RA Guard configured on all access switch ports
- [ ] DHCPv6 snooping enabled on access switches
- [ ] IPv6 ACLs mirror equivalent IPv4 ACLs
- [ ] Fail2Ban or equivalent configured for IPv6 ban actions

## Per-Service Checklist

Use this for each service being migrated:

### Service: ____________________

**Pre-Migration**
- [ ] Service runs in staging with IPv6 connectivity
- [ ] AAAA DNS record prepared (not yet published)
- [ ] Load balancer IPv6 VIP configured
- [ ] Firewall rules permit IPv6 to this service
- [ ] SSL certificate covers same hostnames (certificates are not IP-version specific)
- [ ] Application listens on IPv6 (often by binding to `::` or equivalent IPv6 listener configuration)
- [ ] X-Forwarded-For / X-Real-IP handling updated for IPv6
- [ ] Health checks updated to use IPv6 endpoints

**Go-Live**
- [ ] Deploy updated application configuration
- [ ] Publish AAAA DNS record (low TTL: 60 seconds)
- [ ] Verify service responds: `curl -6 https://service.example.com`
- [ ] Verify IPv6 address appears in access logs
- [ ] Monitoring shows IPv6 traffic

**Post Go-Live**
- [ ] Increase DNS TTL to normal value (300–3600 seconds)
- [ ] IPAM updated with service IPv6 addresses
- [ ] Runbook updated with IPv6 troubleshooting steps
- [ ] Alert thresholds reviewed for IPv6 traffic patterns

## Network Layer Checklist

```bash
#!/bin/bash
# run_migration_checks.sh - automated checklist verification

FAIL=0
PASS=0

check() {
    local desc="$1"
    shift
    if "$@" &>/dev/null; then
        echo "  [PASS] $desc"
        PASS=$((PASS+1))
    else
        echo "  [FAIL] $desc"
        FAIL=$((FAIL+1))
    fi
}

echo "=== Network Layer IPv6 Checks ==="
check "IPv6 enabled on current interfaces" bash -c '
for f in /proc/sys/net/ipv6/conf/*/disable_ipv6; do
    case "$f" in
        */all/disable_ipv6|*/default/disable_ipv6) continue ;;
    esac
    [ "$(cat "$f")" = 0 ] || exit 1
done
'
check "IPv6 default route present" bash -c "ip -6 route show default | grep -q ."
check "AAAA DNS resolution works" bash -c "dig AAAA google.com +short | grep -q ':'"
check "IPv6 external reach" ping -6 -c 2 2001:4860:4860::8888
check "IPv6 NDP cache populated" bash -c "ip -6 neigh show | grep -q ."
check "IPv6 forwarding enabled (router)" bash -c '[ "$(sysctl -qn net.ipv6.conf.all.forwarding)" = 1 ]'

echo ""
echo "=== Service Layer IPv6 Checks ==="
# Check common service ports; adjust this list for your environment

for port in 80 443 22 25 53; do
    check "Port $port listening on IPv6" bash -c "ss -H -lnut6 \"sport = :$port\" | grep -q ."
done

echo ""
echo "Result: PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
```

## Post-Migration Checklist

- [ ] All services have AAAA DNS records published
- [ ] IPv6 traffic visible in dashboards (not zero)
- [ ] IPv6 error rate comparable to IPv4 error rate
- [ ] Monitoring alerts tested with IPv6 addresses
- [ ] Incident runbooks updated for IPv6 troubleshooting
- [ ] All firewall rules reviewed: no IPv4-only rules that should apply to IPv6
- [ ] IPAM reflects current deployed state
- [ ] Stakeholder sign-off on IPv6 acceptance criteria

## Conclusion

An IPv6 migration checklist prevents the most common failure modes: services that were not enabled, DNS records not published, firewall rules that block IPv6, and monitoring that does not see IPv6 traffic. Organize the checklist by phase (pre-migration, per-service, post-migration) and assign items to specific teams. Automate what you can - shell scripts that verify service listening, connectivity, and DNS records catch issues before they cause incidents.

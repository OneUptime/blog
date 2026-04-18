# How to Validate IPv6 Lab Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Lab, Validation, Testing, Connectivity, Scripting

Description: Systematically validate IPv6 lab connectivity including reachability, routing, DNS, MTU, and protocol-specific checks.

## Comprehensive Connectivity Validation Script

```bash
#!/bin/bash
# validate-ipv6-lab.sh - Run after building IPv6 lab

PASS=0
FAIL=0
WARN=0

pass() { echo "  PASS: $1"; ((PASS++)); }
fail() { echo "  FAIL: $1"; ((FAIL++)); }
warn() { echo "  WARN: $1"; ((WARN++)); }

section() { echo ""; echo "=== $1 ==="; }

# ─────────────────────────────────────────────────────────

section "1. Basic IPv6 Configuration"

# Check IPv6 is enabled on kernel
if [ "$(cat /proc/sys/net/ipv6/conf/all/disable_ipv6)" -eq 0 ]; then
    pass "IPv6 enabled in kernel"
else
    fail "IPv6 disabled in kernel (disable_ipv6=1)"
fi

# Check at least one global unicast address
GLOBAL=$(ip -6 addr show scope global | grep -c inet6)
if [ "${GLOBAL}" -gt 0 ]; then
    pass "Global unicast address present (${GLOBAL} addresses)"
else
    warn "No global unicast address - only link-local?"
fi

# Check forwarding (for routers)
FWDING=$(sysctl -n net.ipv6.conf.all.forwarding)
if [ "${FWDING}" -eq 1 ]; then
    pass "IPv6 forwarding enabled"
else
    warn "IPv6 forwarding disabled (expected for hosts)"
fi

# ─────────────────────────────────────────────────────────
section "2. Reachability Tests"

TARGETS=(
    "::1|loopback"
    "2001:db8::1|Router1"
    "2001:db8::2|Router2"
)

for TARGET_PAIR in "${TARGETS[@]}"; do
    ADDR="${TARGET_PAIR%%|*}"
    NAME="${TARGET_PAIR#*|}"

    if ping6 -c 2 -W 2 -q "${ADDR}" &>/dev/null; then
        pass "Reachable: ${NAME} (${ADDR})"
    else
        fail "Unreachable: ${NAME} (${ADDR})"
    fi
done

# ─────────────────────────────────────────────────────────
section "3. DNS Resolution"

# AAAA lookup
AAAA=$(host -t AAAA ipv6.google.com 8.8.8.8 2>/dev/null | grep "has IPv6")
if [ -n "${AAAA}" ]; then
    pass "DNS AAAA resolution (Google)"
else
    fail "DNS AAAA resolution failed"
fi

# Reverse DNS
PTR=$(host -t PTR 1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.0.0.2.ip6.arpa 2>/dev/null | grep "domain name")
if [ -n "${PTR}" ]; then
    pass "Reverse DNS (PTR) resolution"
else
    warn "Reverse DNS resolution failed (may be expected)"
fi

# ─────────────────────────────────────────────────────────
section "4. MTU Path Discovery"

# Test progressive payload sizes
MTU_OK=0
for SIZE in 1280 1400 1450 1480; do
    if ping6 -c 1 -M do -s ${SIZE} -W 2 2001:db8::1 &>/dev/null; then
        MTU_OK=${SIZE}
    else
        break
    fi
done

if [ ${MTU_OK} -ge 1280 ]; then
    pass "MTU path working up to ${MTU_OK} bytes"
else
    fail "MTU issue: packets fail at 1280 bytes"
fi

# ─────────────────────────────────────────────────────────
section "5. Routing Table Validation"

# Default route
if ip -6 route show default | grep -q via; then
    pass "Default IPv6 route present"
else
    warn "No default IPv6 route"
fi

# Specific prefixes
ip -6 route show | grep -q "2001:db8" && \
    pass "Lab prefix (2001:db8::/32) in routing table" || \
    warn "No lab routes in routing table"

# Summary
echo ""
echo "─────────────────────────────────────────"
echo "PASS: ${PASS}  FAIL: ${FAIL}  WARN: ${WARN}"
[ "${FAIL}" -eq 0 ] && echo "Status: PASS" || echo "Status: FAIL"
```

## Protocol-Specific Validation

```bash
# Validate DHCPv6 client received prefix
dhclient -6 eth0 && ip -6 addr show eth0 | grep inet6

# Validate SLAAC address generation
ip -6 addr show scope global | grep inet6 | grep -v temporary

# Validate NDP neighbor cache
ip -6 neigh show | grep REACHABLE

# Validate OSPFv3 adjacencies (FRR)
vtysh -c "show ipv6 ospf6 neighbor" | grep "Full"

# Validate BGP IPv6 sessions (FRR)
vtysh -c "show bgp ipv6 unicast summary" | grep "Established"
```

## TCP Port Reachability Validation

```bash
#!/bin/bash
# validate-services.sh

check_port() {
    local HOST=$1
    local PORT=$2
    local NAME=$3

    if nc -z -6 -w 3 ${HOST} ${PORT} 2>/dev/null; then
        echo "  PASS: ${NAME} [${HOST}]:${PORT}"
    else
        echo "  FAIL: ${NAME} [${HOST}]:${PORT}"
    fi
}

echo "=== Service Availability ==="
check_port "2001:db8::1" 22 "SSH Router1"
check_port "2001:db8::1" 80 "HTTP Router1"
check_port "2001:db8::1" 443 "HTTPS Router1"
check_port "2001:db8::2" 22 "SSH Router2"
```

## Conclusion

IPv6 lab validation requires checking multiple layers: kernel configuration, address assignment, routing, DNS, MTU path discovery, and application port reachability. A systematic pass/fail script catches issues immediately after topology changes. MTU validation is particularly important because IPv6 mandates a minimum 1280-byte MTU - anything below this breaks NDP and routing protocol traffic. Run validation after every topology change or provisioning update to ensure the lab remains functional.

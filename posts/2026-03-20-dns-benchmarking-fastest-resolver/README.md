# How to Use DNS Benchmarking Tools to Find the Fastest Resolver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Benchmarking, Performance, Linux, Resolver, Optimization

Description: Benchmark multiple DNS resolvers to find the fastest one for your network location using namebench, dnsperftest, and custom measurement scripts.

## Introduction

The fastest DNS resolver for your location depends on your network path, ISP peering, and geographic proximity to resolver infrastructure. Popular public resolvers such as Google (8.8.8.8), Cloudflare (1.1.1.1), and Quad9 (9.9.9.9) are common candidates, but the winner varies by network and query mix. Your ISP's resolver may be fastest for ISP-cached queries. Benchmarking from your actual network location determines which resolver minimizes DNS lookup time.

## Quick Resolver Comparison

```bash
#!/bin/bash
# Quick DNS resolver benchmark

DOMAINS=(google.com amazon.com github.com cloudflare.com netflix.com
         stackoverflow.com reddit.com twitter.com microsoft.com apple.com)

declare -A RESOLVERS=(
    ["Cloudflare"]="1.1.1.1"
    ["Google"]="8.8.8.8"
    ["Quad9"]="9.9.9.9"
    ["OpenDNS"]="208.67.222.222"
    ["AdGuard"]="94.140.14.14"
    ["NextDNS"]="45.90.28.0"
    ["System"]="$(grep ^nameserver /etc/resolv.conf | head -1 | awk '{print $2}')"
)

echo "Testing DNS resolvers from this location..."
echo ""
printf "%-15s | %-7s | %-7s | %-7s\n" "Resolver" "Avg" "Min" "Max"
printf "%-15s | %-7s | %-7s | %-7s\n" "---------------" "-------" "-------" "-------"

for name in "${!RESOLVERS[@]}"; do
    resolver="${RESOLVERS[$name]}"
    [ -z "$resolver" ] && continue

    total=0; count=0; min=99999; max=0

    for domain in "${DOMAINS[@]}"; do
        rt=$(dig @$resolver +tries=1 +timeout=3 $domain 2>/dev/null | \
             grep "Query time" | awk '{print $4}')
        if [ -n "$rt" ]; then
            total=$((total + rt))
            count=$((count + 1))
            [ $rt -lt $min ] && min=$rt
            [ $rt -gt $max ] && max=$rt
        fi
    done

    if [ $count -gt 0 ]; then
        avg=$((total / count))
        printf "%-15s | %-7s | %-7s | %-7s\n" \
          "$name" "${avg}ms" "${min}ms" "${max}ms"
    fi
done
```

## namebench (Historical Reference)

```bash
# namebench is archived and unmaintained.
# The current upstream repository is an experimental rewrite and does not support
# the old command-line flags.
# The old Google Code download URL is gone, and `pip install namebench` no longer works.
# For current Linux benchmarking, prefer the dig-based script above and resperf below.
```

## Use resperf for Load Testing

```bash
# Install the dnsperf package (includes resperf):
apt-get install dnsperf -y

# Create a small query file for a smoke test:
cat > /tmp/bench_queries.txt << 'EOF'
google.com A
amazon.com A
github.com A
cloudflare.com A
facebook.com A
twitter.com A
instagram.com A
youtube.com A
netflix.com A
microsoft.com A
EOF

# For meaningful throughput tests, use a much larger query set from your own traffic.
# For recursive resolvers on the live Internet, use resperf rather than dnsperf.
# Run this only against a resolver you control or a lab target:
resperf -s 10.0.0.2 -d /tmp/bench_queries.txt -m 500 -c 5
```

## Measure Cache Hit Rate Impact

```bash
# Test: cached vs uncached performance for each resolver
# Uncached here = reduce answer-cache hits with unique names
# Cached = warm (resolver has it from recent query)

# Uncached test: query random subdomains to reduce answer-cache hits
for resolver in 8.8.8.8 1.1.1.1; do
    echo "=== $resolver (uncached) ==="
    for i in $(seq 1 5); do
        RAND=$(cat /dev/urandom | tr -dc 'a-z' | head -c 8)
        # Generate unique subdomains to avoid repeated answers
        RT=$(dig @$resolver ${RAND}.example.com +tries=1 +timeout=3 2>/dev/null | \
             grep "Query time" | awk '{print $4}')
        echo "${RT}ms"
    done
done

# Cached test: query popular domains (likely cached at all resolvers)
for resolver in 8.8.8.8 1.1.1.1; do
    echo "=== $resolver (likely cached) ==="
    for domain in google.com cloudflare.com amazon.com; do
        RT=$(dig @$resolver $domain +tries=1 2>/dev/null | \
             grep "Query time" | awk '{print $4}')
        echo "$domain: ${RT}ms"
    done
done
```

## Regional Considerations

```bash
# DNS resolver performance varies by region and ISP
# Some resolvers use Anycast: same IP routes to nearest datacenter

# Trace the route to a resolver to inspect the network path:
traceroute 1.1.1.1
traceroute 8.8.8.8
# Hop count is only a rough signal; it does not reliably indicate geography or latency.

# Check the Cloudflare edge serving your HTTP request:
curl -s https://cloudflare.com/cdn-cgi/trace | grep '^colo='
# colo=LHR → London edge

# Query Google's documented DoH JSON API:
curl -s 'https://dns.google/resolve?name=example.com&type=A'
# Returns JSON DNS data; Google does not expose a simple public PoP-identification endpoint here
```

## Apply Best Resolver

```bash
# After finding the fastest resolver, apply it:
# For systemd-resolved:
# FallbackDNS= is only used when no other DNS server information is known,
# so put the servers you want to use in DNS=.
cat > /etc/systemd/resolved.conf << 'EOF'
[Resolve]
DNS=1.1.1.1 8.8.8.8 9.9.9.9
EOF
systemctl restart systemd-resolved

# For /etc/resolv.conf (only on systems that manage it statically):
cat > /etc/resolv.conf << 'EOF'
nameserver 1.1.1.1     # Fastest resolver
nameserver 8.8.8.8     # Fallback
EOF
```

## Conclusion

DNS resolver benchmarking from your actual network location gives you ground truth on which resolver is fastest for your users. Use the benchmark script to compare Cloudflare, Google, Quad9, and your system-configured resolver. Cloudflare and Google are common top performers because of their large Anycast footprints, but the winner still varies by network, resolver policy, and query mix. Your ISP's resolver may win for queries that are frequently cached on your ISP's network. Test cached and uncached performance separately since they have very different characteristics.

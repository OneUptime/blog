# How to Log and Analyze DNSSEC Validation Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: DNSSEC, Logging, DNS, Security, Troubleshooting, Analysis

Description: A comprehensive guide to configuring DNS resolver logging, capturing DNSSEC validation failures, and analyzing them to maintain secure and reliable DNS infrastructure.

---

It's 3:17 AM. Your monitoring dashboard lights up with alerts. Users report that parts of your application are unreachable. Your web servers are healthy, your databases are responding, and your load balancers show green across the board. Yet customers cannot access your services. The culprit? Silent DNSSEC validation failures that your logging infrastructure never captured.

DNSSEC (Domain Name System Security Extensions) protects users from DNS spoofing and cache poisoning attacks by cryptographically signing DNS records. When validation fails, legitimate queries can be rejected, causing service disruptions that masquerade as network issues. Without proper logging and analysis, these failures become invisible gremlins in your infrastructure.

This guide walks you through configuring comprehensive DNSSEC logging, building analysis pipelines, and establishing monitoring patterns that catch validation failures before they impact users.

---

## Why DNSSEC Validation Failures Matter

DNSSEC validation failures occur when a DNS resolver cannot verify the cryptographic chain of trust for a domain. Common causes include:

- **Expired signatures**: RRSIG records have a validity period that can expire
- **Key rollovers gone wrong**: DNSKEY updates not propagated correctly
- **Clock skew**: System time differences affecting signature validation
- **Broken delegation**: DS records in parent zone not matching child zone keys
- **Network issues**: Truncated responses or blocked UDP/TCP traffic
- **Misconfigured zones**: Missing or malformed DNSSEC records

When validation fails, a DNSSEC-enforcing resolver returns a SERVFAIL response, effectively making the domain unreachable. Unlike a standard DNS failure, users cannot simply "try again" because the resolver will consistently reject the invalid response.

The impact cascades quickly:
- Web applications fail to load external resources
- API integrations break silently
- Email delivery stops
- Certificate validation fails (DANE/TLSA)
- CDN edge nodes lose connectivity

---

## Understanding DNSSEC Validation Flow

Before diving into logging configuration, understanding the validation flow helps you know what to capture:

```text
1. Client queries resolver for example.com A record
2. Resolver queries root servers (.) for example.com
3. Root servers return DS record for .com and referral
4. Resolver queries .com TLD servers
5. TLD servers return DS record for example.com and referral
6. Resolver queries example.com authoritative servers
7. Authoritative servers return A record + RRSIG signature
8. Resolver validates RRSIG using DNSKEY from example.com
9. Resolver validates DNSKEY using DS record from .com
10. Chain continues to root trust anchor
11. If any step fails -> SERVFAIL returned to client
```

Each step in this chain can fail, and your logging must capture enough detail to identify which step broke and why.

---

## Configuring BIND 9 for DNSSEC Logging

BIND 9 is the most widely deployed DNS resolver. Here is a comprehensive logging configuration:

### Basic Logging Configuration

```named.conf
logging {
    // Define log file channels
    channel dnssec_log {
        file "/var/log/named/dnssec.log" versions 10 size 100m;
        severity debug 3;
        print-time yes;
        print-severity yes;
        print-category yes;
    };

    channel validation_log {
        file "/var/log/named/validation.log" versions 10 size 50m;
        severity info;
        print-time yes;
        print-severity yes;
        print-category yes;
    };

    channel query_log {
        file "/var/log/named/queries.log" versions 10 size 200m;
        severity info;
        print-time yes;
        print-severity yes;
        print-category yes;
    };

    channel security_log {
        file "/var/log/named/security.log" versions 5 size 50m;
        severity warning;
        print-time yes;
        print-severity yes;
        print-category yes;
    };

    // Route categories to channels
    category dnssec { dnssec_log; };
    category dnssec-validation { validation_log; };
    category queries { query_log; };
    category security { security_log; };
    category resolver { dnssec_log; };
};
```

### Enhanced DNSSEC Options

```named.conf
options {
    directory "/var/named";

    // Enable DNSSEC validation
    dnssec-validation auto;

    // Log validation failures with full detail
    dnssec-must-be-secure example.com yes;

    // Enable query logging for correlation
    querylog yes;

    // Response policy logging
    response-policy { zone "rpz.local"; }
        qname-wait-recurse no;
};
```

### Structured Logging with JSON Output

For modern log analysis pipelines, configure JSON output:

```named.conf
logging {
    channel dnssec_json {
        file "/var/log/named/dnssec.json" versions 10 size 100m;
        severity debug 3;
        print-time iso8601;
        print-category yes;
        print-severity yes;
    };

    category dnssec { dnssec_json; };
    category dnssec-validation { dnssec_json; };
};
```

---

## Configuring Unbound for DNSSEC Logging

Unbound is a popular validating resolver with excellent logging capabilities:

### Basic Unbound Configuration

```yaml
# /etc/unbound/unbound.conf
server:
    # Enable DNSSEC validation
    auto-trust-anchor-file: "/var/lib/unbound/root.key"

    # Logging verbosity (0-5)
    # 0: No verbosity, only errors
    # 1: Operational information
    # 2: Detailed operational information
    # 3: Query level information
    # 4: Algorithm level information
    # 5: Client identification for cache misses
    verbosity: 3

    # Log DNSSEC validation failures
    val-log-level: 2

    # Log file location
    logfile: "/var/log/unbound/unbound.log"

    # Use syslog instead (recommended for central logging)
    use-syslog: yes
    log-tag-queryreply: yes
    log-local-actions: yes
    log-servfail: yes

    # Extended statistics
    extended-statistics: yes
    statistics-interval: 300
    statistics-cumulative: no
```

### Advanced Validation Logging

```yaml
server:
    # Log all validation failures
    val-log-level: 2

    # Log the reason for BOGUS status
    log-replies: yes
    log-queries: yes

    # Include timing information
    log-time-ascii: yes

    # Log identity for debugging
    log-identity: "resolver-01"

    # Detailed DNSSEC debugging
    val-clean-additional: yes
    val-permissive-mode: no

    # Trust anchor reporting
    trust-anchor-signaling: yes
    root-key-sentinel: yes
```

### Unbound Remote Control for Live Debugging

```yaml
remote-control:
    control-enable: yes
    control-interface: 127.0.0.1
    control-port: 8953
    server-key-file: "/etc/unbound/unbound_server.key"
    server-cert-file: "/etc/unbound/unbound_server.pem"
    control-key-file: "/etc/unbound/unbound_control.key"
    control-cert-file: "/etc/unbound/unbound_control.pem"
```

Use `unbound-control` for live DNSSEC debugging:

```bash
# Dump current validation status
unbound-control dump_cache | grep -E "(BOGUS|SERVFAIL)"

# Get detailed statistics including DNSSEC
unbound-control stats_noreset

# Flush specific domain and retry
unbound-control flush example.com
unbound-control flush_zone example.com
```

---

## Configuring PowerDNS Recursor

PowerDNS Recursor offers excellent DNSSEC validation with detailed logging:

```lua
-- /etc/pdns-recursor/recursor.conf

-- Enable DNSSEC validation
dnssec=validate

-- Logging configuration
loglevel=5
log-timestamp=yes
log-common-errors=yes

-- DNSSEC specific logging
dnssec-log-bogus=yes

-- Structured logging
structured-logging=yes
structured-logging-backend=json

-- Log file
logging-facility=0
log-dns-details=yes
log-dns-queries=yes

-- Statistics
stats-ringbuffer-entries=10000
statistics-interval=60
```

### PowerDNS Lua Scripting for Custom Logging

```lua
-- /etc/pdns-recursor/dnssec-logger.lua

function postresolve(dq)
    -- Log DNSSEC validation failures
    if dq.validationState == pdns.validationstates.Bogus then
        pdnslog("DNSSEC_BOGUS: " .. dq.qname:toString() ..
                " type=" .. dq.qtype ..
                " rcode=" .. dq.rcode ..
                " client=" .. dq.remoteaddr:toString(),
                pdns.loglevels.Warning)
    end

    if dq.validationState == pdns.validationstates.Insecure then
        pdnslog("DNSSEC_INSECURE: " .. dq.qname:toString() ..
                " type=" .. dq.qtype,
                pdns.loglevels.Info)
    end

    return true
end
```

---

## Systemd Journal Configuration for DNS Logging

For systems using systemd, configure the journal for DNS log capture:

```ini
# /etc/systemd/journald.conf.d/dns-logging.conf
[Journal]
Storage=persistent
Compress=yes
SystemMaxUse=2G
SystemKeepFree=1G
SystemMaxFileSize=100M
MaxRetentionSec=30day
ForwardToSyslog=yes
```

Query DNSSEC failures from journald:

```bash
# View DNSSEC-related messages
journalctl -u named.service --grep="DNSSEC|validation|BOGUS"

# Follow live DNSSEC failures
journalctl -u unbound.service -f | grep -E "(BOGUS|SERVFAIL|validation)"

# Export to JSON for analysis
journalctl -u named.service --output=json --since="1 hour ago" > dns-logs.json
```

---

## Log Analysis Techniques

### Pattern Matching for DNSSEC Failures

Common log patterns indicating DNSSEC validation failures:

```text
# BIND 9 patterns
"no valid signature found"
"validate: no valid RRSIG"
"not insecure resolving"
"RRSIG validity period has not begun"
"RRSIG has expired"
"verify: DNSKEY not found"
"DS RRset for zone is not present"
"DNSKEY: algorithm unknown"

# Unbound patterns
"validation failure"
"response has failed DNSSEC validation"
"BOGUS"
"signature expired"
"no signatures"
"wrong number of labels"
"NSEC3 closest encloser proof failed"

# PowerDNS patterns
"Bogus"
"validation failed"
"no DNSKEY to verify"
"signature not valid"
```

### grep and awk Analysis Scripts

```bash
#!/bin/bash
# dnssec-failure-analysis.sh

LOG_FILE="/var/log/named/dnssec.log"
OUTPUT_DIR="/var/log/named/analysis"

mkdir -p "$OUTPUT_DIR"

# Extract unique domains with validation failures
grep -E "(BOGUS|validation failure|no valid signature)" "$LOG_FILE" | \
    awk '{print $NF}' | \
    sed 's/[()]//g' | \
    sort | uniq -c | sort -rn > "$OUTPUT_DIR/failed-domains.txt"

# Time-series analysis of failures
grep -E "(BOGUS|validation failure)" "$LOG_FILE" | \
    awk '{print $1, $2}' | \
    cut -d: -f1,2 | \
    uniq -c > "$OUTPUT_DIR/failures-by-hour.txt"

# Extract specific failure reasons
grep -oE "(signature expired|DNSKEY not found|DS not found|algorithm unknown)" "$LOG_FILE" | \
    sort | uniq -c | sort -rn > "$OUTPUT_DIR/failure-reasons.txt"

# Client IP analysis
grep -E "(BOGUS|SERVFAIL)" "$LOG_FILE" | \
    grep -oE "client [0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" | \
    awk '{print $2}' | \
    sort | uniq -c | sort -rn > "$OUTPUT_DIR/affected-clients.txt"

echo "Analysis complete. Results in $OUTPUT_DIR"
```

### Python Analysis Script

```python
#!/usr/bin/env python3
"""
DNSSEC Validation Failure Analyzer
Parses DNS resolver logs and generates failure reports
"""

import re
import json
from datetime import datetime
from collections import defaultdict
from pathlib import Path

class DNSSECAnalyzer:
    def __init__(self, log_path):
        self.log_path = Path(log_path)
        self.failures = defaultdict(list)
        self.failure_reasons = defaultdict(int)
        self.affected_domains = defaultdict(int)
        self.hourly_failures = defaultdict(int)

        # Regex patterns for different resolver formats
        self.patterns = {
            'bind_bogus': re.compile(
                r'(\d{2}-\w{3}-\d{4}\s+\d{2}:\d{2}:\d{2}\.\d+).*'
                r'(BOGUS|no valid signature).*?([a-zA-Z0-9.-]+\.[a-zA-Z]+)'
            ),
            'unbound_validation': re.compile(
                r'(\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2}).*'
                r'validation failure.*?<([a-zA-Z0-9.-]+)>'
            ),
            'failure_reason': re.compile(
                r'(signature expired|DNSKEY not found|DS not found|'
                r'algorithm unknown|NSEC3 proof failed|no signatures|'
                r'RRSIG expired|validity period)'
            ),
            'client_ip': re.compile(r'client\s+(\d+\.\d+\.\d+\.\d+)'),
        }

    def parse_logs(self):
        """Parse log file and extract DNSSEC failures"""
        with open(self.log_path, 'r') as f:
            for line in f:
                self._process_line(line)
        return self

    def _process_line(self, line):
        """Process a single log line"""
        # Check for BOGUS or validation failure
        for pattern_name, pattern in self.patterns.items():
            match = pattern.search(line)
            if match:
                if pattern_name == 'bind_bogus':
                    self._record_failure(match.group(1), match.group(3), line)
                elif pattern_name == 'unbound_validation':
                    self._record_failure(match.group(1), match.group(2), line)
                elif pattern_name == 'failure_reason':
                    self.failure_reasons[match.group(1)] += 1

    def _record_failure(self, timestamp_str, domain, raw_line):
        """Record a validation failure"""
        self.affected_domains[domain] += 1

        # Extract hour for time series
        try:
            # Handle different timestamp formats
            if '-' in timestamp_str:
                dt = datetime.strptime(timestamp_str[:20], '%d-%b-%Y %H:%M:%S')
            else:
                dt = datetime.strptime(timestamp_str, '%b %d %H:%M:%S')
                dt = dt.replace(year=datetime.now().year)

            hour_key = dt.strftime('%Y-%m-%d %H:00')
            self.hourly_failures[hour_key] += 1
        except ValueError:
            pass

        self.failures[domain].append({
            'timestamp': timestamp_str,
            'raw': raw_line.strip()
        })

    def generate_report(self):
        """Generate analysis report"""
        report = {
            'summary': {
                'total_failures': sum(self.affected_domains.values()),
                'unique_domains': len(self.affected_domains),
                'analysis_time': datetime.now().isoformat()
            },
            'top_failing_domains': dict(
                sorted(self.affected_domains.items(),
                       key=lambda x: x[1], reverse=True)[:20]
            ),
            'failure_reasons': dict(self.failure_reasons),
            'hourly_distribution': dict(
                sorted(self.hourly_failures.items())
            )
        }
        return report

    def export_json(self, output_path):
        """Export report to JSON"""
        report = self.generate_report()
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"Report exported to {output_path}")

    def print_summary(self):
        """Print human-readable summary"""
        report = self.generate_report()

        print("\n" + "="*60)
        print("DNSSEC VALIDATION FAILURE ANALYSIS")
        print("="*60)

        print(f"\nTotal Failures: {report['summary']['total_failures']}")
        print(f"Unique Domains: {report['summary']['unique_domains']}")

        print("\nTop 10 Failing Domains:")
        print("-"*40)
        for domain, count in list(report['top_failing_domains'].items())[:10]:
            print(f"  {domain}: {count} failures")

        print("\nFailure Reasons:")
        print("-"*40)
        for reason, count in report['failure_reasons'].items():
            print(f"  {reason}: {count}")

        print("\nHourly Distribution (last 24 entries):")
        print("-"*40)
        for hour, count in list(report['hourly_distribution'].items())[-24:]:
            bar = "#" * min(count, 50)
            print(f"  {hour}: {bar} ({count})")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python dnssec_analyzer.py <log_file> [output.json]")
        sys.exit(1)

    analyzer = DNSSECAnalyzer(sys.argv[1])
    analyzer.parse_logs()
    analyzer.print_summary()

    if len(sys.argv) > 2:
        analyzer.export_json(sys.argv[2])
```

---

## Real-time Monitoring with OpenTelemetry

Integrate DNSSEC logging with OpenTelemetry for modern observability:

### OpenTelemetry Collector Configuration

```yaml
# otel-collector-config.yaml
receivers:
  filelog/dnssec:
    include:
      - /var/log/named/dnssec.log
      - /var/log/unbound/unbound.log
    operators:
      - type: regex_parser
        regex: '^(?P<timestamp>\d{2}-\w{3}-\d{4}\s+\d{2}:\d{2}:\d{2}\.\d+)\s+(?P<category>\w+):\s+(?P<severity>\w+):\s+(?P<message>.*)$'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%d-%b-%Y %H:%M:%S.%f'

      - type: filter
        expr: 'body matches "BOGUS|validation failure|SERVFAIL"'

      - type: add
        field: attributes.log_type
        value: dnssec_validation

      - type: severity_parser
        parse_from: attributes.severity
        mapping:
          error:
            - BOGUS
            - error
          warn:
            - warning
            - SERVFAIL
          info:
            - info

processors:
  batch:
    timeout: 10s
    send_batch_size: 1000

  attributes/dnssec:
    actions:
      - key: service.name
        value: dns-resolver
        action: upsert
      - key: dnssec.validation
        value: true
        action: upsert

  filter/dnssec_failures:
    logs:
      include:
        match_type: regexp
        bodies:
          - ".*BOGUS.*"
          - ".*validation failure.*"
          - ".*no valid signature.*"

exporters:
  otlp:
    endpoint: "oneuptime-collector:4317"
    tls:
      insecure: false
      cert_file: /etc/ssl/certs/collector.crt
      key_file: /etc/ssl/private/collector.key

  logging:
    verbosity: detailed
    sampling_initial: 5
    sampling_thereafter: 200

service:
  pipelines:
    logs/dnssec:
      receivers: [filelog/dnssec]
      processors: [batch, attributes/dnssec, filter/dnssec_failures]
      exporters: [otlp, logging]
```

### Custom Metrics from DNSSEC Logs

```yaml
# otel-collector-metrics.yaml
receivers:
  filelog/dnssec_metrics:
    include:
      - /var/log/named/dnssec.log
    operators:
      - type: regex_parser
        regex: '(?P<domain>[a-zA-Z0-9.-]+\.[a-zA-Z]+).*(?P<status>BOGUS|SECURE|INSECURE)'

processors:
  groupbyattrs:
    keys:
      - domain
      - status

  metricstransform:
    transforms:
      - include: dnssec_validation_total
        action: update
        operations:
          - action: add_label
            new_label: validation_status
            new_value: "{{.status}}"

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: dns
    const_labels:
      resolver: primary

service:
  pipelines:
    metrics/dnssec:
      receivers: [filelog/dnssec_metrics]
      processors: [groupbyattrs, metricstransform]
      exporters: [prometheus]
```

---

## Building Alerts for DNSSEC Failures

### Prometheus Alert Rules

```yaml
# dnssec-alerts.yaml
groups:
  - name: dnssec_validation
    interval: 30s
    rules:
      - alert: DNSSECValidationFailureSpike
        expr: |
          rate(dns_dnssec_validation_failures_total[5m]) > 10
        for: 2m
        labels:
          severity: warning
          category: dnssec
        annotations:
          summary: "High rate of DNSSEC validation failures"
          description: "{{ $value }} failures per second in the last 5 minutes"
          runbook_url: "https://wiki.example.com/runbooks/dnssec-failures"

      - alert: DNSSECValidationFailureCritical
        expr: |
          rate(dns_dnssec_validation_failures_total[5m]) > 50
        for: 1m
        labels:
          severity: critical
          category: dnssec
        annotations:
          summary: "Critical DNSSEC validation failure rate"
          description: "{{ $value }} failures per second - immediate attention required"

      - alert: DNSSECDomainPersistentFailure
        expr: |
          sum by (domain) (
            increase(dns_dnssec_validation_failures_total[1h])
          ) > 100
        for: 5m
        labels:
          severity: warning
          category: dnssec
        annotations:
          summary: "Persistent DNSSEC failures for domain {{ $labels.domain }}"
          description: "Domain {{ $labels.domain }} has {{ $value }} validation failures in the last hour"

      - alert: DNSSECSignatureExpiringSoon
        expr: |
          dns_dnssec_signature_expiry_seconds < 86400
        for: 10m
        labels:
          severity: warning
          category: dnssec
        annotations:
          summary: "DNSSEC signature expiring within 24 hours"
          description: "Zone {{ $labels.zone }} signature expires in {{ $value | humanizeDuration }}"

      - alert: DNSSECTrustAnchorStale
        expr: |
          time() - dns_dnssec_trust_anchor_last_update_timestamp > 2592000
        for: 1h
        labels:
          severity: warning
          category: dnssec
        annotations:
          summary: "DNSSEC trust anchor not updated in 30 days"
          description: "Trust anchor last updated {{ $value | humanizeDuration }} ago"
```

### OneUptime Alert Configuration

Configure OneUptime to monitor DNSSEC failures by setting up log-based alerts:

```yaml
# oneuptime-monitor-config.yaml
monitors:
  - name: "DNSSEC Validation Failures"
    type: log
    query: |
      log_type:dnssec_validation AND
      (message:BOGUS OR message:"validation failure" OR message:SERVFAIL)
    threshold:
      count: 10
      window: 5m
    severity: warning
    notification_channels:
      - slack-oncall
      - pagerduty-dns-team

  - name: "DNSSEC Critical Domain Failure"
    type: log
    query: |
      log_type:dnssec_validation AND
      domain:("*.example.com" OR "*.api.example.com") AND
      message:BOGUS
    threshold:
      count: 1
      window: 1m
    severity: critical
    notification_channels:
      - pagerduty-critical
      - slack-incidents
```

---

## Debugging DNSSEC Failures

### Command-line Diagnostic Tools

```bash
#!/bin/bash
# dnssec-debug.sh - Comprehensive DNSSEC debugging script

DOMAIN="${1:-example.com}"
RESOLVER="${2:-8.8.8.8}"

echo "=========================================="
echo "DNSSEC Diagnostic Report for: $DOMAIN"
echo "Using resolver: $RESOLVER"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=========================================="

echo -e "\n[1] Basic DNS Resolution"
echo "-------------------------------------------"
dig +short "$DOMAIN" @"$RESOLVER"

echo -e "\n[2] DNSSEC Chain Validation"
echo "-------------------------------------------"
dig +dnssec +multi "$DOMAIN" @"$RESOLVER"

echo -e "\n[3] DS Record from Parent Zone"
echo "-------------------------------------------"
dig +short DS "$DOMAIN" @"$RESOLVER"

echo -e "\n[4] DNSKEY Records"
echo "-------------------------------------------"
dig +dnssec DNSKEY "$DOMAIN" @"$RESOLVER" | grep -E "(DNSKEY|RRSIG)"

echo -e "\n[5] RRSIG Signature Details"
echo "-------------------------------------------"
dig +dnssec "$DOMAIN" @"$RESOLVER" | grep RRSIG | while read line; do
    echo "$line"
    # Extract expiration date
    expiry=$(echo "$line" | awk '{print $9}')
    echo "  Signature expires: $expiry"
done

echo -e "\n[6] Trust Chain Trace"
echo "-------------------------------------------"
delv "$DOMAIN" @"$RESOLVER" +rtrace 2>&1 || echo "delv not available"

echo -e "\n[7] Validate with drill (if available)"
echo "-------------------------------------------"
drill -DT "$DOMAIN" @"$RESOLVER" 2>&1 || echo "drill not available"

echo -e "\n[8] Check for NSEC/NSEC3 Records"
echo "-------------------------------------------"
dig +dnssec NSEC "$DOMAIN" @"$RESOLVER" | grep -E "(NSEC|NSEC3)" || echo "No NSEC records found"

echo -e "\n[9] Full Validation Status"
echo "-------------------------------------------"
# Using unbound-host if available
if command -v unbound-host &> /dev/null; then
    unbound-host -v -D "$DOMAIN"
else
    echo "unbound-host not available, using dig cd flag test"
    echo "With DNSSEC validation:"
    dig +dnssec "$DOMAIN" @"$RESOLVER" | grep -E "(status:|flags:)"
    echo "Without DNSSEC validation (cd flag):"
    dig +cd "$DOMAIN" @"$RESOLVER" | grep -E "(status:|flags:)"
fi

echo -e "\n=========================================="
echo "Diagnostic complete"
echo "=========================================="
```

### Automated Validation Testing

```python
#!/usr/bin/env python3
"""
DNSSEC Validation Tester
Tests DNSSEC validation for a list of domains and reports failures
"""

import dns.resolver
import dns.dnssec
import dns.name
import dns.rdatatype
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

class DNSSECTester:
    def __init__(self, resolver_ip='8.8.8.8'):
        self.resolver = dns.resolver.Resolver()
        self.resolver.nameservers = [resolver_ip]
        self.resolver.use_dnssec = True
        self.results = []

    def test_domain(self, domain):
        """Test DNSSEC validation for a single domain"""
        result = {
            'domain': domain,
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'unknown',
            'details': {}
        }

        try:
            # Query with DNSSEC
            response = self.resolver.resolve(domain, 'A',
                                            raise_on_no_answer=False)

            # Check if response is authenticated
            if response.response.flags & dns.flags.AD:
                result['status'] = 'secure'
                result['details']['authenticated'] = True
            else:
                result['status'] = 'insecure'
                result['details']['authenticated'] = False

            # Get RRSIG information
            try:
                rrsig_response = self.resolver.resolve(domain, 'RRSIG')
                for rrsig in rrsig_response:
                    result['details']['signature_expiration'] = str(rrsig.expiration)
                    result['details']['signature_inception'] = str(rrsig.inception)
                    result['details']['algorithm'] = rrsig.algorithm
            except Exception:
                result['details']['rrsig'] = 'not found'

        except dns.resolver.NXDOMAIN:
            result['status'] = 'nxdomain'
            result['details']['error'] = 'Domain does not exist'

        except dns.resolver.NoAnswer:
            result['status'] = 'no_answer'
            result['details']['error'] = 'No A record found'

        except dns.dnssec.ValidationFailure as e:
            result['status'] = 'bogus'
            result['details']['error'] = str(e)
            result['details']['validation_failed'] = True

        except Exception as e:
            result['status'] = 'error'
            result['details']['error'] = str(e)

        self.results.append(result)
        return result

    def test_domains(self, domains, max_workers=10):
        """Test multiple domains concurrently"""
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(self.test_domain, d): d for d in domains}
            for future in as_completed(futures):
                domain = futures[future]
                try:
                    future.result()
                except Exception as e:
                    print(f"Error testing {domain}: {e}")

        return self.results

    def get_failures(self):
        """Return only failed validations"""
        return [r for r in self.results if r['status'] == 'bogus']

    def export_results(self, filepath):
        """Export results to JSON"""
        with open(filepath, 'w') as f:
            json.dump({
                'test_time': datetime.utcnow().isoformat(),
                'total_domains': len(self.results),
                'failures': len(self.get_failures()),
                'results': self.results
            }, f, indent=2)


if __name__ == "__main__":
    # Example usage
    test_domains = [
        "cloudflare.com",
        "google.com",
        "example.com",
        "dnssec-failed.org",  # Intentionally broken DNSSEC
    ]

    tester = DNSSECTester()
    results = tester.test_domains(test_domains)

    print("\nDNSSEC Validation Results:")
    print("-" * 60)
    for result in results:
        status_icon = {
            'secure': '[OK]',
            'insecure': '[--]',
            'bogus': '[FAIL]',
            'error': '[ERR]'
        }.get(result['status'], '[??]')

        print(f"{status_icon} {result['domain']}: {result['status']}")
        if result['status'] == 'bogus':
            print(f"     Error: {result['details'].get('error', 'Unknown')}")

    # Export failures
    failures = tester.get_failures()
    if failures:
        print(f"\n{len(failures)} domains failed DNSSEC validation!")
        tester.export_results('/tmp/dnssec-test-results.json')
```

---

## Log Rotation and Retention

### Logrotate Configuration

```conf
# /etc/logrotate.d/dns-resolver
/var/log/named/*.log
/var/log/unbound/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 named named
    sharedscripts
    postrotate
        # BIND
        /usr/sbin/rndc reconfig > /dev/null 2>&1 || true
        # Unbound
        /usr/sbin/unbound-control log_reopen > /dev/null 2>&1 || true
    endscript
}

# Keep DNSSEC-specific logs longer for analysis
/var/log/named/dnssec.log
/var/log/named/validation.log {
    weekly
    rotate 52
    compress
    delaycompress
    missingok
    notifempty
    create 0640 named named
    postrotate
        /usr/sbin/rndc reconfig > /dev/null 2>&1 || true
    endscript
}
```

### Archival to Object Storage

```bash
#!/bin/bash
# archive-dnssec-logs.sh
# Archive DNSSEC logs to S3/MinIO for long-term retention

ARCHIVE_BUCKET="s3://dns-logs-archive"
LOG_DIR="/var/log/named"
ARCHIVE_DATE=$(date -d "yesterday" +%Y-%m-%d)

# Compress and upload
for log_type in dnssec validation; do
    log_file="${LOG_DIR}/${log_type}.log.1"
    if [ -f "$log_file" ]; then
        gzip -c "$log_file" | \
        aws s3 cp - "${ARCHIVE_BUCKET}/${ARCHIVE_DATE}/${log_type}.log.gz" \
            --storage-class STANDARD_IA

        echo "Archived ${log_type} logs for ${ARCHIVE_DATE}"
    fi
done

# Clean up logs older than 90 days locally
find "$LOG_DIR" -name "*.log.*.gz" -mtime +90 -delete
```

---

## Integration with OneUptime

Send DNSSEC validation metrics and logs to OneUptime for unified observability:

### Fluent Bit Configuration for OneUptime

```conf
# /etc/fluent-bit/fluent-bit.conf
[SERVICE]
    Flush         5
    Log_Level     info
    Parsers_File  parsers.conf

[INPUT]
    Name              tail
    Path              /var/log/named/dnssec.log
    Tag               dns.dnssec
    Parser            bind_dnssec
    Refresh_Interval  10
    Mem_Buf_Limit     5MB

[INPUT]
    Name              tail
    Path              /var/log/unbound/unbound.log
    Tag               dns.unbound
    Parser            unbound
    Refresh_Interval  10

[FILTER]
    Name              grep
    Match             dns.*
    Regex             log BOGUS|validation failure|SERVFAIL

[FILTER]
    Name              modify
    Match             dns.*
    Add               service dns-resolver
    Add               environment production
    Add               dnssec_monitoring true

[OUTPUT]
    Name              opentelemetry
    Match             dns.*
    Host              oneuptime-collector.example.com
    Port              4318
    Logs_uri          /v1/logs
    Log_response_payload True
    Tls               On
    Tls.verify        On
```

### Parsers Configuration

```conf
# /etc/fluent-bit/parsers.conf
[PARSER]
    Name        bind_dnssec
    Format      regex
    Regex       ^(?<time>\d{2}-\w{3}-\d{4}\s+\d{2}:\d{2}:\d{2}\.\d+)\s+(?<category>\w+):\s+(?<severity>\w+):\s+(?<message>.*)$
    Time_Key    time
    Time_Format %d-%b-%Y %H:%M:%S.%f

[PARSER]
    Name        unbound
    Format      regex
    Regex       ^\[(?<time>\d+)\]\s+(?<module>\w+)\[(?<pid>\d+):(?<tid>\d+)\]\s+(?<severity>\w+):\s+(?<message>.*)$
    Time_Key    time
    Time_Format %s
```

---

## Summary Table: DNSSEC Failure Types and Remediation

| Failure Type | Log Pattern | Likely Cause | Remediation |
|--------------|-------------|--------------|-------------|
| Signature Expired | `RRSIG expired`, `signature validity period` | Zone signing key not refreshed | Re-sign zone, check automated signing |
| Missing DNSKEY | `DNSKEY not found`, `no DNSKEY` | Key rollover incomplete | Verify DNSKEY published, check DS at parent |
| DS Mismatch | `DS RRset not present`, `no matching DS` | Parent zone DS outdated | Update DS record at registrar |
| Algorithm Unsupported | `algorithm unknown`, `unsupported algorithm` | Resolver doesn't support algorithm | Use supported algorithm (RSA/ECDSA) |
| Clock Skew | `not yet valid`, `signature not yet active` | Server time incorrect | Sync NTP, check inception time |
| NSEC3 Failure | `NSEC3 proof failed`, `closest encloser` | Broken denial of existence | Regenerate NSEC3 chain |
| Truncated Response | `truncated`, `TC flag set` | UDP response too large | Enable TCP, reduce record count |
| Network Timeout | `timeout`, `connection refused` | Firewall blocking DNS | Allow UDP/TCP 53, check routing |
| Trust Anchor Stale | `trust anchor not found` | Root key not updated | Update root.key, run `unbound-anchor` |
| Chain Broken | `validation chain broken` | Intermediate zone unsigned | Check parent zone DNSSEC status |

---

## Best Practices Checklist

Use this checklist to ensure comprehensive DNSSEC logging and analysis:

- [ ] **Logging Configuration**
  - [ ] Enable debug-level logging for DNSSEC category
  - [ ] Configure structured (JSON) output for log analysis
  - [ ] Set appropriate log rotation and retention policies
  - [ ] Include timestamp, severity, and category in all log entries

- [ ] **Real-time Monitoring**
  - [ ] Set up alerts for validation failure rate spikes
  - [ ] Monitor signature expiration times proactively
  - [ ] Track trust anchor update status
  - [ ] Create dashboards for DNSSEC health metrics

- [ ] **Analysis Pipeline**
  - [ ] Deploy log aggregation (Fluent Bit, Vector, or similar)
  - [ ] Configure OpenTelemetry Collector for DNSSEC logs
  - [ ] Build automated analysis scripts for failure patterns
  - [ ] Export metrics to time-series database

- [ ] **Incident Response**
  - [ ] Document debugging procedures for common failures
  - [ ] Maintain list of diagnostic commands
  - [ ] Create runbooks for each failure type
  - [ ] Test validation with known-good and known-bad domains

- [ ] **Proactive Maintenance**
  - [ ] Schedule regular DNSSEC validation tests
  - [ ] Monitor certificate transparency logs for your domains
  - [ ] Review and update trust anchors periodically
  - [ ] Audit zone signing configurations quarterly

---

## Conclusion

DNSSEC validation failures represent a unique class of infrastructure problems: they are silent, they masquerade as network issues, and they can affect users without triggering traditional availability monitors. The key to managing them is comprehensive logging and proactive analysis.

By implementing the configurations and techniques in this guide, you transform DNSSEC from a black box into an observable system component. You gain the ability to:

1. **Detect failures early** through real-time log analysis and alerting
2. **Diagnose root causes quickly** with detailed validation logging
3. **Prevent incidents** by monitoring signature expirations and key rollovers
4. **Correlate DNS issues** with application-level problems using OpenTelemetry

The investment in DNSSEC observability pays dividends during incidents. When that 3 AM alert fires, you will have the logs, metrics, and context needed to resolve the issue in minutes rather than hours.

Start with basic logging, build your analysis pipeline incrementally, and integrate with your existing observability stack. Your future self, debugging a mysterious service outage at 2 AM, will thank you.

---

**Related Reading:**

- [Three Pillars of Observability: Logs, Metrics, and Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [How to Structure Logs Properly in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
- [What is OpenTelemetry Collector and Why Use One](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view)

**Need help setting up DNSSEC monitoring?** The OneUptime community is here to help. Connect with us to discuss your DNS observability challenges and share your experiences with DNSSEC troubleshooting.

# How to Monitor DNSSEC Expiry and Prevent Outages

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: DNSSEC, DNS, Monitoring, Security, Alerting, DevOps

Description: Learn how to proactively monitor DNSSEC signature expiration and key rollovers to prevent catastrophic DNS resolution failures that can take down your entire infrastructure.

---

DNSSEC (Domain Name System Security Extensions) adds cryptographic signatures to DNS records, protecting against cache poisoning and man-in-the-middle attacks. However, these signatures have expiration dates. When DNSSEC signatures expire without renewal, validating resolvers will reject your domain as invalid, causing a complete DNS resolution failure. Unlike typical outages that might affect one service, a DNSSEC failure makes your entire domain unreachable to security-conscious resolvers worldwide.

## Why DNSSEC Expiry Is Dangerous

| Scenario | Impact | Recovery Time |
|----------|--------|---------------|
| Expired RRSIG | Domain unreachable to validating resolvers | Hours to days |
| KSK rollover failure | Complete DNSSEC chain break | 24-48 hours minimum |
| ZSK expiry without rotation | Signature validation fails | 4-24 hours |
| DS record mismatch | Parent zone rejects child | Depends on registrar |
| Algorithm downgrade | Security validation fails | Hours to days |

## Understanding DNSSEC Components

Before diving into monitoring, let's understand what we need to track:

### Key Types

- **KSK (Key Signing Key)**: Signs the DNSKEY RRset, published as DS record in parent zone
- **ZSK (Zone Signing Key)**: Signs all other records in the zone
- **DS (Delegation Signer)**: Hash of KSK stored in parent zone

### Signature Records

- **RRSIG**: Signatures attached to DNS records with inception and expiration timestamps
- **DNSKEY**: Public keys used for signature verification
- **NSEC/NSEC3**: Authenticated denial of existence records

### Critical Expiration Points

1. RRSIG expiration on SOA, A, AAAA, MX, and other records
2. DNSKEY validity periods
3. DS record synchronization with parent zone
4. Algorithm support and deprecation timelines

---

## Basic DNSSEC Monitoring with dig

Start with manual checks to understand your current DNSSEC state:

```bash
#!/bin/bash
# dnssec-check-basic.sh
# Basic DNSSEC validation check

DOMAIN="${1:-example.com}"

echo "=== DNSSEC Check for $DOMAIN ==="
echo ""

# Check if DNSSEC is enabled
echo "1. Checking DNSSEC status..."
dig +dnssec +short "$DOMAIN" DNSKEY

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to query DNSKEY"
    exit 1
fi

# Check RRSIG records
echo ""
echo "2. Checking RRSIG expiration for SOA..."
dig +dnssec "$DOMAIN" SOA | grep RRSIG

# Check DS record at parent
echo ""
echo "3. Checking DS record at parent zone..."
PARENT=$(echo "$DOMAIN" | cut -d. -f2-)
dig +short "$DOMAIN" DS @$(dig +short "$PARENT" NS | head -1)

# Validate the chain
echo ""
echo "4. Full DNSSEC validation..."
dig +sigchase +trusted-key=/etc/trusted-key.key "$DOMAIN" A 2>/dev/null || \
dig +dnssec +cd "$DOMAIN" A

echo ""
echo "=== Check Complete ==="
```

### Extracting RRSIG Expiration Dates

```bash
#!/bin/bash
# extract-rrsig-expiry.sh
# Extract and parse RRSIG expiration dates

DOMAIN="${1:-example.com}"
RECORD_TYPE="${2:-SOA}"

echo "Checking RRSIG expiration for $DOMAIN $RECORD_TYPE"

# Get RRSIG record
RRSIG=$(dig +dnssec "$DOMAIN" "$RECORD_TYPE" | grep "RRSIG" | grep "$RECORD_TYPE")

if [ -z "$RRSIG" ]; then
    echo "ERROR: No RRSIG found for $DOMAIN $RECORD_TYPE"
    exit 1
fi

# Parse expiration date (field 9 in RRSIG format: YYYYMMDDHHmmSS)
EXPIRY_RAW=$(echo "$RRSIG" | awk '{print $9}')

# Convert to readable format
EXPIRY_YEAR="${EXPIRY_RAW:0:4}"
EXPIRY_MONTH="${EXPIRY_RAW:4:2}"
EXPIRY_DAY="${EXPIRY_RAW:6:2}"
EXPIRY_HOUR="${EXPIRY_RAW:8:2}"
EXPIRY_MIN="${EXPIRY_RAW:10:2}"
EXPIRY_SEC="${EXPIRY_RAW:12:2}"

EXPIRY_DATE="$EXPIRY_YEAR-$EXPIRY_MONTH-$EXPIRY_DAY $EXPIRY_HOUR:$EXPIRY_MIN:$EXPIRY_SEC UTC"

echo "RRSIG Expiration: $EXPIRY_DATE"

# Calculate time until expiry
EXPIRY_EPOCH=$(date -u -d "$EXPIRY_DATE" +%s 2>/dev/null || \
               date -u -j -f "%Y-%m-%d %H:%M:%S" "$EXPIRY_DATE" +%s 2>/dev/null)
NOW_EPOCH=$(date +%s)

SECONDS_REMAINING=$((EXPIRY_EPOCH - NOW_EPOCH))
DAYS_REMAINING=$((SECONDS_REMAINING / 86400))
HOURS_REMAINING=$(( (SECONDS_REMAINING % 86400) / 3600 ))

echo "Time remaining: ${DAYS_REMAINING} days, ${HOURS_REMAINING} hours"

# Warning thresholds
if [ $DAYS_REMAINING -lt 1 ]; then
    echo "CRITICAL: RRSIG expires in less than 24 hours!"
    exit 2
elif [ $DAYS_REMAINING -lt 3 ]; then
    echo "WARNING: RRSIG expires in less than 3 days!"
    exit 1
else
    echo "OK: RRSIG has sufficient validity"
    exit 0
fi
```

---

## Python DNSSEC Monitoring Script

For production monitoring, a Python script provides more robust parsing and error handling:

```python
#!/usr/bin/env python3
"""
dnssec_monitor.py
Comprehensive DNSSEC monitoring script for production use
"""

import subprocess
import re
import sys
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
import argparse


@dataclass
class RRSIGInfo:
    """Information about an RRSIG record"""
    record_type: str
    algorithm: int
    labels: int
    original_ttl: int
    expiration: datetime
    inception: datetime
    key_tag: int
    signer: str
    days_until_expiry: int
    hours_until_expiry: int
    status: str  # OK, WARNING, CRITICAL, EXPIRED


@dataclass
class DNSKEYInfo:
    """Information about a DNSKEY record"""
    flags: int
    protocol: int
    algorithm: int
    key_tag: int
    key_type: str  # KSK or ZSK
    key_length: int


@dataclass
class DSInfo:
    """Information about a DS record"""
    key_tag: int
    algorithm: int
    digest_type: int
    digest: str
    matches_dnskey: bool


@dataclass
class DNSSECStatus:
    """Overall DNSSEC status for a domain"""
    domain: str
    dnssec_enabled: bool
    validation_status: str
    rrsig_records: List[RRSIGInfo]
    dnskey_records: List[DNSKEYInfo]
    ds_records: List[DSInfo]
    chain_valid: bool
    earliest_expiry: Optional[datetime]
    issues: List[str]
    timestamp: datetime


class DNSSECMonitor:
    """Monitor DNSSEC status and expiration for domains"""

    WARNING_THRESHOLD_DAYS = 7
    CRITICAL_THRESHOLD_DAYS = 3

    def __init__(self, domain: str, nameserver: Optional[str] = None):
        self.domain = domain
        self.nameserver = nameserver
        self.issues: List[str] = []

    def _run_dig(self, record_type: str, options: List[str] = None) -> str:
        """Execute dig command and return output"""
        cmd = ["dig", "+dnssec", "+multiline"]

        if options:
            cmd.extend(options)

        if self.nameserver:
            cmd.append(f"@{self.nameserver}")

        cmd.extend([self.domain, record_type])

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            return result.stdout
        except subprocess.TimeoutExpired:
            self.issues.append(f"DNS query timeout for {record_type}")
            return ""
        except Exception as e:
            self.issues.append(f"DNS query failed: {str(e)}")
            return ""

    def _parse_rrsig_date(self, date_str: str) -> datetime:
        """Parse RRSIG date format (YYYYMMDDHHmmSS)"""
        return datetime.strptime(date_str, "%Y%m%d%H%M%S").replace(
            tzinfo=timezone.utc
        )

    def _calculate_time_remaining(
        self, expiry: datetime
    ) -> Tuple[int, int, str]:
        """Calculate days/hours remaining and status"""
        now = datetime.now(timezone.utc)
        delta = expiry - now

        total_seconds = delta.total_seconds()
        days = int(total_seconds // 86400)
        hours = int((total_seconds % 86400) // 3600)

        if total_seconds < 0:
            status = "EXPIRED"
        elif days < self.CRITICAL_THRESHOLD_DAYS:
            status = "CRITICAL"
        elif days < self.WARNING_THRESHOLD_DAYS:
            status = "WARNING"
        else:
            status = "OK"

        return days, hours, status

    def check_rrsig(self) -> List[RRSIGInfo]:
        """Check all RRSIG records for the domain"""
        rrsig_records = []
        record_types = ["SOA", "A", "AAAA", "MX", "NS", "DNSKEY"]

        for rtype in record_types:
            output = self._run_dig(rtype)

            # Parse RRSIG lines
            rrsig_pattern = re.compile(
                r'(\S+)\s+\d+\s+IN\s+RRSIG\s+(\S+)\s+(\d+)\s+(\d+)\s+'
                r'(\d+)\s+\(\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+'
            )

            for match in rrsig_pattern.finditer(output):
                try:
                    expiry_str = match.group(6)
                    inception_str = match.group(7)

                    expiry = self._parse_rrsig_date(expiry_str)
                    inception = self._parse_rrsig_date(inception_str)

                    days, hours, status = self._calculate_time_remaining(expiry)

                    rrsig_info = RRSIGInfo(
                        record_type=match.group(2),
                        algorithm=int(match.group(3)),
                        labels=int(match.group(4)),
                        original_ttl=int(match.group(5)),
                        expiration=expiry,
                        inception=inception,
                        key_tag=int(match.group(8)),
                        signer=match.group(9),
                        days_until_expiry=days,
                        hours_until_expiry=hours,
                        status=status
                    )
                    rrsig_records.append(rrsig_info)

                    if status in ["WARNING", "CRITICAL", "EXPIRED"]:
                        self.issues.append(
                            f"RRSIG for {rtype}: {status} - "
                            f"expires in {days}d {hours}h"
                        )

                except (ValueError, IndexError) as e:
                    self.issues.append(f"Failed to parse RRSIG for {rtype}: {e}")

        return rrsig_records

    def check_dnskey(self) -> List[DNSKEYInfo]:
        """Check DNSKEY records"""
        dnskey_records = []
        output = self._run_dig("DNSKEY")

        # DNSKEY format: flags protocol algorithm public-key
        dnskey_pattern = re.compile(
            r'\S+\s+\d+\s+IN\s+DNSKEY\s+(\d+)\s+(\d+)\s+(\d+)\s+\('
        )

        for match in dnskey_pattern.finditer(output):
            flags = int(match.group(1))
            protocol = int(match.group(2))
            algorithm = int(match.group(3))

            # Determine key type from flags
            # 257 = KSK (Secure Entry Point)
            # 256 = ZSK
            key_type = "KSK" if flags == 257 else "ZSK"

            # Calculate key tag (simplified)
            key_tag = self._calculate_key_tag(output, match.start())

            dnskey_info = DNSKEYInfo(
                flags=flags,
                protocol=protocol,
                algorithm=algorithm,
                key_tag=key_tag,
                key_type=key_type,
                key_length=self._get_key_length(algorithm)
            )
            dnskey_records.append(dnskey_info)

        if not dnskey_records:
            self.issues.append("No DNSKEY records found - DNSSEC may not be enabled")

        return dnskey_records

    def _calculate_key_tag(self, output: str, position: int) -> int:
        """Extract key tag from dig output"""
        # Look for key tag in comments or calculate from key
        tag_match = re.search(r'key id = (\d+)', output[position:position+500])
        if tag_match:
            return int(tag_match.group(1))
        return 0

    def _get_key_length(self, algorithm: int) -> int:
        """Get typical key length for algorithm"""
        key_lengths = {
            5: 1024,   # RSA/SHA-1
            7: 1024,   # RSASHA1-NSEC3-SHA1
            8: 2048,   # RSA/SHA-256
            10: 2048,  # RSA/SHA-512
            13: 256,   # ECDSA P-256
            14: 384,   # ECDSA P-384
            15: 256,   # Ed25519
            16: 456,   # Ed448
        }
        return key_lengths.get(algorithm, 0)

    def check_ds(self) -> List[DSInfo]:
        """Check DS records at parent zone"""
        ds_records = []

        # Get DS from parent zone
        parent = ".".join(self.domain.split(".")[1:]) or "."

        # Query parent nameservers for DS
        ns_output = self._run_dig("NS")

        # Get DS record
        output = subprocess.run(
            ["dig", "+short", self.domain, "DS"],
            capture_output=True,
            text=True,
            timeout=30
        ).stdout

        # Parse DS records
        ds_pattern = re.compile(r'(\d+)\s+(\d+)\s+(\d+)\s+(\S+)')

        for match in ds_pattern.finditer(output):
            ds_info = DSInfo(
                key_tag=int(match.group(1)),
                algorithm=int(match.group(2)),
                digest_type=int(match.group(3)),
                digest=match.group(4),
                matches_dnskey=False  # Will verify below
            )
            ds_records.append(ds_info)

        if not ds_records:
            self.issues.append(
                "No DS record found at parent - "
                "DNSSEC chain may be broken"
            )

        return ds_records

    def validate_chain(self) -> bool:
        """Validate the complete DNSSEC chain"""
        try:
            # Use delv for chain validation if available
            result = subprocess.run(
                ["delv", "+rtrace", self.domain, "A"],
                capture_output=True,
                text=True,
                timeout=60
            )

            if "fully validated" in result.stdout.lower():
                return True
            elif "validation failure" in result.stdout.lower():
                self.issues.append("DNSSEC validation failed")
                return False

        except FileNotFoundError:
            # delv not available, try alternative validation
            result = subprocess.run(
                ["dig", "+dnssec", "+cd", self.domain, "A"],
                capture_output=True,
                text=True,
                timeout=30
            )

            # Check for AD (Authenticated Data) flag
            if "ad" in result.stdout.lower().split("flags:")[1].split(";")[0]:
                return True

        return False

    def get_status(self) -> DNSSECStatus:
        """Get complete DNSSEC status"""
        rrsig_records = self.check_rrsig()
        dnskey_records = self.check_dnskey()
        ds_records = self.check_ds()
        chain_valid = self.validate_chain()

        # Determine earliest expiry
        earliest_expiry = None
        if rrsig_records:
            earliest_expiry = min(r.expiration for r in rrsig_records)

        # Determine overall validation status
        if not dnskey_records:
            validation_status = "NOT_ENABLED"
        elif any(r.status == "EXPIRED" for r in rrsig_records):
            validation_status = "EXPIRED"
        elif any(r.status == "CRITICAL" for r in rrsig_records):
            validation_status = "CRITICAL"
        elif any(r.status == "WARNING" for r in rrsig_records):
            validation_status = "WARNING"
        elif not chain_valid:
            validation_status = "CHAIN_BROKEN"
        else:
            validation_status = "OK"

        return DNSSECStatus(
            domain=self.domain,
            dnssec_enabled=bool(dnskey_records),
            validation_status=validation_status,
            rrsig_records=rrsig_records,
            dnskey_records=dnskey_records,
            ds_records=ds_records,
            chain_valid=chain_valid,
            earliest_expiry=earliest_expiry,
            issues=self.issues,
            timestamp=datetime.now(timezone.utc)
        )


def main():
    parser = argparse.ArgumentParser(
        description="Monitor DNSSEC status and expiration"
    )
    parser.add_argument("domain", help="Domain to check")
    parser.add_argument(
        "--nameserver", "-n",
        help="Specific nameserver to query"
    )
    parser.add_argument(
        "--json", "-j",
        action="store_true",
        help="Output as JSON"
    )
    parser.add_argument(
        "--warning-days", "-w",
        type=int,
        default=7,
        help="Warning threshold in days (default: 7)"
    )
    parser.add_argument(
        "--critical-days", "-c",
        type=int,
        default=3,
        help="Critical threshold in days (default: 3)"
    )

    args = parser.parse_args()

    monitor = DNSSECMonitor(args.domain, args.nameserver)
    monitor.WARNING_THRESHOLD_DAYS = args.warning_days
    monitor.CRITICAL_THRESHOLD_DAYS = args.critical_days

    status = monitor.get_status()

    if args.json:
        # Custom JSON serialization for datetime
        def serialize(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            return obj

        output = {
            "domain": status.domain,
            "dnssec_enabled": status.dnssec_enabled,
            "validation_status": status.validation_status,
            "chain_valid": status.chain_valid,
            "earliest_expiry": serialize(status.earliest_expiry),
            "issues": status.issues,
            "timestamp": serialize(status.timestamp),
            "rrsig_count": len(status.rrsig_records),
            "dnskey_count": len(status.dnskey_records),
        }
        print(json.dumps(output, indent=2))
    else:
        print(f"DNSSEC Status for {status.domain}")
        print("=" * 50)
        print(f"DNSSEC Enabled: {status.dnssec_enabled}")
        print(f"Validation Status: {status.validation_status}")
        print(f"Chain Valid: {status.chain_valid}")

        if status.earliest_expiry:
            print(f"Earliest Expiry: {status.earliest_expiry.isoformat()}")

        if status.issues:
            print("\nIssues Found:")
            for issue in status.issues:
                print(f"  - {issue}")

        print(f"\nRRSIG Records: {len(status.rrsig_records)}")
        print(f"DNSKEY Records: {len(status.dnskey_records)}")
        print(f"DS Records: {len(status.ds_records)}")

    # Exit codes for monitoring integration
    if status.validation_status in ["EXPIRED", "CHAIN_BROKEN"]:
        sys.exit(2)  # Critical
    elif status.validation_status in ["CRITICAL", "WARNING"]:
        sys.exit(1)  # Warning
    else:
        sys.exit(0)  # OK


if __name__ == "__main__":
    main()
```

---

## Node.js DNSSEC Monitoring Service

For integration with Node.js applications and OneUptime:

```javascript
// dnssec-monitor.js
// Node.js DNSSEC monitoring service

const { spawn } = require('child_process');
const { promisify } = require('util');

class DNSSECMonitor {
  constructor(options = {}) {
    this.warningThresholdDays = options.warningDays || 7;
    this.criticalThresholdDays = options.criticalDays || 3;
    this.timeout = options.timeout || 30000;
  }

  async runDig(domain, recordType, options = []) {
    return new Promise((resolve, reject) => {
      const args = ['+dnssec', '+multiline', ...options, domain, recordType];
      const dig = spawn('dig', args);

      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        dig.kill();
        reject(new Error(`DNS query timeout for ${domain} ${recordType}`));
      }, this.timeout);

      dig.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      dig.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      dig.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`dig failed: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  parseRRSIGDate(dateStr) {
    // RRSIG date format: YYYYMMDDHHmmSS
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(8, 10));
    const minute = parseInt(dateStr.substring(10, 12));
    const second = parseInt(dateStr.substring(12, 14));

    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  calculateTimeRemaining(expiryDate) {
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    let status;
    if (diffMs < 0) {
      status = 'EXPIRED';
    } else if (days < this.criticalThresholdDays) {
      status = 'CRITICAL';
    } else if (days < this.warningThresholdDays) {
      status = 'WARNING';
    } else {
      status = 'OK';
    }

    return { days, hours, status, diffMs };
  }

  async checkRRSIG(domain) {
    const recordTypes = ['SOA', 'A', 'AAAA', 'MX', 'NS', 'DNSKEY'];
    const results = [];

    for (const recordType of recordTypes) {
      try {
        const output = await this.runDig(domain, recordType);

        // Parse RRSIG records
        const rrsigRegex = /RRSIG\s+(\S+)\s+(\d+)\s+(\d+)\s+(\d+)\s+\(\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)/g;
        let match;

        while ((match = rrsigRegex.exec(output)) !== null) {
          const expiryDate = this.parseRRSIGDate(match[5]);
          const inceptionDate = this.parseRRSIGDate(match[6]);
          const timeRemaining = this.calculateTimeRemaining(expiryDate);

          results.push({
            recordType: match[1],
            algorithm: parseInt(match[2]),
            labels: parseInt(match[3]),
            originalTTL: parseInt(match[4]),
            expiration: expiryDate.toISOString(),
            inception: inceptionDate.toISOString(),
            keyTag: parseInt(match[7]),
            signer: match[8],
            daysUntilExpiry: timeRemaining.days,
            hoursUntilExpiry: timeRemaining.hours,
            status: timeRemaining.status
          });
        }
      } catch (error) {
        console.error(`Failed to check RRSIG for ${recordType}:`, error.message);
      }
    }

    return results;
  }

  async checkDNSKEY(domain) {
    const output = await this.runDig(domain, 'DNSKEY');
    const keys = [];

    // Parse DNSKEY records
    const dnskeyRegex = /DNSKEY\s+(\d+)\s+(\d+)\s+(\d+)\s+\(/g;
    let match;

    while ((match = dnskeyRegex.exec(output)) !== null) {
      const flags = parseInt(match[1]);
      keys.push({
        flags,
        protocol: parseInt(match[2]),
        algorithm: parseInt(match[3]),
        keyType: flags === 257 ? 'KSK' : 'ZSK'
      });
    }

    return keys;
  }

  async checkDS(domain) {
    const output = await this.runDig(domain, 'DS', ['+short']);
    const records = [];

    const lines = output.trim().split('\n').filter(l => l);
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 4) {
        records.push({
          keyTag: parseInt(parts[0]),
          algorithm: parseInt(parts[1]),
          digestType: parseInt(parts[2]),
          digest: parts[3]
        });
      }
    }

    return records;
  }

  async validateChain(domain) {
    try {
      const output = await this.runDig(domain, 'A', ['+sigchase']);
      return output.toLowerCase().includes('validated') ||
             output.includes('flags:') && output.includes(' ad');
    } catch {
      return false;
    }
  }

  async getStatus(domain) {
    const issues = [];

    const [rrsigRecords, dnskeyRecords, dsRecords] = await Promise.all([
      this.checkRRSIG(domain),
      this.checkDNSKEY(domain),
      this.checkDS(domain)
    ]);

    const chainValid = await this.validateChain(domain);

    // Find earliest expiry
    let earliestExpiry = null;
    if (rrsigRecords.length > 0) {
      earliestExpiry = rrsigRecords.reduce((min, r) => {
        const expiry = new Date(r.expiration);
        return !min || expiry < min ? expiry : min;
      }, null);
    }

    // Check for issues
    if (dnskeyRecords.length === 0) {
      issues.push('No DNSKEY records found - DNSSEC may not be enabled');
    }

    if (dsRecords.length === 0) {
      issues.push('No DS record at parent zone - DNSSEC chain may be broken');
    }

    for (const rrsig of rrsigRecords) {
      if (rrsig.status === 'EXPIRED') {
        issues.push(`RRSIG for ${rrsig.recordType} has EXPIRED`);
      } else if (rrsig.status === 'CRITICAL') {
        issues.push(
          `RRSIG for ${rrsig.recordType} expires in ` +
          `${rrsig.daysUntilExpiry}d ${rrsig.hoursUntilExpiry}h (CRITICAL)`
        );
      } else if (rrsig.status === 'WARNING') {
        issues.push(
          `RRSIG for ${rrsig.recordType} expires in ` +
          `${rrsig.daysUntilExpiry}d ${rrsig.hoursUntilExpiry}h (WARNING)`
        );
      }
    }

    // Determine overall status
    let validationStatus;
    if (dnskeyRecords.length === 0) {
      validationStatus = 'NOT_ENABLED';
    } else if (rrsigRecords.some(r => r.status === 'EXPIRED')) {
      validationStatus = 'EXPIRED';
    } else if (rrsigRecords.some(r => r.status === 'CRITICAL')) {
      validationStatus = 'CRITICAL';
    } else if (rrsigRecords.some(r => r.status === 'WARNING')) {
      validationStatus = 'WARNING';
    } else if (!chainValid) {
      validationStatus = 'CHAIN_BROKEN';
    } else {
      validationStatus = 'OK';
    }

    return {
      domain,
      dnssecEnabled: dnskeyRecords.length > 0,
      validationStatus,
      rrsigRecords,
      dnskeyRecords,
      dsRecords,
      chainValid,
      earliestExpiry: earliestExpiry ? earliestExpiry.toISOString() : null,
      issues,
      timestamp: new Date().toISOString()
    };
  }
}

// Export for use in other modules
module.exports = { DNSSECMonitor };

// CLI usage
if (require.main === module) {
  const domain = process.argv[2];

  if (!domain) {
    console.error('Usage: node dnssec-monitor.js <domain>');
    process.exit(1);
  }

  const monitor = new DNSSECMonitor();

  monitor.getStatus(domain)
    .then(status => {
      console.log(JSON.stringify(status, null, 2));

      if (status.validationStatus === 'EXPIRED' ||
          status.validationStatus === 'CHAIN_BROKEN') {
        process.exit(2);
      } else if (status.validationStatus === 'CRITICAL' ||
                 status.validationStatus === 'WARNING') {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(2);
    });
}
```

---

## Automated Monitoring with Cron

Set up automated checks with cron jobs:

```bash
#!/bin/bash
# /usr/local/bin/dnssec-cron-check.sh
# Automated DNSSEC monitoring with alerting

set -e

DOMAINS=(
    "example.com"
    "api.example.com"
    "cdn.example.com"
)

ALERT_EMAIL="oncall@example.com"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"
ONEUPTIME_WEBHOOK="${ONEUPTIME_WEBHOOK_URL}"
LOG_FILE="/var/log/dnssec-monitor.log"

log() {
    echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $1" | tee -a "$LOG_FILE"
}

send_slack_alert() {
    local domain="$1"
    local status="$2"
    local message="$3"

    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \":warning: DNSSEC Alert for ${domain}\",
                \"attachments\": [{
                    \"color\": \"$([ \"$status\" = 'CRITICAL' ] && echo 'danger' || echo 'warning')\",
                    \"fields\": [
                        {\"title\": \"Domain\", \"value\": \"${domain}\", \"short\": true},
                        {\"title\": \"Status\", \"value\": \"${status}\", \"short\": true},
                        {\"title\": \"Details\", \"value\": \"${message}\", \"short\": false}
                    ]
                }]
            }"
    fi
}

send_oneuptime_alert() {
    local domain="$1"
    local status="$2"
    local message="$3"

    if [ -n "$ONEUPTIME_WEBHOOK" ]; then
        curl -s -X POST "$ONEUPTIME_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
                \"monitorName\": \"DNSSEC - ${domain}\",
                \"status\": \"$([ \"$status\" = 'OK' ] && echo 'online' || echo 'offline')\",
                \"message\": \"${message}\"
            }"
    fi
}

check_domain() {
    local domain="$1"
    log "Checking DNSSEC for ${domain}..."

    # Run Python monitor script
    result=$(python3 /usr/local/bin/dnssec_monitor.py "$domain" --json 2>/dev/null)

    if [ $? -ne 0 ]; then
        log "ERROR: Failed to check ${domain}"
        send_slack_alert "$domain" "ERROR" "DNSSEC check failed"
        return 1
    fi

    status=$(echo "$result" | jq -r '.validation_status')
    earliest_expiry=$(echo "$result" | jq -r '.earliest_expiry')
    issues=$(echo "$result" | jq -r '.issues | join(", ")')

    log "Domain: ${domain}, Status: ${status}"

    case "$status" in
        "OK")
            log "OK: DNSSEC valid for ${domain}"
            send_oneuptime_alert "$domain" "OK" "DNSSEC signatures valid"
            ;;
        "WARNING")
            log "WARNING: ${domain} - ${issues}"
            send_slack_alert "$domain" "WARNING" "Signatures expiring soon: ${issues}"
            send_oneuptime_alert "$domain" "WARNING" "$issues"
            ;;
        "CRITICAL"|"EXPIRED"|"CHAIN_BROKEN")
            log "CRITICAL: ${domain} - ${issues}"
            send_slack_alert "$domain" "CRITICAL" "$issues"
            send_oneuptime_alert "$domain" "CRITICAL" "$issues"

            # Send email for critical alerts
            echo "DNSSEC CRITICAL Alert for ${domain}

Status: ${status}
Issues: ${issues}
Earliest Expiry: ${earliest_expiry}

Immediate action required!" | mail -s "CRITICAL: DNSSEC Alert - ${domain}" "$ALERT_EMAIL"
            ;;
        *)
            log "UNKNOWN: Unexpected status ${status} for ${domain}"
            ;;
    esac
}

# Main execution
log "Starting DNSSEC monitoring run..."

for domain in "${DOMAINS[@]}"; do
    check_domain "$domain" || true
done

log "DNSSEC monitoring run complete."
```

Add to crontab:

```bash
# Check DNSSEC every 6 hours
0 */6 * * * /usr/local/bin/dnssec-cron-check.sh >> /var/log/dnssec-cron.log 2>&1

# Daily comprehensive check at 9 AM UTC
0 9 * * * /usr/local/bin/dnssec_monitor.py example.com --json >> /var/log/dnssec-daily.log 2>&1
```

---

## OneUptime Integration

### Custom Monitor Script for OneUptime

Create a synthetic monitor in OneUptime that checks DNSSEC status:

```javascript
// OneUptime Custom Monitor Script
// Add this as a synthetic monitor in OneUptime

async function monitor() {
  const domain = 'example.com';
  const warningThresholdDays = 7;
  const criticalThresholdDays = 3;

  // Use the dns module (available in OneUptime synthetic monitors)
  const dns = require('dns').promises;

  try {
    // Check if domain resolves (basic check)
    await dns.resolve(domain);

    // For DNSSEC-specific checks, we need to call external validator
    // OneUptime synthetic monitors can make HTTP requests
    const https = require('https');

    // Use a DNSSEC validation API (example: DNSViz API)
    const validationResult = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'dnsviz.net',
        path: `/api/v1/zone/${domain}/status`,
        method: 'GET',
        timeout: 30000
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ status: 'unknown' });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Timeout')));
      req.end();
    });

    // Return status based on validation
    if (validationResult.status === 'secure') {
      return {
        status: 'online',
        message: `DNSSEC valid for ${domain}`,
        responseTime: Date.now()
      };
    } else if (validationResult.status === 'insecure') {
      return {
        status: 'degraded',
        message: `DNSSEC not enabled for ${domain}`,
        responseTime: Date.now()
      };
    } else {
      return {
        status: 'offline',
        message: `DNSSEC validation failed for ${domain}`,
        responseTime: Date.now()
      };
    }

  } catch (error) {
    return {
      status: 'offline',
      message: `DNSSEC check failed: ${error.message}`,
      responseTime: Date.now()
    };
  }
}

module.exports = { monitor };
```

### Webhook Integration for External Monitors

Configure your external DNSSEC monitor to send alerts to OneUptime:

```bash
#!/bin/bash
# Send DNSSEC status to OneUptime via webhook

ONEUPTIME_API_KEY="${ONEUPTIME_API_KEY}"
ONEUPTIME_PROJECT_ID="${ONEUPTIME_PROJECT_ID}"
ONEUPTIME_MONITOR_ID="${ONEUPTIME_MONITOR_ID}"

send_status() {
    local status="$1"  # online, offline, degraded
    local message="$2"

    curl -X POST "https://oneuptime.com/api/monitor/${ONEUPTIME_PROJECT_ID}/${ONEUPTIME_MONITOR_ID}/status" \
        -H "Authorization: Bearer ${ONEUPTIME_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"status\": \"${status}\",
            \"message\": \"${message}\",
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
        }"
}

# Example usage in your monitoring script
DNSSEC_STATUS=$(python3 dnssec_monitor.py example.com --json | jq -r '.validation_status')

case "$DNSSEC_STATUS" in
    "OK")
        send_status "online" "DNSSEC signatures valid"
        ;;
    "WARNING")
        send_status "degraded" "DNSSEC signatures expiring soon"
        ;;
    *)
        send_status "offline" "DNSSEC validation failed: ${DNSSEC_STATUS}"
        ;;
esac
```

---

## Prometheus and Grafana Integration

Export DNSSEC metrics for Prometheus:

```python
#!/usr/bin/env python3
"""
dnssec_exporter.py
Prometheus exporter for DNSSEC metrics
"""

from prometheus_client import start_http_server, Gauge, Counter, Info
import time
import sys
import os

# Import our DNSSEC monitor
from dnssec_monitor import DNSSECMonitor

# Prometheus metrics
DNSSEC_ENABLED = Gauge(
    'dnssec_enabled',
    'Whether DNSSEC is enabled for the domain',
    ['domain']
)

DNSSEC_VALID = Gauge(
    'dnssec_chain_valid',
    'Whether DNSSEC chain validates correctly',
    ['domain']
)

DNSSEC_EXPIRY_SECONDS = Gauge(
    'dnssec_signature_expiry_seconds',
    'Seconds until DNSSEC signature expires',
    ['domain', 'record_type']
)

DNSSEC_EXPIRY_DAYS = Gauge(
    'dnssec_signature_expiry_days',
    'Days until earliest DNSSEC signature expires',
    ['domain']
)

DNSSEC_STATUS = Gauge(
    'dnssec_status',
    'DNSSEC status (0=OK, 1=WARNING, 2=CRITICAL, 3=EXPIRED)',
    ['domain']
)

DNSSEC_CHECK_ERRORS = Counter(
    'dnssec_check_errors_total',
    'Total number of DNSSEC check errors',
    ['domain']
)

DNSSEC_CHECKS = Counter(
    'dnssec_checks_total',
    'Total number of DNSSEC checks performed',
    ['domain']
)


def status_to_number(status):
    """Convert status string to number for Prometheus"""
    mapping = {
        'OK': 0,
        'WARNING': 1,
        'CRITICAL': 2,
        'EXPIRED': 3,
        'CHAIN_BROKEN': 3,
        'NOT_ENABLED': -1
    }
    return mapping.get(status, -1)


def check_domain(domain):
    """Check DNSSEC for a domain and update metrics"""
    try:
        monitor = DNSSECMonitor(domain)
        status = monitor.get_status()

        DNSSEC_CHECKS.labels(domain=domain).inc()

        # Update metrics
        DNSSEC_ENABLED.labels(domain=domain).set(
            1 if status.dnssec_enabled else 0
        )

        DNSSEC_VALID.labels(domain=domain).set(
            1 if status.chain_valid else 0
        )

        DNSSEC_STATUS.labels(domain=domain).set(
            status_to_number(status.validation_status)
        )

        # Set expiry metrics for each record type
        for rrsig in status.rrsig_records:
            expiry_seconds = (
                rrsig.expiration - status.timestamp
            ).total_seconds()

            DNSSEC_EXPIRY_SECONDS.labels(
                domain=domain,
                record_type=rrsig.record_type
            ).set(max(0, expiry_seconds))

        # Set overall expiry days
        if status.earliest_expiry:
            days_remaining = (
                status.earliest_expiry - status.timestamp
            ).days
            DNSSEC_EXPIRY_DAYS.labels(domain=domain).set(
                max(0, days_remaining)
            )

        return True

    except Exception as e:
        DNSSEC_CHECK_ERRORS.labels(domain=domain).inc()
        print(f"Error checking {domain}: {e}", file=sys.stderr)
        return False


def main():
    # Configuration
    port = int(os.environ.get('EXPORTER_PORT', 9199))
    interval = int(os.environ.get('CHECK_INTERVAL', 3600))  # 1 hour default
    domains_str = os.environ.get('DOMAINS', 'example.com')
    domains = [d.strip() for d in domains_str.split(',')]

    print(f"Starting DNSSEC Prometheus exporter on port {port}")
    print(f"Monitoring domains: {domains}")
    print(f"Check interval: {interval} seconds")

    # Start Prometheus HTTP server
    start_http_server(port)

    # Main loop
    while True:
        for domain in domains:
            print(f"Checking {domain}...")
            check_domain(domain)

        print(f"Sleeping for {interval} seconds...")
        time.sleep(interval)


if __name__ == '__main__':
    main()
```

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'dnssec'
    static_configs:
      - targets: ['localhost:9199']
    scrape_interval: 5m
```

### Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "DNSSEC Monitoring",
    "panels": [
      {
        "title": "DNSSEC Status",
        "type": "stat",
        "targets": [
          {
            "expr": "dnssec_status",
            "legendFormat": "{{domain}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "mappings": [
              {"type": "value", "options": {"0": {"text": "OK", "color": "green"}}},
              {"type": "value", "options": {"1": {"text": "WARNING", "color": "yellow"}}},
              {"type": "value", "options": {"2": {"text": "CRITICAL", "color": "orange"}}},
              {"type": "value", "options": {"3": {"text": "EXPIRED", "color": "red"}}}
            ]
          }
        }
      },
      {
        "title": "Days Until Signature Expiry",
        "type": "gauge",
        "targets": [
          {
            "expr": "dnssec_signature_expiry_days",
            "legendFormat": "{{domain}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "orange", "value": 3},
                {"color": "yellow", "value": 7},
                {"color": "green", "value": 14}
              ]
            },
            "min": 0,
            "max": 30
          }
        }
      },
      {
        "title": "DNSSEC Check Errors",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(dnssec_check_errors_total[1h])",
            "legendFormat": "{{domain}}"
          }
        ]
      }
    ]
  }
}
```

### Alerting Rules for Prometheus

```yaml
# dnssec-alerts.yml
groups:
  - name: dnssec
    rules:
      - alert: DNSSECSignatureExpiringSoon
        expr: dnssec_signature_expiry_days < 7
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "DNSSEC signature expiring soon for {{ $labels.domain }}"
          description: "DNSSEC signature for {{ $labels.domain }} expires in {{ $value }} days"

      - alert: DNSSECSignatureExpiryCritical
        expr: dnssec_signature_expiry_days < 3
        for: 30m
        labels:
          severity: critical
        annotations:
          summary: "DNSSEC signature critical for {{ $labels.domain }}"
          description: "DNSSEC signature for {{ $labels.domain }} expires in {{ $value }} days - immediate action required"

      - alert: DNSSECSignatureExpired
        expr: dnssec_status == 3
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "DNSSEC signature EXPIRED for {{ $labels.domain }}"
          description: "DNSSEC signatures have expired for {{ $labels.domain }} - domain may be unreachable"

      - alert: DNSSECChainBroken
        expr: dnssec_chain_valid == 0 and dnssec_enabled == 1
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: "DNSSEC chain validation failed for {{ $labels.domain }}"
          description: "DNSSEC is enabled but chain validation fails for {{ $labels.domain }}"

      - alert: DNSSECCheckFailure
        expr: increase(dnssec_check_errors_total[1h]) > 3
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "DNSSEC check failures for {{ $labels.domain }}"
          description: "Multiple DNSSEC check failures detected for {{ $labels.domain }}"
```

---

## Best Practices for DNSSEC Management

### 1. Key Rollover Procedures

```bash
#!/bin/bash
# dnssec-key-rollover-check.sh
# Monitor for upcoming key rollovers

DOMAIN="$1"
ROLLOVER_WARNING_DAYS=30

# Check current key ages
check_key_age() {
    local domain="$1"

    # Get DNSKEY records with their inception dates
    dig +dnssec "$domain" DNSKEY | grep -A1 "DNSKEY" | while read -r line; do
        if [[ "$line" =~ "key id" ]]; then
            key_id=$(echo "$line" | grep -oP 'key id = \K\d+')
            echo "Key ID: $key_id"
        fi
    done
}

# Recommended key lifetimes
echo "DNSSEC Key Rollover Guidelines:"
echo "================================"
echo "ZSK: Roll every 30-90 days"
echo "KSK: Roll every 1-2 years"
echo ""
echo "Current keys for $DOMAIN:"
check_key_age "$DOMAIN"
```

### 2. Signature Refresh Schedule

| Component | Recommended Lifetime | Refresh Before |
|-----------|---------------------|----------------|
| RRSIG (ZSK-signed) | 7-14 days | 3-5 days before expiry |
| RRSIG (KSK-signed) | 14-30 days | 7 days before expiry |
| ZSK | 30-90 days | 14 days before expiry |
| KSK | 1-2 years | 30 days before expiry |
| DS Record | Match KSK | Update with KSK rollover |

### 3. Algorithm Recommendations

| Algorithm | ID | Status | Recommendation |
|-----------|-----|--------|----------------|
| RSA/SHA-256 | 8 | Current | Acceptable, widely supported |
| RSA/SHA-512 | 10 | Current | Good security |
| ECDSA P-256 | 13 | Recommended | Best balance of security/performance |
| ECDSA P-384 | 14 | Recommended | Higher security |
| Ed25519 | 15 | Recommended | Modern, fast, secure |
| Ed448 | 16 | Recommended | Maximum security |
| RSA/SHA-1 | 5 | Deprecated | Avoid, phase out |
| DSA/SHA-1 | 3 | Deprecated | Do not use |

### 4. Monitoring Checklist

```markdown
## Daily Checks
- [ ] RRSIG expiration > 3 days for all record types
- [ ] DNSSEC chain validates successfully
- [ ] No SERVFAIL responses from validating resolvers

## Weekly Checks
- [ ] RRSIG expiration > 7 days
- [ ] DS record matches current KSK
- [ ] Algorithm not on deprecation list

## Monthly Checks
- [ ] ZSK age < 90 days (if using time-based rollover)
- [ ] Key lengths meet current recommendations
- [ ] NSEC/NSEC3 configuration appropriate

## Quarterly Checks
- [ ] KSK age check (plan rollover if > 1 year)
- [ ] Review algorithm recommendations
- [ ] Audit DNSSEC monitoring coverage
```

---

## Troubleshooting Common DNSSEC Issues

### Issue 1: SERVFAIL Responses

```bash
#!/bin/bash
# diagnose-servfail.sh
# Diagnose DNSSEC-related SERVFAIL

DOMAIN="$1"

echo "Diagnosing SERVFAIL for $DOMAIN"
echo "================================"

# Check with CD flag (disable validation)
echo "1. Query with validation disabled (CD flag):"
dig +cd "$DOMAIN" A

# Check RRSIG presence
echo ""
echo "2. Check RRSIG records:"
dig +dnssec "$DOMAIN" SOA | grep RRSIG

# Check DNSKEY
echo ""
echo "3. Check DNSKEY records:"
dig +dnssec "$DOMAIN" DNSKEY | grep DNSKEY

# Check DS at parent
echo ""
echo "4. Check DS record at parent:"
dig +short "$DOMAIN" DS

# Validate chain
echo ""
echo "5. Validate DNSSEC chain:"
delv "$DOMAIN" A 2>&1 || echo "delv not available"
```

### Issue 2: DS Record Mismatch

```bash
#!/bin/bash
# check-ds-match.sh
# Verify DS record matches DNSKEY

DOMAIN="$1"

echo "Checking DS/DNSKEY match for $DOMAIN"
echo "====================================="

# Get DS from parent
echo "DS record at parent:"
DS_RECORD=$(dig +short "$DOMAIN" DS)
echo "$DS_RECORD"

# Calculate DS from DNSKEY
echo ""
echo "Calculated DS from DNSKEY:"
dig +dnssec "$DOMAIN" DNSKEY | dnssec-dsfromkey -2 /dev/stdin 2>/dev/null

# Compare
echo ""
if [ -n "$DS_RECORD" ]; then
    echo "Comparison: Manual verification required"
else
    echo "WARNING: No DS record found at parent zone"
fi
```

### Issue 3: Clock Skew Problems

```bash
#!/bin/bash
# check-clock-skew.sh
# Detect clock skew issues in DNSSEC

DOMAIN="$1"

echo "Checking for clock skew issues"
echo "==============================="

# Get current time
NOW=$(date -u +%Y%m%d%H%M%S)
echo "Current time (UTC): $(date -u)"

# Get RRSIG inception and expiration
echo ""
echo "RRSIG timing for $DOMAIN SOA:"
dig +dnssec "$DOMAIN" SOA | grep RRSIG | while read -r line; do
    EXPIRY=$(echo "$line" | awk '{print $9}')
    INCEPTION=$(echo "$line" | awk '{print $10}')

    echo "  Inception:   $INCEPTION"
    echo "  Expiration:  $EXPIRY"
    echo "  Current:     $NOW"

    if [[ "$NOW" < "$INCEPTION" ]]; then
        echo "  WARNING: Current time is before signature inception!"
        echo "  This indicates clock skew or pre-published signatures."
    fi

    if [[ "$NOW" > "$EXPIRY" ]]; then
        echo "  ERROR: Signature has expired!"
    fi
done
```

---

## Summary: DNSSEC Monitoring Quick Reference

| Metric | Warning Threshold | Critical Threshold | Check Frequency |
|--------|-------------------|-------------------|-----------------|
| RRSIG Expiry | < 7 days | < 3 days | Every 6 hours |
| ZSK Age | > 60 days | > 85 days | Daily |
| KSK Age | > 18 months | > 23 months | Weekly |
| Chain Validation | Any failure | Any failure | Every hour |
| DS Match | Mismatch | Mismatch | Daily |
| Algorithm | Deprecated | Deprecated | Monthly |

### Key Takeaways

1. **Monitor proactively**: DNSSEC failures are catastrophic but entirely preventable with proper monitoring.

2. **Set multiple alert thresholds**: Use warning alerts at 7 days and critical alerts at 3 days before expiry.

3. **Automate checks**: Manual DNSSEC management is error-prone. Automate signature refresh and key rollovers.

4. **Test validation regularly**: Use validating resolvers (like 8.8.8.8 or 1.1.1.1) to verify your domain validates correctly.

5. **Document rollover procedures**: Have clear runbooks for emergency key rollovers and signature refresh.

6. **Monitor the full chain**: Check not just your zone but also the DS record at the parent and the chain to the root.

7. **Integrate with incident management**: Connect DNSSEC monitors to OneUptime and your on-call rotation for immediate response.

DNSSEC expiry monitoring is not optional for security-conscious organizations. A single missed signature renewal can make your entire domain unreachable to the growing number of validating resolvers worldwide. With the monitoring scripts and best practices in this guide, you can catch expiration issues days before they become outages and maintain the cryptographic integrity of your DNS infrastructure.

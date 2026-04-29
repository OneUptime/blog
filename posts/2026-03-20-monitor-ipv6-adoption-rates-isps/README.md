# How to Monitor IPv6 Adoption Rates for ISPs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Monitoring, ISP, Adoption, Analytics, NetFlow

Description: Monitor and report on IPv6 adoption rates across your ISP subscriber base using flow data, DNS queries, and traffic analysis.

## Why Monitor IPv6 Adoption?

ISPs need to track IPv6 adoption to justify investment, identify deployment blockers, and measure progress toward IPv6-only or dual-stack targets.

Key metrics:
- Percentage of subscribers with IPv6 enabled
- Percentage of traffic using IPv6
- IPv6 DNS query ratio
- IPv6 capable vs IPv6 preferring clients

## Method 1: Flow-Based Traffic Ratio

Analyze IPFIX/NetFlow data to calculate the IPv6 traffic percentage:

```sql
-- Calculate IPv6 vs IPv4 traffic ratio from flow data
-- Assumes flows are stored in a PostgreSQL database

SELECT
    date_trunc('hour', flow_start) AS hour,
    ROUND(
        100.0 * SUM(CASE WHEN ip_version = 6 THEN bytes ELSE 0 END) /
        NULLIF(SUM(bytes), 0),
        2
    ) AS ipv6_percentage,
    SUM(bytes) AS total_bytes
FROM flows
WHERE flow_start > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;
```

## Method 2: RADIUS Session Tracking

Count active IPv6 sessions through your AAA system:

```python
import pymysql
from datetime import datetime

def get_ipv6_session_ratio(db_config: dict) -> float:
    """Calculate percentage of active sessions with IPv6."""
    conn = pymysql.connect(**db_config)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            COUNT(*) as total_sessions,
            SUM(CASE WHEN framed_ipv6_prefix IS NOT NULL THEN 1 ELSE 0 END) as ipv6_sessions
        FROM radacct
        WHERE acctstoptime IS NULL  -- Active sessions only
    """)
    row = cursor.fetchone()
    total, ipv6 = row[0], row[1]
    conn.close()

    return (ipv6 / total * 100) if total > 0 else 0

ratio = get_ipv6_session_ratio({"host": "db.isp.example.com", "db": "radius", "user": "ro", "password": "pass"})
print(f"IPv6 session adoption: {ratio:.1f}%")
```

## Method 3: DNS Query Analysis

Count AAAA vs A query ratios in DNS resolver logs:

```bash
# Analyze BIND query log for IPv6 vs IPv4 DNS query ratio

# Assuming query logging is enabled in named.conf

grep "query:" /var/log/named/queries.log | \
  grep -oE "IN [A-Z]+" | sort | uniq -c | sort -rn | head -20

# Quick ratio check
TOTAL=$(grep "query:" /var/log/named/queries.log | wc -l)
AAAA=$(grep "query:.*AAAA" /var/log/named/queries.log | wc -l)
echo "AAAA query ratio: $(echo "scale=2; $AAAA * 100 / $TOTAL" | bc)%"
```

## Grafana Dashboard Setup

Create a Grafana dashboard to visualize IPv6 adoption trends:

```json
{
  "title": "IPv6 Adoption Dashboard",
  "panels": [
    {
      "title": "IPv6 Traffic Percentage",
      "type": "gauge",
      "targets": [
        {
          "rawSql": "SELECT ipv6_percentage FROM hourly_stats ORDER BY hour DESC LIMIT 1"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "thresholds": {
            "steps": [
              {"color": "red", "value": 0},
              {"color": "yellow", "value": 30},
              {"color": "green", "value": 60}
            ]
          }
        }
      }
    }
  ]
}
```

## Reporting to Management

Generate weekly IPv6 adoption reports:

```python
import smtplib
from email.mime.text import MIMEText

def send_weekly_report(ipv6_pct: float, aaaa_pct: float, session_pct: float):
    body = f"""
IPv6 Adoption Weekly Report
===========================
Traffic ratio (IPv6): {ipv6_pct:.1f}%
DNS AAAA query ratio: {aaaa_pct:.1f}%
Subscriber session ratio: {session_pct:.1f}%

Trend: {'Improving' if ipv6_pct > 50 else 'Needs attention'}
    """
    msg = MIMEText(body)
    msg["Subject"] = f"IPv6 Adoption Report - {ipv6_pct:.0f}% traffic"
    msg["To"] = "management@isp.example.com"

    with smtplib.SMTP("smtp.isp.example.com") as smtp:
        smtp.send_message(msg)
```

## External Benchmarks

Compare your adoption rate against:
- Global IPv6 stats: `https://stats.labs.apnic.net/ipv6`
- Google IPv6 stats: `https://www.google.com/intl/en/ipv6/statistics.html`
- Hurricane Electric: `https://bgp.he.net/ipv6-progress-report.cgi`

## Conclusion

Monitoring IPv6 adoption requires combining flow data, RADIUS session tracking, and DNS query analysis. Setting up automated reporting and Grafana dashboards gives operations and management teams visibility into deployment progress and helps identify subscribers that still need IPv6 enablement.

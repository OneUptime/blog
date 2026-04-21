# How to Test IPv6 Compliance of Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Compliance Testing, Application, Web, API, Development

Description: Test applications for IPv6 compliance, including web applications, APIs, client software, and backend services to ensure correct behavior on IPv6 networks.

---

Application IPv6 compliance testing verifies that software correctly handles IPv6 connections, parses IPv6 addresses, logs IPv6 sources accurately, and functions identically on IPv6-only networks as on IPv4. Many applications have subtle IPv6 bugs that only appear in production.

## Web Application IPv6 Testing

```bash
# Test 1: Web application serves correctly over IPv6

# Application must respond to IPv6 requests

# Basic connectivity test
curl -6 https://app.example.com/

# Test with specific IPv6 source
curl -6 --interface 2001:db8::10 \
  https://app.example.com/api/v1/health

# Test redirects over IPv6
curl -6 -L http://app.example.com/

# Test POST requests over IPv6
curl -6 -X POST https://app.example.com/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com"}'
```

## IPv6 Address Handling in Application Code

```python
# Test IPv6 address parsing and storage
# test_ipv6_app.py

import ipaddress
import re

# Test 1: IPv6 address validation
def test_ipv6_validation():
    valid_addrs = [
        "2001:db8::1",
        "::1",
        "fe80::1%eth0",
        "2001:db8:0:0:0:0:0:1",
    ]
    for addr in valid_addrs:
        try:
            # Remove zone ID for validation
            clean = addr.split('%')[0]
            ipaddress.ip_address(clean)
            print(f"PASS: {addr} is valid IPv6")
        except ValueError:
            print(f"FAIL: {addr} rejected as invalid")

# Test 2: IPv6 in URL construction
def test_ipv6_in_url():
    ipv6_addr = "2001:db8::80"
    port = 8080
    # IPv6 in URLs MUST use bracket notation
    url = f"http://[{ipv6_addr}]:{port}/api/v1/"
    print(f"Correct IPv6 URL: {url}")

    # Common mistake - no brackets
    wrong_url = f"http://{ipv6_addr}:{port}/api/v1/"
    print(f"WRONG IPv6 URL: {wrong_url}")

# Test 3: IPv6 regex patterns
def test_ipv6_regex():
    # Simplified IPv6 pattern (use ipaddress module in production)
    ipv6_pattern = r'[0-9a-fA-F:]{3,39}'
    test_log = "Connection from 2001:db8::20 on port 443"
    match = re.search(ipv6_pattern, test_log)
    if match:
        print(f"PASS: Extracted IPv6: {match.group()}")

if __name__ == '__main__':
    test_ipv6_validation()
    test_ipv6_in_url()
    test_ipv6_regex()
```

## Log Analysis IPv6 Testing

```bash
# Test that application logs correctly capture IPv6 addresses

# Check access logs for IPv6 entries
grep "2001:\|::1\|fe80:" /var/log/nginx/access.log | head -5

# Verify IPv6 addresses in application log files
grep -E "[0-9a-f]{1,4}:[0-9a-f]{1,4}:" /var/log/app/app.log | head -5

# Test log aggregation tool handles IPv6
# (ELK, Splunk, Graylog should parse IPv6 correctly)
cat << 'EOF' | python3
import json

# Test log parsing with IPv6 source
log_entry = json.dumps({
    "timestamp": "2026-03-20T10:00:00Z",
    "source_ip": "2001:db8::20",
    "method": "GET",
    "path": "/api/v1/resource",
    "status": 200
})
print("Sample IPv6 log entry:", log_entry)

data = json.loads(log_entry)
import ipaddress
try:
    ip = ipaddress.ip_address(data['source_ip'])
    print(f"IPv6 address parsed: version={ip.version}")
except ValueError as e:
    print(f"ERROR: {e}")
EOF
```

## Database IPv6 Address Storage

```sql
-- Test database handles IPv6 addresses correctly

-- PostgreSQL - inet type supports IPv6
CREATE TABLE connections (
    id SERIAL PRIMARY KEY,
    client_ip INET,  -- Supports both IPv4 and IPv6
    connected_at TIMESTAMP DEFAULT NOW()
);

-- Insert IPv6 address
INSERT INTO connections (client_ip) VALUES ('2001:db8::20');

-- Query with IPv6 subnet
SELECT * FROM connections
WHERE client_ip <<= '2001:db8::/32'::inet;

-- CIDR matching
SELECT * FROM connections
WHERE family(client_ip) = 6;  -- family=6 means IPv6
```

## API IPv6 Input Validation

```python
# Test API correctly validates IPv6 input
from flask import Flask, request, jsonify
import ipaddress

app = Flask(__name__)

@app.route('/api/v1/block-ip', methods=['POST'])
def block_ip():
    data = request.get_json()
    ip_str = data.get('ip', '')

    try:
        ip = ipaddress.ip_address(ip_str)
        if ip.version == 6:
            # Handle IPv6 blocking
            return jsonify({"status": "blocked", "ip": str(ip), "version": 6})
        else:
            return jsonify({"status": "blocked", "ip": str(ip), "version": 4})
    except ValueError:
        return jsonify({"error": f"Invalid IP address: {ip_str}"}), 400

# Test the endpoint with IPv6
# curl -X POST http://localhost:5000/api/v1/block-ip \
#   -H "Content-Type: application/json" \
#   -d '{"ip": "2001:db8::bad"}'
```

## Testing Email Sending over IPv6

```bash
# Test application can send email over IPv6 SMTP

# Test SMTP connectivity over IPv6
nc -6 -w 5 smtp.example.com 587

# Send test email via IPv6 SMTP
swaks --to recipient@example.com \
  --from sender@yourdomain.com \
  --server [2001:db8::25]:587 \
  --auth LOGIN \
  --auth-user sender@yourdomain.com \
  --auth-password password
```

Application IPv6 compliance requires testing not just connectivity but address handling throughout the application stack: URL construction, log parsing, database storage using appropriate data types, input validation accepting IPv6 format, and outbound connections (SMTP, API calls, webhooks) over IPv6 when servers provide AAAA records.

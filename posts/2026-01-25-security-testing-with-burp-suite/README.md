# How to Implement Security Testing with Burp Suite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Burp Suite, Security Testing, Penetration Testing, Web Security, OWASP, Application Security

Description: Learn how to implement security testing with Burp Suite, including proxy configuration, vulnerability scanning, and manual testing techniques for web applications.

---

Web applications face constant security threats. SQL injection, cross-site scripting, authentication bypasses - these vulnerabilities exist in production systems right now. Burp Suite is the industry-standard toolkit for finding these issues before attackers do. It combines an intercepting proxy with automated scanners and manual testing tools.

## Installing Burp Suite

Download Burp Suite Community Edition (free) or Professional from PortSwigger:

```bash
# After downloading, make executable and run
chmod +x burpsuite_community_linux_*.sh
./burpsuite_community_linux_*.sh

# Or on macOS
open burpsuite_community_macos_*.dmg
```

Java is required. Burp includes its own JRE.

## Configuring the Proxy

Burp acts as a proxy between your browser and the target application.

### Setting Up the Proxy Listener

1. Open Burp Suite
2. Go to Proxy > Options
3. Verify listener is running on 127.0.0.1:8080

### Configuring Your Browser

For Firefox:

```
1. Settings > Network Settings > Configure Proxy
2. Manual proxy configuration
3. HTTP Proxy: 127.0.0.1, Port: 8080
4. Check "Also use this proxy for HTTPS"
```

For Chrome with extension:

```bash
# Install FoxyProxy or SwitchyOmega extension
# Configure proxy to 127.0.0.1:8080
```

### Installing Burp CA Certificate

For HTTPS interception:

1. With browser proxied, visit http://burp
2. Click "CA Certificate" to download
3. Import into browser trust store

Firefox:

```
Settings > Privacy & Security > Certificates > View Certificates
Authorities > Import > Select downloaded certificate
Trust for identifying websites
```

## Basic Workflow

```mermaid
flowchart TD
    A[Configure Proxy] --> B[Browse Target]
    B --> C[Build Site Map]
    C --> D[Identify Entry Points]
    D --> E[Manual Testing]
    D --> F[Automated Scanning]
    E --> G[Document Findings]
    F --> G
```

## Intercepting Requests

### Intercept Mode

1. Go to Proxy > Intercept
2. Click "Intercept is off" to turn it on
3. Browse the target application
4. Modify requests before they're sent

Example: Modifying a login request:

```http
POST /api/login HTTP/1.1
Host: target.example.com
Content-Type: application/json

{"username":"admin","password":"password123"}
```

Change to test authentication:

```http
POST /api/login HTTP/1.1
Host: target.example.com
Content-Type: application/json

{"username":"admin","password":"' OR '1'='1"}
```

### HTTP History

View all requests in Proxy > HTTP history. Filter by:
- Host
- URL pattern
- Response status
- MIME type
- Search term

## Using the Repeater

Repeater lets you manually modify and resend requests:

1. Right-click a request in HTTP history
2. Select "Send to Repeater"
3. Go to Repeater tab
4. Modify the request
5. Click "Send"
6. Analyze the response

### Testing for SQL Injection

Original request:

```http
GET /api/users?id=1 HTTP/1.1
Host: target.example.com
```

Test payloads:

```http
# Error-based detection
GET /api/users?id=1' HTTP/1.1

# Boolean-based detection
GET /api/users?id=1 AND 1=1 HTTP/1.1
GET /api/users?id=1 AND 1=2 HTTP/1.1

# Time-based detection
GET /api/users?id=1; WAITFOR DELAY '0:0:5' HTTP/1.1
```

### Testing for XSS

```http
# Reflected XSS
GET /search?q=<script>alert(1)</script> HTTP/1.1

# Check response for unescaped output
# Try encoding variations
GET /search?q=%3Cscript%3Ealert(1)%3C/script%3E HTTP/1.1
```

## Using Intruder

Intruder automates sending many requests with different payloads.

### Attack Types

**Sniper**: Single payload position, one payload at a time

```http
POST /api/login HTTP/1.1

{"username":"admin","password":"PAYLOAD_HERE"}
```

**Battering Ram**: Same payload in all positions

```http
{"username":"PAYLOAD","password":"PAYLOAD"}
```

**Pitchfork**: Different payload lists for each position (parallel)

**Cluster Bomb**: All combinations of payloads

### Example: Password Brute Force

1. Send login request to Intruder
2. Mark password value as payload position: `{"password":"PASSWORD"}`
3. Go to Payloads tab
4. Load a password wordlist
5. Start attack
6. Sort results by status code or response length

### Example: Parameter Fuzzing

```http
GET /api/users?PARAM=value HTTP/1.1
```

Payload list for parameter names:

```
id
user_id
userId
uid
user
```

## Automated Scanning (Professional)

Burp Scanner automatically finds vulnerabilities:

1. Right-click target in site map
2. Select "Scan" or "Active scan this host"
3. Configure scan options
4. Review findings in Target > Issues

### Scan Configurations

Create custom scan configs for different scenarios:

```json
{
  "name": "API Security Scan",
  "scan_type": "active",
  "insertion_point_options": {
    "insert_in_url_path": true,
    "insert_in_parameter_values": true,
    "insert_in_header_values": true,
    "insert_in_json": true
  },
  "scan_options": {
    "enable_sql_injection": true,
    "enable_xss": true,
    "enable_xxe": true,
    "enable_ssrf": true
  }
}
```

## Testing Authentication

### Session Token Analysis

1. Go to Sequencer
2. Select a request that returns a session token
3. Define token location
4. Start live capture
5. Analyze randomness and entropy

Good tokens show:
- High entropy (close to 128 bits)
- No predictable patterns
- Sufficient length

### Testing Password Reset

```http
# Capture reset request
POST /api/password-reset HTTP/1.1

{"email":"victim@example.com"}

# Test for IDOR
POST /api/password-reset HTTP/1.1

{"email":"victim@example.com","user_id":"123"}

# Test token predictability
GET /api/reset?token=abc123
GET /api/reset?token=abc124  # Increment
```

## Testing Authorization

### Horizontal Privilege Escalation

1. Create two test accounts (user A, user B)
2. Log in as user A, capture requests for user A's data
3. Log in as user B
4. Replay user A's requests with user B's session
5. Check if user B can access user A's data

```http
# User A's request
GET /api/orders/123 HTTP/1.1
Cookie: session=userA_session

# Replay with User B's session
GET /api/orders/123 HTTP/1.1
Cookie: session=userB_session
```

### Vertical Privilege Escalation

```http
# Normal user request
GET /api/admin/users HTTP/1.1
Cookie: session=normal_user_session
# Should return 403

# Try bypass
GET /api/admin/users HTTP/1.1
X-Original-URL: /api/admin/users
Cookie: session=normal_user_session
```

## Using Extensions

Install extensions from BApp Store:

1. Extender > BApp Store
2. Browse or search
3. Click Install

Useful extensions:
- **Logger++**: Enhanced request logging
- **Autorize**: Authorization testing automation
- **JSON Web Tokens**: JWT analysis and manipulation
- **Param Miner**: Discover hidden parameters
- **Turbo Intruder**: High-speed fuzzing

### JWT Testing with Extension

```http
# Original token
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Test none algorithm
Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0...

# Test key confusion
# Change alg from RS256 to HS256
```

## Generating Reports

1. Target > Site map
2. Right-click target
3. Select "Issues" > "Report issues for this host"
4. Choose format (HTML, XML)
5. Select issues to include
6. Generate report

## CI/CD Integration

Use Burp Enterprise or DAST tools for automation:

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main]

jobs:
  dast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start application
        run: docker-compose up -d

      - name: Run OWASP ZAP scan
        uses: zaproxy/action-baseline@v0.10.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: security-report
          path: report_html.html
```

## Best Practices

1. Always get written authorization before testing
2. Start with passive scanning, then active
3. Test in a staging environment first
4. Document all findings with reproduction steps
5. Use scope settings to avoid testing unintended targets
6. Save your project for future reference
7. Keep Burp and extensions updated
8. Combine automated scanning with manual testing

---

Burp Suite is the Swiss Army knife of web security testing. The proxy lets you see exactly what your application sends and receives. Repeater helps you manually test edge cases. Intruder automates the tedious parts. Together, they help you find vulnerabilities before attackers do.

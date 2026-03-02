# How to Use Burp Suite for Web App Testing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Burp Suite, Security, Web Security, Penetration Testing

Description: Learn how to install and use Burp Suite for web application security testing on Ubuntu, covering proxy setup, intercepting requests, scanning for vulnerabilities, and common testing workflows.

---

Burp Suite is the standard tool for web application penetration testing. It acts as an intercepting proxy between your browser and the target web application, letting you view, modify, and replay HTTP/HTTPS requests. The Community edition (free) includes the essential tools for manual testing, while the Professional edition adds automated scanning. This guide covers setting up Burp Suite on Ubuntu and using it for common testing scenarios.

## Installing Burp Suite

```bash
# Download Burp Suite Community Edition from PortSwigger
# Visit: https://portswigger.net/burp/communitydownload

# Or download via command line
wget "https://portswigger-cdn.net/burp/releases/download?product=community&type=Linux" \
  -O burpsuite_community_linux.sh

# Make the installer executable
chmod +x burpsuite_community_linux.sh

# Run the installer
./burpsuite_community_linux.sh

# The installer creates a desktop launcher and CLI wrapper
# Default install location: ~/BurpSuiteCommunity/

# Launch from command line
~/BurpSuiteCommunity/BurpSuiteCommunity

# Or if you want to run headlessly (for scripting)
java -jar /path/to/burpsuite_community.jar
```

Burp Suite requires Java 17+:

```bash
# Install Java if not present
sudo apt update
sudo apt install default-jre

# Verify Java version
java -version
```

## Configuring the Proxy

Burp Suite's proxy listens on `127.0.0.1:8080` by default.

1. Open Burp Suite
2. Go to **Proxy > Options** (or **Proxy > Proxy settings** in newer versions)
3. Confirm the proxy listener is on `127.0.0.1:8080`

Configure your browser to use the proxy:

**For Firefox:**
- Settings > Network Settings > Manual proxy configuration
- HTTP Proxy: 127.0.0.1, Port: 8080
- Check "Also use this proxy for HTTPS"

**Via command line (launch Firefox with proxy):**

```bash
# Launch Firefox with Burp proxy
firefox --proxy-server="127.0.0.1:8080" &

# Or use chromium
chromium --proxy-server="127.0.0.1:8080" &
```

## Installing the Burp CA Certificate

For HTTPS interception, install Burp's CA certificate in your browser:

```bash
# While the proxy is running, visit this URL in your proxied browser:
# http://burpsuite or http://burp

# Download the CA certificate
curl -x http://127.0.0.1:8080 http://burpsuite/cert -o burp_ca.der

# Convert to PEM format
openssl x509 -inform DER -in burp_ca.der -out burp_ca.crt

# For system-wide installation
sudo cp burp_ca.crt /usr/local/share/ca-certificates/burp_ca.crt
sudo update-ca-certificates
```

For Firefox, import via:
- Settings > Privacy & Security > Certificates > View Certificates
- Authorities tab > Import
- Select the burp_ca.crt file and trust it for identifying websites

## Intercepting Requests

The Proxy > Intercept tab lets you pause and modify requests in flight:

1. Click **Intercept is on** to enable interception
2. Load a page in your browser
3. The request appears in Burp - you can modify it and click **Forward**
4. Or click **Drop** to discard the request

Useful keyboard shortcuts in the intercept view:
- Ctrl+F - Forward the request
- Ctrl+D - Drop the request
- Ctrl+I - Send to Intruder
- Ctrl+R - Send to Repeater

## Using the Repeater

The Repeater lets you send modified requests repeatedly and compare responses:

1. Right-click any request in Proxy History
2. Select **Send to Repeater**
3. Switch to the Repeater tab
4. Modify the request
5. Click **Send**
6. View the response and compare

```
Example workflow for testing SQL injection:
1. Find a login form
2. Submit a test login to capture the request
3. Send to Repeater
4. Modify the username field: admin' OR '1'='1
5. Send and observe response
6. Try variations: admin'--  or 1 OR 1=1
```

## Using the Intruder for Fuzzing

The Intruder automates sending many variations of a request (fuzzing):

1. Capture a request with the proxy
2. Right-click > **Send to Intruder**
3. Go to **Intruder > Positions**
4. Highlight the parameter you want to fuzz
5. Click **Add** to mark it as a position
6. Go to **Payloads** tab
7. Select payload type: Simple list, Numbers, Brute forcer, etc.
8. Click **Start attack**

```
Common Intruder use cases:
- Username enumeration: vary the username, look for different response lengths
- Password brute force: vary the password field with a wordlist
- Path traversal: fuzz file paths with ../
- Parameter value testing: find valid IDs or enum values
```

Note: In Burp Community edition, Intruder attacks are throttled. Burp Professional removes this limitation.

## Scanning with Burp Scanner

The active scanner (Professional edition only) crawls and tests automatically. In Community edition, you can use the passive scanner:

```bash
# Enable passive scanning in Proxy > Options:
# Check "Perform passive scanning"

# The passive scanner analyzes requests as you browse
# It looks for:
# - Reflected XSS opportunities
# - Potential injection points
# - Information disclosure
# - Cookie security issues
```

For Community edition, use the target site map for manual coverage:

1. Browse the entire application with interception off
2. Go to **Target > Site Map** to see all discovered URLs
3. Right-click a path and select **Engagement tools** for manual checks

## Common Testing Techniques

### SQL Injection Testing

```
Test these inputs in form fields and URL parameters:
'
''
`
')
'))
'--
'/*
' OR '1'='1
' OR '1'='1'--
1' ORDER BY 1--
1 UNION SELECT null,null,null--
```

In Burp Repeater, send a request with these payloads and look for:
- Database error messages in the response
- Different response lengths or timing for TRUE vs FALSE inputs
- Content that should not be visible

### XSS Testing

```
Test inputs:
<script>alert(1)</script>
<img src=x onerror=alert(1)>
"><script>alert(1)</script>
';alert(1);//
javascript:alert(1)
```

In Burp, use **Ctrl+U** to URL-encode payloads before sending.

### Directory Traversal

```
Fuzz file path parameters with:
../../../etc/passwd
..%2F..%2F..%2Fetc%2Fpasswd
....//....//....//etc/passwd
%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd
```

## Using Burp's Decoder

The Decoder tab helps encode and decode various formats:

```
Supported formats:
- URL encoding/decoding
- HTML encoding/decoding
- Base64 encode/decode
- Hex encode/decode
- Gzip compress/decompress
- JWT decode (via extensions)
```

Right-click any text in a request/response and select **Send to Decoder** for quick encoding operations.

## Setting Up Project Files

Save your work between sessions:

1. File > New Project
2. Choose "Save to file" with a descriptive name
3. All history, scope, and findings are saved

Configure the scope to avoid accidentally testing out-of-scope systems:

1. Right-click target in Site Map > **Add to scope**
2. Go to **Target > Scope**
3. Enable "Filter out-of-scope items"
4. In Proxy, check "Drop all requests outside target scope" to be safe

## Automating with Burp CLI

For CI/CD pipeline integration (Professional edition):

```bash
# Run Burp in headless mode with a config file
java -jar burpsuite_pro.jar \
  --project-file=scan.burp \
  --config-file=scan_config.json \
  --collaborator-server-location=your-collab-server:9090
```

A minimal scan configuration JSON:

```json
{
  "target": {
    "scope": {
      "advanced_mode": true,
      "include": [
        {
          "enabled": true,
          "scheme": "https",
          "host": "example.com",
          "port": "443",
          "file": ".*"
        }
      ]
    }
  },
  "scanner": {
    "thorough_audit": false,
    "audit_checks": ["active"]
  }
}
```

## Chrome Integration via SwitchyOmega

For a better browser proxy setup on Ubuntu, install the SwitchyOmega Chrome extension:

```bash
# Install Chromium
sudo apt install chromium-browser

# Use the SwitchyOmega extension from the Chrome Web Store
# Configure a profile:
# - Protocol: HTTP
# - Server: 127.0.0.1
# - Port: 8080
```

This lets you quickly switch between proxied and direct traffic without changing system settings.

## Logging Out After Testing

After a testing session:

1. Disable the proxy in your browser
2. Remove any permanent CA certificate installations if using a shared machine
3. Save and close your Burp project

```bash
# Remove Burp CA from system store
sudo rm /usr/local/share/ca-certificates/burp_ca.crt
sudo update-ca-certificates --fresh
```

Burp Suite is most effective when combined with manual investigation. Automated scanners find common issues but miss business logic flaws, authorization issues, and subtle injection points that require understanding the application's context.

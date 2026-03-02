# How to Use wpscan for WordPress Security Scanning on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, WordPress, wpscan, Vulnerability Scanning

Description: Learn how to install and use WPScan on Ubuntu to identify vulnerabilities in WordPress installations, plugins, themes, and user accounts.

---

WordPress powers a large percentage of the web, making it a constant target for attackers. WPScan is a WordPress-specific security scanner that checks for known vulnerabilities in the WordPress core, plugins, themes, and user enumeration. It's an essential tool for WordPress site owners and security professionals doing authorized assessments.

**Important**: Only scan WordPress sites you own or have explicit written authorization to test.

## Installing WPScan on Ubuntu

WPScan is written in Ruby and can be installed as a gem or via Docker:

### Method 1: Ruby Gem (Recommended)

```bash
# Install Ruby and build dependencies
sudo apt update
sudo apt install ruby ruby-dev ruby-bundler build-essential curl -y

# Install WPScan gem
sudo gem install wpscan

# Verify installation
wpscan --version
```

### Method 2: Docker (No Ruby Required)

```bash
# Pull the WPScan Docker image
docker pull wpscanteam/wpscan

# Create an alias for easier use
alias wpscan='docker run -it --rm wpscanteam/wpscan'

# Test it works
wpscan --version
```

### Method 3: Kali Linux Repository

If running Ubuntu with Kali repos (not recommended for production servers but useful for dedicated security VMs):

```bash
# On Kali-based systems
sudo apt install wpscan -y
```

## Getting a WPScan API Token

WPScan uses the WPVulnDB vulnerability database. Without an API token, vulnerability details are limited. Get a free token at https://wpscan.com/register:

```bash
# After registering, use the token
wpscan --url https://example.com --api-token YOUR_API_TOKEN_HERE

# Or set it as an environment variable
export WPSCAN_API_TOKEN="your_token_here"
wpscan --url https://example.com
```

## Basic Scanning

```bash
# Basic scan (non-destructive)
wpscan --url https://yourwordpresssite.com

# Disable TLS/SSL certificate verification (useful for self-signed certs)
wpscan --url https://yoursite.local --disable-tls-checks

# Verbose output for more details
wpscan --url https://yoursite.com -v
```

A basic scan checks:
- WordPress version
- Active plugins (visible ones)
- Active theme
- WordPress readme.html exposure
- XML-RPC availability
- Login page exposure
- User enumeration

## Enumerating Plugins

```bash
# Enumerate all installed plugins
wpscan --url https://example.com --enumerate p

# Enumerate vulnerable plugins only (requires API token)
wpscan --url https://example.com \
    --enumerate vp \
    --api-token YOUR_TOKEN

# Enumerate plugins with their versions
wpscan --url https://example.com \
    --enumerate ap \
    --plugins-version-detection aggressive
```

### Plugin Detection Modes

```bash
# Passive - only analyzes page source (stealthier but finds fewer plugins)
wpscan --url https://example.com \
    --enumerate p \
    --plugins-detection passive

# Aggressive - actively probes known plugin paths (finds more, more requests)
wpscan --url https://example.com \
    --enumerate p \
    --plugins-detection aggressive

# Mixed (default) - combines both
wpscan --url https://example.com \
    --enumerate p \
    --plugins-detection mixed
```

## Enumerating Themes

```bash
# Enumerate installed themes
wpscan --url https://example.com --enumerate t

# Enumerate vulnerable themes with API
wpscan --url https://example.com \
    --enumerate vt \
    --api-token YOUR_TOKEN

# All themes with aggressive detection
wpscan --url https://example.com \
    --enumerate at \
    --themes-detection aggressive
```

## User Enumeration

Knowing WordPress usernames is the first step in a brute-force attack:

```bash
# Enumerate WordPress users
wpscan --url https://example.com --enumerate u

# Enumerate users 1 through 100
wpscan --url https://example.com \
    --enumerate u[1-100]

# User enumeration uses multiple techniques:
# - /wp-json/wp/v2/users API
# - Author archive pages (?author=1, ?author=2, etc.)
# - Login error messages
```

## Password Brute Forcing

WPScan can test passwords against discovered users:

```bash
# Basic password brute force with a wordlist
wpscan --url https://example.com \
    --username admin \
    --passwords /usr/share/wordlists/rockyou.txt

# Brute force for all discovered users
wpscan --url https://example.com \
    --usernames usernames.txt \
    --passwords /usr/share/wordlists/rockyou.txt

# Limit to common passwords first (faster)
wpscan --url https://example.com \
    --username admin \
    --passwords /usr/share/wordlists/fasttrack.txt

# Control number of parallel threads (default is 5)
wpscan --url https://example.com \
    --username admin \
    --passwords wordlist.txt \
    --max-threads 2
```

**Note**: Brute forcing is very noisy and will likely be detected and blocked. Only use on sites you own and are specifically testing for brute-force resilience.

## Complete Vulnerability Assessment

Run a comprehensive scan covering all vulnerability categories:

```bash
#!/bin/bash
# wp-audit.sh - Comprehensive WordPress security scan

TARGET_URL="$1"
API_TOKEN="${WPSCAN_API_TOKEN:-}"
REPORT_FILE="/tmp/wpscan-$(date +%Y%m%d-%H%M%S).json"

if [ -z "$TARGET_URL" ]; then
    echo "Usage: $0 <wordpress-url>"
    exit 1
fi

echo "Starting WordPress security audit: $TARGET_URL"

# Full scan with all enumerations
wpscan \
    --url "$TARGET_URL" \
    --api-token "$API_TOKEN" \
    --enumerate vp,vt,u,tt,cb,dbe \
    --plugins-detection aggressive \
    --themes-detection aggressive \
    --output "$REPORT_FILE" \
    --format json \
    --verbose

echo "Scan complete. Results saved to: $REPORT_FILE"

# Parse key findings from JSON output
if command -v jq &>/dev/null; then
    echo ""
    echo "=== Key Findings ==="

    echo "WordPress Version:"
    jq -r '.version.number // "Not detected"' "$REPORT_FILE"

    echo "Vulnerable Plugins:"
    jq -r '.plugins // {} | to_entries[] | .key + ": " + (.value.vulnerabilities[0].title // "no vulns")' "$REPORT_FILE" 2>/dev/null

    echo "Users Found:"
    jq -r '.users // {} | to_entries[] | .value.username' "$REPORT_FILE" 2>/dev/null
fi
```

The enumeration flags in detail:
- `vp` - vulnerable plugins
- `vt` - vulnerable themes
- `u` - users
- `tt` - timthumbs (old vulnerable image library)
- `cb` - config backups
- `dbe` - database exports

## Scanning Options Reference

```bash
# Use a specific HTTP proxy
wpscan --url https://example.com \
    --proxy http://127.0.0.1:8080

# Set custom HTTP headers (e.g., for staging sites with basic auth)
wpscan --url https://staging.example.com \
    --http-auth username:password

# Use a custom user agent to avoid WAF blocking
wpscan --url https://example.com \
    --user-agent "Mozilla/5.0 (compatible; bot)"

# Force HTTP (skip HTTPS)
wpscan --url http://example.com

# Set request timeout
wpscan --url https://example.com \
    --request-timeout 60

# Throttle requests to avoid overloading the server
wpscan --url https://example.com \
    --throttle 500  # 500ms between requests
```

## Interpreting Results

### WordPress Version Vulnerabilities

```
[!] The WordPress version identified as 6.3.1 seems to be outdated
```
Update WordPress immediately. Outdated versions have known CVEs.

### Plugin Vulnerabilities

```
[!] Title: All In One SEO Pack <= 4.4.4 - Missing Authorization
    Fixed In: 4.4.5
    References: https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-XXXX
```
Update the plugin to the fixed version or disable it until updated.

### User Enumeration

```
[+] Enumerating Users (via Passive and Aggressive Methods)
 Brute Forcing author ID's - Time: 00:00:02
[i] User(s) Identified: admin, editor, johndoe
```
Consider enabling login protection plugins (Limit Login Attempts Reloaded) and restricting the WordPress REST API for user enumeration.

### XML-RPC Exposure

```
[+] XML-RPC seems to be enabled: https://example.com/xmlrpc.php
```
If you don't use XML-RPC (Jetpack, some plugins need it), disable it in your web server or WordPress configuration.

## Remediation Checks

After fixing identified issues, verify the fixes:

```bash
# Quick re-check after applying fixes
wpscan --url https://example.com \
    --api-token YOUR_TOKEN \
    --enumerate vp,vt \
    --format cli-no-colour 2>&1 | tee /tmp/post-fix-scan.txt

# Compare with previous scan
diff /tmp/initial-scan.txt /tmp/post-fix-scan.txt
```

## Keeping WPScan Updated

```bash
# Update WPScan gem
sudo gem update wpscan

# Update vulnerability database
wpscan --update

# With Docker
docker pull wpscanteam/wpscan
```

WPScan gives you a clear picture of the security posture of a WordPress installation in minutes. Combined with regular updates, strong passwords, and a web application firewall, it's an effective part of a WordPress security maintenance routine.

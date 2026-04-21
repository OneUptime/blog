# How to Test SSL/TLS Certificate Expiry with Command-Line Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSL, TLS, Certificate Expiry, OpenSSL, Monitoring, Command Line

Description: Learn how to check SSL certificate expiry dates using openssl, curl, and custom scripts for monitoring certificates across multiple domains.

## Quick Expiry Check with openssl s_client

```bash
# Check certificate expiry for a live server

openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | \
  openssl x509 -noout -dates

# Output:
# notBefore=Apr  2 21:18:57 2026 GMT
# notAfter=Jul  1 21:24:46 2026 GMT
                # ^^^^^^^^^^^^^^^^^ This is the expiry date
```

## Step 1: Check Days Until Expiry

```bash
# Get the expiry date string
EXPIRY=$(openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | \
  openssl x509 -noout -enddate | sed 's/notAfter=//')

# Convert it to a Unix timestamp and calculate days remaining
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW=$(date +%s)
DAYS=$(( (EXPIRY_EPOCH - NOW) / 86400 ))
echo "Certificate expires in ${DAYS} days (${EXPIRY})"

# Use checkend to directly test if cert expires within N seconds
# 0 = check if already expired
# 2592000 = check if expires within 30 days
openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | \
  openssl x509 -noout -checkend 2592000 && echo "OK (>30 days)" || echo "WARNING: expires within 30 days"
```

## Step 2: Check a Local Certificate File

```bash
# Check expiry of a certificate file
openssl x509 -enddate -noout -in /etc/ssl/certs/example.com.crt

# Expiry date for a local file
CERT="/etc/letsencrypt/live/example.com/cert.pem"
openssl x509 -enddate -noout -in "$CERT"

# Check if local cert expires within 30 days
openssl x509 -noout -checkend 2592000 -in "$CERT" && \
  echo "OK" || echo "Renew soon!"
```

## Step 3: Batch Check Multiple Domains

```bash
#!/bin/bash
# check_certs.sh - Check SSL expiry for multiple domains

DOMAINS=(
    "example.com:443"
    "api.example.com:443"
    "mail.example.com:993"
    "smtp.example.com:587:smtp"
)

WARNING_DAYS=30
CRITICAL_DAYS=7

echo "====================================="
echo "SSL Certificate Expiry Report"
echo "Generated: $(date)"
echo "====================================="

for ENTRY in "${DOMAINS[@]}"; do
    HOST="${ENTRY%%:*}"
    REST="${ENTRY#*:}"
    PORT="${REST%%:*}"
    PROTO="${REST##*:}"

    # Build openssl command (with STARTTLS if needed)
    if [ "$PROTO" = "smtp" ]; then
        STARTTLS="-starttls smtp"
    elif [ "$PROTO" = "imap" ]; then
        STARTTLS="-starttls imap"
    else
        STARTTLS=""
    fi

    # Get certificate expiry
    RESULT=$(openssl s_client $STARTTLS \
              -connect "${HOST}:${PORT}" \
              -servername "${HOST}" \
              2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | \
              sed 's/notAfter=//')

    if [ -z "$RESULT" ]; then
        echo "ERROR: ${HOST}:${PORT} - Could not retrieve certificate"
        continue
    fi

    # Calculate days remaining
    EXPIRY_EPOCH=$(date -d "$RESULT" +%s 2>/dev/null)
    if [ -z "$EXPIRY_EPOCH" ]; then
        EXPIRY_EPOCH=$(date -jf "%b %d %H:%M:%S %Y %Z" "$RESULT" +%s 2>/dev/null)
    fi
    if [ -z "$EXPIRY_EPOCH" ]; then
        echo "ERROR: ${HOST}:${PORT} - Could not parse expiry date: ${RESULT}"
        continue
    fi
    NOW=$(date +%s)
    DAYS=$(( (EXPIRY_EPOCH - NOW) / 86400 ))

    # Determine status
    if [ "$DAYS" -lt 0 ]; then
        STATUS="EXPIRED"
    elif [ "$DAYS" -lt "$CRITICAL_DAYS" ]; then
        STATUS="CRITICAL"
    elif [ "$DAYS" -lt "$WARNING_DAYS" ]; then
        STATUS="WARNING"
    else
        STATUS="OK"
    fi

    printf "%-30s %8s  %3d days  %s\n" "${HOST}:${PORT}" "$STATUS" "$DAYS" "$RESULT"
done
```

## Step 4: Use curl to Check Certificate

```bash
# curl shows certificate info in verbose mode
curl -vI https://example.com/ 2>&1 | grep -E "expire|issuer|subject"

# Check with curl's --head option
curl --head --silent https://example.com/ \
  --write-out "verify_result: %{ssl_verify_result}\n%{certs}" \
  --output /dev/null | grep -E "verify_result|Subject:|Issuer:|Expire date:"

# Note: %{certs} requires curl 7.88.0+ and a supported TLS backend
```

## Step 5: Nagios/Check_MK Plugin for Expiry Monitoring

```bash
#!/bin/bash
# check_ssl_expiry.sh - Nagios-compatible check

HOST="${1:-example.com}"
PORT="${2:-443}"
WARNING="${3:-30}"
CRITICAL="${4:-7}"

EXPIRY=$(openssl s_client -connect "${HOST}:${PORT}" -servername "${HOST}" \
          2>/dev/null | openssl x509 -noout -enddate | sed 's/notAfter=//')
if [ -z "$EXPIRY" ]; then
    echo "UNKNOWN: ${HOST} certificate could not be retrieved"
    exit 3
fi

EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null)
if [ -z "$EXPIRY_EPOCH" ]; then
    echo "UNKNOWN: ${HOST} certificate expiry date could not be parsed"
    exit 3
fi

DAYS=$(( (EXPIRY_EPOCH - $(date +%s)) / 86400 ))

if [ "$DAYS" -lt 0 ]; then
    echo "CRITICAL: ${HOST} certificate EXPIRED ${DAYS#-} days ago"
    exit 2
elif [ "$DAYS" -lt "$CRITICAL" ]; then
    echo "CRITICAL: ${HOST} certificate expires in ${DAYS} days"
    exit 2
elif [ "$DAYS" -lt "$WARNING" ]; then
    echo "WARNING: ${HOST} certificate expires in ${DAYS} days"
    exit 1
else
    echo "OK: ${HOST} certificate valid for ${DAYS} days (expires ${EXPIRY})"
    exit 0
fi
```

## Step 6: Check OCSP Revocation Status

```bash
# Get the OCSP responder URL from the certificate
OCSP_URL=$(openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | \
  openssl x509 -noout -ocsp_uri | head -n 1)

# Check revocation status via OCSP
openssl ocsp -issuer /etc/ssl/certs/intermediate.pem \
  -cert /etc/ssl/certs/example.com.crt \
  -url "$OCSP_URL" \
  -no_nonce \
  -text 2>&1 | grep -Ei "good|revoked|error"
```

## Conclusion

Command-line SSL certificate expiry checking with `openssl` is fast and scriptable. Use `openssl x509 -checkend` for quick pass/fail checks, write batch scripts to check multiple domains, and integrate with Nagios/Zabbix using the Nagios-compatible exit codes. Run expiry checks daily from cron and alert when certificates fall below 30 days remaining.

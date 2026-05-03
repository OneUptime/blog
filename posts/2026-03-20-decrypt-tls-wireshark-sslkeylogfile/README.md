# How to Capture HTTPS Traffic and Decrypt TLS in Wireshark with SSLKEYLOGFILE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, TLS, HTTPS, SSLKEYLOGFILE, Decryption

Description: Learn how to decrypt TLS/HTTPS traffic in Wireshark using the SSLKEYLOGFILE environment variable, which captures session keys from browsers and applications without requiring the server's private key.

## How TLS Decryption Works

Modern TLS uses Perfect Forward Secrecy (PFS) with ephemeral key exchange, meaning the server's private key can't decrypt captured traffic. The SSLKEYLOGFILE method works by:
1. Setting `SSLKEYLOGFILE` environment variable
2. The application (Chrome, Firefox, curl) writes session keys to the file as connections are made
3. Wireshark reads the key file and decrypts the captured traffic

## Step 1: Set SSLKEYLOGFILE Environment Variable

```bash
# Linux/macOS - set before launching the application

# Method 1: For a single session

export SSLKEYLOGFILE=/tmp/tls-keys.log
google-chrome
# or
export SSLKEYLOGFILE=/tmp/tls-keys.log
firefox

# Method 2: Permanent (add to ~/.bashrc or ~/.zshrc)
echo 'export SSLKEYLOGFILE=~/.ssl-key.log' >> ~/.bashrc
source ~/.bashrc

# Verify the file is being written
tail -f /tmp/tls-keys.log
# Should show entries like: CLIENT_RANDOM ab12cd34... ef56gh78...
```

```cmd
REM Windows - set before launching browser
set SSLKEYLOGFILE=C:\temp\tls-keys.log
start chrome.exe

REM Or set permanently in System Environment Variables:
REM System Properties → Environment Variables → New
REM Variable: SSLKEYLOGFILE
REM Value: C:\Users\YourName\tls-keys.log
```

## Step 2: Configure Wireshark to Use Key File

```text
In Wireshark:
1. Edit → Preferences
2. Expand: Protocols → TLS (or SSL in older versions)
3. (Pre)-Master-Secret log filename: /tmp/tls-keys.log
4. Click OK

Or via command line:
tshark -r capture.pcap -o 'tls.keylog_file:/tmp/tls-keys.log'
```

## Step 3: Capture HTTPS Traffic

```bash
# Start Wireshark first, then start browser with SSLKEYLOGFILE set

# Method 1: Capture then decrypt
# 1. Start Wireshark capture
# 2. Open browser with SSLKEYLOGFILE set
# 3. Browse HTTPS sites
# 4. Stop capture
# 5. Configure key file in Wireshark → traffic decrypts automatically

# Method 2: tcpdump + Wireshark offline
sudo tcpdump -i eth0 -n -w /tmp/https-capture.pcap 'port 443'

# While tcpdump runs:
export SSLKEYLOGFILE=/tmp/tls-keys.log
curl https://example.com
curl https://api.example.com/v1/data

# Then open in Wireshark with key file configured
```

## Step 4: Use SSLKEYLOGFILE with curl and Python

```bash
# curl supports SSLKEYLOGFILE natively
SSLKEYLOGFILE=/tmp/tls-keys.log curl -v https://example.com

# Capture simultaneously
sudo tcpdump -i eth0 -w /tmp/curl-capture.pcap 'port 443' &
SSLKEYLOGFILE=/tmp/tls-keys.log curl https://api.example.com/endpoint
kill %1   # Stop tcpdump
```

```python
# Python requests - export keys via environment variable
import os
import requests

# Set before making requests
os.environ['SSLKEYLOGFILE'] = '/tmp/tls-keys.log'

# Python 3.8+ ssl.create_default_context() honors SSLKEYLOGFILE automatically.
# requests >= 2.30 (with urllib3 >= 2.0) also reads SSLKEYLOGFILE in
# create_urllib3_context(), so no custom SSL context is needed on modern stacks.
# Legacy urllib3 1.x does NOT honor it - upgrade urllib3 or build a custom
# SSLContext and set context.keylog_filename explicitly.

# Alternative: Use mitmproxy for Python request interception
# pip install mitmproxy
# mitmproxy -p 8080 --ssl-insecure
```

## Step 5: Verify Decryption Is Working

```text
In Wireshark after configuring key file:

Before decryption: TLS packets show as "TLSv1.3 Application Data"
After decryption:  Packets show as HTTP/2 or HTTP/1.1 content

Display filter to confirm decryption:
http2          → HTTP/2 frames (modern HTTPS)
http           → HTTP/1.1 (older HTTPS)
http2.headers  → HTTP/2 headers (method, URL, status code)

If still showing TLS Application Data:
1. Check key file path in preferences is correct
2. Verify SSLKEYLOGFILE was set BEFORE the connection was made
3. Check key file contains CLIENT_RANDOM entries for captured sessions
```

## Step 6: Analyze Decrypted HTTPS

```text
After successful decryption, apply filters:

All HTTP/2 requests:
http2.headers.method

Specific API calls:
http2.headers.path contains "/api/"

Response codes:
http2.headers.status == 200
http2.headers.status == 500

Request bodies (POST data):
http2 and http2.type == 0    → DATA frames containing body

Frame-type breakdown:
Statistics → HTTP2
Shows counts per HTTP/2 frame type (HEADERS, DATA, etc.)
```

## Step 7: Security Considerations

```bash
# IMPORTANT: The TLS key log file contains session keys
# Anyone with this file can decrypt captured traffic

# Restrict file permissions
chmod 600 /tmp/tls-keys.log

# Never enable this in production environments
# Only use for development/debugging on controlled machines

# Clean up after use
rm /tmp/tls-keys.log

# Unset the environment variable when done
unset SSLKEYLOGFILE

# For production TLS debugging, use:
# - Application-level logging (log request/response in your code)
# - APM tools (Datadog, New Relic, Jaeger)
# - mTLS with certificate pinning for API debugging
```

## Conclusion

TLS decryption in Wireshark uses the SSLKEYLOGFILE method: set `export SSLKEYLOGFILE=/tmp/tls-keys.log` before launching Chrome/Firefox/curl, capture traffic with `tcpdump -w capture.pcap`, then configure Wireshark under Edit → Preferences → TLS → Pre-Master-Secret log filename. After loading the key file, TLS Application Data packets become readable HTTP/2 or HTTP/1.1 frames. This method works with PFS/ephemeral keys that the server's private key cannot decrypt. Never use on production systems - restrict file permissions to `600` and delete the key file when done.

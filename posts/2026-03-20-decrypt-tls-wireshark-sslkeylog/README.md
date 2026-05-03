# How to Decrypt TLS Traffic in Wireshark with SSLKEYLOGFILE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, TLS, HTTPS, Security, Network Analysis, Debugging

Description: Learn how to capture and decrypt TLS/HTTPS traffic in Wireshark using the SSLKEYLOGFILE pre-master secret log for troubleshooting.

---

Wireshark can decrypt TLS traffic if it has the session key material. Modern TLS uses ephemeral keys (ECDHE), making server private key decryption impossible - but the `SSLKEYLOGFILE` mechanism lets browsers and other TLS clients log the session keys as they're negotiated.

---

## Enable SSLKEYLOGFILE in Your Browser

```bash
# Linux/macOS

export SSLKEYLOGFILE=/tmp/tls-keys.log
google-chrome &
# or
firefox &

# Windows (Command Prompt)
set SSLKEYLOGFILE=C:\tls-keys.log
"C:\Program Files\Google\Chrome\Application\chrome.exe"
```

The log file grows as you browse - each TLS session appends its keys.

---

## Capture TLS Traffic with tcpdump

```bash
# While the browser with SSLKEYLOGFILE is running
sudo tcpdump -i eth0 -w capture.pcap 'port 443'
```

---

## Configure Wireshark to Use the Key Log File

1. Open Wireshark and load the capture file.
2. Go to **Edit** → **Preferences** → **Protocols** → **TLS**.
3. Set **(Pre)-Master-Secret log filename** to `/tmp/tls-keys.log`.
4. Click **OK** and reload the capture (**File** → **Reload**).

TLS traffic now appears decrypted in the packet details.

---

## Apply Display Filters After Decryption

```text
# Show decrypted HTTP/2 frames
http2

# Show decrypted HTTP/1.1
http

# Filter by hostname after decryption
http.host == "api.example.com"

# Show TLS handshake packets
tls.handshake
```

---

## Capture with tshark and Decrypt

```bash
# Decrypt during tshark export
tshark -r capture.pcap   -o "tls.keylog_file:/tmp/tls-keys.log"   -Y "http"   -T fields -e http.request.uri
```

---

## Security Considerations

- The key log file contains session secrets - store securely and delete after use
- Never use SSLKEYLOGFILE in production environments
- Only works with TLS clients that support it (Chrome, Firefox, curl, Python requests)
- Does not work for applications whose TLS stack does not expose session keys (e.g., many native mobile apps, older Java/.NET runtimes)

---

## Enable in curl and Python

```bash
# curl (requires curl 7.58.0+ with a supported TLS backend such as OpenSSL, GnuTLS, or wolfSSL)
SSLKEYLOGFILE=/tmp/tls-keys.log curl -v https://api.example.com/

# Python requests (via urllib3 keylog)
SSLKEYLOGFILE=/tmp/tls-keys.log python3 my_script.py
```

---

## Summary

Set `SSLKEYLOGFILE=/tmp/tls-keys.log` before launching a TLS client, capture the traffic with tcpdump or Wireshark, then point Wireshark to the key log file via **Preferences** → **TLS**. Wireshark decrypts the sessions and exposes the plaintext HTTP, HTTP/2, or other application data for analysis.

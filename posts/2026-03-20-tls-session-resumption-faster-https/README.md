# How to Configure TLS Session Resumption for Faster HTTPS Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TLS, Session Resumption, Performance, Nginx, HTTPS, Optimization

Description: Learn how to configure TLS session caching and session tickets to reduce handshake overhead for repeat HTTPS visitors, improving connection performance.

## Why TLS Session Resumption?

A full TLS handshake requires 1-2 round trips before any application data is sent. For repeat clients, session resumption allows them to skip most of the handshake by reusing previously negotiated session parameters. This reduces latency and CPU overhead on both client and server.

## Two Resumption Mechanisms

| Mechanism | Storage | Security | TLS 1.3 Support |
|---|---|---|---|
| Session Cache (IDs) | Server-side | Good (server controls validity) | No (legacy TLS 1.2 and earlier) |
| Session Tickets | Client-side (encrypted) | Weaker (ticket key must be protected) | Yes (PSK resumption; 0-RTT optional) |

TLS 1.3 uses PSK (Pre-Shared Key) resumption, commonly provisioned with `NewSessionTicket` messages, which supersedes legacy session IDs.

## Step 1: Configure Session Cache in Nginx

```nginx
# /etc/nginx/conf.d/ssl.conf or server block

# Shared SSL session cache (10MB ≈ ~40,000 sessions)

ssl_session_cache   shared:SSL:10m;

# Session timeout - how long to keep session parameters (default: 5m)
ssl_session_timeout 1d;   # 1 day for returning visitors

# Disable ticket-based resumption if you only want server-side session IDs.
# Note: this disables TLS 1.3 ticket/PSK resumption in Nginx.
ssl_session_tickets off;
```

The `shared` keyword makes the cache shared across all worker processes-essential for multi-worker Nginx deployments. With tickets disabled, this primarily helps TLS 1.2 and older clients; TLS 1.3 resumption uses PSKs delivered by tickets.

## Step 2: Configure Session Tickets (Optional)

Session tickets move storage to the client side, encrypted with a server-held ticket key:

```bash
# Generate a ticket key (rotate at least every 24 hours)
openssl rand 80 > /etc/nginx/ssl_ticket.key
```

```nginx
# Enable session tickets (less secure than session IDs but scales better)
ssl_session_tickets on;

# Reference in nginx (Nginx 1.5.7+)
# ssl_session_ticket_key /etc/nginx/ssl_ticket.key;
```

**Security note:** If the ticket key is compromised, captured ticket-protected session state can be decrypted and tickets can be reused until they expire or the key is rotated. Rotate ticket keys regularly.

## Step 3: Configure Session Resumption in Apache

```apache
# /etc/apache2/mods-enabled/ssl.conf

# Server-side session cache
SSLSessionCache         shmcb:/var/run/apache2/ssl_scache(512000)
SSLSessionCacheTimeout  86400     # 24 hours

# Disable session tickets for better forward secrecy
SSLSessionTickets off
```

## Step 4: Verify Session Resumption Is Working

Test with `openssl s_client` and look for the "Reused" indicator:

```bash
# Server-side session ID cache test for TLS 1.2
openssl s_client -connect example.com:443 -servername example.com \
  -tls1_2 -no_ticket -reconnect 2>&1 | \
  grep -E "Session-ID|^(New|Reused),"

# Output on first connection:
# Session-ID: A1B2C3D4...
# Session-ID-ctx:
# Master-Key: ...

# Subsequent connections should show:
# Reused, TLSv1.2, Cipher is ECDHE-RSA-AES256-GCM-SHA384
# ^^^^^^ "Reused" confirms session resumption

# Ticket/PSK resumption test (useful for TLS 1.3)
# Keep the first connection open long enough to receive a NewSessionTicket, then quit.
openssl s_client -connect example.com:443 \
  -servername example.com -sess_out /tmp/session.txt

openssl s_client -connect example.com:443 \
  -servername example.com -sess_in /tmp/session.txt 2>&1 | grep -E "^(New|Reused),|Session-ID"
```

## Step 5: Monitor Session Resumption Rate

Default Nginx logs don't show session resumption directly. Add `$ssl_session_reused` to a custom log format, where `r` means reused and `.` means a new session:

```nginx
log_format tls '$remote_addr $ssl_protocol $ssl_cipher $ssl_session_reused "$request"';
access_log /var/log/nginx/access.log tls;
```

```bash
# Or use OpenSSL for a spot check of TLS 1.2 session-ID reuse
openssl s_client -connect example.com:443 -servername example.com \
  -tls1_2 -no_ticket -reconnect 2>&1 | \
  grep -c "^Reused"
```

## Step 6: TLS 1.3 0-RTT (Zero Round-Trip) Resumption

TLS 1.3 supports 0-RTT data, where resumed sessions can send application data immediately:

```nginx
# Enable early data / 0-RTT (Nginx 1.15.4+ with OpenSSL 1.1.1+)
ssl_early_data on;

# IMPORTANT: 0-RTT is vulnerable to replay attacks
# Only use for idempotent requests (GET requests, not POST)
# Pass the early data header to your app for detection
proxy_set_header Early-Data $ssl_early_data;
```

In your application, reject non-idempotent requests if `Early-Data: 1` is present.

## Step 7: Session Cache Size Calculation

Estimate the cache size needed:

```text
Cache entries needed = new TLS sessions per second * desired reuse window in seconds
Memory per session ≈ 256 bytes
10MB cache ≈ 40,000 sessions

# For 1000 sessions/second and 10 minute reuse window:
# 1000 * 600 = 600,000 sessions needed -> ~150MB cache
ssl_session_cache shared:SSL:150m;
```

## Conclusion

TLS session resumption reduces handshake overhead for returning clients. Use server-side session caching (`ssl_session_cache shared:SSL:10m`) with a 24-hour timeout for TLS 1.2 session-ID resumption. For TLS 1.3 resumption, use ticket/PSK resumption and rotate the ticket key regularly if you configure one explicitly. Verify resumption with `openssl s_client` and look for the "Reused" output.

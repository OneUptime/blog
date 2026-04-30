# How to Troubleshoot IPv6 Happy Eyeballs Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Happy Eyeballs, Dual-Stack, Troubleshooting, Connection Delays, RFC 8305

Description: Diagnose and fix Happy Eyeballs (RFC 8305) connection delays, unexpected IPv4 fallback, and application behavior when both IPv4 and IPv6 are available.

## Introduction

Happy Eyeballs (RFC 8305) is an algorithm dual-stack applications use to race IPv4 and IPv6 connection attempts, using whichever responds first. When implemented correctly, users get the best of both protocols. Problems arise when IPv6 connections consistently fail or are slow, often causing roughly 250ms+ delays before a later IPv4 attempt - or when an application unexpectedly falls back to IPv4.

## Understanding Happy Eyeballs

```text
Happy Eyeballs flow:
1. Start AAAA and A DNS queries asynchronously (AAAA first, then A immediately)
2. If A arrives first, wait briefly for AAAA (50ms resolution delay per RFC 8305)
3. Sort available addresses per RFC 6724 and interleave address families
4. Start the first connection attempt
5. If no connection succeeds after the connection-attempt delay (often 250ms), start the next address
6. Use the first successful connection and cancel the rest
```

## Step 1: Diagnose Connection Preference

```bash
# Check which protocol curl actually uses

curl -w "Connected to: %{remote_ip}\n" -s -o /dev/null https://example.com

# Force IPv6 to see if it succeeds
curl -6 -s -o /dev/null https://example.com && echo "IPv6 works"

# Force IPv4 to see if it succeeds
curl -4 -s -o /dev/null https://example.com && echo "IPv4 works"

# Measure connection timing for IPv6 vs IPv4
echo "IPv6 timing:"
curl -6 -s -o /dev/null -w "remote_ip=%{remote_ip}\nconnect=%{time_connect}s\ntls=%{time_appconnect}s\n" https://example.com

echo "IPv4 timing:"
curl -4 -s -o /dev/null -w "remote_ip=%{remote_ip}\nconnect=%{time_connect}s\ntls=%{time_appconnect}s\n" https://example.com
```

## Step 2: Test DNS Response Times for AAAA vs A

```bash
# Measure DNS resolution time for AAAA
time dig AAAA example.com +short

# Measure DNS resolution time for A
time dig A example.com +short

# If one family is consistently delayed or times out, it can change which
# addresses are available first to the Happy Eyeballs algorithm

# Check if AAAA queries time out
dig AAAA example.com +time=2 +tries=1
echo "Exit code: $? (0=response received, 9=no reply from server)"
```

## Step 3: Simulate Happy Eyeballs Behavior

```python
#!/usr/bin/env python3
"""Simulate a simple Happy Eyeballs-style connection race."""

import asyncio
import socket
import time

async def try_connect(host, port, family, delay_ms=0):
    """Try each address for one family after an optional delay."""
    await asyncio.sleep(delay_ms / 1000)
    loop = asyncio.get_running_loop()

    info = await loop.getaddrinfo(
        host, port, family=family, type=socket.SOCK_STREAM
    )

    last_error = None
    for af, socktype, proto, _, sockaddr in info:
        sock = socket.socket(af, socktype, proto)
        sock.setblocking(False)
        family_name = "IPv6" if af == socket.AF_INET6 else "IPv4"
        conn_start = time.monotonic()

        try:
            await asyncio.wait_for(
                loop.sock_connect(sock, sockaddr),
                timeout=5
            )
            elapsed = (time.monotonic() - conn_start) * 1000
            print(f"{family_name} connected to {sockaddr[0]} in {elapsed:.0f}ms")
            return family_name, elapsed
        except Exception as exc:
            last_error = exc
        finally:
            sock.close()

    raise last_error or OSError("No addresses returned")

async def happy_eyeballs(host, port):
    """Race IPv6 first, then start IPv4 after 250ms."""
    print(f"Happy Eyeballs test to {host}:{port}")

    tasks = [
        asyncio.create_task(try_connect(host, port, socket.AF_INET6, delay_ms=0)),
        asyncio.create_task(try_connect(host, port, socket.AF_INET, delay_ms=250)),
    ]

    try:
        for task in asyncio.as_completed(tasks):
            try:
                winner, elapsed = await task
                print(f"Winner: {winner} ({elapsed:.0f}ms)")
                return
            except Exception as exc:
                print(f"Attempt failed: {exc}")

        print("No connection succeeded")
    finally:
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

asyncio.run(happy_eyeballs("google.com", 443))
```

## Step 4: Fix Happy Eyeballs Delays in Applications

Problem: IPv6 SYN never returns, causing added delay before another address is tried

Solution: Fix underlying IPv6 connectivity or tune the application's connection behavior

```python
import asyncio

async def main():
    _reader, writer = await asyncio.open_connection(
        "example.com",
        443,
        happy_eyeballs_delay=0.25,
        interleave=1,
    )
    writer.close()
    await writer.wait_closed()

asyncio.run(main())
```

```go
dialer := &net.Dialer{
    Timeout:       5 * time.Second,
    FallbackDelay: 100 * time.Millisecond, // Default is 300ms if zero
}
```

```js
import net from 'node:net';

const socket = net.createConnection({
  host: 'example.com',
  port: 443,
  autoSelectFamily: true,
  autoSelectFamilyAttemptTimeout: 250,
});
```

## Step 5: Fix Broken IPv6 That Causes Fallback Delays

```bash
# If IPv6 is assigned but broken (causing fallback delays):

# Option 1: Fix IPv6 (preferred)
# Ensure default route exists:
ip -6 route show default

# Ensure ICMPv6 is not blocked:
ping -6 -c 1 2001:4860:4860::8888 || echo "IPv6 broken!"

# Option 2: Remove problematic IPv6 routes
# Remove the IPv6 default route to force IPv4
sudo ip -6 route del default

# Option 3: Disable IPv6 on specific interface
sudo sysctl -w net.ipv6.conf.eth0.disable_ipv6=1

# Option 4: Adjust /etc/gai.conf to prefer IPv4 for getaddrinfo()-based clients
# Add to /etc/gai.conf to prefer IPv4:
# precedence ::ffff:0:0/96 100
```

## Conclusion

Happy Eyeballs delays often come from IPv6 connection attempts that fail silently or from DNS/application behavior that postpones later attempts. The fix is usually to repair IPv6 connectivity (fix the default route or unblock ICMPv6), adjust application fallback behavior, or remove broken IPv6 routes that cause fruitless connection attempts. Measure with `curl -w "%{remote_ip}"` to confirm which protocol is actually used and `curl -w "%{time_connect}"` (and `"%{time_appconnect}"` for HTTPS) to quantify connection setup differences. A properly working dual-stack network often shows comparable connection times for both protocols.

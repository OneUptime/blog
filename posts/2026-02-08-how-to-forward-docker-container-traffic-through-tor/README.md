# How to Forward Docker Container Traffic Through Tor

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Tor, Networking, Privacy, Security, Containers

Description: Learn how to route Docker container traffic through the Tor network for anonymous browsing, testing, and privacy-focused applications.

---

Tor (The Onion Router) anonymizes network traffic by routing it through multiple encrypted relays. Running Tor inside Docker containers is useful for privacy-focused applications, anonymous scraping, testing .onion services, and verifying that your application works behind anonymizing proxies. This guide covers setting up a Tor proxy container and routing other container traffic through it.

## Architecture Overview

The setup involves two components: a Tor container that acts as a SOCKS proxy, and application containers that route their traffic through that proxy.

```mermaid
graph LR
    A[App Container] -->|SOCKS5 Proxy| B[Tor Container]
    B -->|Encrypted| C[Tor Entry Node]
    C -->|Encrypted| D[Tor Relay]
    D -->|Encrypted| E[Tor Exit Node]
    E --> F[Destination Server]
```

The application container never connects directly to the destination. All traffic passes through the Tor network.

## Method 1: Tor as a SOCKS Proxy Container

The simplest approach is to run Tor as a SOCKS5 proxy and configure your application to use it.

Start a Tor container that exposes a SOCKS5 proxy:

```bash
# Run a Tor SOCKS5 proxy container
docker run -d \
  --name tor-proxy \
  --restart unless-stopped \
  dperson/torproxy
```

This container exposes a SOCKS5 proxy on port 9050. Test it:

```bash
# Verify the Tor proxy is working by checking your exit IP
docker run --rm --link tor-proxy:tor alpine/curl \
  -x socks5h://tor:9050 \
  https://check.torproject.org/api/ip
```

The response should show `"IsTor": true` and the exit node's IP address.

## Method 2: Tor with Docker Network

Using a Docker network is cleaner than the legacy `--link` flag:

```bash
# Create a network for Tor traffic
docker network create tor-net

# Start the Tor proxy on the network
docker run -d \
  --name tor-proxy \
  --network tor-net \
  dperson/torproxy

# Run an application that uses the Tor proxy
docker run --rm \
  --network tor-net \
  alpine/curl \
  -x socks5h://tor-proxy:9050 \
  https://check.torproject.org/api/ip
```

The `socks5h://` protocol (note the `h`) tells curl to resolve DNS through the SOCKS proxy as well. This prevents DNS leaks, where hostnames get resolved outside the Tor network.

## Method 3: Transparent Tor Proxy

For applications that do not support SOCKS proxy configuration, you can run a transparent proxy that intercepts all traffic and routes it through Tor. This requires no application changes.

Create a Dockerfile for a transparent Tor proxy:

```dockerfile
# Dockerfile.tor-transparent
# Transparent Tor proxy that intercepts all traffic
FROM alpine:3.19

RUN apk add --no-cache tor iptables

# Tor configuration for transparent proxy mode
RUN echo "VirtualAddrNetworkIPv4 10.192.0.0/10" >> /etc/tor/torrc && \
    echo "AutomapHostsOnResolve 1" >> /etc/tor/torrc && \
    echo "TransPort 0.0.0.0:9040" >> /etc/tor/torrc && \
    echo "DNSPort 0.0.0.0:5353" >> /etc/tor/torrc && \
    echo "SocksPort 0.0.0.0:9050" >> /etc/tor/torrc

EXPOSE 9040 9050 5353

CMD ["tor", "-f", "/etc/tor/torrc"]
```

Build and run it:

```bash
# Build the transparent Tor proxy image
docker build -t tor-transparent -f Dockerfile.tor-transparent .

# Run the transparent proxy
docker run -d \
  --name tor-transparent \
  --network tor-net \
  tor-transparent
```

## Method 4: Sharing Network Namespace

For complete traffic interception without application configuration, use Docker's network namespace sharing:

```bash
# Start the Tor proxy container
docker run -d \
  --name tor-gateway \
  --cap-add NET_ADMIN \
  dperson/torproxy

# Route all traffic from an app container through Tor
docker run --rm \
  --network container:tor-gateway \
  alpine/curl https://check.torproject.org/api/ip
```

With `--network container:tor-gateway`, the app container shares the Tor container's network stack. All traffic exits through Tor.

## Docker Compose Setup

Here is a complete Docker Compose setup with a Tor proxy and multiple services:

```yaml
# docker-compose.yml - Application stack with Tor proxy
services:
  tor:
    image: dperson/torproxy
    container_name: tor-proxy
    networks:
      - tor-net
    restart: unless-stopped

  scraper:
    image: python:3.11-slim
    networks:
      - tor-net
    environment:
      # Configure the application to use Tor SOCKS proxy
      HTTP_PROXY: socks5h://tor-proxy:9050
      HTTPS_PROXY: socks5h://tor-proxy:9050
      ALL_PROXY: socks5h://tor-proxy:9050
    depends_on:
      - tor
    command: python scraper.py

  web-tester:
    image: alpine/curl
    networks:
      - tor-net
    depends_on:
      - tor
    # Test that traffic goes through Tor
    command: >
      sh -c "while true; do
        curl -s -x socks5h://tor-proxy:9050 https://check.torproject.org/api/ip;
        echo '';
        sleep 60;
      done"

networks:
  tor-net:
    driver: bridge
```

## Using Tor with Python Applications

Here is a Python example that routes HTTP requests through the Tor proxy:

```python
# tor_request.py - Make HTTP requests through Tor
import requests

# Configure the SOCKS5 proxy
proxies = {
    'http': 'socks5h://tor-proxy:9050',
    'https': 'socks5h://tor-proxy:9050'
}

# Make a request through Tor
response = requests.get(
    'https://check.torproject.org/api/ip',
    proxies=proxies,
    timeout=30
)

data = response.json()
print(f"Exit IP: {data['IP']}")
print(f"Is Tor: {data['IsTor']}")
```

Install the required packages:

```bash
# Install requests with SOCKS support
pip install requests[socks]
```

## Rotating Tor Exit Nodes

Tor periodically changes circuits (and therefore exit IPs) automatically. If you need to force a new circuit, send a signal to the Tor process:

```bash
# Force Tor to establish a new circuit (new exit IP)
docker exec tor-proxy sh -c 'echo -e "AUTHENTICATE\r\nSIGNAL NEWNYM\r\n" | nc 127.0.0.1 9051'
```

For this to work, you need to enable the Tor control port. Create a custom torrc:

```bash
# torrc with control port enabled
SocksPort 0.0.0.0:9050
ControlPort 9051
HashedControlPassword 16:YOURHASH
```

Generate the password hash:

```bash
# Generate a hashed password for the Tor control port
docker run --rm dperson/torproxy tor --hash-password "mypassword"
```

## Accessing .onion Services

Tor containers can access .onion hidden services. The DNS must be resolved through Tor (which is why `socks5h://` is important):

```bash
# Access a .onion service through the Tor proxy
docker run --rm \
  --network tor-net \
  alpine/curl \
  -x socks5h://tor-proxy:9050 \
  http://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/
```

## Hosting a Tor Hidden Service

You can also run a Tor hidden service inside Docker, making a containerized web service accessible via a .onion address:

```yaml
# docker-compose.yml - Host a Tor hidden service
services:
  tor:
    image: dperson/torproxy
    volumes:
      - tor-data:/var/lib/tor
      - ./torrc:/etc/tor/torrc
    ports:
      - "9050:9050"
    restart: unless-stopped

  web:
    image: nginx:latest
    network_mode: "service:tor"

volumes:
  tor-data:
```

With a custom torrc:

```
HiddenServiceDir /var/lib/tor/hidden_service/
HiddenServicePort 80 127.0.0.1:80
SocksPort 0.0.0.0:9050
```

After starting, find your .onion address:

```bash
# Get the .onion address for your hidden service
docker exec tor cat /var/lib/tor/hidden_service/hostname
```

## Security Considerations

Running Tor in containers requires attention to several security aspects:

1. **DNS leaks:** Always use `socks5h://` instead of `socks5://`. The `h` suffix ensures DNS is resolved through the proxy, not locally.

2. **Traffic analysis:** While Tor encrypts and routes traffic through relays, metadata like timing patterns can still be analyzed. For strong anonymity, avoid mixing Tor and non-Tor traffic in the same container.

3. **Application leaks:** Some applications send identifying information (browser fingerprint, user agent, etc.) even through Tor. Be aware of what your application transmits.

4. **Exit node trust:** Tor exit nodes can see unencrypted traffic. Always use HTTPS for sensitive communications, even through Tor.

5. **Container isolation:** Keep the Tor proxy on a dedicated Docker network. Do not expose the SOCKS port to the host unless necessary.

## Monitoring Tor Connection Status

Check if Tor is connected and working:

```bash
# Check Tor's bootstrap status
docker exec tor-proxy sh -c "cat /var/lib/tor/notices.log | tail -5"

# Verify circuit establishment
docker exec tor-proxy sh -c 'echo -e "AUTHENTICATE\r\nGETINFO circuit-status\r\n" | nc 127.0.0.1 9051'

# Quick connectivity test
docker run --rm --network tor-net alpine/curl \
  -s -o /dev/null -w "%{http_code}" \
  -x socks5h://tor-proxy:9050 \
  https://check.torproject.org
```

## Summary

Forwarding Docker container traffic through Tor is straightforward with a dedicated proxy container. Use the SOCKS5 proxy approach when your application supports proxy configuration. Use network namespace sharing for transparent proxying without application changes. Always resolve DNS through the Tor proxy to prevent DNS leaks, and keep Tor traffic isolated on a dedicated Docker network. Whether you need anonymous testing, privacy-focused services, or access to .onion sites, Docker makes it easy to integrate Tor into your container workflow.

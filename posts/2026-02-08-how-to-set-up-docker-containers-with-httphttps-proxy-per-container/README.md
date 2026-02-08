# How to Set Up Docker Containers with HTTP/HTTPS Proxy Per Container

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, HTTP Proxy, HTTPS Proxy, Networking, DevOps, Security, Configuration

Description: Configure HTTP and HTTPS proxy settings on a per-container basis in Docker for fine-grained network traffic control

---

Corporate networks, restricted environments, and security-conscious deployments often require outbound traffic to route through HTTP or HTTPS proxies. Docker supports proxy configuration at multiple levels: globally for the daemon, per-client operation, and per-container. The per-container approach gives you the most flexibility, letting different containers use different proxies or bypass proxies entirely. This guide covers every method for configuring HTTP/HTTPS proxies on individual Docker containers.

## Understanding Docker Proxy Levels

Docker proxy configuration operates at three distinct levels:

1. **Docker daemon level**: Affects image pulls, pushes, and registry authentication
2. **Docker client level**: Affects build-time operations
3. **Container level**: Affects the running application inside the container

This guide focuses on the third level, container-specific proxy configuration, which gives you per-container control.

## Method 1: Environment Variables

The most common approach is setting the standard proxy environment variables when running a container.

Pass proxy settings through environment variables:

```bash
# Run a container with HTTP/HTTPS proxy configuration
docker run -d \
  -e HTTP_PROXY=http://proxy.company.com:8080 \
  -e HTTPS_PROXY=http://proxy.company.com:8080 \
  -e NO_PROXY=localhost,127.0.0.1,.company.com,10.0.0.0/8 \
  -e http_proxy=http://proxy.company.com:8080 \
  -e https_proxy=http://proxy.company.com:8080 \
  -e no_proxy=localhost,127.0.0.1,.company.com,10.0.0.0/8 \
  --name my-app \
  my-app:latest
```

Both uppercase and lowercase variants are set because different tools respect different conventions. `curl` uses lowercase, `wget` uses uppercase, and some libraries check both.

## Method 2: Docker Compose Per Service

Docker Compose makes per-container proxy configuration clean and readable.

This Compose file sets different proxies for different services:

```yaml
version: "3.8"

services:
  # This service routes through the corporate proxy
  backend:
    image: my-backend:latest
    environment:
      - HTTP_PROXY=http://corporate-proxy.company.com:8080
      - HTTPS_PROXY=http://corporate-proxy.company.com:8080
      - NO_PROXY=localhost,127.0.0.1,postgres,redis,.company.com
      - http_proxy=http://corporate-proxy.company.com:8080
      - https_proxy=http://corporate-proxy.company.com:8080
      - no_proxy=localhost,127.0.0.1,postgres,redis,.company.com

  # This service routes through a different proxy
  external-api:
    image: my-api-gateway:latest
    environment:
      - HTTP_PROXY=http://external-proxy.company.com:3128
      - HTTPS_PROXY=http://external-proxy.company.com:3128
      - NO_PROXY=localhost,127.0.0.1

  # This service has no proxy (direct internet access)
  monitoring:
    image: my-monitoring:latest
    # No proxy environment variables set

  postgres:
    image: postgres:16-alpine
    # Database does not need proxy access
```

## Method 3: Using an env_file

For cleaner Compose files, store proxy configuration in separate files.

Create environment files for each proxy configuration:

```bash
# proxy-corporate.env
HTTP_PROXY=http://corporate-proxy.company.com:8080
HTTPS_PROXY=http://corporate-proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,.company.com,10.0.0.0/8
http_proxy=http://corporate-proxy.company.com:8080
https_proxy=http://corporate-proxy.company.com:8080
no_proxy=localhost,127.0.0.1,.company.com,10.0.0.0/8
```

```bash
# proxy-external.env
HTTP_PROXY=http://external-proxy.company.com:3128
HTTPS_PROXY=http://external-proxy.company.com:3128
NO_PROXY=localhost,127.0.0.1
http_proxy=http://external-proxy.company.com:3128
https_proxy=http://external-proxy.company.com:3128
no_proxy=localhost,127.0.0.1
```

Reference them in Docker Compose:

```yaml
version: "3.8"

services:
  backend:
    image: my-backend:latest
    env_file:
      - proxy-corporate.env

  external-api:
    image: my-api-gateway:latest
    env_file:
      - proxy-external.env
```

## Method 4: Proxy with Authentication

Many corporate proxies require username and password authentication.

Set authenticated proxy URLs:

```bash
# Format: http://username:password@proxy-host:port
docker run -d \
  -e HTTP_PROXY=http://jdoe:p%40ssw0rd@proxy.company.com:8080 \
  -e HTTPS_PROXY=http://jdoe:p%40ssw0rd@proxy.company.com:8080 \
  -e NO_PROXY=localhost,127.0.0.1 \
  --name my-app \
  my-app:latest
```

Special characters in the password must be URL-encoded. The `@` symbol becomes `%40`, spaces become `%20`, and so on.

For Docker Compose, use the same format in environment variables or env files. Be cautious about committing credentials to version control. Use Docker secrets or external secret managers for production.

## Method 5: Build-Time Proxy for Dockerfile

During image builds, containers need proxy access to download packages, dependencies, and other resources.

Pass proxy settings as build arguments:

```dockerfile
FROM python:3.12-slim

# Accept proxy settings as build arguments
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

# These are automatically available to RUN commands
WORKDIR /app
COPY requirements.txt .

# pip, apt-get, and other tools will use the proxy
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["python", "app.py"]
```

Build with proxy settings:

```bash
docker build \
  --build-arg HTTP_PROXY=http://proxy.company.com:8080 \
  --build-arg HTTPS_PROXY=http://proxy.company.com:8080 \
  --build-arg NO_PROXY=localhost,127.0.0.1 \
  -t my-app:latest .
```

Docker handles `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` as predefined build arguments. They are applied automatically without needing explicit `ARG` declarations, but declaring them makes the Dockerfile more readable.

**Important**: Build arguments with proxy settings are not persisted in the final image. They only apply during the build process.

## Configuring NO_PROXY Correctly

The `NO_PROXY` variable tells applications which destinations should bypass the proxy. Getting this right is critical, especially in Docker Compose environments where services communicate over internal networks.

Guidelines for NO_PROXY:

```bash
# Always include these
NO_PROXY=localhost,127.0.0.1

# Add Docker service names (they resolve internally)
NO_PROXY=localhost,127.0.0.1,postgres,redis,backend,frontend

# Add internal network ranges
NO_PROXY=localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16

# Add company internal domains
NO_PROXY=localhost,127.0.0.1,.company.com,.internal.company.com

# Combined example
NO_PROXY=localhost,127.0.0.1,postgres,redis,.company.com,10.0.0.0/8,172.16.0.0/12
```

If you forget to include Docker service names in `NO_PROXY`, inter-service communication attempts to route through the proxy and fails.

## Running a Per-Container HTTP Proxy

You can run an HTTP proxy as a Docker service and route specific container traffic through it.

Run Squid as an HTTP proxy:

```yaml
version: "3.8"

services:
  # Squid HTTP proxy
  squid:
    image: ubuntu/squid:latest
    ports:
      - "3128:3128"
    volumes:
      - ./squid.conf:/etc/squid/squid.conf
    restart: unless-stopped

  # App that uses the Squid proxy
  app-proxied:
    image: my-app:latest
    environment:
      - HTTP_PROXY=http://squid:3128
      - HTTPS_PROXY=http://squid:3128
      - NO_PROXY=localhost,127.0.0.1,squid
    depends_on:
      - squid

  # App with direct access (no proxy)
  app-direct:
    image: my-other-app:latest
    # No proxy configured
```

Basic Squid configuration:

```
# squid.conf - Minimal Squid proxy configuration
http_port 3128

# Allow traffic from Docker networks
acl docker_nets src 172.16.0.0/12
http_access allow docker_nets

# Deny everything else
http_access deny all
```

## Language-Specific Proxy Considerations

Different programming languages handle proxy environment variables differently.

**Node.js**: The `http` and `https` modules do not automatically use proxy environment variables. You need a library like `global-agent` or `https-proxy-agent`.

```javascript
// Node.js needs explicit proxy configuration
const { HttpsProxyAgent } = require('https-proxy-agent');
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);

fetch('https://api.example.com', { agent });
```

**Python**: The `requests` library respects proxy environment variables automatically.

```python
import requests
# requests automatically uses HTTP_PROXY and HTTPS_PROXY
response = requests.get('https://api.example.com')
```

**Go**: The `http` package respects proxy environment variables by default through `http.ProxyFromEnvironment`.

**Java**: Set proxy through system properties: `-Dhttp.proxyHost=proxy.company.com -Dhttp.proxyPort=8080`.

## Verifying Proxy Configuration

Test that a container correctly uses the proxy:

```bash
# Check the visible public IP through the proxy
docker run --rm \
  -e HTTP_PROXY=http://proxy.company.com:8080 \
  -e HTTPS_PROXY=http://proxy.company.com:8080 \
  curlimages/curl \
  https://httpbin.org/ip

# Verify environment variables are set inside the container
docker exec my-app env | grep -i proxy

# Test connectivity without proxy (should show your actual IP)
docker run --rm curlimages/curl https://httpbin.org/ip
```

## Troubleshooting

**Certificate errors through HTTPS proxy**: Some corporate proxies perform SSL inspection, replacing certificates with their own. You may need to add the company's CA certificate to the container.

Add a custom CA certificate:

```dockerfile
FROM node:20-alpine

# Copy the corporate CA certificate
COPY corporate-ca.crt /usr/local/share/ca-certificates/
RUN update-ca-certificates

# For Node.js, also set the certificate path
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/corporate-ca.crt
```

**Inter-service communication failing**: Add Docker service names and internal network ranges to `NO_PROXY`.

**Proxy not being used**: Check both uppercase and lowercase environment variable variants. Some tools only check one form.

## Conclusion

Per-container HTTP/HTTPS proxy configuration gives you fine-grained control over network traffic routing. Use environment variables for the simplest approach, env_file for cleaner Compose configurations, and build arguments for proxy access during image builds. Always configure `NO_PROXY` correctly to prevent internal Docker communication from being routed through the proxy. Different containers in the same Compose stack can use different proxies, no proxy at all, or a mix, giving you the flexibility to match complex network requirements.

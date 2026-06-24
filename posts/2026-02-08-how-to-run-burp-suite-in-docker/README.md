# How to Run Burp Suite in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Burp Suite, Security Testing, Penetration Testing, Web Security, OWASP, Proxy

Description: Run Burp Suite Community Edition in Docker for web application security testing with proxy interception and vulnerability scanning.

---

Burp Suite is the industry standard tool for web application security testing. It acts as an intercepting proxy between your browser and a target web application, allowing you to inspect, modify, and replay HTTP requests. Security professionals use it to investigate vulnerabilities like SQL injection, cross-site scripting (XSS), authentication flaws, and insecure API endpoints. Automated vulnerability scanning requires Burp Suite Professional or Burp Suite DAST; Community Edition is focused on manual testing.

Running Burp Suite in Docker isolates the testing environment from your primary workstation and makes it easy to spin up consistent, disposable security testing setups. This guide covers running Burp Suite Community Edition in a Docker container with a graphical interface, headless launch options, and notes on CI/CD pipelines for Burp Suite Professional or Burp Suite DAST.

## Why Dockerize Burp Suite?

There are several practical reasons to run Burp Suite in Docker. It keeps your testing environment separate from your development setup. You can version your testing configuration and share it with your security team. Disposable containers prevent test artifacts from accumulating. And for CI/CD integration, Docker can package the tooling that drives Burp Suite Professional or Burp Suite DAST scans as part of your deployment pipeline.

## Running Burp Suite with a GUI

Burp Suite is a graphical application, so running it in Docker requires forwarding the display. On Linux, you can share the X11 socket. On macOS, you need XQuartz. The examples below use the custom image built in the next section.

```bash
# Linux: Run Burp Suite with X11 forwarding

# This shares your display with the container for GUI access
docker run -d \
  --name burp-suite \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  -v burp-data:/home/burp/data \
  -p 8080:8080 \
  burp-suite-community
```

For macOS with XQuartz:

```bash
# macOS: Install XQuartz first, then allow network connections
# brew install --cask xquartz
# Open XQuartz preferences, go to Security tab, check "Allow connections from network clients"
# Restart XQuartz, then run:

xhost +localhost

docker run -d \
  --name burp-suite \
  -e DISPLAY=host.docker.internal:0 \
  -v burp-data:/home/burp/data \
  -p 8080:8080 \
  burp-suite-community
```

## Building a Custom Burp Suite Image

PortSwigger does not publish a Docker image for Burp Suite Community Edition, so build your own from the official JAR download.

```dockerfile
# Dockerfile - Burp Suite Community Edition
# Based on a Java 21 runtime with necessary GUI libraries
FROM eclipse-temurin:21-jre-jammy

# Install GUI libraries and utilities
RUN apt-get update && apt-get install -y \
    libxext6 \
    libxrender1 \
    libxtst6 \
    libxi6 \
    libfreetype6 \
    fontconfig \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for running Burp
RUN useradd -m -s /bin/bash burp

# Download Burp Suite Community Edition
# Update the URL to the latest version
RUN curl -L "https://portswigger-cdn.net/burp/releases/download?product=community&type=Jar" \
    -o /opt/burpsuite_community.jar

# Create data directory for settings and exported files
RUN mkdir -p /home/burp/data && chown -R burp:burp /home/burp

USER burp
WORKDIR /home/burp

# Expose the proxy port
EXPOSE 8080

# Launch Burp Suite
ENTRYPOINT ["sh", "-c", "exec java ${JAVA_OPTS:-} -jar /opt/burpsuite_community.jar \"$@\"", "--"]
```

```bash
# Build the image
docker build -t burp-suite-community .

# Run with GUI (Linux)
docker run -d \
  --name burp-suite \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  -v $(pwd)/burp-data:/home/burp/data \
  -p 8080:8080 \
  burp-suite-community
```

## Docker Compose Setup

```yaml
# docker-compose.yml - Burp Suite security testing environment
# Includes Burp Suite and vulnerable test applications

services:
  burp-suite:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: burp-suite
    ports:
      - "8080:8080"    # Proxy listener port
      - "1337:1337"    # Optional API port for Professional or extensions
    volumes:
      - burp-data:/home/burp/data
      - ./burp-config.json:/home/burp/config.json:ro
    environment:
      - DISPLAY=${DISPLAY}
      - JAVA_OPTS=-Xmx2g
    networks:
      - security-net

  # OWASP Juice Shop - a deliberately vulnerable app for testing
  juice-shop:
    image: bkimminich/juice-shop:latest
    container_name: juice-shop
    ports:
      - "3000:3000"
    networks:
      - security-net

  # DVWA - another vulnerable test application
  dvwa:
    image: vulnerables/web-dvwa:latest
    container_name: dvwa
    ports:
      - "80:80"
    networks:
      - security-net

volumes:
  burp-data:

networks:
  security-net:
    driver: bridge
```

## Headless Startup with Burp Suite

For scripted startup, run Burp Suite in headless mode using documented Java and Burp command-line options. Community Edition does not include Burp Scanner, so this starts Burp without a GUI but does not perform an automated vulnerability scan.

```bash
# Start Burp in headless mode with a project configuration file
docker run --rm \
  --name burp-scan \
  -e JAVA_OPTS="-Djava.awt.headless=true -Xmx2g" \
  -v $(pwd)/reports:/home/burp/reports \
  -v $(pwd)/burp-config.json:/home/burp/config.json:ro \
  burp-suite-community \
  --config-file=/home/burp/config.json
```

## Burp Suite Configuration File

Preconfigure Burp Suite settings for consistent testing.

```json
{
    "proxy": {
        "request_listeners": [
            {
                "listen_mode": "all_interfaces",
                "listener_port": 8080,
                "running": true
            }
        ],
        "intercept_client_requests": {
            "do_intercept": false
        },
        "intercept_server_responses": {
            "do_intercept": false
        }
    },
    "target": {
        "scope": {
            "advanced_mode": false,
            "include": [
                {
                    "enabled": true,
                    "host": "juice-shop",
                    "port": "3000",
                    "protocol": "http"
                }
            ]
        }
    }
}
```

## Configuring Your Browser

To use Burp Suite as an intercepting proxy, configure your browser to route traffic through it.

```bash
# Option 1: Use Firefox with manual proxy settings
# Set HTTP Proxy to: localhost, Port: 8080
# Check "Also use this proxy for HTTPS"

# Option 2: Launch a browser with proxy settings from Docker
docker run -d \
  --name firefox-proxy \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  --network container:burp-suite \
  jlesage/firefox:latest

# Option 3: Use curl through the Burp proxy for API testing
curl -x http://localhost:8080 -k https://target-app.example.com/api/users
```

## Installing the CA Certificate

Burp generates its own CA certificate for intercepting HTTPS traffic. Install it in your browser or test client.

```bash
# Download the Burp CA certificate from the running proxy
curl -o burp-ca.der http://localhost:8080/cert

# Convert to PEM format
openssl x509 -inform DER -in burp-ca.der -out burp-ca.pem

# For use with curl, specify the CA cert
curl --cacert burp-ca.pem -x http://localhost:8080 https://target-app.example.com/

# For system-wide installation on Linux
cp burp-ca.pem /usr/local/share/ca-certificates/burp-ca.crt
update-ca-certificates
```

## Automated Scanning with Burp REST API

Burp Suite DAST includes APIs for automated scanning, and its REST API uses an API key in the URL. Burp Suite Professional has scanner automation features, but Community Edition does not include Burp Scanner.

```bash
# Start a scan using the Burp Suite DAST REST API
curl -X POST "https://burp-dast.example.com/api/YOUR_API_KEY/v0.1/scan" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["http://juice-shop:3000"],
    "scope": {
      "include": [{"rule": "http://juice-shop:3000/"}],
      "type": "SimpleScope"
    }
  }'

# Check scan status
curl "https://burp-dast.example.com/api/YOUR_API_KEY/v0.1/scan/1"

# Get scan results
curl "https://burp-dast.example.com/api/YOUR_API_KEY/v0.1/scan/1/issues"
```

## Integration with CI/CD

Add security scanning to your deployment pipeline with Burp Suite DAST.

```yaml
# .gitlab-ci.yml - Security scan stage using Burp Suite
security_scan:
  stage: test
  image: docker:latest
  services:
    - docker:dind
  variables:
    BURP_CONFIG_FILE_PATH: "$CI_PROJECT_DIR/burp-config.yml"
    BURP_REPORT_FILE_PATH: "$CI_PROJECT_DIR/burp_junit_report.xml"
    BURP_ENTERPRISE_SERVER_URL: "$BURP_ENTERPRISE_SERVER_URL"
    BURP_ENTERPRISE_API_KEY: "$BURP_ENTERPRISE_API_KEY"
  script:
    - docker run --rm
      -u $(id -u)
      -v "$CI_PROJECT_DIR:$CI_PROJECT_DIR:rw"
      -w "$CI_PROJECT_DIR"
      -e BURP_CONFIG_FILE_PATH
      -e BURP_REPORT_FILE_PATH
      -e BURP_ENTERPRISE_SERVER_URL
      -e BURP_ENTERPRISE_API_KEY
      public.ecr.aws/portswigger/enterprise-scan-container:latest
  artifacts:
    when: always
    paths:
      - burp_junit_report.xml
    reports:
      junit: burp_junit_report.xml
```

If you are running your target application as a GitLab service, give it a network alias and point the Burp DAST configuration file at that alias:

```yaml
security_scan:
  stage: test
  image: docker:latest
  services:
    - docker:dind
    - name: your-app:latest
      alias: target-app
```

## Working with Extensions

Burp Suite supports extensions through the BApp Store. In a Docker environment, mount extension files and load them manually from Extensions > Installed, or import downloaded `.bapp` files from Extensions > BApp Store.

```bash
# Download or build Burp extension files
mkdir -p burp-extensions

# Mount extensions into the container for manual loading
docker run -d \
  --name burp-suite \
  -v $(pwd)/burp-extensions:/home/burp/extensions \
  -v burp-data:/home/burp/data \
  -p 8080:8080 \
  burp-suite-community
```

## Security and Ethical Considerations

Burp Suite is a powerful tool that should only be used against systems you own or have explicit permission to test. Never scan production systems without authorization. Running scans against systems without permission is illegal in most jurisdictions. Always document your testing scope and get written approval before starting security assessments.

## Production Tips

Set appropriate memory limits for the JVM using JAVA_OPTS - Burp can consume significant RAM during large projects and active scans in Professional or DAST. Use named volumes to persist settings and exported files between container restarts. Run vulnerable test applications (like OWASP Juice Shop or DVWA) in the same Docker network for safe practice without touching real infrastructure. Keep your Burp image updated to get the latest vulnerability checks in editions that include Burp Scanner. Monitor your testing containers with OneUptime to track resource usage during long-running scans.

Burp Suite in Docker provides a portable, reproducible security testing environment. Whether you are running manual penetration tests or integrating security scans into your CI/CD pipeline, Docker keeps your testing setup clean, consistent, and disposable.

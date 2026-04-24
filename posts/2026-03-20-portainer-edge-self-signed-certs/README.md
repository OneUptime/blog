# How to Configure Edge Agent with Self-Signed Certificates - Portainer Certs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, TLS, Self-Signed Certificates, Security

Description: Configure the Portainer Edge Agent to trust self-signed certificates when connecting to a Portainer server that uses a self-signed TLS certificate.

## Introduction

When Portainer is deployed with a self-signed TLS certificate, Edge Agents cannot connect because they cannot verify the certificate. This guide covers configuring the Edge Agent to trust your self-signed certificate or skip certificate verification for development environments.

## Option 1: Provide the CA or Self-Signed Certificate (Recommended)

Trust the certificate explicitly by providing a PEM certificate file to the edge agent. If you are using Portainer's default self-signed certificate, export the server certificate itself:

```bash
# Export the certificate presented by Portainer
openssl s_client -connect portainer.example.com:9443 -servername portainer.example.com < /dev/null 2>/dev/null \
  | openssl x509 > portainer-cert.pem

# Verify the certificate
openssl x509 -in portainer-cert.pem -text -noout | grep -E "Subject:|Not After:"
```

If Portainer uses an internal CA-signed certificate instead of the default self-signed certificate, use your CA certificate or CA bundle here instead of exporting the leaf certificate from the server.

Mount the certificate and configure the agent. Match the agent tag to your Portainer Server version:

```bash
docker run -d \
  --name portainer_edge_agent \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -v /path/to/portainer-cert.pem:/certs/portainer-cert.pem:ro \
  -e EDGE=1 \
  -e EDGE_ID=device-id \
  -e EDGE_KEY=edge-key \
  -e SSL_CERT_FILE=/certs/portainer-cert.pem \
  portainer/agent:${PORTAINER_VERSION:-2.39.0}
```

## Option 2: Skip Certificate Verification (Development Only)

```bash
docker run -d \
  --name portainer_edge_agent \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID=device-id \
  -e EDGE_KEY=edge-key \
  -e EDGE_INSECURE_POLL=1 \
  portainer/agent:${PORTAINER_VERSION:-2.39.0}
```

**WARNING**: `EDGE_INSECURE_POLL=1` disables TLS certificate validation. Only use in isolated development environments.

## Option 3: Bake the Certificate into the Container Image

If you prefer not to mount the certificate at runtime, bake it into a custom image:

```dockerfile
ARG PORTAINER_VERSION=2.39.0
FROM portainer/agent:${PORTAINER_VERSION}
COPY portainer-cert.pem /certs/portainer-cert.pem
ENV SSL_CERT_FILE=/certs/portainer-cert.pem
```

## Docker Compose with Certificate File

```yaml
services:
  edge-agent:
    image: "portainer/agent:${PORTAINER_VERSION:-2.39.0}"
    container_name: portainer_edge_agent
    restart: always
    environment:
      EDGE: "1"
      EDGE_ID: "remote-device"
      EDGE_KEY: "your-edge-key"
      SSL_CERT_FILE: "/certs/portainer-cert.pem"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
      - /:/host
      - portainer_agent_data:/data
      - ./portainer-cert.pem:/certs/portainer-cert.pem:ro

volumes:
  portainer_agent_data:
```

## Verifying Certificate Trust

```bash
# Test that the agent can connect to Portainer with the provided cert
docker logs portainer_edge_agent | grep -E "TLS|cert|connect|error"

# Manual test
curl --cacert portainer-cert.pem --fail -I https://portainer.example.com:9443
```

## Using Let's Encrypt Instead

The cleanest long-term solution is to use a publicly trusted certificate:

```bash
# Use Traefik with Let's Encrypt
# Edge agents trust Let's Encrypt certs without any extra configuration
# No EDGE_INSECURE_POLL or SSL_CERT_FILE needed
```

## Conclusion

Self-signed certificates require explicit trust configuration in edge agents. Providing a trusted certificate file maintains security by validating the certificate chain. For production, strongly consider using a properly issued certificate (Let's Encrypt, internal CA, commercial) to eliminate the self-signed certificate complexity across all edge devices.

# How to Set Up Custom SSL Certificates in Portainer on Docker Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, SSL, TLS, Security

Description: Configure custom SSL/TLS certificates for Portainer deployed on Docker Swarm using Docker secrets for secure certificate distribution.

---

When running Portainer on Docker Swarm, the best practice for managing SSL certificates is to use Docker Swarm secrets. This avoids storing certificate files on disk and allows secure distribution across Swarm nodes.

## Step 1: Create Docker Swarm Secrets for Certificates

```bash
# Create Docker secrets from your certificate and key files

# Run on the Swarm manager node

# Create secret for the certificate
docker secret create portainer_cert /path/to/portainer.crt

# Create secret for the private key
docker secret create portainer_key /path/to/portainer.key

# Verify secrets were created
docker secret ls
```

## Step 2: Update the Portainer Stack to Use Secrets

Create or update your Portainer stack file to reference the secrets:

```yaml
# portainer-swarm.yml
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:latest
    command:
      - -H
      - tcp://tasks.agent:9001
      - --tlsskipverify
      - --tlscert
      - /run/secrets/portainer_cert   # Swarm secrets are mounted here
      - --tlskey
      - /run/secrets/portainer_key
    ports:
      - "9443:9443"
      - "9000:9000"
      - "8000:8000"
    volumes:
      - portainer_data:/data
    networks:
      - agent_network
    secrets:
      - portainer_cert
      - portainer_key
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager

  agent:
    image: portainer/agent:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    networks:
      - agent_network
    deploy:
      mode: global

networks:
  agent_network:
    driver: overlay
    attachable: true

volumes:
  portainer_data:

secrets:
  portainer_cert:
    external: true    # Reference the pre-created secret
  portainer_key:
    external: true
```

## Step 3: Deploy the Stack

```bash
# Deploy Portainer stack with custom SSL
docker stack deploy -c portainer-swarm.yml portainer

# Verify the service is running
docker service ls --filter name=portainer_portainer
```

## Rotating Certificates on Swarm

When certificates expire, rotate the secrets without downtime:

```bash
# Create new certificate secrets with a versioned name
docker secret create portainer_cert_v2 /path/to/renewed.crt
docker secret create portainer_key_v2 /path/to/renewed.key

# Update the stack file to reference v2 secrets, then redeploy
docker stack deploy -c portainer-swarm.yml portainer
```

## Verify the Certificate

```bash
# Check which node is running Portainer
docker service ps portainer_portainer

# Verify SSL from the manager IP
openssl s_client -connect <manager-ip>:9443 -showcerts </dev/null 2>/dev/null | \
  openssl x509 -noout -subject -enddate
```

---

*Monitor your Swarm cluster and Portainer with [OneUptime](https://oneuptime.com) for 24/7 uptime visibility.*

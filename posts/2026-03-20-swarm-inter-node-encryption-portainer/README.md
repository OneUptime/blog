# How to Set Up Swarm Inter-Node Encryption in Portainer - Inter Node

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Encryption, Security, Overlay Network

Description: Enable Docker Swarm inter-node traffic encryption for overlay networks managed through Portainer to protect container-to-container communication across nodes.

---

Docker Swarm overlay networks carry container-to-container traffic across cluster nodes. By default, this traffic is unencrypted. Enabling encryption on overlay networks protects sensitive service communication without requiring application-level TLS.

## How Swarm Network Encryption Works

Swarm uses IPsec (AES-128-GCM) to encrypt traffic on overlay networks. The encryption keys are distributed via the Swarm Raft log and rotated automatically. Enabling encryption requires no changes to your applications.

## Step 1: Create an Encrypted Overlay Network

In Portainer's terminal or via stack YAML:

```bash
# Create an encrypted overlay network via CLI

docker network create \
  --driver overlay \
  --opt encrypted=true \
  secure-backend
```

Or declare it in a stack:

```yaml
version: "3.8"
services:
  api:
    image: my-api:latest
    networks:
      - secure-backend

  database:
    image: postgres:16
    networks:
      - secure-backend

networks:
  secure-backend:
    driver: overlay
    driver_opts:
      # Enable IPsec encryption for this overlay network
      encrypted: "true"
```

## Step 2: Deploy the Stack via Portainer

Paste the stack YAML in **Stacks > Add Stack**. Portainer creates the encrypted network and attaches the services to it.

## Step 3: Verify Encryption is Active

```bash
# Check network options for a CLI-created network
docker network inspect secure-backend --format '{{ index .Options "encrypted" }}'

# For a Portainer stack, replace mystack with the stack name
docker network inspect mystack_secure-backend --format '{{ index .Options "encrypted" }}'

# Expected: true
```

## Step 4: Performance Considerations

Encryption adds CPU overhead for IPsec processing, and the exact impact depends on your hardware, kernel, and workload. For workloads where performance is critical and traffic is already protected by application-layer TLS (HTTPS), the additional overlay encryption may be redundant.

Recommendation:
- **Enable** for networks carrying unencrypted database traffic or internal API calls
- **Optional** for networks where all traffic is already TLS-encrypted

## Step 5: Autolock for Cluster Key Protection

Enable Swarm Autolock to protect the cluster encryption keys at rest. Without autolock, the mutual TLS key and the key used to encrypt and decrypt Raft logs are stored unencrypted on manager disks:

```bash
# Enable autolock when initializing a new swarm
docker swarm init --autolock

# Enable autolock on an existing swarm
docker swarm update --autolock=true

# Save the unlock key securely
docker swarm unlock-key
```

After enabling autolock, managers require the unlock key after restart.

## Step 6: Network Key Rotation

Swarm rotates overlay network encryption keys automatically. There is no supported `docker network update` command to manually rotate the IPsec keys for a single overlay network.

## Summary

Swarm overlay network encryption is a transparent, application-agnostic security control. By setting `encrypted: "true"` in your network definition, container-to-container traffic crossing swarm nodes on that network is automatically encrypted with AES-128-GCM without requiring application changes. Portainer's stack interface makes enabling encryption as simple as adding a network option to your YAML.

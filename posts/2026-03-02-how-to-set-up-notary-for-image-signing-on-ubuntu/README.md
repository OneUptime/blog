# How to Set Up Notary for Image Signing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Docker, Container

Description: Set up Notary on Ubuntu to cryptographically sign container images and enforce Docker Content Trust, ensuring only verified images run in your environment.

---

Running unsigned container images is a supply chain risk. Without image signing, you cannot verify that the image you pull is the same one that was built and tested - an attacker who compromises a registry or performs a man-in-the-middle attack could substitute a malicious image. Docker Content Trust (DCT) and Notary address this by providing cryptographic image signing and verification.

## How Notary Works

Notary implements The Update Framework (TUF), a framework for securing software update systems. At its core, Notary maintains a chain of trust using multiple signing keys:

- **Root key**: The root of trust. Generated once and stored offline.
- **Targets key**: Signs specific image tags.
- **Snapshot key**: Signs the current state of the repository.
- **Timestamp key**: Ensures freshness by signing timestamped metadata.

When Docker Content Trust is enabled, Docker automatically verifies signatures when pulling images. Unsigned images are rejected.

## Installing Notary Client on Ubuntu

```bash
# Download the Notary binary from GitHub releases
NOTARY_VERSION="0.7.0"
wget https://github.com/theupdateframework/notary/releases/download/v${NOTARY_VERSION}/notary-Linux-amd64

# Install to a system-wide location
sudo mv notary-Linux-amd64 /usr/local/bin/notary
sudo chmod +x /usr/local/bin/notary

# Verify installation
notary version
```

## Installing Notary Server with Docker Compose

For a self-hosted setup, deploy Notary Server and Notary Signer alongside your registry:

```bash
# Clone the Notary repository for example configurations
git clone https://github.com/theupdateframework/notary.git
cd notary

# Copy the example config files
cp cmd/notary-server/config.postgres.json /etc/notary-server-config.json
cp cmd/notary-signer/config.json /etc/notary-signer-config.json
```

Create a Docker Compose file for the Notary stack:

```bash
mkdir -p ~/notary-server && cd ~/notary-server
nano docker-compose.yml
```

```yaml
version: "3.7"

services:
  notary-server:
    image: notary:server-0.7.0
    container_name: notary-server
    restart: always
    depends_on:
      - notary-db
      - notary-signer
    ports:
      - "4443:4443"
    volumes:
      - ./config/server-config.json:/etc/notary/server-config.json
      - ./certs:/certs
    command: -config /etc/notary/server-config.json

  notary-signer:
    image: notary:signer-0.7.0
    container_name: notary-signer
    restart: always
    depends_on:
      - notary-db
    volumes:
      - ./config/signer-config.json:/etc/notary/signer-config.json
      - ./certs:/certs
    command: -config /etc/notary/signer-config.json

  notary-db:
    image: postgres:13-alpine
    container_name: notary-db
    restart: always
    environment:
      POSTGRES_USER: notary
      POSTGRES_PASSWORD: notary_db_password
      POSTGRES_DB: notaryserver
    volumes:
      - notary-db-data:/var/lib/postgresql/data

volumes:
  notary-db-data:
```

### Generating TLS Certificates for Notary

Notary requires TLS for all communication:

```bash
mkdir -p ~/notary-server/certs

# Generate a CA certificate
openssl genrsa -out ~/notary-server/certs/ca.key 4096
openssl req -new -x509 -days 3650 -key ~/notary-server/certs/ca.key \
  -out ~/notary-server/certs/ca.crt \
  -subj "/CN=Notary CA"

# Generate server certificate signed by the CA
openssl genrsa -out ~/notary-server/certs/server.key 4096
openssl req -new -key ~/notary-server/certs/server.key \
  -out ~/notary-server/certs/server.csr \
  -subj "/CN=notary-server"

openssl x509 -req -days 365 \
  -in ~/notary-server/certs/server.csr \
  -CA ~/notary-server/certs/ca.crt \
  -CAkey ~/notary-server/certs/ca.key \
  -CAcreateserial \
  -out ~/notary-server/certs/server.crt
```

```bash
# Start Notary
cd ~/notary-server
docker compose up -d
```

## Enabling Docker Content Trust

Docker Content Trust is controlled by an environment variable:

```bash
# Enable Docker Content Trust for this session
export DOCKER_CONTENT_TRUST=1

# To make it permanent for all users, add to /etc/environment
echo 'DOCKER_CONTENT_TRUST=1' | sudo tee -a /etc/environment
```

With DCT enabled, any `docker pull` that retrieves an unsigned image will fail. Any `docker push` will automatically attempt to sign the image.

### Configuring the Notary Server URL

If using a self-hosted Notary Server rather than Docker Hub's default:

```bash
export DOCKER_CONTENT_TRUST_SERVER=https://your-notary-server:4443
```

## Signing Your First Image

The first time you push a signed image to a repository, Docker generates the necessary signing keys:

```bash
# Make sure DCT is enabled
export DOCKER_CONTENT_TRUST=1

# Build an image
docker build -t your-registry.com/myapp:v1.0 .

# Push and sign the image
# Docker will prompt you to create a root key passphrase and repository key passphrase
docker push your-registry.com/myapp:v1.0
```

Docker will prompt you for passphrases for the root key and repository key. Store these securely - losing the root key means you cannot sign future images for existing repositories.

### Where Keys Are Stored

```bash
# Docker stores trust data and keys in
ls ~/.docker/trust/

# Private keys
ls ~/.docker/trust/private/

# Trust data (signed metadata)
ls ~/.docker/trust/tg/
```

**Backup the root key immediately after creation:**

```bash
# Copy the root key to secure offline storage
# The key filename starts with the key ID shown during creation
cp ~/.docker/trust/private/<root_key_id>.key /path/to/secure/backup/
```

## Verifying Signed Images

```bash
# Inspect trust data for an image
docker trust inspect --pretty your-registry.com/myapp:v1.0

# View signatures using the notary client
notary -s https://your-notary-server:4443 \
  -d ~/.docker/trust \
  list your-registry.com/myapp
```

The output shows which tags are signed, who signed them, and when.

## Adding Additional Signers

For team environments, you may want multiple people to be able to sign images:

```bash
# Generate a delegation key for a team member
notary -s https://your-notary-server:4443 \
  -d ~/.docker/trust \
  key generate alice

# Add Alice as a signer for the repository
notary -s https://your-notary-server:4443 \
  -d ~/.docker/trust \
  delegation add \
  your-registry.com/myapp \
  alice \
  --all-paths

# Publish the delegation changes
notary -s https://your-notary-server:4443 \
  -d ~/.docker/trust \
  publish your-registry.com/myapp
```

Alice can now sign images using her delegation key without having access to the root key.

## Enforcing Signature Verification in Production

On hosts where you want to enforce that only signed images run, set DCT permanently and configure Docker to reject unsigned images:

```bash
# Create or edit Docker daemon configuration
sudo nano /etc/docker/daemon.json
```

```json
{
  "content-trust": {
    "mode": "enforced"
  }
}
```

```bash
sudo systemctl restart docker
```

With this configuration, Docker will refuse to run any image that lacks a valid signature from a trusted signer.

## Rotating Keys

Keys should be rotated periodically or immediately if compromised:

```bash
# Rotate the snapshot key for a repository
notary -s https://your-notary-server:4443 \
  -d ~/.docker/trust \
  key rotate \
  your-registry.com/myapp snapshot

notary -s https://your-notary-server:4443 \
  -d ~/.docker/trust \
  publish your-registry.com/myapp
```

For root key rotation (after compromise):

```bash
# Generate a new root key
notary -s https://your-notary-server:4443 \
  -d ~/.docker/trust \
  key generate root

# This requires coordination with all existing signers to update their trust data
```

## Integrating with CI/CD

In your build pipeline, sign images as part of the push step:

```bash
#!/bin/bash
# CI signing script

# Unlock the signing key (pass passphrase via environment variable)
export DOCKER_CONTENT_TRUST=1
export DOCKER_CONTENT_TRUST_SERVER=https://notary-server:4443

# The repository key passphrase should be set as a CI secret
# export DOCKER_CONTENT_TRUST_REPOSITORY_PASSPHRASE="from_ci_secrets"

IMAGE="your-registry.com/myapp:${BUILD_TAG}"

# Build
docker build -t "$IMAGE" .

# Push and sign
docker push "$IMAGE"

echo "Image signed and pushed: $IMAGE"
```

Set `DOCKER_CONTENT_TRUST_REPOSITORY_PASSPHRASE` as a protected CI/CD secret so the pipeline can sign without interactive prompts.

## Troubleshooting

If push fails with a trust error:

```bash
# Check if the Notary server is reachable
curl -k https://your-notary-server:4443/v2/

# Reset trust data for a repository (use with caution)
notary -s https://your-notary-server:4443 \
  -d ~/.docker/trust \
  delete your-registry.com/myapp --remote

# Clear local trust cache and try again
rm -rf ~/.docker/trust/tg/your-registry.com/
```

Image signing with Notary adds a meaningful layer of supply chain security. When combined with enforced content trust on production hosts, it ensures that only images that passed your review and build process can be deployed.

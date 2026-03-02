# How to Set Up Zot Container Registry on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Container Registry, Zot, OCI, Docker

Description: Learn how to deploy Zot, a lightweight OCI-native container registry, on Ubuntu as a self-hosted alternative to Docker Hub for storing and distributing container images.

---

Zot is an OCI-native container registry built around the OCI Distribution Specification. Unlike Docker Registry v2 (the classic `registry:2` image), Zot is designed specifically around OCI standards from the ground up, supports OCI artifacts (Helm charts, SBOMs, signatures), and includes features like image caching, replication, and authentication out of the box. It is lightweight, easy to configure, and a good choice when you need a self-hosted registry that goes beyond simple image storage.

## Why Zot

- **OCI-native** - supports OCI images, OCI artifacts, and referrers
- **Single binary** - no Docker or Java runtime required
- **Built-in auth** - local user database or integration with OAuth/LDAP
- **Storage backends** - local filesystem, S3-compatible, or Azure Blob Storage
- **Extensions** - search, metrics, UI, sync are optional modules
- **Cosign/Notation support** - for image signing verification

## Installing Zot

```bash
# Download the latest Zot binary
VERSION="2.0.2"
curl -Lo /usr/local/bin/zot \
    https://github.com/project-zot/zot/releases/download/v${VERSION}/zot-linux-amd64

sudo chmod +x /usr/local/bin/zot

# Verify installation
zot --version
```

Alternatively, use the container image:

```bash
docker pull ghcr.io/project-zot/zot-linux-amd64:latest
```

## Basic Configuration

Create the configuration file:

```bash
sudo mkdir -p /etc/zot /var/lib/zot
sudo useradd --system --no-create-home zot
sudo chown zot:zot /var/lib/zot

sudo nano /etc/zot/config.json
```

```json
{
  "distSpecVersion": "1.1.0",
  "storage": {
    "rootDirectory": "/var/lib/zot",
    "gc": true,
    "gcDelay": "1h",
    "gcInterval": "6h",
    "dedupe": true
  },
  "http": {
    "address": "0.0.0.0",
    "port": "5000",
    "realm": "zot"
  },
  "log": {
    "level": "info",
    "output": "/var/log/zot/zot.log"
  }
}
```

## Enabling Authentication

Configure local user authentication:

```bash
# Generate a password hash using htpasswd
sudo apt install apache2-utils
htpasswd -Bn admin
# Enter password when prompted - copy the output hash

sudo nano /etc/zot/htpasswd
```

```
# /etc/zot/htpasswd - bcrypt-hashed passwords
admin:$2y$05$ZfSdZqfW7t5CG2vCJ5gMZuE.MJE2fkDSCZPwEpWqJXsGN4NXGxOm6
developer:$2y$05$someotherhashhere
```

Update the configuration to use authentication:

```json
{
  "distSpecVersion": "1.1.0",
  "storage": {
    "rootDirectory": "/var/lib/zot"
  },
  "http": {
    "address": "0.0.0.0",
    "port": "5000",
    "realm": "zot",
    "auth": {
      "htpasswd": {
        "path": "/etc/zot/htpasswd"
      }
    }
  },
  "accessControl": {
    "repositories": {
      "**": {
        "defaultPolicy": []
      }
    },
    "adminPolicy": {
      "users": ["admin"],
      "actions": ["read", "create", "update", "delete"]
    },
    "policies": [
      {
        "users": ["developer"],
        "repositories": ["dev/**", "staging/**"],
        "actions": ["read", "create", "update"]
      }
    ]
  },
  "log": {
    "level": "info"
  }
}
```

## Enabling TLS

Generate or obtain a TLS certificate and configure Zot to use it:

```bash
# Generate a self-signed certificate for testing
sudo openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout /etc/zot/server.key \
    -out /etc/zot/server.crt \
    -subj "/CN=registry.example.com"

sudo chown zot:zot /etc/zot/server.key /etc/zot/server.crt
```

Update config.json to use TLS:

```json
{
  "http": {
    "address": "0.0.0.0",
    "port": "5000",
    "tls": {
      "cert": "/etc/zot/server.crt",
      "key": "/etc/zot/server.key"
    }
  }
}
```

## Enabling the Web UI and Search

Zot supports optional extensions including a web UI:

```json
{
  "distSpecVersion": "1.1.0",
  "storage": {
    "rootDirectory": "/var/lib/zot"
  },
  "http": {
    "address": "0.0.0.0",
    "port": "5000"
  },
  "extensions": {
    "search": {
      "enable": true
    },
    "ui": {
      "enable": true
    },
    "metrics": {
      "enable": true,
      "prometheus": {
        "path": "/metrics"
      }
    }
  },
  "log": {
    "level": "info"
  }
}
```

Note: UI and search extensions are included in the `zot` binary but not the minimal `zot-minimal` build. Ensure you downloaded the full binary.

## Setting Up as a Systemd Service

```bash
sudo mkdir -p /var/log/zot
sudo chown zot:zot /var/log/zot

sudo nano /etc/systemd/system/zot.service
```

```ini
[Unit]
Description=Zot OCI Container Registry
After=network.target

[Service]
Type=simple
User=zot
Group=zot
ExecStart=/usr/local/bin/zot serve /etc/zot/config.json
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable zot
sudo systemctl start zot

# Check status
sudo systemctl status zot
```

## Pushing and Pulling Images

```bash
# Configure Docker to trust the registry (if using self-signed cert)
sudo mkdir -p /etc/docker/certs.d/registry.example.com:5000
sudo cp /etc/zot/server.crt /etc/docker/certs.d/registry.example.com:5000/ca.crt

# Log in
docker login registry.example.com:5000 -u admin

# Tag and push an image
docker tag ubuntu:22.04 registry.example.com:5000/ubuntu:22.04
docker push registry.example.com:5000/ubuntu:22.04

# Pull an image
docker pull registry.example.com:5000/ubuntu:22.04

# List images via the OCI API
curl -u admin:password https://registry.example.com:5000/v2/_catalog
curl -u admin:password https://registry.example.com:5000/v2/ubuntu/tags/list
```

## Configuring Image Sync

Zot can sync images from upstream registries on demand or on a schedule:

```json
{
  "extensions": {
    "sync": {
      "enable": true,
      "registries": [
        {
          "urls": ["https://registry-1.docker.io"],
          "onDemand": true,
          "tlsVerify": true,
          "content": [
            {
              "prefix": "library/**",
              "destination": "/mirror/docker-hub"
            }
          ]
        },
        {
          "urls": ["https://ghcr.io"],
          "onDemand": true,
          "tlsVerify": true,
          "content": [
            {
              "prefix": "**",
              "destination": "/mirror/ghcr"
            }
          ]
        }
      ]
    }
  }
}
```

With `onDemand: true`, Zot fetches the image from the upstream registry the first time it's requested and caches it locally. Subsequent pulls are served from the local cache.

## Using S3 as Storage Backend

For scalable storage, use S3-compatible object storage:

```json
{
  "storage": {
    "rootDirectory": "/var/lib/zot",
    "storageDriver": {
      "name": "s3",
      "region": "us-east-1",
      "bucket": "my-zot-registry",
      "secure": true,
      "skipverify": false,
      "accesskey": "AKIAIOSFODNN7EXAMPLE",
      "secretkey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    }
  }
}
```

## Cosign Image Signing

Zot natively supports OCI referrers, which is what Cosign uses for storing signatures:

```bash
# Sign an image (after pushing it)
cosign sign --key cosign.key registry.example.com:5000/myapp:latest

# Verify a signed image
cosign verify --key cosign.pub registry.example.com:5000/myapp:latest

# Attach an SBOM as an OCI artifact
cosign attach sbom --sbom sbom.json registry.example.com:5000/myapp:latest
```

Zot is an excellent choice for teams building a supply chain security posture around OCI standards - the native support for referrers, signatures, and SBOMs makes it more forward-looking than the classic Docker registry for compliance-focused environments.

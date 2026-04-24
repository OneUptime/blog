# How to Set Up Swarm Inter-Node Encryption in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Encryption, Security, mTLS

Description: Enable and configure Docker Swarm's built-in inter-node encryption for overlay networks managed by Portainer.

## Introduction

Docker Swarm provides built-in encryption for inter-node communication, and it can also encrypt overlay network traffic. Swarm control-plane traffic between nodes is encrypted by default, while overlay network data-plane traffic must be enabled per network.

## Swarm-Level Encryption

Docker Swarm secures multiple layers, but they are enabled differently:
1. **Management/control plane**: Node-to-node communication uses mutual TLS by default
2. **Raft logs at rest**: Manager Raft logs are encrypted on disk by default, and `--autolock` protects the keys needed to unlock managers after restart
3. **Overlay network data plane**: Container-to-container traffic on overlay networks is encrypted only when the network is created with encryption enabled

## Initializing Swarm with Encryption

```bash
# Initialize swarm with manager autolock enabled

docker swarm init \
  --advertise-addr 192.168.1.10 \
  --autolock

# Output includes an unlock key:
# Swarm initialized: current node (xxx) is now a manager.
# 
# To unlock a swarm manager after it restarts, run `docker swarm unlock`
# and provide the following key:
# SWMKEY-1-xxxxxxxxxxxxxxxx
#
# IMPORTANT: Store the unlock key in a secure location!

# Save the unlock key securely
UNLOCK_KEY="SWMKEY-1-xxxxxxxxxxxxxxxx"
printf '%s' "$UNLOCK_KEY" | vault kv put -mount=secret swarm-unlock-key value=-
```

## Unlocking Swarm After Restart

When autolock is enabled, managers must be unlocked after Docker restarts:

```bash
# When Docker restarts, the Swarm manager is locked
# Unlock it with the stored key
docker swarm unlock
# Enter the unlock key when prompted

# Verify the manager is unlocked
docker node ls
```

## Rotating the Unlock Key

```bash
# Rotate the unlock key periodically
docker swarm unlock-key --rotate

# Display the current unlock key
docker swarm unlock-key
```

## Overlay Network Encryption

Enable encryption for overlay networks to protect container-to-container traffic:

```yaml
# encrypted-network-stack.yml
version: '3.8'

services:
  frontend:
    image: nginx:latest
    deploy:
      replicas: 2
    networks:
      - frontend-net

  api:
    image: myapp:latest
    deploy:
      replicas: 3
    networks:
      - frontend-net
      - backend-net

  db:
    image: postgres:15
    deploy:
      replicas: 1
    networks:
      - backend-net
    environment:
      POSTGRES_PASSWORD: secret

networks:
  frontend-net:
    driver: overlay
    driver_opts:
      encrypted: "true"  # Enable IPsec encryption
  
  backend-net:
    driver: overlay
    driver_opts:
      encrypted: "true"   # Encrypted backend traffic
```

## Verifying Network Encryption

```bash
# Create a test encrypted network
docker network create \
  --driver overlay \
  --opt encrypted \
  --attachable \
  secure-test-net

# Inspect the network to verify encryption
docker network inspect secure-test-net \
  --format '{{json .Options}}'
# Should include the "encrypted" option

# Test connectivity on the encrypted network
docker run -d \
  --name secure-peer \
  --network secure-test-net \
  alpine sleep 300

docker run --rm \
  --network secure-test-net \
  alpine ping -c 3 secure-peer

docker rm -f secure-peer
```

## Securing the Docker Daemon API

```bash
# Generate CA, server, and client certificates for Docker daemon TLS
mkdir -p ~/docker-tls && cd ~/docker-tls
HOST=192.168.1.10

# CA
openssl genrsa -aes256 -out ca-key.pem 4096
openssl req -new -x509 -days 365 -sha256 \
  -key ca-key.pem -out ca.pem -subj "/CN=docker-ca"

# Server
openssl genrsa -out server-key.pem 4096
openssl req -subj "/CN=$HOST" -sha256 -new -key server-key.pem -out server.csr
cat > extfile.cnf <<EOF
subjectAltName = IP:$HOST,IP:127.0.0.1
extendedKeyUsage = serverAuth
EOF
openssl x509 -req -days 365 -sha256 -in server.csr -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem -extfile extfile.cnf

# Client
openssl genrsa -out key.pem 4096
openssl req -subj "/CN=client" -new -key key.pem -out client.csr
echo extendedKeyUsage = clientAuth > extfile-client.cnf
openssl x509 -req -days 365 -sha256 -in client.csr -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out cert.pem -extfile extfile-client.cnf

# Install the server certificates for dockerd
sudo mkdir -p /etc/docker/tls
sudo cp ca.pem server-cert.pem server-key.pem /etc/docker/tls/

# On systemd-based hosts, configure remote TLS access with a service override
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo tee /etc/systemd/system/docker.service.d/override.conf <<EOF
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd --tlsverify --tlscacert=/etc/docker/tls/ca.pem --tlscert=/etc/docker/tls/server-cert.pem --tlskey=/etc/docker/tls/server-key.pem -H fd:// -H tcp://$HOST:2376
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker.service

# Verify the TLS-secured Docker API
docker --tlsverify \
  --tlscacert=ca.pem \
  --tlscert=cert.pem \
  --tlskey=key.pem \
  -H=tcp://$HOST:2376 version
```

## Portainer with Encrypted Swarm

Portainer works transparently with encrypted Swarm clusters. If Portainer runs on the local Docker socket, no additional Portainer configuration is required. If it connects to a remote Docker API secured with TLS, add the environment with the CA, client certificate, and client key:

```bash
# Add a TLS-secured remote Swarm environment to Portainer
http --form POST https://my-portainer-server:9443/api/endpoints \
  "Authorization: Bearer <PORTAINER_JWT>" \
  Name="swarm-remote-tls" \
  URL="tcp://192.168.1.10:2376" \
  EndpointCreationType=1 \
  TLS="true" \
  TLSCACertFile@/path/to/ca.pem \
  TLSCertFile@/path/to/cert.pem \
  TLSKeyFile@/path/to/key.pem
```

## Conclusion

Docker Swarm's built-in security features protect the control plane with mutual TLS, encrypt Raft logs on managers, and can encrypt overlay network data traffic when you enable it per network. Portainer manages encrypted Swarm environments transparently, while the underlying encryption remains a Docker responsibility. Enabling encryption at the network layer provides defense-in-depth for containerized workloads in shared or untrusted network environments.

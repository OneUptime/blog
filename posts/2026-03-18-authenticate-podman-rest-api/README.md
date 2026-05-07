# How to Authenticate with the Podman REST API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, Authentication, Security, DevOps

Description: Learn how to set up authentication for the Podman REST API, including Unix socket permissions, SSH tunneling, TLS certificates, and reverse proxy authentication strategies.

---

> The Podman REST API does not include a built-in authentication mechanism. Instead, it relies on Unix socket permissions and transport-layer security to control access. Understanding these authentication strategies is essential for running Podman securely in production environments.

Unlike many REST APIs that use API keys or OAuth tokens, the Podman REST API authenticates clients based on who can access the Unix socket or network endpoint. This design follows the Unix philosophy of leveraging the operating system's permission model. However, when exposing the API over a network, you need additional layers of authentication to prevent unauthorized access.

This guide covers the various authentication and access control strategies available for the Podman REST API.

---

## How Podman API Authentication Works

By default, the Podman API listens on a Unix socket. Access control is managed through file system permissions on the socket file. Anyone who can connect to the socket can use the API with the full privileges of the user that started the Podman service.

There are several approaches to authentication:

1. **Unix socket permissions** for local access control.
2. **SSH tunneling** for authenticated remote access.
3. **TLS certificates** for mutual authentication over TCP.
4. **Reverse proxy authentication** for HTTP-based auth mechanisms.

## Unix Socket Permissions

The simplest form of access control is managing who can access the Podman socket file.

### Rootful Podman

When running Podman as root, the socket is typically at `/run/podman/podman.sock`:

```bash
# Start the service

sudo podman system service --time=0 unix:///run/podman/podman.sock &

# Check socket permissions
ls -la /run/podman/podman.sock
# srw-rw---- 1 root root 0 Mar 18 10:00 /run/podman/podman.sock
```

By default, only root can access this socket. To allow a group of users:

```bash
# Create a podman group
sudo groupadd podman

# Add users to the group
sudo usermod -aG podman deploy-user

# Set socket group ownership
sudo chown root:podman /run/podman/podman.sock
sudo chmod 660 /run/podman/podman.sock
```

### Rootless Podman

For rootless Podman, the socket is in the user's runtime directory:

```bash
# Start rootless service
podman system service --time=0 unix://$XDG_RUNTIME_DIR/podman/podman.sock &

# The socket is automatically restricted to the current user
ls -la $XDG_RUNTIME_DIR/podman/podman.sock
# srw-rw---- 1 myuser myuser 0 Mar 18 10:00 podman.sock
```

Rootless Podman naturally isolates the API to the user that started it. Other users on the system cannot access the socket.

### Systemd Socket Activation

For production deployments, use systemd to manage the socket:

```ini
# /etc/systemd/system/podman.socket
[Unit]
Description=Podman API Socket

[Socket]
ListenStream=/run/podman/podman.sock
SocketMode=0660
SocketUser=root
SocketGroup=podman

[Install]
WantedBy=sockets.target
```

```ini
# /etc/systemd/system/podman.service
[Unit]
Description=Podman API Service
Requires=podman.socket
After=podman.socket

[Service]
Type=exec
ExecStart=/usr/bin/podman system service --time=0
KillMode=process

[Install]
WantedBy=multi-user.target
```

Enable the socket:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now podman.socket
```

## SSH Tunneling for Remote Access

SSH tunneling is the recommended approach for remote Podman API access. It provides strong authentication through SSH keys and encrypts all traffic.

### Setting Up SSH Access

On the remote server, ensure the Podman socket is running:

```bash
# On the remote server
systemctl --user enable --now podman.socket
```

From the client machine, create an SSH tunnel:

```bash
# Forward the remote Podman socket to a local socket
ssh -nNT -L /tmp/podman-remote.sock:/run/user/1000/podman/podman.sock user@remote-host &

# Use the local socket
curl --unix-socket /tmp/podman-remote.sock \
  http://localhost/v4.0.0/libpod/info | jq .host.hostname
```

### Using Podman's Built-in SSH Support

Podman natively supports remote connections over SSH:

```bash
# Add a remote connection
podman system connection add myserver ssh://user@remote-host/run/user/1000/podman/podman.sock

# Use the remote connection
podman --connection myserver ps
```

While this uses the CLI, it demonstrates the SSH authentication model that Podman was designed around.

### Scripted SSH Tunnel

For automated workflows, create a persistent SSH tunnel:

```bash
#!/bin/bash

REMOTE_USER="deploy"
REMOTE_HOST="container-host.example.com"
REMOTE_SOCKET="/run/user/1000/podman/podman.sock"
LOCAL_SOCKET="/tmp/podman-remote.sock"

# Clean up old socket
rm -f "$LOCAL_SOCKET"

# Create tunnel with auto-reconnect
while true; do
  ssh -nNT \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -L "$LOCAL_SOCKET:$REMOTE_SOCKET" \
    "$REMOTE_USER@$REMOTE_HOST"

  echo "SSH tunnel disconnected, reconnecting in 5 seconds..."
  rm -f "$LOCAL_SOCKET"
  sleep 5
done
```

## TLS Certificate Authentication

When you need to expose the Podman API over TCP, use TLS with client certificates for mutual authentication.

### Generating Certificates

Create a CA and certificates for server and client authentication:

```bash
# Create CA
openssl genrsa -out ca-key.pem 4096
openssl req -new -x509 -days 365 -key ca-key.pem -out ca.pem \
  -subj "/CN=Podman CA"

# Create server certificate
openssl genrsa -out server-key.pem 4096
openssl req -new -key server-key.pem -out server.csr \
  -subj "/CN=podman-server"
openssl x509 -req -days 365 -in server.csr \
  -CA ca.pem -CAkey ca-key.pem -CAcreateserial \
  -out server-cert.pem \
  -extfile <(echo "subjectAltName=DNS:podman-server,IP:10.0.0.5")

# Create client certificate
openssl genrsa -out client-key.pem 4096
openssl req -new -key client-key.pem -out client.csr \
  -subj "/CN=podman-client"
openssl x509 -req -days 365 -in client.csr \
  -CA ca.pem -CAkey ca-key.pem -CAcreateserial \
  -out client-cert.pem
```

### Starting Podman with TLS

Start the Podman API service with TLS:

```bash
podman system service --time=0 \
  tcp://0.0.0.0:8443 \
  --tls-cert=/etc/podman/tls/server-cert.pem \
  --tls-key=/etc/podman/tls/server-key.pem \
  --tls-client-ca=/etc/podman/tls/ca.pem
```

### Connecting with Client Certificates

```bash
curl --cacert ca.pem \
  --cert client-cert.pem \
  --key client-key.pem \
  https://podman-server:8443/v4.0.0/libpod/info | jq .
```

## Reverse Proxy Authentication

For environments where HTTP-based authentication is preferred, place a reverse proxy in front of the Podman API.

### Nginx with Basic Auth

```nginx
upstream podman {
    server unix:/run/podman/podman.sock;
}

server {
    listen 8443 ssl;
    server_name podman-api.example.com;

    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;

    auth_basic "Podman API";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://podman;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # Required for streaming endpoints
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
```

Create the password file:

```bash
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd podman-admin
```

Access the API through the proxy:

```bash
curl -u podman-admin:password \
  https://podman-api.example.com:8443/v4.0.0/libpod/info | jq .
```

### Token-Based Authentication with Nginx

For API token authentication:

```nginx
server {
    listen 8443 ssl;

    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;

    location / {
        if ($http_authorization != "Bearer your-secret-token-here") {
            return 401;
        }

        proxy_pass http://unix:/run/podman/podman.sock:/;
        proxy_buffering off;
    }
}
```

```bash
curl -H "Authorization: Bearer your-secret-token-here" \
  https://podman-api.example.com:8443/v4.0.0/libpod/info | jq .
```

## Registry Authentication

The Podman API also supports checking container registry credentials and passing registry authentication for pulling and pushing images:

```bash
# Check credentials with a registry without storing them on disk
curl -s --unix-socket /run/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "username": "myuser",
    "password": "mypassword",
    "serveraddress": "registry.example.com"
  }' \
  "http://localhost/v4.0.0/auth"
```

For pulling private images, pass credentials with the pull request using the `X-Registry-Auth` header with a base64-encoded JSON object:

```bash
AUTH=$(printf '%s' '{"username":"myuser","password":"mypassword","serveraddress":"registry.example.com"}' | base64 -w0)

curl -s --unix-socket /run/podman/podman.sock \
  -X POST \
  -H "X-Registry-Auth: $AUTH" \
  "http://localhost/v4.0.0/libpod/images/pull?reference=registry.example.com/myapp:latest"
```

## Best Practices

1. **Prefer SSH tunneling** for remote access. It provides strong authentication and encryption with minimal configuration.
2. **Use rootless Podman** whenever possible to limit the blast radius of a compromised socket.
3. **Never expose the Podman socket** directly over TCP without TLS and authentication.
4. **Rotate credentials** regularly, especially TLS certificates and proxy passwords.
5. **Audit access** by logging all API requests through a reverse proxy.
6. **Restrict socket permissions** to the minimum set of users that need access.

## Conclusion

While the Podman REST API does not include built-in authentication, the ecosystem provides multiple strategies for securing access. Unix socket permissions handle local access control, SSH tunneling provides secure remote access, TLS certificates enable mutual authentication, and reverse proxies add HTTP-level authentication. Choose the approach that best fits your environment and security requirements, and always ensure the API is never accessible without proper authentication in production.

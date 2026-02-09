# How to Run XMPP (Prosody/ejabberd) in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, XMPP, Prosody, ejabberd, Messaging, Self-Hosted, Communication

Description: Learn how to deploy XMPP messaging servers like Prosody and ejabberd using Docker containers for real-time communication.

---

XMPP (Extensible Messaging and Presence Protocol) remains one of the most battle-tested protocols for real-time messaging. Originally known as Jabber, XMPP powers everything from private chat systems to IoT device communication. Two of the most popular XMPP server implementations are Prosody and ejabberd. Running either of them in Docker simplifies deployment, configuration, and scaling considerably.

This guide walks you through setting up both Prosody and ejabberd in Docker containers, covering configuration, TLS, user management, and production considerations.

## Why Run XMPP in Docker?

Traditional XMPP server installations involve compiling from source or managing distribution-specific packages. Docker eliminates these headaches. You get a consistent runtime environment, easy upgrades through image versioning, and the ability to spin up test instances in seconds. For teams evaluating XMPP for internal communication or building chat features into their applications, Docker is the fastest path to a working server.

## Prerequisites

Before you begin, make sure you have:

- Docker and Docker Compose installed on your host
- A domain name pointed to your server (for production use)
- Ports 5222 (client-to-server) and 5269 (server-to-server) available

## Option 1: Running Prosody in Docker

Prosody is a lightweight XMPP server written in Lua. It is known for its simplicity and low resource footprint.

### Quick Start with Docker Run

The simplest way to get Prosody running is with a single docker run command.

```bash
# Pull the official Prosody image and start a container
# Port 5222 handles client connections, 5269 handles server federation
docker run -d \
  --name prosody \
  -p 5222:5222 \
  -p 5269:5269 \
  -p 5280:5280 \
  -e DOMAIN=chat.example.com \
  -e ALLOW_REGISTRATION=true \
  -v prosody-data:/var/lib/prosody \
  prosody/prosody:latest
```

### Docker Compose Setup for Prosody

For a more maintainable setup, use Docker Compose. This configuration includes persistent storage and environment-based configuration.

```yaml
# docker-compose.yml for Prosody XMPP server
# Includes volume mounts for data persistence and custom configuration
version: "3.8"

services:
  prosody:
    image: prosody/prosody:latest
    container_name: prosody-xmpp
    restart: unless-stopped
    ports:
      - "5222:5222"   # Client-to-server connections
      - "5269:5269"   # Server-to-server federation
      - "5280:5280"   # HTTP admin and BOSH
      - "5281:5281"   # HTTPS admin
    environment:
      - DOMAIN=chat.example.com
      - ALLOW_REGISTRATION=false
    volumes:
      - prosody-data:/var/lib/prosody
      - prosody-modules:/usr/lib/prosody/modules
      - ./prosody.cfg.lua:/etc/prosody/prosody.cfg.lua:ro

volumes:
  prosody-data:
  prosody-modules:
```

### Custom Prosody Configuration

Create a prosody.cfg.lua file alongside your docker-compose.yml for fine-grained control.

```lua
-- prosody.cfg.lua - Main configuration file for Prosody
-- This sets up a single virtual host with MUC (group chat) support

admins = { "admin@chat.example.com" }

-- Enable required modules
modules_enabled = {
    "roster";       -- Contact list management
    "saslauth";     -- Authentication via SASL
    "tls";          -- TLS encryption
    "dialback";     -- Server-to-server authentication
    "disco";        -- Service discovery
    "carbons";      -- Message synchronization across devices
    "pep";          -- Personal eventing (for avatars, etc.)
    "private";      -- Private XML storage
    "blocklist";    -- Block contacts
    "vcard4";       -- User profiles
    "mam";          -- Message archive management
    "ping";         -- XMPP ping
    "register";     -- In-band user registration
    "admin_adhoc";  -- Admin commands
    "http";         -- HTTP server for BOSH/WebSocket
    "bosh";         -- BOSH support for web clients
    "websocket";    -- WebSocket support
}

-- Disable plain text authentication on unencrypted connections
c2s_require_encryption = true
s2s_require_encryption = true

-- Set up the virtual host
VirtualHost "chat.example.com"

-- Multi-user chat rooms
Component "conference.chat.example.com" "muc"
    modules_enabled = { "muc_mam" }

-- HTTP upload for file sharing
Component "upload.chat.example.com" "http_file_share"
    http_file_share_size_limit = 10485760  -- 10 MB limit
```

### Creating Users in Prosody

Once Prosody is running, create user accounts with the prosodyctl command.

```bash
# Create an admin user inside the running container
docker exec -it prosody-xmpp prosodyctl adduser admin@chat.example.com

# List registered users for the domain
docker exec -it prosody-xmpp prosodyctl mod_listusers
```

## Option 2: Running ejabberd in Docker

ejabberd is a robust, highly scalable XMPP server written in Erlang. It handles millions of concurrent users and is the go-to choice for large-scale deployments.

### Docker Compose Setup for ejabberd

```yaml
# docker-compose.yml for ejabberd XMPP server
# ejabberd includes a built-in web admin panel on port 5443
version: "3.8"

services:
  ejabberd:
    image: ejabberd/ecs:latest
    container_name: ejabberd-xmpp
    restart: unless-stopped
    ports:
      - "5222:5222"   # XMPP client connections
      - "5269:5269"   # XMPP server-to-server
      - "5443:5443"   # HTTPS admin panel and API
      - "1883:1883"   # MQTT support (optional)
    environment:
      - ERLANG_NODE_ARG=ejabberd@localhost
      - CTL_ON_CREATE=register admin chat.example.com supersecretpassword
    volumes:
      - ejabberd-data:/home/ejabberd/database
      - ejabberd-logs:/home/ejabberd/logs
      - ./ejabberd.yml:/home/ejabberd/conf/ejabberd.yml:ro

volumes:
  ejabberd-data:
  ejabberd-logs:
```

### ejabberd Configuration File

```yaml
# ejabberd.yml - Server configuration
# Configures listeners, authentication, and modules
hosts:
  - chat.example.com

loglevel: info

listen:
  -
    port: 5222
    ip: "::"
    module: ejabberd_c2s
    max_stanza_size: 262144
    shaper: c2s_shaper
    access: c2s
    starttls_required: true
  -
    port: 5269
    ip: "::"
    module: ejabberd_s2s_in
    max_stanza_size: 524288
  -
    port: 5443
    ip: "::"
    module: ejabberd_http
    tls: true
    request_handlers:
      /admin: ejabberd_web_admin
      /api: mod_http_api
      /bosh: mod_bosh
      /ws: ejabberd_http_ws

# Authentication using the internal database
auth_method: internal
auth_password_format: scram

# Access control
acl:
  admin:
    user: admin@chat.example.com
  local:
    user_regexp: ""

access_rules:
  local:
    allow: local
  c2s:
    deny: blocked
    allow: all
  announce:
    allow: admin
  configure:
    allow: admin

# Enabled modules
modules:
  mod_adhoc: {}
  mod_admin_extra: {}
  mod_announce:
    access: announce
  mod_blocking: {}
  mod_carbons: {}
  mod_disco: {}
  mod_mam:
    assume_mam_usage: true
    default: always
  mod_muc:
    access_create: local
    default_room_options:
      mam: true
  mod_ping: {}
  mod_privacy: {}
  mod_private: {}
  mod_roster:
    versioning: true
  mod_vcard: {}
  mod_http_upload:
    put_url: "https://upload.chat.example.com:5443"
    max_size: 10485760
```

### Managing ejabberd Users

```bash
# Register a new user through the ejabberd container
docker exec -it ejabberd-xmpp ejabberdctl register alice chat.example.com password123

# Check the status of the ejabberd server
docker exec -it ejabberd-xmpp ejabberdctl status

# List all registered users on the domain
docker exec -it ejabberd-xmpp ejabberdctl registered_users chat.example.com

# View connected users
docker exec -it ejabberd-xmpp ejabberdctl connected_users
```

## Adding TLS Certificates

Both servers need TLS certificates for encrypted connections. You can use Let's Encrypt with a reverse proxy or mount certificates directly.

```bash
# Generate self-signed certificates for testing
# For production, use Let's Encrypt or a trusted CA
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout certs/xmpp.key \
  -out certs/xmpp.crt \
  -subj "/CN=chat.example.com"

# Combine key and cert for Prosody (it expects a single PEM file)
cat certs/xmpp.key certs/xmpp.crt > certs/xmpp.pem
```

Then mount the certificate directory into your container by adding a volume line to your Compose file.

```yaml
    volumes:
      - ./certs:/etc/prosody/certs:ro  # For Prosody
      # or
      - ./certs:/home/ejabberd/certs:ro  # For ejabberd
```

## Connecting XMPP Clients

With your server running, you can connect using any XMPP client. Popular options include Conversations (Android), Monal (iOS/macOS), and Gajim (desktop). Configure the client with your domain and the user credentials you created.

## Monitoring and Health Checks

Add a health check to your Docker Compose configuration to ensure the server stays responsive.

```yaml
    # Health check pings the XMPP port to verify the server is accepting connections
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "5222"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
```

## Prosody vs. ejabberd: Which to Choose?

Prosody works well for small to medium deployments where simplicity matters. Its Lua-based configuration is easy to read and modify. ejabberd shines in large-scale environments where you need clustering, high availability, and support for millions of users. If you are building a startup chat feature, start with Prosody. If you are running infrastructure for an enterprise, ejabberd is the safer bet.

## Production Considerations

For production deployments, keep these points in mind. Always disable in-band registration to prevent spam accounts. Set up rate limiting on both client and server connections. Enable message archiving (MAM) only if your storage can handle the volume. Use a reverse proxy like Nginx in front of the HTTP interfaces. Back up your data volumes regularly, especially the authentication database and message archives.

Running XMPP in Docker gives you a powerful, standards-based messaging platform without the operational complexity of a bare-metal installation. Whether you pick Prosody or ejabberd, Docker makes it straightforward to deploy, test, and iterate on your messaging infrastructure.

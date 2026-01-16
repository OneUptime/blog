# How to Install Jitsi Meet for Video Conferencing on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Jitsi Meet, Video Conferencing, WebRTC, Self-Hosted, Tutorial

Description: Complete guide to installing Jitsi Meet video conferencing platform on Ubuntu.

---

Jitsi Meet is a powerful, open-source video conferencing solution that provides secure, scalable, and feature-rich communication capabilities. Unlike proprietary alternatives, Jitsi Meet gives you complete control over your data and infrastructure. This comprehensive guide walks you through installing and configuring Jitsi Meet on Ubuntu, from basic setup to advanced features like recording and multi-server deployments.

## Jitsi Meet Architecture Overview

Before diving into installation, understanding Jitsi Meet's architecture helps you make informed decisions about deployment and scaling.

### Core Components

Jitsi Meet consists of several interconnected components:

```
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|   Web Browser    +---->+   Nginx/Prosody   +---->+   Jitsi Meet     |
|   (WebRTC)       |     |   (XMPP/BOSH)     |     |   Web Interface  |
|                  |     |                   |     |                  |
+--------+---------+     +---------+---------+     +------------------+
         |                         |
         |                         v
         |               +---------+---------+
         |               |                   |
         +-------------->+   Jicofo          |
                         |   (Focus)         |
                         |                   |
                         +---------+---------+
                                   |
                                   v
                         +---------+---------+
                         |                   |
                         |   Jitsi           |
                         |   Videobridge     |
                         |   (JVB)           |
                         |                   |
                         +-------------------+
```

**Component Descriptions:**

- **Jitsi Meet Web**: The React-based frontend application that users interact with in their browsers
- **Prosody**: An XMPP server handling signaling, authentication, and presence
- **Jicofo (Jitsi Conference Focus)**: Manages conference sessions and coordinates between participants
- **Jitsi Videobridge (JVB)**: The core media server that routes video/audio streams using SFU (Selective Forwarding Unit) architecture
- **Jibri**: Optional component for recording and live streaming conferences
- **Jigasi**: Optional SIP gateway for telephone integration

### Data Flow

1. Users connect to the web interface via HTTPS
2. XMPP signaling flows through Prosody using BOSH (Bidirectional-streams Over Synchronous HTTP)
3. Jicofo allocates videobridge resources for conferences
4. Media streams flow directly between clients and the videobridge via WebRTC

## Prerequisites

### System Requirements

For a small to medium deployment (up to 100 concurrent users):

- **OS**: Ubuntu 22.04 LTS or Ubuntu 24.04 LTS
- **CPU**: 4+ cores (8+ recommended for larger deployments)
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 50GB SSD (more if using Jibri for recordings)
- **Network**: 100Mbps+ with low latency

### Domain and DNS

You need a fully qualified domain name (FQDN) pointing to your server:

```bash
# Example DNS A record
meet.yourdomain.com.    IN    A    203.0.113.50
```

### Firewall Ports

Configure your firewall to allow the following ports:

```bash
# Install UFW if not present
sudo apt update
sudo apt install -y ufw

# Allow SSH (adjust port if needed)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS for web interface
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Jitsi Videobridge media traffic
# UDP 10000 is the default for JVB
sudo ufw allow 10000/udp

# Allow XMPP client connections (optional, for Oroplex users)
sudo ufw allow 5222/tcp

# Allow XMPP server-to-server (if federating)
sudo ufw allow 5269/tcp

# Allow OHRM/OTEL traffic if using OpenTelemetry monitoring
sudo ufw allow 4317/tcp  # OTLP gRPC
sudo ufw allow 4318/tcp  # OTLP HTTP

# Enable the firewall
sudo ufw enable

# Verify rules
sudo ufw status verbose
```

**Port Reference Table:**

| Port | Protocol | Purpose |
|------|----------|---------|
| 80 | TCP | HTTP (redirects to HTTPS) |
| 443 | TCP | HTTPS web interface |
| 10000 | UDP | Jitsi Videobridge media |
| 5222 | TCP | XMPP client connections |
| 5269 | TCP | XMPP server-to-server |
| 5347 | TCP | XMPP component connections |
| 4317 | TCP | OTLP gRPC (monitoring) |
| 4318 | TCP | OTLP HTTP (monitoring) |

## Adding the Jitsi Repository

### Step 1: Install Required Dependencies

```bash
# Update package lists
sudo apt update

# Install necessary packages
sudo apt install -y gnupg2 nginx-full apt-transport-https curl
```

### Step 2: Add the Jitsi GPG Key

```bash
# Download and add the Jitsi GPG key
curl -fsSL https://download.jitsi.org/jitsi-key.gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/jitsi-keyring.gpg
```

### Step 3: Add the Jitsi Repository

```bash
# Add the stable repository
echo "deb [signed-by=/usr/share/keyrings/jitsi-keyring.gpg] https://download.jitsi.org stable/" | sudo tee /etc/apt/sources.list.d/jitsi-stable.list

# Update package lists to include Jitsi packages
sudo apt update
```

### Verify Repository Setup

```bash
# Check available Jitsi packages
apt-cache search jitsi

# Expected output includes:
# jitsi-meet - WebRTC JavaScript video conferences
# jitsi-meet-web - Jitsi Meet web interface
# jitsi-meet-prosody - Prosody configuration for Jitsi Meet
# jitsi-videobridge2 - WebRTC-compatible Selective Forwarding Unit
# jicofo - Jitsi Conference Focus
```

## Installing Jitsi Meet Packages

### Pre-Installation Configuration

Before installing, set the hostname properly:

```bash
# Set the system hostname to your FQDN
sudo hostnamectl set-hostname meet.yourdomain.com

# Add hostname to /etc/hosts
echo "127.0.0.1 meet.yourdomain.com" | sudo tee -a /etc/hosts

# Verify hostname
hostname -f
```

### Install Jitsi Meet

The installation process is interactive and will prompt for configuration:

```bash
# Install the jitsi-meet meta-package
# This includes: jitsi-meet-web, jitsi-meet-prosody, jitsi-videobridge2, jicofo
sudo apt install -y jitsi-meet
```

**During Installation Prompts:**

1. **Hostname**: Enter your FQDN (e.g., `meet.yourdomain.com`)
2. **SSL Certificate**: Choose "Generate a new self-signed certificate" initially

### Post-Installation Verification

```bash
# Check that all services are running
sudo systemctl status prosody
sudo systemctl status jicofo
sudo systemctl status jitsi-videobridge2
sudo systemctl status nginx

# View listening ports
sudo ss -tlnp | grep -E '(80|443|5222|5280|5347)'
```

## SSL/TLS Configuration

### Option 1: Let's Encrypt (Recommended for Production)

Jitsi provides a script to automatically obtain and configure Let's Encrypt certificates:

```bash
# Run the Let's Encrypt certificate installation script
sudo /usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh
```

The script will:
1. Install certbot if not present
2. Obtain a certificate for your domain
3. Configure Nginx to use the certificate
4. Set up automatic renewal

**Manual Renewal Check:**

```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Check certificate expiration
sudo certbot certificates
```

### Option 2: Custom SSL Certificate

If you have your own certificate:

```bash
# Create directory for certificates
sudo mkdir -p /etc/jitsi/meet/ssl

# Copy your certificate files
sudo cp your_certificate.crt /etc/jitsi/meet/ssl/meet.yourdomain.com.crt
sudo cp your_private_key.key /etc/jitsi/meet/ssl/meet.yourdomain.com.key
sudo cp ca_bundle.crt /etc/jitsi/meet/ssl/ca-bundle.crt

# Set proper permissions
sudo chown root:root /etc/jitsi/meet/ssl/*
sudo chmod 600 /etc/jitsi/meet/ssl/*.key
sudo chmod 644 /etc/jitsi/meet/ssl/*.crt
```

**Update Nginx Configuration:**

```nginx
# /etc/nginx/sites-available/meet.yourdomain.com.conf

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name meet.yourdomain.com;

    # SSL Certificate Configuration
    ssl_certificate /etc/jitsi/meet/ssl/meet.yourdomain.com.crt;
    ssl_certificate_key /etc/jitsi/meet/ssl/meet.yourdomain.com.key;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # HSTS (optional but recommended)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rest of the configuration...
    root /usr/share/jitsi-meet;
    index index.html;

    location = /external_api.js {
        alias /usr/share/jitsi-meet/libs/external_api.min.js;
    }

    # BOSH
    location = /http-bind {
        proxy_pass http://127.0.0.1:5280/http-bind;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Host $http_host;
    }

    # WebSocket for XMPP
    location = /xmpp-websocket {
        proxy_pass http://127.0.0.1:5280/xmpp-websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $http_host;
        tcp_nodelay on;
    }
}
```

Restart Nginx after changes:

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Authentication Setup

### Understanding Authentication Modes

Jitsi Meet supports multiple authentication configurations:

1. **Open Access**: Anyone can create rooms (default)
2. **Authenticated Users Only**: Only authenticated users can create rooms
3. **Guest Access with Moderator**: Guests can join, but a moderator must start the meeting

### Configuring Secure Domain (Authenticated Moderators)

This setup requires authentication to create rooms while allowing guests to join existing rooms.

**Step 1: Configure Prosody**

```lua
-- /etc/prosody/conf.avail/meet.yourdomain.com.cfg.lua

-- Main virtual host configuration
VirtualHost "meet.yourdomain.com"
    -- Enable authentication for this host
    authentication = "internal_hashed"

    -- Properties for this virtual host
    c2s_require_encryption = true

    -- Modules to load for this host
    modules_enabled = {
        "bosh";
        "pubsub";
        "ping";
        "speakerstats";
        "turncredentials";
        "conference_duration";
        "muc_lobby_rooms";
        "av_moderation";
    }

    -- Lobby rooms configuration
    main_muc = "conference.meet.yourdomain.com"
    lobby_muc = "lobby.meet.yourdomain.com"

    -- Token authentication (optional, for JWT)
    -- app_id = "your_app_id"
    -- app_secret = "your_app_secret"

-- Guest virtual host (unauthenticated users join here)
VirtualHost "guest.meet.yourdomain.com"
    authentication = "anonymous"
    c2s_require_encryption = true

    modules_enabled = {
        "bosh";
        "pubsub";
        "ping";
    }

-- MUC (Multi-User Conference) component
Component "conference.meet.yourdomain.com" "muc"
    storage = "memory"
    modules_enabled = {
        "muc_meeting_id";
        "muc_domain_mapper";
        "polls";
    }
    admins = { "focus@auth.meet.yourdomain.com" }
    muc_room_locking = false
    muc_room_default_public_jids = true

-- Internal authentication component for Jitsi components
Component "auth.meet.yourdomain.com" "auth"
    authentication = "internal_hashed"

-- Jitsi Videobridge component
Component "jitsi-videobridge.meet.yourdomain.com"
    component_secret = "CHANGE_THIS_SECRET"

-- Focus component
Component "focus.meet.yourdomain.com" "client_proxy"
    target_address = "focus@auth.meet.yourdomain.com"

-- Lobby MUC component
Component "lobby.meet.yourdomain.com" "muc"
    storage = "memory"
    muc_room_cache_size = 1000
    restrict_room_creation = true
```

**Step 2: Configure Jitsi Meet**

```javascript
// /etc/jitsi/meet/meet.yourdomain.com-config.js

var config = {
    // Connection settings
    hosts: {
        // Main domain where the XMPP server is running
        domain: 'meet.yourdomain.com',

        // Guest domain for anonymous users
        anonymousdomain: 'guest.meet.yourdomain.com',

        // Authentication domain
        authdomain: 'meet.yourdomain.com',

        // MUC (conference) domain
        muc: 'conference.meet.yourdomain.com',

        // Focus component
        focus: 'focus.meet.yourdomain.com'
    },

    // BOSH URL for XMPP over HTTP
    bosh: '//meet.yourdomain.com/http-bind',

    // WebSocket URL (alternative to BOSH)
    websocket: 'wss://meet.yourdomain.com/xmpp-websocket',

    // Enable authentication
    enableUserRolesBasedOnToken: false,

    // UI settings
    enableWelcomePage: true,
    enableClosePage: false,

    // Require display name before joining
    requireDisplayName: true,

    // P2P settings (direct connection between 2 participants)
    p2p: {
        enabled: true,
        stunServers: [
            { urls: 'stun:meet-jit-si-turnrelay.jitsi.net:443' }
        ]
    },

    // Analytics (disabled by default for privacy)
    analytics: {
        disabled: true
    },

    // Breakout rooms configuration
    breakoutRooms: {
        hideAddRoomButton: false,
        hideAutoAssignButton: false,
        hideJoinRoomButton: false
    },

    // Testing settings (configure for your environment)
    testing: {
        enableFirefoxSimulcast: false,
        p2pTestMode: false
    }
};
```

**Step 3: Configure Jicofo**

```bash
# /etc/jitsi/jicofo/jicofo.conf

jicofo {
    # XMPP settings
    xmpp {
        client {
            # XMPP server hostname
            hostname = "localhost"

            # Authentication domain
            domain = "auth.meet.yourdomain.com"

            # Username for Jicofo
            username = "focus"

            # Password (set during installation)
            password = "YOUR_FOCUS_PASSWORD"

            # Connection settings
            use-tls = true
        }

        trusted-domains = [ "auth.meet.yourdomain.com" ]
    }

    # Conference settings
    conference {
        # Enable authentication
        enable-auto-owner = false
    }

    # Authentication settings
    authentication {
        enabled = true
        type = XMPP
        login-url = "meet.yourdomain.com"
    }

    # Bridge selection strategy
    bridge {
        selection-strategy = SplitBridgeSelectionStrategy
    }
}
```

**Step 4: Create User Accounts**

```bash
# Register a new user for Prosody
sudo prosodyctl register username meet.yourdomain.com password

# Example: Create an admin user
sudo prosodyctl register admin meet.yourdomain.com SecurePassword123!

# List registered users
sudo prosodyctl mod_listusers meet.yourdomain.com

# Delete a user
sudo prosodyctl deluser username@meet.yourdomain.com
```

**Step 5: Restart Services**

```bash
# Restart all Jitsi services
sudo systemctl restart prosody
sudo systemctl restart jicofo
sudo systemctl restart jitsi-videobridge2
sudo systemctl restart nginx

# Check service status
sudo systemctl status prosody jicofo jitsi-videobridge2 nginx
```

## Customizing the Interface

### Branding and Appearance

```javascript
// /etc/jitsi/meet/meet.yourdomain.com-config.js

var config = {
    // ... other settings ...

    // Branding
    defaultLanguage: 'en',

    // Custom toolbar buttons
    toolbarButtons: [
        'microphone',
        'camera',
        'closedcaptions',
        'desktop',
        'fullscreen',
        'fodeviceselection',
        'hangup',
        'profile',
        'chat',
        'recording',
        'livestreaming',
        'etherpad',
        'sharedvideo',
        'settings',
        'raisehand',
        'videoquality',
        'filmstrip',
        'invite',
        'feedback',
        'stats',
        'shortcuts',
        'tileview',
        'videobackgroundblur',
        'download',
        'help',
        'mute-everyone',
        'security'
    ],

    // Notifications
    notifications: [
        'connection.CONNFAIL',
        'dialog.cameraNotSendingData',
        'dialog.kickTitle',
        'dialog.liveStreaming',
        'dialog.lockTitle',
        'dialog.maxUsersLimitReached',
        'dialog.micNotSendingData',
        'dialog.passwordNotSupportedTitle',
        'dialog.recording',
        'dialog.remoteControlTitle',
        'dialog.reservationError',
        'dialog.serviceUnavailable',
        'dialog.sessTerminated',
        'dialog.sessionRestarted',
        'dialog.tokenAuthFailed',
        'dialog.transcribing',
        'dialOut.statusMessage',
        'liveStreaming.busy',
        'liveStreaming.failedToStart',
        'liveStreaming.unavailableTitle',
        'lobby.joinRejectedMessage',
        'lobby.notificationTitle',
        'notify.connectedOneMember',
        'notify.connectedTwoMembers',
        'notify.connectedThreePlusMembers',
        'notify.disconnected',
        'notify.grantedTo',
        'notify.invitedOneMember',
        'notify.invitedThreePlusMembers',
        'notify.invitedTwoMembers',
        'notify.kickParticipant',
        'notify.mutedRemotelyTitle',
        'notify.mutedTitle',
        'notify.newDeviceAudioTitle',
        'notify.newDeviceCameraTitle',
        'notify.passwordRemovedRemotely',
        'notify.passwordSetRemotely',
        'notify.raisedHand',
        'notify.startSilentTitle',
        'notify.unmute',
        'prejoin.errorDialOut',
        'prejoin.errorDialOutDisconnected',
        'prejoin.errorDialOutFailed',
        'prejoin.errorDialOutStatus',
        'prejoin.errorStatusCode',
        'prejoin.errorValidation',
        'recording.busy',
        'recording.failedToStart',
        'recording.unavailableTitle',
        'toolbar.noAudioSignalTitle',
        'toolbar.noisyAudioInputTitle',
        'toolbar.talkWhileMutedPopup',
        'transcribing.failedToStart'
    ]
};
```

### Custom Interface Configuration

```javascript
// /usr/share/jitsi-meet/interface_config.js

var interfaceConfig = {
    // Application name displayed in the UI
    APP_NAME: 'Your Company Meet',

    // Default branding
    DEFAULT_LOGO_URL: 'images/your-logo.svg',
    DEFAULT_WELCOME_PAGE_LOGO_URL: 'images/your-logo.svg',

    // Watermark settings
    SHOW_JITSI_WATERMARK: false,
    SHOW_WATERMARK_FOR_GUESTS: false,
    SHOW_BRAND_WATERMARK: true,
    BRAND_WATERMARK_LINK: 'https://yourdomain.com',

    // Toolbar configuration
    TOOLBAR_BUTTONS: [
        'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
        'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
        'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
        'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
        'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
        'security'
    ],

    // Settings sections to show
    SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar'],

    // Video quality settings
    VIDEO_QUALITY_LABEL_DISABLED: false,

    // Connection indicator settings
    CONNECTION_INDICATOR_AUTO_HIDE_ENABLED: true,
    CONNECTION_INDICATOR_AUTO_HIDE_TIMEOUT: 5000,
    CONNECTION_INDICATOR_DISABLED: false,

    // Filmstrip settings
    FILM_STRIP_MAX_HEIGHT: 120,
    VERTICAL_FILMSTRIP: true,

    // Recent list
    RECENT_LIST_ENABLED: true,

    // Mobile app links (optional)
    MOBILE_APP_PROMO: false,

    // Hide features
    HIDE_INVITE_MORE_HEADER: false,

    // Default remote display name
    DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
    DEFAULT_LOCAL_DISPLAY_NAME: 'me',

    // Tile view settings
    TILE_VIEW_MAX_COLUMNS: 5,

    // Maximum participants for optimal performance
    OPTIMAL_BROWSERS_ONLY: false,

    // Pre-join page settings
    DISPLAY_WELCOME_FOOTER: true,
    DISPLAY_WELCOME_PAGE_ADDITIONAL_CARD: false,
    DISPLAY_WELCOME_PAGE_CONTENT: true,
    DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,

    // Disable join/leave sounds
    DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,

    // Video layout settings
    VIDEO_LAYOUT_FIT: 'both',

    // Support URL
    SUPPORT_URL: 'https://support.yourdomain.com',

    // Native app settings
    NATIVE_APP_NAME: 'Your Company Meet',

    // Provider name for calendar integration
    PROVIDER_NAME: 'Your Company'
};
```

### Adding Custom CSS

Create a custom CSS file:

```css
/* /usr/share/jitsi-meet/css/custom.css */

/* Custom branding colors */
:root {
    --ohrm-primary-color: #0052CC;
    --ohrm-secondary-color: #FF5630;
    --ohrm-background-color: #172B4D;
}

/* Customize the header */
.ohrm-header {
    background-color: var(--ohrm-primary-color) !important;
}

/* Customize buttons */
.ohrm-button-primary {
    background-color: var(--ohrm-primary-color) !important;
    border-color: var(--ohrm-primary-color) !important;
}

.ohrm-button-primary:hover {
    background-color: #0065FF !important;
}

/* Welcome page customization */
.ohrm-welcome-page {
    background: linear-gradient(135deg, var(--ohrm-background-color) 0%, #1e3a5f 100%);
}

/* Filmstrip customization */
.ohrm-filmstrip {
    background-color: rgba(0, 0, 0, 0.7);
}

/* Toolbar customization */
.ohrm-toolbar {
    background-color: rgba(0, 0, 0, 0.8);
}
```

Include the custom CSS in your HTML:

```bash
# Edit the Nginx configuration or use a custom index.html
# Add the CSS reference in the head section
```

## OpenTelemetry (OTEL) Configuration

OpenTelemetry provides observability through distributed tracing, metrics, and logs. This section covers integrating OTEL with Jitsi Meet for comprehensive monitoring.

### Installing OpenTelemetry Collector

```bash
# Download the OTEL Collector
wget https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v0.90.0/otelcol-contrib_0.90.0_linux_amd64.deb

# Install the collector
sudo dpkg -i otelcol-contrib_0.90.0_linux_amd64.deb

# Enable and start the service
sudo systemctl enable otelcol-contrib
sudo systemctl start otelcol-contrib
```

### OTEL Collector Configuration

```yaml
# /etc/otelcol-contrib/config.yaml

receivers:
  # Receive OTLP data from applications
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Collect host metrics
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu:
      memory:
      disk:
      network:
      load:

  # Prometheus receiver for JVB metrics
  prometheus:
    config:
      scrape_configs:
        - job_name: 'jitsi-videobridge'
          static_configs:
            - targets: ['localhost:8080']
          metrics_path: '/colibri/stats'

        - job_name: 'prosody'
          static_configs:
            - targets: ['localhost:5280']

        - job_name: 'jicofo'
          static_configs:
            - targets: ['localhost:8888']

processors:
  # Add resource attributes
  resource:
    attributes:
      - key: service.name
        value: jitsi-meet
        action: upsert
      - key: deployment.environment
        value: production
        action: upsert

  # Batch processing for efficiency
  batch:
    timeout: 10s
    send_batch_size: 1000

  # Memory limiter to prevent OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 1000
    spike_limit_mib: 200

exporters:
  # Export to OneUptime or your preferred backend
  otlp:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      Authorization: "Bearer YOUR_ONEUPTIME_API_KEY"
    tls:
      insecure: false

  # Export to Prometheus (optional)
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: jitsi

  # Debug logging
  logging:
    loglevel: info

extensions:
  # Health check endpoint
  health_check:
    endpoint: 0.0.0.0:13133

  # Performance profiler
  pprof:
    endpoint: 0.0.0.0:1777

service:
  extensions: [health_check, pprof]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, resource]
      exporters: [otlp, logging]

    metrics:
      receivers: [otlp, hostmetrics, prometheus]
      processors: [memory_limiter, batch, resource]
      exporters: [otlp, prometheus, logging]

    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch, resource]
      exporters: [otlp, logging]
```

### Configuring Jitsi Videobridge for Metrics

```bash
# /etc/jitsi/videobridge/jvb.conf

videobridge {
    # HTTP server for stats
    http-servers {
        public {
            port = 8080
            host = 0.0.0.0
        }
    }

    # Enable statistics
    stats {
        enabled = true
        transports = [
            { type = "colibri" }
        ]
    }

    # OTEL integration
    otel {
        enabled = true
        service-name = "jitsi-videobridge"
        endpoint = "http://localhost:4317"
    }

    # WebSocket settings
    websockets {
        enabled = true
        server-id = "default"
        domain = "meet.yourdomain.com"
        tls = true
    }

    # ICE settings
    ice {
        tcp {
            enabled = true
            port = 443
        }
        udp {
            port = 10000
        }
    }

    # Codec settings
    codecs {
        video {
            vp8 {
                enabled = true
            }
            vp9 {
                enabled = true
            }
            h264 {
                enabled = true
            }
            av1 {
                enabled = false
            }
        }
    }
}
```

### OHRM (Observability Human Resource Management) Setup

OHRM provides a centralized dashboard for managing Jitsi Meet observability:

```yaml
# /etc/ohrm/config.yaml

# OHRM Configuration for Jitsi Meet
server:
  host: 0.0.0.0
  port: 9000

# Data sources
datasources:
  - name: jitsi-otel
    type: opentelemetry
    url: http://localhost:4317

  - name: jitsi-prometheus
    type: prometheus
    url: http://localhost:9090

# Alerting rules
alerting:
  rules:
    - name: high-cpu-usage
      condition: "cpu_usage > 80"
      duration: 5m
      severity: warning

    - name: conference-failures
      condition: "conference_creation_failures > 5"
      duration: 10m
      severity: critical

    - name: participant-join-failures
      condition: "participant_join_failure_rate > 0.1"
      duration: 5m
      severity: warning

# Dashboard configurations
dashboards:
  - name: jitsi-overview
    panels:
      - title: Active Conferences
        query: "jitsi_conferences_active"

      - title: Total Participants
        query: "jitsi_participants_total"

      - title: Videobridge Load
        query: "jitsi_jvb_cpu_usage"

      - title: Network Throughput
        query: "jitsi_network_bytes_total"
```

## Jibri for Recording and Live Streaming

Jibri (Jitsi Broadcasting Infrastructure) enables recording and live streaming of conferences.

### Jibri System Requirements

- **Dedicated Server**: Jibri requires its own machine (can be virtual)
- **CPU**: 4+ cores
- **RAM**: 4GB minimum
- **GPU**: Not required, but Chrome uses significant CPU
- **Storage**: Sufficient for recordings (calculate based on expected usage)

### Installing Jibri

```bash
# Install dependencies
sudo apt update
sudo apt install -y linux-image-extra-virtual ffmpeg curl unzip

# Install Google Chrome
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update
sudo apt install -y google-chrome-stable

# Install ChromeDriver
CHROMEDRIVER_VERSION=$(curl -s https://chromedriver.storage.googleapis.com/LATEST_RELEASE)
wget -N https://chromedriver.storage.googleapis.com/${CHROMEDRIVER_VERSION}/chromedriver_linux64.zip
unzip chromedriver_linux64.zip
sudo mv chromedriver /usr/local/bin/
sudo chmod +x /usr/local/bin/chromedriver

# Install Jibri
sudo apt install -y jibri

# Add Jibri user to required groups
sudo usermod -aG adm,audio,video,plugdev jibri
```

### Jibri Configuration

```bash
# /etc/jitsi/jibri/jibri.conf

jibri {
    # Unique instance ID
    id = "jibri-instance-1"

    # Single-use mode (restart after each recording)
    single-use-mode = false

    # Recording settings
    recording {
        # Directory for recordings
        recordings-directory = "/recordings"

        # Finalize script (optional)
        finalize-script = "/opt/jibri/scripts/finalize.sh"
    }

    # Streaming settings
    streaming {
        # RTMP URL for live streaming
        rtmp-allow-list = [
            ".*"  # Allow all RTMP servers (restrict in production)
        ]
    }

    # Chrome settings
    chrome {
        # Path to Chrome binary
        binary = "/usr/bin/google-chrome-stable"

        # Chrome flags
        flags = [
            "--use-fake-ui-for-media-stream",
            "--start-maximized",
            "--kiosk",
            "--enabled",
            "--autoplay-policy=no-user-gesture-required",
            "--disable-infobars",
            "--ignore-certificate-errors"
        ]
    }

    # FFmpeg settings
    ffmpeg {
        resolution = "1920x1080"
        framerate = 30
        video-encode-preset = "veryfast"
        queue-size = 4096
        streaming-max-bitrate = 2976

        # H.264 encoding settings
        h264-constant-rate-factor = 25
    }

    # XMPP settings for connecting to Jitsi Meet
    api {
        xmpp {
            environments = [
                {
                    name = "production"

                    # XMPP server settings
                    xmpp-server-hosts = ["meet.yourdomain.com"]
                    xmpp-domain = "meet.yourdomain.com"

                    # Control MUC settings
                    control-muc {
                        domain = "internal.auth.meet.yourdomain.com"
                        room-name = "JibriBrewery"
                        nickname = "jibri-instance-1"
                    }

                    # Login credentials
                    control-login {
                        domain = "auth.meet.yourdomain.com"
                        username = "jibri"
                        password = "JIBRI_PASSWORD"
                    }

                    # Call login for joining meetings
                    call-login {
                        domain = "recorder.meet.yourdomain.com"
                        username = "recorder"
                        password = "RECORDER_PASSWORD"
                    }

                    # Strip from room domain
                    strip-from-room-domain = "conference."

                    # Trust all certificates (set false in production with valid certs)
                    trust-all-xmpp-certs = true

                    # Usage timeout
                    usage-timeout = 0
                }
            ]
        }
    }

    # Stats settings
    stats {
        enable-stats-d = true
    }

    # Webhook for notifications (optional)
    webhook {
        subscribers = []
    }

    # Call status checks
    call-status-checks {
        # No media timeout
        no-media-timeout = 30 seconds

        # All muted timeout
        all-muted-timeout = 10 minutes

        # Default call empty timeout
        default-call-empty-timeout = 30 seconds
    }
}
```

### Prosody Configuration for Jibri

Add these settings to your Prosody configuration:

```lua
-- /etc/prosody/conf.avail/meet.yourdomain.com.cfg.lua

-- Add to the main VirtualHost section
VirtualHost "recorder.meet.yourdomain.com"
    modules_enabled = {
        "ping";
    }
    authentication = "internal_hashed"

-- Internal MUC for Jibri
Component "internal.auth.meet.yourdomain.com" "muc"
    storage = "memory"
    modules_enabled = {
        "ping";
    }
    admins = { "focus@auth.meet.yourdomain.com", "jvb@auth.meet.yourdomain.com" }
    muc_room_locking = false
    muc_room_default_public_jids = true
```

### Register Jibri Users

```bash
# Register the Jibri control user
sudo prosodyctl register jibri auth.meet.yourdomain.com JIBRI_PASSWORD

# Register the recorder user
sudo prosodyctl register recorder recorder.meet.yourdomain.com RECORDER_PASSWORD
```

### Configure Jicofo for Jibri

```bash
# /etc/jitsi/jicofo/jicofo.conf

jicofo {
    # ... existing configuration ...

    # Jibri settings
    jibri {
        # Enable Jibri functionality
        enabled = true

        # Brewery MUC for Jibri instances
        brewery-jid = "JibriBrewery@internal.auth.meet.yourdomain.com"

        # Pending timeout
        pending-timeout = 90 seconds
    }

    # Recording settings
    recording {
        enabled = true
    }

    # Live streaming settings
    streaming {
        enabled = true
    }
}
```

### Start and Enable Jibri

```bash
# Restart Prosody and Jicofo
sudo systemctl restart prosody
sudo systemctl restart jicofo

# Start Jibri
sudo systemctl start jibri
sudo systemctl enable jibri

# Check Jibri status
sudo systemctl status jibri

# View Jibri logs
sudo journalctl -u jibri -f
```

## Scalability with Multiple Videobridges

For large deployments, you can scale horizontally by adding multiple Jitsi Videobridge instances.

### Architecture for Scalability

```
                    +------------------+
                    |                  |
                    |   Load Balancer  |
                    |   (HAProxy/Nginx)|
                    |                  |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
      +-------+------+ +-----+--------+ +---+----------+
      |              | |              | |              |
      | Web Server 1 | | Web Server 2 | | Web Server 3 |
      | (Nginx)      | | (Nginx)      | | (Nginx)      |
      |              | |              | |              |
      +-------+------+ +------+-------+ +------+-------+
              |               |                |
              +---------------+----------------+
                              |
                    +---------+---------+
                    |                   |
                    |   Prosody XMPP    |
                    |   + Jicofo        |
                    |                   |
                    +---------+---------+
                              |
         +--------------------+--------------------+
         |                    |                    |
  +------+------+      +------+------+      +------+------+
  |             |      |             |      |             |
  | JVB Server 1|      | JVB Server 2|      | JVB Server 3|
  | (Region A)  |      | (Region B)  |      | (Region C)  |
  |             |      |             |      |             |
  +-------------+      +-------------+      +-------------+
```

### Setting Up Additional Videobridge Servers

On each additional JVB server:

```bash
# Install Jitsi Videobridge only
sudo apt update
sudo apt install -y jitsi-videobridge2
```

### Videobridge Configuration for Multi-Server Setup

```bash
# /etc/jitsi/videobridge/jvb.conf (on each JVB server)

videobridge {
    # Unique identifier for this bridge
    id = "jvb-server-1"  # Change for each server

    # HTTP server for stats
    http-servers {
        public {
            port = 8080
            host = 0.0.0.0
        }
    }

    # Enable statistics
    stats {
        enabled = true
        transports = [
            { type = "colibri" }
        ]
    }

    # WebSocket configuration
    websockets {
        enabled = true
        server-id = "jvb-server-1"  # Unique per server
        domain = "meet.yourdomain.com"
        tls = true
    }

    # ICE configuration
    ice {
        tcp {
            enabled = true
            port = 443
        }
        udp {
            port = 10000
        }
        # Advertise the public IP
        harvest {
            mapping {
                stun {
                    addresses = ["stun.l.google.com:19302"]
                }
            }
        }
    }

    # XMPP connection to main server
    apis {
        xmpp-client {
            configs {
                xmpp-server-1 {
                    # Main Prosody server
                    hostname = "meet.yourdomain.com"
                    domain = "auth.meet.yourdomain.com"
                    username = "jvb"
                    password = "JVB_PASSWORD"
                    muc_jids = ["JvbBrewery@internal.auth.meet.yourdomain.com"]
                    muc_nickname = "jvb-server-1"  # Unique per server
                    disable_certificate_verification = false
                }
            }
        }
    }

    # Sctp datastreams
    sctp {
        enabled = true
    }

    # Relay settings for octo (cascaded bridges)
    relay {
        enabled = true
        region = "region-a"  # Geographic region
        relay-id = "jvb-server-1"
    }
}
```

### Configure Jicofo for Multiple Bridges

```bash
# /etc/jitsi/jicofo/jicofo.conf

jicofo {
    # XMPP settings
    xmpp {
        client {
            hostname = "localhost"
            domain = "auth.meet.yourdomain.com"
            username = "focus"
            password = "FOCUS_PASSWORD"
        }
    }

    # Bridge selection strategy for multiple JVBs
    bridge {
        # Strategy options:
        # - SingleBridgeSelectionStrategy (default, uses one bridge per conference)
        # - SplitBridgeSelectionStrategy (distributes load across bridges)
        # - RegionBasedBridgeSelectionStrategy (selects bridge based on participant region)
        selection-strategy = RegionBasedBridgeSelectionStrategy

        # Participant region based on IP
        participant-selection-strategy = RegionBasedParticipantSelectionStrategy

        # Maximum participants per bridge before overflow
        max-bridge-participants = 80

        # Maximum total conferences per bridge
        max-bridge-packet-rate = 50000

        # Bridge regions configuration
        regions {
            local-region = "region-a"
        }
    }

    # Octo configuration for cascaded bridges
    octo {
        enabled = true
    }
}
```

### Prosody Configuration for Multiple Bridges

```lua
-- /etc/prosody/conf.avail/meet.yourdomain.com.cfg.lua

-- JVB Brewery MUC
Component "internal.auth.meet.yourdomain.com" "muc"
    storage = "memory"
    modules_enabled = {
        "ping";
    }
    admins = { "focus@auth.meet.yourdomain.com" }
    muc_room_locking = false
    muc_room_default_public_jids = true
```

### Register JVB Users

```bash
# On the main Prosody server, register each JVB
sudo prosodyctl register jvb auth.meet.yourdomain.com JVB_PASSWORD
```

### Load Balancer Configuration (HAProxy)

```bash
# /etc/haproxy/haproxy.cfg

global
    log stdout format raw local0
    maxconn 4096
    tune.ssl.default-dh-param 2048

defaults
    mode http
    timeout connect 5s
    timeout client 60s
    timeout server 60s
    option httplog

frontend https_front
    bind *:443 ssl crt /etc/ssl/private/meet.yourdomain.com.pem

    # Route WebSocket connections for XMPP
    acl is_websocket hdr(Upgrade) -i websocket
    acl is_xmpp_ws path_beg /xmpp-websocket

    # Route colibri-ws to appropriate JVB
    acl is_colibri_ws path_beg /colibri-ws

    use_backend jvb_websockets if is_colibri_ws
    use_backend prosody_ws if is_xmpp_ws is_websocket
    default_backend web_servers

backend web_servers
    balance roundrobin
    option httpchk GET /
    server web1 192.168.1.10:80 check
    server web2 192.168.1.11:80 check
    server web3 192.168.1.12:80 check

backend prosody_ws
    balance roundrobin
    server prosody1 192.168.1.20:5280 check

backend jvb_websockets
    balance source
    hash-type consistent
    server jvb1 192.168.1.30:9090 check
    server jvb2 192.168.1.31:9090 check
    server jvb3 192.168.1.32:9090 check
```

## OHRM Server Setup

Setting up a dedicated OHRM (Observability Human Resource Management) server for centralized monitoring:

### Installing OHRM Components

```bash
# Create OHRM directory structure
sudo mkdir -p /opt/ohrm/{config,data,logs}

# Install required dependencies
sudo apt update
sudo apt install -y docker.io docker-compose

# Enable Docker
sudo systemctl enable docker
sudo systemctl start docker
```

### OHRM Docker Compose Configuration

```yaml
# /opt/ohrm/docker-compose.yml

version: '3.8'

services:
  # Prometheus for metrics storage
  prometheus:
    image: prom/prometheus:latest
    container_name: ohrm-prometheus
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    ports:
      - "9090:9090"
    restart: unless-stopped

  # Grafana for dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: ohrm-grafana
    volumes:
      - grafana_data:/var/lib/grafana
      - ./config/grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password_here
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
    restart: unless-stopped

  # Loki for log aggregation
  loki:
    image: grafana/loki:latest
    container_name: ohrm-loki
    volumes:
      - ./config/loki.yml:/etc/loki/local-config.yaml
      - loki_data:/loki
    ports:
      - "3100:3100"
    restart: unless-stopped

  # Jaeger for distributed tracing
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: ohrm-jaeger
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    ports:
      - "16686:16686"  # UI
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    restart: unless-stopped

  # Alertmanager for notifications
  alertmanager:
    image: prom/alertmanager:latest
    container_name: ohrm-alertmanager
    volumes:
      - ./config/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - "9093:9093"
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
```

### Prometheus Configuration for Jitsi

```yaml
# /opt/ohrm/config/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

rule_files:
  - "alerts/*.yml"

scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Jitsi Videobridge metrics
  - job_name: 'jitsi-videobridge'
    static_configs:
      - targets:
        - 'jvb1.yourdomain.com:8080'
        - 'jvb2.yourdomain.com:8080'
        - 'jvb3.yourdomain.com:8080'
    metrics_path: '/colibri/stats'

  # Jicofo metrics
  - job_name: 'jicofo'
    static_configs:
      - targets: ['meet.yourdomain.com:8888']

  # Prosody metrics (if mod_prometheus enabled)
  - job_name: 'prosody'
    static_configs:
      - targets: ['meet.yourdomain.com:5280']
    metrics_path: '/metrics'

  # Node Exporter for system metrics
  - job_name: 'node'
    static_configs:
      - targets:
        - 'meet.yourdomain.com:9100'
        - 'jvb1.yourdomain.com:9100'
        - 'jvb2.yourdomain.com:9100'
```

### Alerting Rules

```yaml
# /opt/ohrm/config/alerts/jitsi.yml

groups:
  - name: jitsi-alerts
    rules:
      # High CPU usage on videobridge
      - alert: JVBHighCPU
        expr: jitsi_jvb_cpu_usage > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on JVB {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}% on {{ $labels.instance }}"

      # Too many participants on single bridge
      - alert: JVBOverloaded
        expr: jitsi_jvb_participants > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "JVB {{ $labels.instance }} has too many participants"
          description: "{{ $value }} participants on {{ $labels.instance }}"

      # Conference creation failures
      - alert: ConferenceCreationFailures
        expr: rate(jitsi_conference_creation_failures_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Conference creation failures detected"
          description: "{{ $value }} failures per second"

      # JVB down
      - alert: JVBDown
        expr: up{job="jitsi-videobridge"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Jitsi Videobridge {{ $labels.instance }} is down"
          description: "JVB has been unreachable for more than 1 minute"

      # High network utilization
      - alert: JVBHighNetworkUsage
        expr: jitsi_jvb_bit_rate_download + jitsi_jvb_bit_rate_upload > 800000000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High network usage on JVB {{ $labels.instance }}"
          description: "Network usage is {{ $value }} bps"
```

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Jitsi Meet Overview",
    "uid": "jitsi-overview",
    "panels": [
      {
        "title": "Active Conferences",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(jitsi_jvb_conferences)",
            "legendFormat": "Conferences"
          }
        ]
      },
      {
        "title": "Total Participants",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(jitsi_jvb_participants)",
            "legendFormat": "Participants"
          }
        ]
      },
      {
        "title": "Participants per JVB",
        "type": "graph",
        "targets": [
          {
            "expr": "jitsi_jvb_participants",
            "legendFormat": "{{ instance }}"
          }
        ]
      },
      {
        "title": "CPU Usage per JVB",
        "type": "graph",
        "targets": [
          {
            "expr": "jitsi_jvb_cpu_usage",
            "legendFormat": "{{ instance }}"
          }
        ]
      },
      {
        "title": "Network Throughput",
        "type": "graph",
        "targets": [
          {
            "expr": "jitsi_jvb_bit_rate_download",
            "legendFormat": "Download {{ instance }}"
          },
          {
            "expr": "jitsi_jvb_bit_rate_upload",
            "legendFormat": "Upload {{ instance }}"
          }
        ]
      }
    ]
  }
}
```

### Start OHRM Stack

```bash
# Navigate to OHRM directory
cd /opt/ohrm

# Start all services
sudo docker-compose up -d

# Check service status
sudo docker-compose ps

# View logs
sudo docker-compose logs -f
```

## Troubleshooting Common Issues

### Issue 1: Cannot Create Conference

**Symptoms**: Users can access the web interface but cannot create or join meetings.

**Diagnosis**:

```bash
# Check Jicofo logs
sudo journalctl -u jicofo -f

# Check for OHRM-related errors
sudo grep -i "error\|fail" /var/log/jitsi/jicofo.log

# Verify Prosody is running
sudo systemctl status prosody

# Test XMPP connectivity
sudo prosodyctl about
```

**Solutions**:

```bash
# 1. Restart services in order
sudo systemctl restart prosody
sleep 5
sudo systemctl restart jicofo
sleep 5
sudo systemctl restart jitsi-videobridge2

# 2. Check authentication configuration
sudo prosodyctl check

# 3. Verify DNS resolution
nslookup meet.yourdomain.com
```

### Issue 2: Video/Audio Not Working

**Symptoms**: Users join but cannot see/hear each other.

**Diagnosis**:

```bash
# Check JVB logs
sudo journalctl -u jitsi-videobridge2 -f

# Verify UDP port is accessible
sudo nc -zvu localhost 10000

# Check external connectivity
sudo tcpdump -i any port 10000

# Verify ICE candidates
curl http://localhost:8080/colibri/stats | jq '.ice_failed'
```

**Solutions**:

```bash
# 1. Ensure firewall allows UDP 10000
sudo ufw status | grep 10000
sudo ufw allow 10000/udp

# 2. Configure NAT/external IP
# Add to /etc/jitsi/videobridge/sip-communicator.properties:
org.ice4j.ice.harvest.NAT_HARVESTER_LOCAL_ADDRESS=<internal-ip>
org.ice4j.ice.harvest.NAT_HARVESTER_PUBLIC_ADDRESS=<public-ip>

# 3. Restart videobridge
sudo systemctl restart jitsi-videobridge2
```

### Issue 3: Certificate Errors

**Symptoms**: Browser shows SSL warnings or connection errors.

**Diagnosis**:

```bash
# Check certificate validity
sudo openssl x509 -in /etc/jitsi/meet/meet.yourdomain.com.crt -text -noout | grep -A2 "Validity"

# Verify certificate chain
sudo openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt /etc/jitsi/meet/meet.yourdomain.com.crt

# Check Nginx SSL configuration
sudo nginx -t
```

**Solutions**:

```bash
# 1. Renew Let's Encrypt certificate
sudo /usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh

# 2. Fix certificate permissions
sudo chown root:root /etc/jitsi/meet/*.key
sudo chmod 600 /etc/jitsi/meet/*.key

# 3. Reload Nginx
sudo systemctl reload nginx
```

### Issue 4: Jibri Recording Fails

**Symptoms**: Recording button doesn't work or recordings fail to start.

**Diagnosis**:

```bash
# Check Jibri logs
sudo journalctl -u jibri -f

# Verify Jibri is registered in brewery
curl http://localhost:8888/stats | jq '.jibri_detector'

# Check Chrome process
ps aux | grep chrome

# Verify recording directory
ls -la /recordings
```

**Solutions**:

```bash
# 1. Ensure Jibri user has proper permissions
sudo usermod -aG adm,audio,video,plugdev jibri

# 2. Fix ALSA configuration
sudo modprobe snd-aloop

# 3. Verify XMPP credentials
sudo prosodyctl user jibri auth.meet.yourdomain.com

# 4. Restart Jibri
sudo systemctl restart jibri
```

### Issue 5: High Latency/Poor Quality

**Symptoms**: Video stuttering, audio delays, or poor quality.

**Diagnosis**:

```bash
# Check JVB statistics
curl http://localhost:8080/colibri/stats | jq '.'

# Monitor system resources
htop

# Check network utilization
iftop -i eth0

# View packet loss
mtr -r meet.yourdomain.com
```

**Solutions**:

```bash
# 1. Adjust video quality settings in config.js
var config = {
    resolution: 720,
    constraints: {
        video: {
            height: { ideal: 720, max: 720, min: 180 }
        }
    },
    disableSimulcast: false,
    enableLayerSuspension: true
};

# 2. Add bandwidth limits
# In /etc/jitsi/meet/meet.yourdomain.com-config.js
channelLastN: 4,  // Limit displayed participants

# 3. Scale horizontally with more videobridges
```

### Issue 6: Authentication Problems

**Symptoms**: Users cannot log in or guest access doesn't work.

**Diagnosis**:

```bash
# Check Prosody logs
sudo tail -f /var/log/prosody/prosody.log

# Verify user exists
sudo prosodyctl mod_listusers meet.yourdomain.com

# Test authentication
sudo prosodyctl authenticate user@meet.yourdomain.com
```

**Solutions**:

```bash
# 1. Reset user password
sudo prosodyctl passwd user@meet.yourdomain.com

# 2. Verify guest domain configuration
sudo prosodyctl check dns

# 3. Ensure anonymousdomain is set in config.js
# Check hosts configuration matches Prosody setup
```

### Log File Locations

Reference for all relevant log files:

```bash
# Prosody XMPP logs
/var/log/prosody/prosody.log
/var/log/prosody/prosody.err

# Jicofo logs
/var/log/jitsi/jicofo.log

# Jitsi Videobridge logs
/var/log/jitsi/jvb.log

# Jibri logs
/var/log/jitsi/jibri/log/

# Nginx logs
/var/log/nginx/access.log
/var/log/nginx/error.log

# System logs
/var/log/syslog
```

### Useful Diagnostic Commands

```bash
# View all Jitsi-related processes
ps aux | grep -E "java|prosody|nginx|chrome"

# Check memory usage
free -h

# Check disk space
df -h

# Monitor network connections
ss -tlnp | grep -E "80|443|5222|5280|10000"

# Real-time log monitoring
sudo tail -f /var/log/prosody/prosody.log /var/log/jitsi/jicofo.log /var/log/jitsi/jvb.log
```

## Complete Configuration Reference

### Summary of Configuration Files

| Component | Configuration File | Purpose |
|-----------|-------------------|---------|
| Prosody | `/etc/prosody/conf.avail/meet.yourdomain.com.cfg.lua` | XMPP server settings |
| Jitsi Meet | `/etc/jitsi/meet/meet.yourdomain.com-config.js` | Frontend configuration |
| Jicofo | `/etc/jitsi/jicofo/jicofo.conf` | Conference focus settings |
| Videobridge | `/etc/jitsi/videobridge/jvb.conf` | Media server settings |
| Jibri | `/etc/jitsi/jibri/jibri.conf` | Recording settings |
| Nginx | `/etc/nginx/sites-available/meet.yourdomain.com.conf` | Web server settings |
| Interface | `/usr/share/jitsi-meet/interface_config.js` | UI customization |

### Service Management Commands

```bash
# Start all services
sudo systemctl start prosody jicofo jitsi-videobridge2 nginx

# Stop all services
sudo systemctl stop jitsi-videobridge2 jicofo prosody nginx

# Restart all services
sudo systemctl restart prosody && sleep 2 && sudo systemctl restart jicofo && sleep 2 && sudo systemctl restart jitsi-videobridge2

# Check status of all services
sudo systemctl status prosody jicofo jitsi-videobridge2 nginx

# Enable services at boot
sudo systemctl enable prosody jicofo jitsi-videobridge2 nginx
```

## Monitoring with OneUptime

After setting up your Jitsi Meet infrastructure, implementing comprehensive monitoring is essential for maintaining reliability and performance. [OneUptime](https://oneuptime.com) provides an excellent solution for monitoring your video conferencing platform.

### Why Monitor Jitsi Meet with OneUptime

- **Uptime Monitoring**: Track availability of your Jitsi Meet web interface, XMPP server, and videobridges
- **Performance Metrics**: Monitor CPU, memory, and network usage across all components
- **Alerting**: Receive instant notifications when issues occur via email, SMS, Slack, or PagerDuty
- **Status Pages**: Create public or private status pages to communicate service health to users
- **Log Management**: Centralize and analyze logs from all Jitsi components
- **Distributed Monitoring**: Monitor from multiple global locations to ensure availability for remote users

### Setting Up OneUptime Monitoring

1. **Create a OneUptime Account**: Sign up at [oneuptime.com](https://oneuptime.com)

2. **Add HTTP Monitors**: Monitor your Jitsi Meet web endpoints
   - Main web interface: `https://meet.yourdomain.com`
   - BOSH endpoint: `https://meet.yourdomain.com/http-bind`

3. **Add Port Monitors**: Monitor critical services
   - HTTPS (443/TCP)
   - XMPP (5222/TCP)
   - Videobridge media (10000/UDP)

4. **Configure Alerts**: Set up notification channels and escalation policies

5. **Create Dashboards**: Visualize metrics from your OTEL collector

6. **Set Up On-Call Schedules**: Ensure 24/7 coverage for critical issues

OneUptime's comprehensive monitoring capabilities help ensure your self-hosted Jitsi Meet deployment remains reliable and performant, giving you peace of mind and enabling quick response to any issues that arise.

---

By following this guide, you have set up a complete, production-ready Jitsi Meet video conferencing platform on Ubuntu. From basic installation to advanced features like recording with Jibri and horizontal scaling with multiple videobridges, your deployment is now ready to serve secure, high-quality video meetings. Remember to regularly update your installation, monitor performance, and review security configurations to maintain a healthy video conferencing infrastructure.

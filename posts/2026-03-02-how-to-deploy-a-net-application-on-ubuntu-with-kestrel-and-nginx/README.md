# How to Deploy a .NET Application on Ubuntu with Kestrel and Nginx

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, .NET, Kestrel, NGINX, ASP.NET

Description: Deploy an ASP.NET Core application on Ubuntu using Kestrel as the web server with Nginx as a reverse proxy, including systemd service setup and HTTPS configuration.

---

ASP.NET Core applications include Kestrel, a cross-platform web server built into the framework. On Linux, the recommended production pattern is to run Kestrel behind Nginx. Nginx handles SSL termination, static file serving, rate limiting, and connection management, while Kestrel focuses on running the application code.

This guide covers deploying a .NET application as a self-contained systemd service with Nginx acting as the public-facing reverse proxy.

## Installing the .NET Runtime

```bash
# Add Microsoft's package repository
sudo apt update && sudo apt install -y wget

# Download and add the Microsoft package signing key and repository
wget https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb

sudo apt update

# Install the .NET runtime (for running pre-built apps)
sudo apt install -y aspnetcore-runtime-8.0

# Or install the full SDK (for building on the server)
# sudo apt install -y dotnet-sdk-8.0

# Verify installation
dotnet --version
dotnet --list-runtimes
```

## Preparing the Application

The two deployment models for .NET on Linux are:

1. **Framework-dependent**: Small deployment, requires the .NET runtime installed on the server
2. **Self-contained**: Larger deployment, includes the runtime - runs on any Linux machine

```bash
# On your development machine, publish the application

# Framework-dependent (recommended - smaller, easier to update runtime)
dotnet publish MyApp/MyApp.csproj \
    --configuration Release \
    --runtime linux-x64 \
    --self-contained false \
    --output ./publish

# Self-contained (no runtime required on target server)
# dotnet publish MyApp/MyApp.csproj \
#     --configuration Release \
#     --runtime linux-x64 \
#     --self-contained true \
#     --output ./publish
```

## Deploying the Application

```bash
# Create application user and directories
sudo useradd -r -m -d /opt/myapp -s /bin/false myapp
sudo mkdir -p /opt/myapp/app
sudo mkdir -p /var/log/myapp

# Copy published files to the server
# (From your dev machine)
# scp -r ./publish/* user@server:/tmp/myapp/

# Move to the application directory
sudo cp -r /tmp/myapp/* /opt/myapp/app/
sudo chown -R myapp:myapp /opt/myapp/app

# Make the application binary executable
sudo chmod +x /opt/myapp/app/MyApp

# Create the environment configuration
sudo tee /opt/myapp/app/appsettings.Production.json > /dev/null <<'EOF'
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=myappdb;Username=dbuser;Password=dbpass"
  },
  "AllowedHosts": "*"
}
EOF
sudo chmod 640 /opt/myapp/app/appsettings.Production.json
sudo chown myapp:myapp /opt/myapp/app/appsettings.Production.json
```

## Configuring Kestrel

In `Program.cs` or `appsettings.json`, configure Kestrel to listen on a Unix socket for Nginx communication:

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to listen on a Unix socket when behind Nginx
// This is more efficient than TCP for local communication
builder.WebHost.ConfigureKestrel(options =>
{
    // Listen on Unix socket (production, behind Nginx)
    if (builder.Environment.IsProduction())
    {
        options.ListenUnixSocket("/run/myapp/app.sock");
    }
    else
    {
        // Development: listen on a TCP port for convenience
        options.ListenLocalhost(5000);
    }

    // Set limits
    options.Limits.MaxRequestBodySize = 50 * 1024 * 1024; // 50MB
    options.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(2);
    options.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(30);
});

// Configure for running behind a reverse proxy
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor |
                               ForwardedHeaders.XForwardedProto;
    // Trust the local Nginx proxy
    options.KnownProxies.Add(IPAddress.Loopback);
});

var app = builder.Build();

// Apply forwarded headers middleware early in the pipeline
app.UseForwardedHeaders();
```

Alternatively, configure via `appsettings.json`:

```json
{
  "Kestrel": {
    "Endpoints": {
      "UnixSocket": {
        "Url": "http://unix:/run/myapp/app.sock"
      }
    }
  }
}
```

## Creating a systemd Service

```bash
# Create the runtime directory for the socket
sudo tee /etc/tmpfiles.d/myapp.conf > /dev/null <<'EOF'
d /run/myapp 0755 myapp www-data -
EOF

sudo systemd-tmpfiles --create

# Create the systemd service
sudo tee /etc/systemd/system/myapp.service > /dev/null <<'EOF'
[Unit]
Description=ASP.NET Core Web Application
After=network.target

[Service]
Type=notify
User=myapp
Group=myapp

# Working directory
WorkingDirectory=/opt/myapp/app

# Environment variables
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false
Environment=DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

# The application binary
ExecStart=/opt/myapp/app/MyApp

# Or for framework-dependent:
# ExecStart=/usr/bin/dotnet /opt/myapp/app/MyApp.dll

# Graceful restart
Restart=always
RestartSec=5

# Allow socket directory access
RuntimeDirectory=myapp
RuntimeDirectoryMode=0755

# Resource limits
LimitNOFILE=65536
MemoryMax=512M

# Redirect logs to systemd journal
StandardOutput=journal
StandardError=journal
SyslogIdentifier=myapp

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl start myapp
sudo systemctl enable myapp

# Verify it started
sudo systemctl status myapp

# Check the socket was created
ls -la /run/myapp/app.sock
```

## Configuring Nginx

```bash
sudo apt install -y nginx

sudo tee /etc/nginx/sites-available/myapp > /dev/null <<'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # TLS settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Max upload size
    client_max_body_size 50M;

    # Forward requests to Kestrel via Unix socket
    location / {
        proxy_pass http://unix:/run/myapp/app.sock;

        # Pass real connection info
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Buffer settings
        proxy_buffering off;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
    }

    # SignalR WebSocket support
    location /hub {
        proxy_pass http://unix:/run/myapp/app.sock;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    access_log /var/log/nginx/myapp_access.log;
    error_log /var/log/nginx/myapp_error.log;
}
EOF

sudo ln -sf /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## Setting Up SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Running Database Migrations

For Entity Framework Core applications:

```bash
# Run migrations as the app user
sudo -u myapp bash -c "
cd /opt/myapp/app
ASPNETCORE_ENVIRONMENT=Production dotnet MyApp.dll --migrate
"

# Or use the EF migrations tool directly
# (requires SDK on server)
# sudo -u myapp dotnet ef database update \
#     --project /opt/myapp/app/MyApp.dll
```

## Updating the Application

```bash
# Stop the service, deploy new files, restart
sudo systemctl stop myapp

# Copy new files (preserving config)
sudo rsync -av --exclude=appsettings.Production.json \
    /tmp/newrelease/ /opt/myapp/app/

sudo chown -R myapp:myapp /opt/myapp/app

sudo systemctl start myapp
sudo systemctl status myapp
```

## Monitoring

```bash
# View application logs via journalctl
sudo journalctl -u myapp -f

# View recent errors
sudo journalctl -u myapp -p err --since "1 hour ago"

# Check resource usage
systemctl status myapp
sudo cat /sys/fs/cgroup/system.slice/myapp.service/memory.current

# View Nginx access log
sudo tail -f /var/log/nginx/myapp_access.log

# Check .NET version being used
sudo -u myapp dotnet --version
```

## Troubleshooting

```bash
# If the application fails to start, check the journal
sudo journalctl -u myapp -n 50

# Common issues:
# 1. Missing runtime - verify dotnet is installed
which dotnet && dotnet --list-runtimes

# 2. Permission denied on the socket
ls -la /run/myapp/
# The www-data user (Nginx) needs read/write access to the socket
sudo chmod 660 /run/myapp/app.sock
sudo chown myapp:www-data /run/myapp/app.sock

# 3. Configuration file not found
sudo -u myapp ls /opt/myapp/app/appsettings*.json

# 4. Port already in use (if using TCP instead of Unix socket)
ss -tlnp | grep 5000
```

Running .NET on Ubuntu is fully supported and performs well. The Kestrel and Nginx combination provides a modern, production-ready stack that Microsoft actively supports and recommends for Linux deployments.

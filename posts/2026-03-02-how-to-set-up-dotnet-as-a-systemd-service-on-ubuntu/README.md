# How to Set Up .NET as a systemd Service on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, .NET, Systemd, Services, ASP.NET

Description: Run .NET applications as systemd services on Ubuntu with proper user isolation, environment configuration, reverse proxy setup, and log management.

---

.NET Core and later .NET versions run natively on Ubuntu. Deploying a .NET web application as a systemd service gives you reliable process management, automatic restarts, and integrated logging through the journal. This guide covers the full production setup, from publishing the application to configuring nginx as a reverse proxy.

## Installing .NET Runtime on Ubuntu

Microsoft provides an official repository for .NET packages:

```bash
# Add the Microsoft package repository
wget https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb

# Update and install the .NET runtime
sudo apt update

# Install the ASP.NET Core runtime (for web apps)
sudo apt install aspnetcore-runtime-8.0

# Or install the full SDK (for building on the server)
sudo apt install dotnet-sdk-8.0

# Verify
dotnet --version
dotnet --list-runtimes
```

## Publishing a .NET Application

Publish from your development machine or build server:

```bash
# Publish as framework-dependent (relies on installed .NET runtime)
dotnet publish -c Release -o ./publish

# Publish as self-contained (includes .NET runtime in the output)
# No .NET runtime installation needed on the target server
dotnet publish -c Release \
    --self-contained true \
    -r linux-x64 \
    -o ./publish

# Publish as single-file self-contained
dotnet publish -c Release \
    --self-contained true \
    -r linux-x64 \
    -p:PublishSingleFile=true \
    -o ./publish
```

Framework-dependent is smaller; self-contained doesn't require .NET to be installed on the server.

## Creating the Service User and Directory

```bash
# Create a dedicated system user
sudo useradd --system --no-create-home --shell /bin/false dotnetapp

# Create application directory
sudo mkdir -p /var/www/myapp

# Copy the published output to the server
sudo cp -r ./publish/* /var/www/myapp/

# Set ownership
sudo chown -R dotnetapp:dotnetapp /var/www/myapp

# Make the main binary executable
sudo chmod +x /var/www/myapp/myapp
```

## Creating the systemd Unit File

```bash
sudo nano /etc/systemd/system/myapp.service
```

```ini
[Unit]
Description=My .NET Application
After=network.target

[Service]
Type=simple

# Run as dedicated user
User=dotnetapp
Group=dotnetapp

# Application location
WorkingDirectory=/var/www/myapp

# Start command - use full path to dotnet or the binary directly
# Framework-dependent:
ExecStart=/usr/bin/dotnet /var/www/myapp/myapp.dll
# Or for self-contained:
# ExecStart=/var/www/myapp/myapp

# Set ASP.NET Core environment
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5000

# Load additional environment variables from a file
# (database connection strings, API keys, etc.)
EnvironmentFile=/var/www/myapp/.env

# Restart policy
Restart=always
RestartSec=10

# Timeout for graceful shutdown
TimeoutStopSec=30

# Resource limits
MemoryLimit=512M

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/www/myapp/logs /tmp

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=myapp

[Install]
WantedBy=multi-user.target
```

Create the environment file for secrets:

```bash
sudo nano /var/www/myapp/.env
```

```text
ConnectionStrings__DefaultConnection=Server=localhost;Database=mydb;User Id=dbuser;Password=secretpassword;
JWT__Secret=your-jwt-secret-here
ExternalApi__Key=your-api-key
```

```bash
# Secure the env file - readable only by root and the service user
sudo chown root:dotnetapp /var/www/myapp/.env
sudo chmod 640 /var/www/myapp/.env
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable myapp.service
sudo systemctl start myapp.service
sudo systemctl status myapp.service
```

## Configuring ASP.NET Core for Production

Your ASP.NET Core app needs to be configured for behind-proxy operation. In `Program.cs` or `Startup.cs`:

```csharp
// Program.cs

var builder = WebApplication.CreateBuilder(args);

// Configure to run behind a reverse proxy
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor |
                               ForwardedHeaders.XForwardedProto;
    // Trust the proxy
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Add services
builder.Services.AddControllers();

var app = builder.Build();

// Apply forwarded headers middleware FIRST
app.UseForwardedHeaders();

if (app.Environment.IsProduction())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

Configure the URLs in `appsettings.Production.json`:

```json
{
    "Urls": "http://localhost:5000",
    "Kestrel": {
        "Endpoints": {
            "Http": {
                "Url": "http://localhost:5000"
            }
        }
    },
    "Logging": {
        "LogLevel": {
            "Default": "Information",
            "Microsoft.AspNetCore": "Warning"
        }
    }
}
```

## Setting Up Nginx as Reverse Proxy

Install nginx and configure it to proxy to the .NET app:

```bash
sudo apt install nginx
```

```nginx
# /etc/nginx/sites-available/myapp
server {
    listen 80;
    server_name myapp.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name myapp.example.com;

    ssl_certificate /etc/letsencrypt/live/myapp.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.example.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;

        # WebSocket support (for SignalR)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $http_connection;

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Viewing Logs

```bash
# View service logs
journalctl -u myapp.service -f

# View logs with timestamps
journalctl -u myapp.service --since "1 hour ago"

# Filter by log level (requires structured logging)
journalctl -u myapp.service -p err
```

For structured logging from .NET to the journal, add the `Serilog.Sinks.Systemd` package:

```csharp
// Program.cs - using Serilog
using Serilog;
using Serilog.Events;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .WriteTo.Console()
    .WriteTo.Systemd()  // Write to systemd journal
    .Enrich.FromLogContext()
    .CreateLogger();

builder.Host.UseSerilog();
```

## Deployment Script

```bash
#!/bin/bash
# deploy-dotnet.sh - Deploy updated .NET app

set -euo pipefail

APP_DIR="/var/www/myapp"
APP_USER="dotnetapp"
SERVICE_NAME="myapp.service"
BUILD_OUTPUT="./publish"

echo "Publishing application..."
dotnet publish -c Release -o "$BUILD_OUTPUT"

echo "Stopping service..."
sudo systemctl stop "$SERVICE_NAME"

echo "Copying files..."
sudo rsync -a --delete "$BUILD_OUTPUT/" "$APP_DIR/"
sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"
sudo chmod +x "$APP_DIR/myapp"

echo "Starting service..."
sudo systemctl start "$SERVICE_NAME"

echo "Checking service health..."
sleep 3
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "Deployment successful"
    curl -sf http://localhost:5000/health || echo "Warning: health check failed"
else
    echo "ERROR: Service failed to start"
    journalctl -u "$SERVICE_NAME" --no-pager -n 30
    exit 1
fi
```

## Memory Optimization

.NET's default garbage collector behavior can be tuned for server workloads:

```bash
# In the systemd unit Environment or .env file

# Server GC mode - better throughput, higher memory usage
DOTNET_GCConserveMemory=0

# Workstation GC mode - lower memory, lower throughput
# DOTNET_GCConserveMemory=9

# Limit the .NET heap size
DOTNET_GCHeapHardLimit=400000000  # 400MB in bytes

# Use tiered compilation for faster startup
DOTNET_TieredCompilation=1
```

Running .NET applications as systemd services on Ubuntu is production-ready and well-supported. The combination of .NET's built-in Kestrel web server, nginx as a reverse proxy, and systemd for process management provides a reliable and observable deployment configuration.

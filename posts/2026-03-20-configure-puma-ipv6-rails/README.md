# How to Configure Puma for IPv6 in Rails

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Puma, Ruby, Rails, IPv6, Web Server, Dual-Stack, Deployment

Description: Configure Puma to listen on IPv6 addresses for Ruby on Rails deployments, including cluster mode, systemd integration, and NGINX reverse proxy setup.

## Introduction

Puma is the default web server for Ruby on Rails. It supports IPv6 binding using bracket notation in TCP bind URIs. This post covers single and cluster mode configuration for IPv6 production deployments.

## Step 1: Puma Configuration File

```ruby
# config/puma.rb

# Bind to all IPv6 and IPv4 interfaces (dual-stack on most OSes)
bind "tcp://[::]:3000"

# Alternatives (uncomment one instead of the line above):
# Bind to IPv6 loopback only (local only)
# bind "tcp://[::1]:3000"
# Bind to specific IPv6 address
# bind "tcp://[2001:db8::1]:3000"

# Cluster mode
workers ENV.fetch("WEB_CONCURRENCY", 2).to_i
threads_count = ENV.fetch("RAILS_MAX_THREADS", 5).to_i
threads threads_count, threads_count

# Worker lifecycle
preload_app!

on_worker_boot do
  ActiveRecord::Base.establish_connection if defined?(ActiveRecord)
end

# Logging
stdout_redirect "/var/log/puma/stdout.log",
                "/var/log/puma/stderr.log",
                true

# State file for pumactl
state_path "/var/run/puma/puma.state"
activate_control_app "unix:///var/run/puma/pumactl.sock"
```

## Step 2: Run Puma on IPv6

```bash
# Development
rails server --binding "::" --port 3000

# Production with config file
bundle exec puma -C config/puma.rb

# Direct command
bundle exec puma --bind "tcp://[::]:3000" --workers 4

# Test
curl -6 http://[::1]:3000/health
curl -6 http://[2001:db8::1]:3000/
```

## Step 3: Systemd Service

```ini
# /etc/systemd/system/puma.service
[Unit]
Description=Puma HTTP Server (Rails)
After=network.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/var/www/myapp/current
Environment=RAILS_ENV=production
Environment=WEB_CONCURRENCY=4
Environment=RAILS_MAX_THREADS=5

ExecStart=/usr/local/bin/bundle exec puma \
    -C /var/www/myapp/current/config/puma.rb

ExecStop=/usr/local/bin/bundle exec pumactl \
    -S /var/run/puma/puma.state stop

ExecReload=/usr/local/bin/bundle exec pumactl \
    -S /var/run/puma/puma.state phased-restart

Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Step 4: NGINX Reverse Proxy

```nginx
upstream puma_backend {
    server [::1]:3000;
    # Or Unix socket (more efficient):
    # server unix:///var/run/puma/puma.sock;
}

server {
    listen [::]:443 ssl http2;
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://puma_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # Puma keepalive
        proxy_read_timeout 60s;
    }

    location /assets/ {
        root /var/www/myapp/current/public;
        gzip_static on;
        expires max;
        add_header Cache-Control public;
    }
}
```

## Step 5: Capistrano Deployment

```ruby
# config/deploy/production.rb

# Puma restart after deploy
after "deploy:published", "puma:phased_restart"

# SSH to deploy server over IPv6
server "2001:db8::1",
    user: "deploy",
    roles: %w[app web db],
    ssh_options: {
        forward_agent: true
    }
```

## Step 6: Verify and Monitor

```bash
# Check Puma is listening
ss -lntp | grep :3000

# Check with pumactl
bundle exec pumactl -S /var/run/puma/puma.state status

# Test IPv6 connectivity end-to-end
curl -6 -I https://[2001:db8::1]/health

# View Puma threads
bundle exec pumactl -S /var/run/puma/puma.state stats
```

## Conclusion

Puma uses bracket notation for IPv6 binds: `bind "tcp://[::]:3000"`. Multiple `bind` lines support dual-stack. Use Unix sockets between Puma and NGINX for best performance - the IPv6 binding matters for direct access and health checks. Monitor Puma with OneUptime's HTTPS checks and set up alerts for worker restarts.

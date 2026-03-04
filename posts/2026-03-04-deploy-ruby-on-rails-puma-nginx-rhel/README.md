# How to Deploy a Ruby on Rails Application with Puma and Nginx on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ruby, Rails, Puma, Nginx, Deployment, Linux

Description: Deploy a Ruby on Rails application in production on RHEL using Puma as the application server and Nginx as a reverse proxy with systemd management.

---

Deploying Rails in production requires a proper application server and reverse proxy setup. Puma handles Ruby requests while Nginx serves static assets and proxies dynamic requests.

## Prerequisites

```bash
# Install Ruby, Nginx, and build dependencies
sudo dnf module enable ruby:3.2 -y
sudo dnf install -y ruby ruby-devel rubygem-bundler nginx \
  gcc gcc-c++ make postgresql-devel nodejs
```

## Prepare the Application

```bash
# Create a deploy user
sudo useradd -m -s /bin/bash deploy

# Clone or copy your Rails app
sudo mkdir -p /var/www/railsapp
sudo chown deploy:deploy /var/www/railsapp

# As the deploy user
sudo -u deploy bash -c '
cd /var/www/railsapp
# Assuming your app is already here
bundle config set --local deployment true
bundle config set --local without "development test"
bundle install
'

# Set up environment variables
sudo -u deploy tee /var/www/railsapp/.env << 'ENVFILE'
RAILS_ENV=production
RAILS_LOG_TO_STDOUT=1
SECRET_KEY_BASE=your_generated_secret_key_base_here
DATABASE_URL=postgresql://user:pass@localhost/railsapp_production
ENVFILE

# Generate a secret key
sudo -u deploy bash -c 'cd /var/www/railsapp && bundle exec rails secret'
```

## Configure Puma

```ruby
# /var/www/railsapp/config/puma.rb

# Bind to a Unix socket
bind "unix:///var/www/railsapp/tmp/sockets/puma.sock"

# Set the environment
environment ENV.fetch("RAILS_ENV") { "production" }

# Number of worker processes (set to CPU core count)
workers ENV.fetch("WEB_CONCURRENCY") { 2 }

# Threads per worker
threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
threads threads_count, threads_count

# Preload the app for copy-on-write memory savings
preload_app!

# PID file
pidfile "/var/www/railsapp/tmp/pids/puma.pid"
state_path "/var/www/railsapp/tmp/pids/puma.state"

# Logging
stdout_redirect "/var/www/railsapp/log/puma.stdout.log",
                "/var/www/railsapp/log/puma.stderr.log",
                true
```

## Create a Systemd Service for Puma

```bash
sudo tee /etc/systemd/system/puma.service << 'UNIT'
[Unit]
Description=Puma Rails Application Server
After=network.target postgresql.service

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/var/www/railsapp
EnvironmentFile=/var/www/railsapp/.env
ExecStart=/usr/local/bin/bundle exec puma -C config/puma.rb
ExecReload=/bin/kill -USR1 $MAINPID
Restart=always
RestartSec=5
SyslogIdentifier=puma

[Install]
WantedBy=multi-user.target
UNIT

# Create required directories
sudo -u deploy mkdir -p /var/www/railsapp/tmp/{sockets,pids}
sudo -u deploy mkdir -p /var/www/railsapp/log

sudo systemctl daemon-reload
sudo systemctl enable --now puma
```

## Configure Nginx

```bash
sudo tee /etc/nginx/conf.d/railsapp.conf << 'CONF'
upstream puma_backend {
    server unix:/var/www/railsapp/tmp/sockets/puma.sock fail_timeout=0;
}

server {
    listen 80;
    server_name app.example.com;
    root /var/www/railsapp/public;

    client_max_body_size 10M;

    # Serve static files directly
    location ^~ /assets/ {
        gzip_static on;
        expires max;
        add_header Cache-Control public;
    }

    # Proxy everything else to Puma
    location / {
        try_files $uri @puma;
    }

    location @puma {
        proxy_pass http://puma_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
CONF

sudo nginx -t && sudo systemctl enable --now nginx
```

## Precompile Assets and Migrate

```bash
sudo -u deploy bash -c '
cd /var/www/railsapp
RAILS_ENV=production bundle exec rails db:migrate
RAILS_ENV=production bundle exec rails assets:precompile
'
```

## SELinux and Firewall

```bash
sudo setsebool -P httpd_can_network_connect 1
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

Your Rails application is now running in production with Puma workers managed by systemd and Nginx handling client connections.

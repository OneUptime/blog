# How to Deploy a Rails Application on Ubuntu with Puma and Nginx

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Rails, Puma, Nginx, Ruby

Description: Deploy a Ruby on Rails application on Ubuntu using Puma as the application server and Nginx as the reverse proxy, including Capistrano-friendly directory structure and zero-downtime deploys.

---

Ruby on Rails applications in production are typically served by Puma, Rails' default application server since Rails 5. Puma is a multi-threaded, multi-process server that handles concurrent requests efficiently. Nginx fronts Puma to handle SSL termination, static file serving, and connection management.

## Prerequisites

- Ubuntu 22.04 or 24.04
- Sudo access
- A Rails application ready for deployment
- PostgreSQL or MySQL installed (for the database)

## Installing Ruby

The system Ruby packages are often outdated. Use rbenv or RVM for version management:

```bash
# Install rbenv dependencies
sudo apt update
sudo apt install -y git curl libssl-dev libreadline-dev zlib1g-dev \
    build-essential libsqlite3-dev libpq-dev

# Create the application user
sudo useradd -m -d /home/deploy -s /bin/bash deploy
sudo su - deploy

# Install rbenv
git clone https://github.com/rbenv/rbenv.git ~/.rbenv
echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(rbenv init -)"' >> ~/.bashrc
source ~/.bashrc

# Install ruby-build plugin
git clone https://github.com/rbenv/ruby-build.git ~/.rbenv/plugins/ruby-build

# Install the desired Ruby version (check https://www.ruby-lang.org for latest)
rbenv install 3.3.0
rbenv global 3.3.0

# Verify
ruby -v

exit
```

## Setting Up the Application Directory Structure

Using a Capistrano-style directory layout allows zero-downtime deployments:

```
/var/www/myapp/
  current -> releases/20260302120000/  (symlink to active release)
  releases/
    20260302120000/   (current release)
    20260225100000/   (previous release - kept for rollbacks)
  shared/
    config/           (environment-specific config files - shared across releases)
    log/              (log files)
    pids/             (pid files)
    tmp/
      sockets/        (Puma socket)
      pids/           (Puma pid)
```

```bash
# Create the directory structure
sudo mkdir -p /var/www/myapp/{releases,shared}
sudo mkdir -p /var/www/myapp/shared/{config,log,pids,tmp/sockets,tmp/pids,public}
sudo chown -R deploy:deploy /var/www/myapp
```

## Configuring Puma

Puma's configuration file should be in the shared config directory (for Capistrano) or directly in the app:

```bash
sudo -u deploy tee /var/www/myapp/shared/config/puma.rb > /dev/null <<'EOF'
# /var/www/myapp/shared/config/puma.rb

# Application root (adjust for Capistrano: current symlink)
app_dir = File.expand_path("../../..", __FILE__)
shared_dir = "#{app_dir}/shared"

# Number of Puma workers (processes)
# Adjust based on RAM: each worker uses ~300-500MB
workers ENV.fetch("WEB_CONCURRENCY", 3).to_i

# Number of threads per worker
# Adjust based on application concurrency characteristics
threads_count = ENV.fetch("RAILS_MAX_THREADS", 5).to_i
threads threads_count, threads_count

# Use Unix socket for Nginx communication (faster than TCP)
bind "unix://#{shared_dir}/tmp/sockets/puma.sock"

# PID file location
pidfile "#{shared_dir}/tmp/pids/puma.pid"

# State file (used for phased restart)
state_path "#{shared_dir}/tmp/pids/puma.state"

# Activate Puma's control server for zero-downtime deploys
activate_control_app

# Log locations
stdout_redirect "#{shared_dir}/log/puma.stdout.log",
                "#{shared_dir}/log/puma.stderr.log",
                true

# Environment
environment ENV.fetch("RAILS_ENV", "production")

# Preload the application before forking workers
# Enables copy-on-write memory benefits
preload_app!

# Properly handle database connection after forking
on_worker_boot do
  ActiveRecord::Base.establish_connection if defined?(ActiveRecord)
end

# Allow Puma to be restarted by `rails restart` command
plugin :tmp_restart
EOF
```

## Creating the Shared Configuration Files

```bash
# Database configuration (credentials stay in shared, not in the repo)
sudo -u deploy tee /var/www/myapp/shared/config/database.yml > /dev/null <<'EOF'
production:
  adapter: postgresql
  database: myapp_production
  username: <%= ENV['DB_USERNAME'] %>
  password: <%= ENV['DB_PASSWORD'] %>
  host: localhost
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  timeout: 5000
EOF

# Environment variables file
sudo -u deploy tee /var/www/myapp/shared/.env > /dev/null <<'EOF'
RAILS_ENV=production
SECRET_KEY_BASE=your_very_long_secret_key_base_here
DB_USERNAME=dbuser
DB_PASSWORD=dbpassword
RAILS_SERVE_STATIC_FILES=false
RAILS_LOG_TO_STDOUT=true
EOF
sudo chmod 600 /var/www/myapp/shared/.env
```

## Deploying the Application

```bash
# Deploy a release manually (Capistrano automates this in practice)
RELEASE=$(date +%Y%m%d%H%M%S)

sudo -u deploy git clone https://github.com/yourorg/myapp.git \
    /var/www/myapp/releases/$RELEASE

# Link shared files
sudo -u deploy ln -sf /var/www/myapp/shared/config/database.yml \
    /var/www/myapp/releases/$RELEASE/config/database.yml
sudo -u deploy ln -sf /var/www/myapp/shared/.env \
    /var/www/myapp/releases/$RELEASE/.env

# Install gems
sudo -u deploy bash -c "
source ~/.bashrc
cd /var/www/myapp/releases/$RELEASE
bundle install --deployment --without development test
"

# Precompile assets
sudo -u deploy bash -c "
source ~/.bashrc
source /var/www/myapp/shared/.env
cd /var/www/myapp/releases/$RELEASE
bundle exec rails assets:precompile
"

# Run migrations
sudo -u deploy bash -c "
source ~/.bashrc
source /var/www/myapp/shared/.env
cd /var/www/myapp/releases/$RELEASE
bundle exec rails db:migrate
"

# Point the current symlink to the new release
sudo -u deploy ln -sfn /var/www/myapp/releases/$RELEASE /var/www/myapp/current
```

## Creating a systemd Service for Puma

```bash
sudo tee /etc/systemd/system/puma.service > /dev/null <<'EOF'
[Unit]
Description=Puma HTTP Server for Rails
After=network.target

[Service]
Type=simple
User=deploy
Group=deploy

# Working directory is the current release
WorkingDirectory=/var/www/myapp/current

# Load environment variables
EnvironmentFile=/var/www/myapp/shared/.env

# Start Puma with the shared config
ExecStart=/home/deploy/.rbenv/shims/bundle exec puma \
    -C /var/www/myapp/shared/config/puma.rb

# Graceful reload (phased restart for zero-downtime)
ExecReload=/bin/kill -s SIGUSR1 $MAINPID

# For Puma 5+ with --control-url:
# ExecReload=/bin/kill -s USR1 $MAINPID

KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=70

Restart=on-failure
RestartSec=5

# File descriptor limit
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl start puma
sudo systemctl enable puma
sudo systemctl status puma
```

## Configuring Nginx

```bash
sudo apt install -y nginx

sudo tee /etc/nginx/sites-available/myapp > /dev/null <<'EOF'
upstream puma {
    server unix:///var/www/myapp/shared/tmp/sockets/puma.sock fail_timeout=0;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/myapp/current/public;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options nosniff;

    # Upload size limit
    client_max_body_size 50M;

    # Try serving files directly from public/ first
    # This handles compiled assets and error pages without hitting Rails
    try_files $uri/index.html $uri @puma;

    # Serve precompiled assets with long cache headers
    location ^~ /assets/ {
        gzip_static on;
        expires max;
        add_header Cache-Control public;
    }

    location @puma {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        proxy_redirect off;

        proxy_pass http://puma;
    }

    # Handle Rails error pages
    error_page 500 502 503 504 /500.html;
    error_page 404 /404.html;

    access_log /var/log/nginx/myapp_access.log;
    error_log /var/log/nginx/myapp_error.log;
}
EOF

sudo ln -sf /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## Zero-Downtime Deploys

Puma supports phased restarts (rolling worker restarts) which allow new code to be loaded without dropping connections:

```bash
# After deploying new code and updating the 'current' symlink:

# Signal Puma to do a phased restart
# Workers are replaced one by one while the master keeps accepting connections
sudo kill -s SIGUSR1 $(cat /var/www/myapp/shared/tmp/pids/puma.pid)

# Or via systemd
sudo systemctl reload puma

# Monitor the restart
sudo tail -f /var/www/myapp/shared/log/puma.stdout.log
```

## Monitoring

```bash
# Check Puma status
sudo systemctl status puma

# View Puma logs
sudo tail -f /var/www/myapp/shared/log/puma.stdout.log
sudo tail -f /var/www/myapp/shared/log/puma.stderr.log

# View Rails production log
sudo tail -f /var/www/myapp/shared/log/production.log

# Check Nginx logs
sudo tail -f /var/log/nginx/myapp_access.log

# Check Puma workers
ps aux | grep puma
```

The Puma and Nginx stack for Rails is well-tested and battle-hardened. Puma's threaded model handles Rails' I/O-heavy workloads efficiently, and the phased restart capability makes zero-downtime deployments straightforward without external process managers.

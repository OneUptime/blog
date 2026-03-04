# How to Install Ruby on Rails and Set Up a Production Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ruby, Rails, Puma, Nginx, Production, Web Development

Description: Set up a production-ready Ruby on Rails server on RHEL with Puma as the application server and Nginx as a reverse proxy.

---

Ruby on Rails is a full-stack web framework. This guide covers setting up a production Rails environment on RHEL with Puma and Nginx.

## Install Ruby and Rails

```bash
# Install Ruby from AppStream
sudo dnf module enable ruby:3.2 -y
sudo dnf install -y ruby ruby-devel rubygem-bundler gcc gcc-c++ make \
  openssl-devel readline-devel zlib-devel libffi-devel \
  nodejs npm sqlite-devel

# Install Rails
gem install rails --user-install
export PATH="$HOME/.local/share/gem/ruby/3.2.0/bin:$PATH"

# Verify
rails --version
```

## Create a Rails Application

```bash
# Create a new Rails app with PostgreSQL
sudo dnf install -y postgresql-server postgresql-devel
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql

# Create the app
cd /var/www
rails new myapp --database=postgresql
cd myapp

# Configure database in config/database.yml
# Set production database credentials
```

## Configure Puma for Production

```bash
# Edit config/puma.rb
cat > /var/www/myapp/config/puma.rb << 'RUBY'
# Set the number of worker processes (match CPU cores)
workers ENV.fetch("WEB_CONCURRENCY") { 2 }

# Set threads per worker
max_threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
min_threads_count = ENV.fetch("RAILS_MIN_THREADS") { max_threads_count }
threads min_threads_count, max_threads_count

# Bind to a Unix socket for Nginx
bind "unix:///var/www/myapp/tmp/sockets/puma.sock"

# Set the environment
environment ENV.fetch("RAILS_ENV") { "production" }

# Allow Puma to be restarted by systemd
plugin :tmp_restart

# Set the PID file
pidfile "/var/www/myapp/tmp/pids/puma.pid"
RUBY
```

## Create a Systemd Service

```bash
sudo tee /etc/systemd/system/puma.service << 'UNIT'
[Unit]
Description=Puma Rails Server
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/myapp
Environment=RAILS_ENV=production
Environment=RAILS_LOG_TO_STDOUT=1
ExecStart=/usr/local/bin/bundle exec puma -C config/puma.rb
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now puma
```

## Configure Nginx as Reverse Proxy

```bash
sudo dnf install -y nginx

sudo tee /etc/nginx/conf.d/rails.conf << 'CONF'
upstream rails_app {
    server unix:/var/www/myapp/tmp/sockets/puma.sock fail_timeout=0;
}

server {
    listen 80;
    server_name app.example.com;
    root /var/www/myapp/public;

    location / {
        try_files $uri @rails;
    }

    location @rails {
        proxy_pass http://rails_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve static assets directly
    location /assets/ {
        gzip_static on;
        expires max;
        add_header Cache-Control public;
    }
}
CONF

sudo nginx -t && sudo systemctl enable --now nginx
```

## Prepare for Production

```bash
cd /var/www/myapp
RAILS_ENV=production bundle exec rails db:create db:migrate
RAILS_ENV=production bundle exec rails assets:precompile
```

Open the firewall and configure SELinux as needed for your deployment.

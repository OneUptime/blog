# How to Configure Ruby on Rails for IPv6 Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rails, Ruby, IPv6, Puma, Web Framework, Dual-Stack, ActionDispatch

Description: Configure Ruby on Rails to listen on IPv6 with Puma, handle IPv6 client addresses in controllers, and deploy behind an IPv6-capable reverse proxy.

## Introduction

Rails uses Puma as its default web server. Binding Puma to an IPv6 address requires bracket notation in the bind URI. Rails itself handles IPv6 addresses in `ActionDispatch::Request` transparently, but production deployments need specific Puma and proxy configuration.

## Step 1: Puma Configuration for IPv6

```ruby
# config/puma.rb

# Bind to all IPv6 interfaces (dual-stack)

bind "tcp://[::]:3000"

# Bind to both IPv4 and IPv6 explicitly
bind "tcp://0.0.0.0:3000"
bind "tcp://[::]:3000"

# Bind to specific IPv6 address
# bind "tcp://[2001:db8::1]:3000"

# Workers
workers ENV.fetch("WEB_CONCURRENCY", 2)
threads_count = ENV.fetch("RAILS_MAX_THREADS", 5)
threads threads_count, threads_count
```

```bash
# Start Rails with Puma on IPv6
rails server --binding "::" --port 3000
# Or
bundle exec puma -b "tcp://[::]:3000"
```

## Step 2: Get Client IPv6 in Controllers

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  before_action :set_client_ip

  private

  def set_client_ip
    # Rails parses X-Forwarded-For automatically with ActionDispatch
    @client_ip = request.remote_ip

    # Normalize IPv4-mapped IPv6
    if @client_ip.start_with?("::ffff:")
      @client_ip = @client_ip.sub("::ffff:", "")
    end
  end

  def ipv6_client?
    require 'ipaddr'
    IPAddr.new(@client_ip).ipv6?
  rescue IPAddr::InvalidAddressError
    false
  end
end
```

## Step 3: ActionDispatch Trusted Proxies

```ruby
# config/application.rb
module MyApp
  class Application < Rails::Application
    # Trust specific IPv6 proxy
    config.action_dispatch.trusted_proxies = [
      IPAddr.new("2001:db8::/32"),   # IPv6 proxy subnet
      IPAddr.new("::1"),              # Loopback
      IPAddr.new("127.0.0.1"),
    ]

    # Or use the default (loopback + private ranges)
    # config.action_dispatch.trusted_proxies =
    #   ActionDispatch::RemoteIp::TRUSTED_PROXIES
  end
end
```

## Step 4: Store IPv6 in Database

```ruby
# Migration
class AddIpAddressToSessions < ActiveRecord::Migration[7.1]
  def change
    add_column :sessions, :ip_address, :string, limit: 45
    # 45 characters handles the longest IPv6 address with IPv4 notation
    # e.g. "0000:0000:0000:0000:0000:ffff:255.255.255.255"
  end
end

# Model with validation
class Session < ApplicationRecord
  validates :ip_address, format: {
    with: /\A((\d{1,3}\.){3}\d{1,3}|[0-9a-f:]+)\z/i,
    message: "must be a valid IP address"
  }
end
```

## Step 5: NGINX Proxy for IPv6 + Rails

```nginx
upstream rails_app {
    server [::1]:3000;
}

server {
    listen [::]:80;
    listen 80;

    location / {
        proxy_pass http://rails_app;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

## Step 6: Test

```bash
# Start Rails dev server on IPv6
rails server --binding "::" -p 3000

# Test
curl -6 http://[::1]:3000/
curl -6 http://[2001:db8::1]:3000/

# Check Puma binding
ss -lntp | grep :3000
```

## Conclusion

Rails on IPv6 uses Puma's `bind "tcp://[::]:3000"` syntax. `ActionDispatch::Request#remote_ip` handles X-Forwarded-For automatically when trusted proxies are configured. Store IP addresses in `VARCHAR(45)` columns to accommodate the longest possible IPv6 representations. Monitor Rails with OneUptime's HTTP checks targeting IPv6 addresses.

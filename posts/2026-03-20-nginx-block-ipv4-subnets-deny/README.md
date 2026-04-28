# How to Block IPv4 Subnets in Nginx Using the Deny Directive

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, IPv4, Deny Directive, Security, Blocking, Access Control

Description: Use the Nginx deny directive to block specific IPv4 addresses, subnets, and CIDR ranges from accessing your web server or specific locations.

## Introduction

Blocking known-malicious IPs, abusive crawlers, or entire geographic ranges is a straightforward security measure in Nginx. The `deny` directive, part of `ngx_http_access_module`, lets you drop requests from specific IPv4 addresses or subnets before they reach your application.

## Blocking a Single IPv4 Address

```nginx
# /etc/nginx/conf.d/blocks.conf

server {
    listen 80;
    server_name example.com;

    # Block a single abusive IPv4 address
    deny 203.0.113.99;

    # Allow all other traffic
    allow all;

    location / {
        proxy_pass http://backend;
    }
}
```

## Blocking Multiple Subnets

```nginx
server {
    listen 80;
    server_name example.com;

    # Block known malicious IP ranges
    deny 192.0.2.0/24;
    deny 198.51.100.0/24;
    deny 203.0.113.128/25;

    # Block a cloud provider range used for scraping
    deny 100.64.0.0/10;

    allow all;

    location / {
        proxy_pass http://backend;
    }
}
```

## Blocking at Location Level

Apply blocks only to specific endpoints:

```nginx
server {
    listen 80;
    server_name example.com;

    location /login {
        # Block IPs associated with credential stuffing
        deny 198.51.100.0/24;
        deny 203.0.113.0/26;
        allow all;

        proxy_pass http://auth_backend;
    }

    location /api {
        # Separate block list for API endpoints
        deny 192.0.2.0/24;
        allow all;

        proxy_pass http://api_backend;
    }
}
```

## Maintaining Block Lists in External Files

For large block lists, keep them in separate files for easier management:

```nginx
# /etc/nginx/blocklist.conf

# Updated via automation from threat intelligence feeds
deny 192.0.2.0/24;
deny 198.51.100.0/24;
deny 203.0.113.0/24;
# Add additional ranges here
```

```nginx
server {
    listen 80;

    # Include block list at server or location level
    include /etc/nginx/blocklist.conf;
    allow all;

    location / {
        proxy_pass http://backend;
    }
}
```

Automate updates from threat feeds:

```bash
#!/bin/bash
# /usr/local/bin/update-nginx-blocklist.sh

# Download and format block list
curl -sS https://feeds.example.com/malicious-ips.txt | \
  grep -E '^[0-9]' | \
  awk '{print "deny " $1 ";"}' > /etc/nginx/blocklist.conf

# Test and reload Nginx
nginx -t && nginx -s reload
```

## Returning a Custom Response to Blocked IPs

By default blocked clients receive 403. You can return 444 (connection close) to save bandwidth:

```nginx
server {
    listen 80;

    # Convert the default 403 from deny into 444 (close connection without
    # sending a response) for stealth blocking that saves bandwidth.
    error_page 403 = @blocked;

    location @blocked {
        return 444;
    }

    location / {
        deny 198.51.100.0/24;
        allow all;

        proxy_pass http://backend;
    }
}
```

## Logging Blocked Requests

Monitor what you are blocking:

```nginx
# Define a flag variable for conditional logging (http context).
# access_log skips the entry when the variable is "0" or empty.
map $status $status_is_403 {
    403     1;
    default 0;
}

# Custom log format to track blocked requests
log_format blocked '$remote_addr [$time_local] "$request" '
                   '$status "$http_user_agent"';

server {
    listen 80;

    # Log 403 responses to a separate file for analysis
    access_log /var/log/nginx/blocked.log blocked if=$status_is_403;

    deny 198.51.100.0/24;
    allow all;

    location / {
        proxy_pass http://backend;
    }
}
```

## Conclusion

The Nginx `deny` directive is the fastest way to block IPv4 subnets at the proxy layer before requests consume application resources. Maintain large block lists in external files and automate updates from threat intelligence feeds. For dynamic blocking based on behavior (rate patterns, user agent, etc.), pair with `limit_req_zone` or integrate with fail2ban to generate deny rules automatically.

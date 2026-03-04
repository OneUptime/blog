# How to Fix SELinux Blocking Nginx Reverse Proxy Connections on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SELinux, NGINX, Reverse Proxy, Troubleshooting

Description: Fix SELinux denials that prevent Nginx from making outbound network connections when configured as a reverse proxy on RHEL.

---

When Nginx is configured as a reverse proxy on RHEL, SELinux blocks its outbound network connections by default. This results in 502 Bad Gateway errors even when the backend service is running correctly.

## Identifying the Problem

```bash
# Nginx returns 502 Bad Gateway
# Check the Nginx error log
sudo tail -20 /var/log/nginx/error.log
# "connect() to 127.0.0.1:8080 failed (13: Permission denied)"

# Confirm SELinux is blocking the connection
sudo ausearch -m avc -c nginx --start recent
# avc: denied { name_connect } for ... dest=8080 ... scontext=...httpd_t ...
```

## The Fix: Enable httpd_can_network_connect

```bash
# Check the current state of the boolean
sudo getsebool httpd_can_network_connect
# httpd_can_network_connect --> off

# Enable the boolean permanently (-P flag)
sudo setsebool -P httpd_can_network_connect on

# Verify it is now enabled
sudo getsebool httpd_can_network_connect
# httpd_can_network_connect --> on
```

## If Proxying to a Specific Port Type

For more granular control, you can allow connections only to specific port types.

```bash
# If proxying to a database port
sudo setsebool -P httpd_can_network_connect_db on

# View all httpd-related booleans
sudo getsebool -a | grep httpd
```

## If Using a Non-Standard Backend Port

```bash
# Check if the port is already defined in SELinux
sudo semanage port -l | grep 8080

# If the port is not in the http_port_t list, add it
sudo semanage port -a -t http_port_t -p tcp 8080

# Or if the port is already assigned to another type, modify it
sudo semanage port -m -t http_port_t -p tcp 8080
```

## Example Nginx Reverse Proxy Configuration

```nginx
# /etc/nginx/conf.d/proxy.conf
server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Test the proxy
curl -I http://app.example.com
```

## Verifying No More Denials

```bash
# Check for any remaining AVC denials
sudo ausearch -m avc -c nginx --start recent

# Monitor in real time
sudo tail -f /var/log/audit/audit.log | grep nginx
```

The `httpd_can_network_connect` boolean is the correct fix for reverse proxy configurations. Nginx on RHEL runs under the `httpd_t` SELinux context, which shares the same booleans as Apache.

# Validation Summary: How to Install and Configure Nginx on EC2

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon EC2
- Amazon Linux 2023
- Ubuntu Server
- Nginx
- AWS CLI security group rules
- Certbot / Let's Encrypt
- TLS / HTTP/2
- Linux systemd and logrotate

## Sources Consulted
- AWS CLI `authorize-security-group-ingress` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Amazon Linux 2023 package management documentation: https://docs.aws.amazon.com/linux/al2023/ug/package-management.html
- Amazon Linux 2023 package list, including `nginx`, `certbot`, and `python3-certbot-nginx`: https://docs.aws.amazon.com/linux/al2023/release-notes/all-packages-AL2023.11.html
- Ubuntu Server Nginx configuration documentation: https://ubuntu.com/server/docs/how-to/web-services/configure-nginx/
- Nginx `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx `ngx_http_upstream_module` documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx `ngx_http_limit_req_module` documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Nginx `ngx_http_stub_status_module` documentation: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Certbot Nginx instructions and renewal guidance: https://certbot.eff.org/instructions?ws=nginx&os=ubuntufocal
- Bash redirection behavior: https://www.man7.org/linux/man-pages/man1/bash.1.html

## Issues Found
- The examples used `sudo cat > /root-owned/path << 'EOF'`, which would not work for files under `/etc` or `/var/www` because shell redirection is performed before `sudo` runs `cat`. Changed those examples to `sudo tee ... > /dev/null << 'EOF'`.
- The Amazon Linux 2023 install commands used `yum`. `yum` still points to `dnf` on AL2023, but the current AL2023 documentation uses `dnf`, so the commands now use `sudo dnf`.
- The static-site ownership command always used `nginx:nginx`, which is correct on Amazon Linux but not on Ubuntu. Replaced it with a small user-detection snippet that uses `nginx` when present and `www-data` otherwise.
- The reverse proxy and load balancer examples enabled upstream keepalive but also omitted the empty `Connection` header needed for reusable upstream HTTP connections in current Nginx examples. Added `proxy_set_header Connection "";`.
- The load balancer comment said the configuration would mark a server down after 3 failures, but `proxy_next_upstream_tries 3` limits retry attempts for a request; upstream unavailability is controlled by `server` parameters such as `max_fails` and `fail_timeout`. Updated the comment to describe retries accurately.
- The load-balancing method examples placed `least_conn` and `ip_hash` after the server list. Moved the commented examples before the `server` directives, matching Nginx guidance for alternate methods.
- The Certbot section only showed an Amazon Linux-style package command. Added an Ubuntu package command so the section matches the post's two supported distributions.
- The manual TLS snippet used the deprecated `listen 443 ssl http2` form. Updated it to `listen 443 ssl;` plus `http2 on;` per current Nginx HTTP/2 documentation.
- The manual TLS snippet proxied to `app_backend`, which could fail if the upstream from the earlier example was not present. Changed it to proxy directly to `127.0.0.1:3000` so the SSL example is self-contained.
- The performance-tuning `nginx.conf` hard-coded `user nginx;`, which fails on Ubuntu systems where the package user is typically `www-data`. Updated the shell snippet to detect the correct user and preserve Nginx variables while writing the file.
- The stub status configuration block was fenced as `bash` even though it is Nginx configuration. Changed the fence to `nginx`.
- The logrotate example used `create 0640 nginx adm`, which is not portable across Amazon Linux and Ubuntu. Changed it to `create 0640 root root`, which is safe for Nginx because the master process reopens logs as root.

## Review Notes
- The post is technically relevant and contains substantial implementation detail.
- The security-group examples are syntactically valid AWS CLI examples, but in production readers should restrict CIDR ranges where possible instead of opening ports 80 and 443 to all IPv4 addresses.
- `X-XSS-Protection` is a legacy browser header. It does not break Nginx, but future revisions could remove it or replace that advice with a stronger modern security-header set.

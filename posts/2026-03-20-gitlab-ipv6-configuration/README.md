# How to Configure GitLab for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab, IPv6, DevOps, Git, Nginx, Linux, Self-Hosted

Description: Configure GitLab to serve web UI, Git operations, and APIs over IPv6 by updating the Nginx listener configuration and external URL settings.

---

GitLab (Omnibus package) uses a bundled Nginx. Enabling IPv6 requires ensuring the GitLab hostnames resolve over IPv6 and configuring the bundled Nginx services to listen on IPv6 addresses alongside IPv4.

## Configuring GitLab for IPv6

```ruby
# /etc/gitlab/gitlab.rb

# Set external URL with FQDN that resolves over IPv6

external_url 'https://gitlab.example.com'

# Enable Nginx to listen on IPv6
nginx['listen_addresses'] = ['0.0.0.0', '[::]']

# If using IPv6-only
# nginx['listen_addresses'] = ['[::]']

# HTTPS redirect
nginx['redirect_http_to_https'] = true

# Optional: SSH clone URL settings
gitlab_rails['gitlab_ssh_host'] = 'gitlab.example.com'

# Optional: set a non-default SSH port in clone URLs
gitlab_rails['gitlab_shell_ssh_port'] = 22
```

```bash
# Apply configuration
sudo gitlab-ctl reconfigure

# Check Nginx is listening on IPv6
sudo ss -6 -tlnp | grep nginx

# Reload Nginx
sudo gitlab-ctl restart nginx
```

## SSH over IPv6 for Git Operations

```bash
# Optional: SSH clone URL settings
# /etc/gitlab/gitlab.rb
gitlab_rails['gitlab_ssh_host'] = 'gitlab.example.com'
gitlab_rails['gitlab_shell_ssh_port'] = 22

# Ensure the SSH server GitLab uses is listening on IPv6
# /etc/ssh/sshd_config
# AddressFamily any
# ListenAddress 0.0.0.0
# ListenAddress ::

# Restart SSH
sudo systemctl restart sshd  # use ssh on Debian/Ubuntu

# Verify SSH on IPv6
sudo ss -6 -tlnp | grep :22

# Clone repository over IPv6 SSH
GIT_SSH_COMMAND="ssh -6" git clone git@gitlab.example.com:user/repo.git
# (Requires AAAA record for gitlab.example.com)
```

## GitLab Registry over IPv6

```ruby
# /etc/gitlab/gitlab.rb - Container Registry IPv6

registry_external_url 'https://registry.example.com'
registry_nginx['listen_addresses'] = ['*', '[::]']

# After reconfigure:
# registry.example.com must resolve over IPv6
```

## GitLab Pages over IPv6

```ruby
# /etc/gitlab/gitlab.rb - Pages IPv6

pages_external_url 'https://pages.example.com'
pages_nginx['listen_addresses'] = ['*', '[::]']
```

## GitLab Runner over IPv6

```bash
# Register GitLab Runner to connect to GitLab over IPv6
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.example.com/" \
  --token "$RUNNER_AUTHENTICATION_TOKEN" \
  --executor "shell"

# Verify runner can reach GitLab via IPv6
curl -6 https://gitlab.example.com/api/v4/version
```

## Firewall Rules for GitLab IPv6

```bash
# HTTP/HTTPS for web interface
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# SSH for Git operations
sudo ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT

# Container Registry, if exposed on port 5050
sudo ip6tables -A INPUT -p tcp --dport 5050 -j ACCEPT

# Persist rules according to your distro. For example, on Debian/Ubuntu with iptables-persistent:
sudo ip6tables-save > /etc/ip6tables/rules.v6
```

## Testing GitLab IPv6 Access

```bash
# Test GitLab web over IPv6
curl -6 -I https://gitlab.example.com/

# Test GitLab API over IPv6
curl -6 https://gitlab.example.com/api/v4/version

# Clone via HTTPS
git clone https://gitlab.example.com/group/project.git

# Test SSH connectivity (for Git operations)
ssh -6 -T git@gitlab.example.com
# Expected: Welcome to GitLab, @username!

# Check GitLab logs for IPv6 connections
sudo gitlab-ctl tail nginx | grep "2001:"
```

GitLab Omnibus IPv6 support is enabled by configuring IPv6 listener addresses for each bundled Nginx service in `gitlab.rb` and ensuring the SSH service also listens on IPv6, then applying the changes with `gitlab-ctl reconfigure`.

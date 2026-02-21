# How to Use Ansible Galaxy with Proxy Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Proxy, Networking, Enterprise

Description: Configure Ansible Galaxy to work behind corporate proxies including HTTP, HTTPS, SOCKS proxies, and no-proxy exceptions for internal servers.

---

Corporate networks almost always have proxy servers between your workstation and the internet. If you try to run `ansible-galaxy install` without configuring proxy settings, the connection will either hang or fail with a timeout error. This post covers every way to configure proxy settings for Ansible Galaxy, from environment variables to ansible.cfg settings.

## The Problem

When you run `ansible-galaxy install` behind a proxy without configuration, you will see something like this:

```
$ ansible-galaxy install geerlingguy.nginx
- downloading role 'nginx', owned by geerlingguy
[WARNING]: - geerlingguy.nginx was NOT installed successfully:
Connection refused
```

Or it might just hang indefinitely. The fix is to tell Galaxy how to reach the internet through your proxy.

## Method 1: Environment Variables

The most common and reliable approach is to set the standard proxy environment variables:

```bash
# Set proxy environment variables
export HTTP_PROXY="http://proxy.corp.com:8080"
export HTTPS_PROXY="http://proxy.corp.com:8080"
export NO_PROXY="localhost,127.0.0.1,.corp.com,galaxy.internal.com"

# Now Galaxy commands will use the proxy
ansible-galaxy install geerlingguy.nginx
```

These variables work because `ansible-galaxy` uses Python's `urllib` and `requests` libraries, which respect standard proxy environment variables.

Make these persistent by adding them to your shell profile:

```bash
# Add to ~/.bashrc or ~/.zshrc
export HTTP_PROXY="http://proxy.corp.com:8080"
export HTTPS_PROXY="http://proxy.corp.com:8080"
export NO_PROXY="localhost,127.0.0.1,.corp.com"
```

### Lowercase vs Uppercase

Some tools prefer lowercase, others uppercase. Set both to be safe:

```bash
# Set both cases for maximum compatibility
export HTTP_PROXY="http://proxy.corp.com:8080"
export http_proxy="http://proxy.corp.com:8080"
export HTTPS_PROXY="http://proxy.corp.com:8080"
export https_proxy="http://proxy.corp.com:8080"
export NO_PROXY="localhost,127.0.0.1,.corp.com"
export no_proxy="localhost,127.0.0.1,.corp.com"
```

## Method 2: Proxy with Authentication

Many corporate proxies require username and password authentication:

```bash
# Proxy with authentication
export HTTP_PROXY="http://username:password@proxy.corp.com:8080"
export HTTPS_PROXY="http://username:password@proxy.corp.com:8080"
```

If your password contains special characters, URL-encode them:

```bash
# URL-encode special characters in the password
# @ becomes %40, # becomes %23, etc.
export HTTP_PROXY="http://john.doe:p%40ssw0rd%23@proxy.corp.com:8080"
export HTTPS_PROXY="http://john.doe:p%40ssw0rd%23@proxy.corp.com:8080"
```

For a cleaner approach, keep credentials in a separate file:

```bash
# ~/.proxy-config (permissions: 600)
PROXY_USER="john.doe"
PROXY_PASS="p@ssw0rd#"
PROXY_HOST="proxy.corp.com"
PROXY_PORT="8080"
```

```bash
# Source the config and build the URL
source ~/.proxy-config
ENCODED_PASS=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$PROXY_PASS'))")
export HTTP_PROXY="http://${PROXY_USER}:${ENCODED_PASS}@${PROXY_HOST}:${PROXY_PORT}"
export HTTPS_PROXY="$HTTP_PROXY"
```

## Method 3: SOCKS Proxy

If your network uses a SOCKS proxy (common with SSH tunnels):

```bash
# SOCKS5 proxy
export HTTP_PROXY="socks5://proxy.corp.com:1080"
export HTTPS_PROXY="socks5://proxy.corp.com:1080"

# You may need to install PySocks
pip install pysocks
```

For SSH-based SOCKS proxies, set up a tunnel first:

```bash
# Create a SOCKS proxy through an SSH tunnel
ssh -D 1080 -f -N user@bastion.corp.com

# Point Galaxy through the tunnel
export HTTP_PROXY="socks5://127.0.0.1:1080"
export HTTPS_PROXY="socks5://127.0.0.1:1080"

# Install roles through the tunnel
ansible-galaxy install geerlingguy.nginx
```

## Method 4: Configure in ansible.cfg

You can set proxy-related configuration in `ansible.cfg`, though the options are limited:

```ini
# ansible.cfg - proxy-related settings
[galaxy]
# Server URL (useful if using an internal proxy/mirror)
server = https://galaxy.ansible.com

# Timeout for Galaxy API calls (increase for slow proxies)
timeout = 60

# SSL verification (disable if proxy uses a custom CA)
# Not recommended for production
# ignore_certs = true
```

The `ansible.cfg` approach is less direct than environment variables for proxy configuration. Environment variables remain the primary method.

## Handling SSL Certificate Issues

Corporate proxies often perform SSL inspection, which means they present their own certificate instead of the original server's certificate. This causes SSL verification errors:

```
[WARNING]: - geerlingguy.nginx was NOT installed successfully:
SSL: CERTIFICATE_VERIFY_FAILED
```

### Option A: Install the Corporate CA Certificate

The proper fix is to trust the corporate CA:

```bash
# Add the corporate CA to the system trust store (Ubuntu/Debian)
sudo cp corporate-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates

# For RHEL/CentOS
sudo cp corporate-ca.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust

# Tell Python to use the system certificates
export REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
```

### Option B: Custom CA Bundle

If you cannot modify system certificates:

```bash
# Point to a custom CA bundle
export REQUESTS_CA_BUNDLE=/path/to/corporate-ca-bundle.pem

# Or for pip/Python specifically
export SSL_CERT_FILE=/path/to/corporate-ca-bundle.pem
```

### Option C: Skip Verification (Last Resort)

Only use this for testing, never in production:

```bash
# Skip SSL verification (NOT recommended)
ansible-galaxy install geerlingguy.nginx --ignore-certs
```

## Configuring Proxy for Git-Based Roles

When installing roles from Git repositories through a proxy, Git needs its own proxy configuration:

```bash
# Configure Git to use the proxy
git config --global http.proxy http://proxy.corp.com:8080
git config --global https.proxy http://proxy.corp.com:8080

# Exclude internal Git servers from proxy
git config --global http.https://gitlab.internal.com.proxy ""
```

This ensures that `ansible-galaxy install` works for both Galaxy-hosted roles and Git-hosted roles.

## NO_PROXY Configuration

The `NO_PROXY` variable is critical when you have internal Galaxy servers or Git repos that should be reached directly:

```bash
# Configure exceptions to proxy
export NO_PROXY="localhost,127.0.0.1,.corp.com,.internal.com,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```

Common entries to include in `NO_PROXY`:

- `localhost` and `127.0.0.1` for local connections
- Your internal domain (`.corp.com`)
- Internal Galaxy server hostname
- Internal Git server hostname
- Private network ranges if applicable

## Testing Proxy Configuration

Before running Galaxy commands, verify your proxy works:

```bash
# Test connectivity to Galaxy through the proxy
curl -v https://galaxy.ansible.com/api/ 2>&1 | head -20

# Test with Python (same library Galaxy uses)
python3 -c "
import urllib.request
import os

proxy_handler = urllib.request.ProxyHandler({
    'http': os.environ.get('HTTP_PROXY', ''),
    'https': os.environ.get('HTTPS_PROXY', '')
})
opener = urllib.request.build_opener(proxy_handler)
response = opener.open('https://galaxy.ansible.com/api/')
print(f'Status: {response.status}')
print(f'Connected through proxy successfully')
"
```

## CI/CD Proxy Configuration

In CI/CD environments, set proxy variables at the job level:

```yaml
# .github/workflows/deploy.yml - proxy configuration in CI
---
name: Deploy

jobs:
  deploy:
    runs-on: self-hosted
    env:
      HTTP_PROXY: http://proxy.corp.com:8080
      HTTPS_PROXY: http://proxy.corp.com:8080
      NO_PROXY: localhost,127.0.0.1,.corp.com

    steps:
      - uses: actions/checkout@v4

      - name: Install Galaxy dependencies
        run: |
          ansible-galaxy install -r requirements.yml -p ./roles/
          ansible-galaxy collection install -r requirements.yml -p ./collections/
```

For GitLab CI with a corporate runner:

```yaml
# .gitlab-ci.yml - proxy configuration
---
variables:
  HTTP_PROXY: http://proxy.corp.com:8080
  HTTPS_PROXY: http://proxy.corp.com:8080
  NO_PROXY: localhost,127.0.0.1,.corp.com

deploy:
  script:
    - ansible-galaxy install -r requirements.yml -p ./roles/
    - ansible-playbook -i inventory playbook.yml
```

## Summary

Getting Ansible Galaxy to work behind a proxy primarily involves setting `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` environment variables. For authenticated proxies, embed credentials in the URL (with URL encoding for special characters). Handle SSL inspection by installing corporate CA certificates into the system trust store. Configure Git's proxy settings separately for Git-based role installations. In CI/CD, set proxy variables at the job level. The key is testing connectivity before running Galaxy commands so you can isolate proxy issues from Galaxy issues.

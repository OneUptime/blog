# How to Configure pip and npm to Use an IPv4 Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: pip, npm, Proxy, IPv4, Developer Tool, Package Management

Description: Configure Python pip and Node.js npm package managers to route download traffic through an IPv4 HTTP or HTTPS proxy server.

## Introduction

In corporate environments, developer machines often cannot reach the internet directly and must use a proxy server. Both `pip` and `npm` support proxy configuration through environment variables or configuration files.

## Configuring pip to Use a Proxy

### Option 1: Environment Variables

```bash
# Set proxy for the current shell session

export http_proxy="http://proxy.example.com:3128"
export https_proxy="http://proxy.example.com:3128"
export no_proxy="localhost,127.0.0.1,pypi.internal.example.com"

# Now pip uses the proxy automatically
pip install requests
```

### Option 2: pip Command-Line Flag

```bash
# Use --proxy flag for a single command
pip install requests --proxy http://proxy.example.com:3128

# With authentication
pip install requests --proxy http://user:password@proxy.example.com:3128
```

### Option 3: pip Configuration File

Create or edit `~/.config/pip/pip.conf` (Linux), `~/Library/Application Support/pip/pip.conf` or `~/.config/pip/pip.conf` (macOS), or `%APPDATA%\pip\pip.ini` (Windows):

```ini
# pip.conf
[global]
proxy = http://proxy.example.com:3128
# With authentication
# proxy = http://user:password@proxy.example.com:3128

# Only if you must bypass TLS verification for specific hosts (not recommended);
# prefer installing the corporate CA instead.
# trusted-host =
#     pypi.org
#     pypi.python.org
#     files.pythonhosted.org
```

### Verifying pip Proxy Works

```bash
# Test pip through the proxy
pip install --dry-run --ignore-installed requests
```

## Configuring npm to Use a Proxy

### Option 1: npm config Commands

```bash
# Set HTTP proxy
npm config set proxy http://proxy.example.com:3128

# Set HTTPS proxy
npm config set https-proxy http://proxy.example.com:3128

# With authentication
npm config set proxy http://user:password@proxy.example.com:3128

# Set no-proxy exceptions
npm config set noproxy "localhost,127.0.0.1,registry.internal.example.com"
```

### Option 2: Environment Variables

```bash
export HTTP_PROXY="http://proxy.example.com:3128"
export HTTPS_PROXY="http://proxy.example.com:3128"
export NO_PROXY="localhost,127.0.0.1"

npm install express
```

### Option 3: .npmrc File

Edit `~/.npmrc`:

```ini
# ~/.npmrc
proxy=http://proxy.example.com:3128
https-proxy=http://proxy.example.com:3128
noproxy=localhost,127.0.0.1

# For corporate proxy with SSL interception, add the CA cert
# cafile=/etc/ssl/certs/corporate-ca.crt
# strict-ssl=false  (not recommended)
```

## Removing Proxy Configuration

```bash
# Remove pip proxy (delete from pip.conf or unset env var)
unset http_proxy
unset https_proxy

# Remove npm proxy settings
npm config delete proxy
npm config delete https-proxy
```

## Dealing with Corporate SSL Interception

Some corporate proxies decrypt and re-encrypt HTTPS using a corporate CA certificate:

```bash
# For pip: point pip at the corporate CA bundle
pip install requests --cert /etc/ssl/certs/corporate-ca.crt

# For npm: configure the CA certificate
npm config set cafile /etc/ssl/certs/corporate-ca.crt

# Or add the CA to the system trust store (Ubuntu)
sudo cp corporate-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

## Using a Private Registry with a Proxy

```bash
# pip: use internal PyPI mirror (with pypi.internal.example.com in no_proxy)
pip install mypackage \
  --index-url http://pypi.internal.example.com/simple/

# npm: set internal registry (add it to noproxy if it should bypass the proxy)
npm config set registry http://npm.internal.example.com/
```

## Conclusion

Both `pip` and `npm` support proxy configuration through environment variables or configuration files. Use the configuration file approach for persistent settings and the `no_proxy`/`noproxy` lists to bypass the proxy for internal registries and local addresses.

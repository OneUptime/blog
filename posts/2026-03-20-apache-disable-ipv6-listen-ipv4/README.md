# How to Disable IPv6 in Apache and Listen Only on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, IPv4, IPv6, Listen Directive, Networking, Configuration

Description: Configure Apache HTTP Server to disable IPv6 listening and bind exclusively to IPv4 addresses, ensuring consistent behavior on IPv4-only networks.

## Introduction

Apache listens on all addresses by default. On dual-stack Linux systems, this often appears as `:::80`, and that socket may also accept IPv4 connections through IPv4-mapped IPv6 addresses. Explicitly binding to IPv4 only improves clarity and avoids confusion on IPv4-only infrastructure.

## Understanding Default Apache Behavior

On a typical Linux system with Apache default config:

```bash
# Default: Apache listens on all addresses. On many Linux systems,
# this appears as an IPv6 socket that also accepts IPv4.

sudo ss -tlnp | grep apache2
# LISTEN 0 511 :::80 :::*  users:(("apache2",...))
# On many Linux systems, this :::80 listener accepts BOTH IPv4 and IPv6 connections
```

## Disabling IPv6 and Binding IPv4 Only

Edit `ports.conf` to use explicit IPv4 addresses in the `Listen` directives:

```apache
# /etc/apache2/ports.conf (Ubuntu/Debian)

# Replace generic listeners such as:
# Listen 80
# Listen 443

# With explicit IPv4 listeners:
Listen 0.0.0.0:80
Listen 0.0.0.0:443
```

Virtual host definitions usually do not need to change:

```apache
# /etc/apache2/sites-available/000-default.conf

# <VirtualHost> matching does not control what Apache listens on.
# Leaving *:80 here is fine when Listen is already IPv4-only.
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/html
</VirtualHost>
```

## Disabling IPv6 at the OS Level (Optional)

To disable IPv6 on Linux interfaces as well:

```bash
# /etc/sysctl.conf or /etc/sysctl.d/99-disable-ipv6.conf
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
```

Apply the changes:

```bash
sudo sysctl -p /etc/sysctl.d/99-disable-ipv6.conf
```

## Verifying IPv6 Is Not Listening

```bash
# After restarting Apache, verify only IPv4 is listening
sudo systemctl restart apache2
sudo ss -4 -tlnp | grep apache2

# Desired output (IPv4 only):
# LISTEN 0 511 0.0.0.0:80 0.0.0.0:*  users:(("apache2",...))

# Confirm Apache has no IPv6 listener
sudo ss -6 -tlnp | grep apache2
# Should return no output
```

## About Apache's AddressFamily Directive

Apache HTTP Server does not provide a standard `AddressFamily` directive for this. The supported way is to use explicit IPv4 `Listen` directives:

```apache
Listen 0.0.0.0:80
Listen 0.0.0.0:443
```

## Testing IPv4-Only Access

```bash
# Test IPv4 access (should work)
curl -4 http://example.com

# Test IPv6 access (if the host resolves to an AAAA record, this should fail)
curl -6 http://example.com
# Exact error varies by DNS and network path, but the IPv6 request should not succeed
```

## Conclusion

To make Apache IPv4-only, change `Listen` directives such as `Listen 80` to explicit IPv4 addresses like `Listen 0.0.0.0:80` in `ports.conf`. Name-based `<VirtualHost *:80>` blocks can stay as they are, because `Listen` controls the listener. If you also want IPv6 disabled on Linux interfaces, apply the sysctl settings. Always validate with `ss -4` and `ss -6` after restarting to confirm Apache is listening only on IPv4.

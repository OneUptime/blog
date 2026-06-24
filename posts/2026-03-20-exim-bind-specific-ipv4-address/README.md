# How to Set Up Exim to Bind to a Specific IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Exim, IPv4, Email, SMTP, Configuration, Linux, Binding

Description: Learn how to configure Exim to listen and send email on a specific IPv4 address using the local_interfaces and smtp_bind_address directives.

---

On multi-homed servers with multiple IPv4 addresses, you may need Exim to listen on and originate connections from a specific IP - for instance, to ensure email comes from an IP with proper PTR/SPF records.

## Configuring the Listening Address

The `local_interfaces` option in Exim's main configuration controls which IP:port combinations Exim listens on.

```text
# /etc/exim4/exim4.conf.template (or /etc/exim4/conf.d/main/02_exim4-config_options)

# Listen only on a specific IPv4 address on the default SMTP port (25)

local_interfaces = 192.168.1.10

# Listen on multiple addresses (separated by colon-delimited list)
# local_interfaces = 192.168.1.10 : 127.0.0.1

# Listen on all IPv4 interfaces (no IPv6)
# local_interfaces = 0.0.0.0
```

## Binding Outbound Connections to a Specific IPv4 Address

The `interface` option on Exim's `smtp` transport sets the source IP for outgoing SMTP connections.

```text
# /etc/exim4/exim4.conf.template

remote_smtp:
  driver = smtp
  interface = 203.0.113.10
```

This ensures outbound SMTP connections originate from the expected IP, so receiving servers evaluate SPF and reverse DNS against that address.

## Debian/Ubuntu: Split Configuration

On Debian-based systems, Exim uses a split configuration in `/etc/exim4/conf.d/`. Add the listener setting to the main options file and the outbound binding to the SMTP transport. If your system relays through a smarthost, make the same transport change in `30_exim4-config_remote_smtp_smarthost`.

```bash
# Edit the main options file
nano /etc/exim4/conf.d/main/02_exim4-config_options

# Edit the outbound SMTP transport
nano /etc/exim4/conf.d/transport/30_exim4-config_remote_smtp
```

```text
# In /etc/exim4/conf.d/main/02_exim4-config_options
local_interfaces = 192.168.1.10 : 127.0.0.1

# In /etc/exim4/conf.d/transport/30_exim4-config_remote_smtp
interface = 192.168.1.10
```

```bash
# Check the generated config from split files
update-exim4.conf --check

# Restart Exim to regenerate the combined config and apply changes
systemctl restart exim4

# Confirm Exim can read the active configuration
exim -bV
```

## Disabling IPv6 in Exim

```text
# /etc/exim4/exim4.conf.template

# Prevent Exim from creating IPv6 listening sockets
local_interfaces = 0.0.0.0

# Disable IPv6 entirely in Exim
disable_ipv6 = true
```

## Verifying the Configuration

```bash
# Check which ports Exim is listening on
ss -tlnp | grep exim

# Test SMTP connection to the specific IPv4 address
telnet 192.168.1.10 25

# Send a test email
echo "Test" | exim -v recipient@example.com

# Check the mail log
tail -f /var/log/exim4/mainlog
```

## Key Takeaways

- `local_interfaces` controls which IP addresses Exim listens on; specify explicit IPv4 addresses to avoid binding to IPv6.
- The smtp transport's `interface` option forces outbound SMTP connections to originate from a specific IPv4 address.
- On Debian, edit `/etc/exim4/conf.d/main/` for listener settings and `/etc/exim4/conf.d/transport/` for outbound SMTP transport settings.
- Set `disable_ipv6 = true` to disable IPv6 in Exim entirely.

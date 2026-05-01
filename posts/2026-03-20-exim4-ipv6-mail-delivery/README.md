# How to Configure Exim4 for IPv6 Mail Delivery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Exim4, IPv6, Email, SMTP, Mail Server, Debian, Linux

Description: Configure Exim4 on Debian/Ubuntu to send and receive email over IPv6 by adjusting listener addresses, routing settings, and outbound interface binding.

## Introduction

Exim4 is the default MTA on Debian-based systems. It supports IPv6 natively, but on Debian/Ubuntu you may need to adjust `/etc/exim4/update-exim4.conf.conf` or the main configuration if listeners are restricted or if you want to bind outbound SMTP to a specific IPv6 source address.

## Checking Current Exim4 IPv6 Status

```bash
# Check what addresses Exim is listening on

ss -tlnp | grep exim

# Check current Exim configuration
exim4 -bP local_interfaces
exim4 -bP daemon_smtp_ports
```

## Enabling IPv6 Listening in Exim4

On Debian/Ubuntu, the debconf-managed Exim4 settings are in:

```bash
sudo nano /etc/exim4/update-exim4.conf.conf
```

Key settings for IPv6:

```ini
# Listen on all interfaces including IPv6 (`::0` means all IPv6 interfaces)
dc_local_interfaces='::0 ; 0.0.0.0'

# Or listen on specific addresses
dc_local_interfaces='127.0.0.1 ; ::1 ; 2001:db8::10'
```

After editing, regenerate the Exim configuration:

```bash
sudo update-exim4.conf
sudo systemctl restart exim4

# Verify Exim is now listening on IPv6
ss -tlnp | grep 25
# Should show an IPv6 listener such as [::]:25 or :::25
```

## Configuring Outbound IPv6 Delivery

To bind outbound SMTP connections to a specific local IPv6 address when Exim is delivering over IPv6, edit the `remote_smtp` transport:

```bash
# Split configuration
sudo nano /etc/exim4/conf.d/transport/30_exim4-config_remote_smtp

# Unsplit configuration
sudo nano /etc/exim4/exim4.conf.template
```

Add the `interface` option to the `remote_smtp` transport:

```exim
remote_smtp:
  driver = smtp
  # Bind outbound IPv6 connections to this local address
  interface = <; 2001:db8::10
  # Enable TLS
  tls_verify_certificates = /etc/ssl/certs/ca-certificates.crt
```

After editing:

```bash
sudo update-exim4.conf
sudo systemctl restart exim4
```

## Configuring exim4 for Split Configuration (Debian)

On Debian, if using split configuration (`dc_use_split_config='true'`):

```bash
# Ensure a local macro file includes IPv6 listener addresses
sudo tee /etc/exim4/conf.d/main/00_local_macros << 'EOF'
MAIN_LOCAL_INTERFACES = <; ::0 ; 0.0.0.0
EOF

sudo update-exim4.conf
sudo systemctl restart exim4
```

## Testing IPv6 Mail Delivery

Send a test message with verbose delivery output:

```bash
# Test delivery to an external address
printf 'Subject: IPv6 Exim test\n\nIPv6 Exim test\n' | exim4 -i -v recipient@gmail.com

# Check the mail log for IPv6 connection details
sudo tail -f /var/log/exim4/mainlog | grep -E '\[[0-9A-Fa-f:]*:[0-9A-Fa-f:]*\]'

# Run a foreground delivery attempt with verbose debug output
printf 'Subject: IPv6 debug test\n\nIPv6 debug test\n' | sudo exim4 -i -odf -d -v recipient@example.com
```

## Exim4 and IPv6 DNS Resolution

Ensure Exim4 and the system resolver can resolve AAAA records for outbound routing:

```bash
# Test Exim DNS lookup for a domain
exim4 -bt recipient@example.com

# Check if Exim resolves AAAA records
dig AAAA alt1.gmail-smtp-in.l.google.com
```

## Monitoring Exim IPv6 Delivery in Logs

```bash
# Watch for IPv6 connections in Exim mainlog
sudo grep -E '\[[0-9A-Fa-f:]*:[0-9A-Fa-f:]*\]' /var/log/exim4/mainlog | tail -20

# Monitor the queue
sudo exim4 -bp | head -20

# Check the retry queue for IPv6 delivery failures
sudo exim4 -bpr | grep -Ei 'ipv6|::'
```

## Troubleshooting

**Exim not listening on IPv6**: Verify `dc_local_interfaces` contains `::0` or an explicit IPv6 address, then run `sudo update-exim4.conf && sudo systemctl restart exim4`.

**Outbound delivery uses IPv4**: Exim's `dnslookup` router prefers AAAA records by default. If delivery still uses IPv4, verify the recipient MX hosts actually have AAAA records and that you have not enabled `ipv4_only`, `ipv4_prefer`, or `dns_ipv4_lookup`; `interface` only chooses the local source address for IPv6 deliveries.

**EHLO name mismatch**: Set `primary_hostname` in Exim config to match the PTR record for your IPv6 address.

## Conclusion

Configuring Exim4 for IPv6 on Debian often involves setting `dc_local_interfaces` to include IPv6 listeners when you do not want the default wildcard behavior, and optionally configuring the `interface` option in `remote_smtp` to bind a specific outbound IPv6 source address. Always verify with `ss` and mail logs that IPv6 is actually being used.

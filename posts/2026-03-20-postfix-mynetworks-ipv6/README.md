# How to Configure Postfix mynetworks with IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postfix, IPv6, Email, SMTP Relay, Mail Server, Security

Description: Configure the Postfix mynetworks parameter to include IPv6 addresses and subnets to control which clients are permitted to relay email through your mail server.

## Introduction

The `mynetworks` parameter in Postfix defines trusted networks whose hosts are permitted to relay email without SASL authentication. If you set `mynetworks` explicitly and your infrastructure includes IPv6 clients, you must include IPv6 CIDR ranges in `mynetworks` to allow them to relay mail.

## Understanding mynetworks

`mynetworks` is generated automatically unless you set it by hand. The generated value depends on `mynetworks_style`; on current Postfix releases the default is typically to trust only the local machine, while older Postfix releases defaulted to trusting directly connected subnets. If you set `mynetworks` explicitly and your servers communicate over IPv6, those addresses must be included, or mail relay will be rejected with a "Relay access denied" error.

## Viewing Current mynetworks

```bash
# Show current mynetworks setting

postconf mynetworks

# Example output on a current Postfix install:
# mynetworks = 127.0.0.0/8 [::1]/128
```

The `[::1]/128` entry is IPv6 loopback. Square brackets are required around IPv6 addresses in this context.

## Adding IPv6 Addresses to mynetworks

Edit `/etc/postfix/main.cf` with specific IPv6 networks:

```bash
# Add IPv6 loopback, a specific host, and a subnet
sudo postconf -e 'mynetworks = 127.0.0.0/8 [::1]/128 [2001:db8::10]/128 [2001:db8::]/48'

# Reload Postfix to apply
sudo systemctl reload postfix
```

## mynetworks Syntax for IPv6

IPv6 addresses in mynetworks must follow this format:

```text
[<ipv6-address>]/<prefix-length>
```

Examples:

```ini
# Allow only the loopback addresses (default minimum)
mynetworks = 127.0.0.0/8 [::1]/128

# Allow a specific IPv6 host (e.g., your web server)
mynetworks = 127.0.0.0/8 [::1]/128 [2001:db8::100]/128

# Allow an entire /64 subnet (e.g., internal office network)
mynetworks = 127.0.0.0/8 [::1]/128 [2001:db8:cafe::]/64

# Allow multiple IPv6 subnets
mynetworks = 127.0.0.0/8 [::1]/128 [2001:db8:1::]/48 [2001:db8:2::]/48
```

## Using a mynetworks File

For large sets of networks, use an external file:

```bash
# Point mynetworks to a file
sudo postconf -e 'mynetworks = /etc/postfix/mynetworks'

# Create the file with IPv4 and IPv6 entries
sudo tee /etc/postfix/mynetworks << 'EOF'
# IPv4 trusted networks
127.0.0.0/8
10.0.0.0/8
192.168.1.0/24

# IPv6 trusted networks
[::1]/128
[2001:db8:10::]/48
[fd00::]/8
EOF

sudo systemctl reload postfix
```

## Testing mynetworks Relay Permission

Verify that an IPv6 client can relay through the server:

```bash
# Test SMTP relay from an IPv6 client (run on the client machine)
telnet -6 2001:db8::1 25

# At the SMTP prompt:
EHLO test.example.com
MAIL FROM:<sender@example.com>
RCPT TO:<recipient@external.com>
DATA
Subject: Test

Test relay over IPv6
.
QUIT
```

Check the mail log on the server:

```bash
sudo grep "relay" /var/log/mail.log | tail -20
```

## Security Considerations

Be conservative with `mynetworks`. Including large IPv6 blocks like `::/0` can turn your server into an open relay for IPv6 clients. Best practices:

- Use the most specific IPv6 CIDR ranges possible
- Require SASL authentication for clients outside your data center
- Monitor logs regularly for unexpected relay attempts

```bash
# Monitor for relay attempts from unexpected sources
sudo grep "NOQUEUE: reject: RCPT from" /var/log/mail.log | grep "Relay access denied" | \
    sed -E 's/.*RCPT from (.*): [45][0-9][0-9] .*/\1/' | sort | uniq -c | sort -rn | head -20
```

## Conclusion

Properly configuring `mynetworks` with IPv6 CIDR notation ensures your IPv6-connected applications and internal hosts can relay email through Postfix while keeping the server secure from unauthorized use. Always use the most specific prefix length you need.

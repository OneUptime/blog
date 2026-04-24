# How to Troubleshoot Postfix Not Sending Over IPv4 When IPv6 Fails

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postfix, IPv4, IPv6, Troubleshooting, Email Delivery, SMTP

Description: Diagnose and fix Postfix mail delivery failures caused by failed IPv6 SMTP connections on dual-stack servers, forcing delivery over IPv4.

## Introduction

On dual-stack servers, Postfix may try IPv6 first, fail (for example, if local IPv6 routing is broken or the remote destination's IPv6 path is unreachable), and delay delivery instead of quickly succeeding over IPv4. On older Postfix versions or with an IPv6-first address preference, mail can remain deferred. This guide diagnoses and resolves these failures.

## Identifying IPv6 Delivery Failures

```bash
# Check the mail queue for deferred messages

sudo postqueue -p

# View detailed error for a specific message
sudo postcat -qe <QUEUE_ID>

# Check the mail log for IPv6 failure patterns
sudo grep "Connection refused\|Connection timed out\|Network unreachable" /var/log/mail.log | tail -20

# IPv6 failure indicators:
# connect to smtp.example.com[2001:db8::1]:25: Connection refused
# connect to smtp.example.com[2001:db8::1]:25: Network unreachable
# After this, delivery may remain deferred instead of quickly succeeding over IPv4
```

## Immediate Fix: Force IPv4

```bash
# /etc/postfix/main.cf
inet_protocols = ipv4

# Apply immediately (inet_protocols changes require a stop/start)
sudo postfix stop
sudo postfix start

# Flush deferred queue (retry all deferred messages)
sudo postqueue -f

# Watch log for successful delivery over IPv4
sudo tail -f /var/log/mail.log
# Should see: connect to smtp.example.com[203.0.113.x]:25
```

## Check if IPv6 Is Causing Issues

```bash
# Find one MX host for the recipient domain
MX_HOST="$(dig +short mx gmail.com | sort -n | awk 'NR==1 {sub(/\.$/, "", $2); print $2}')"

# Test IPv6 connectivity to that MX host
ping -6 "$MX_HOST"

# Test if IPv6 SMTP works
telnet -6 "$MX_HOST" 25
# If IPv6 fails here while IPv4 succeeds, the IPv6 path or remote IPv6 endpoint is the issue

# Test IPv4 SMTP to the same MX host
telnet -4 "$MX_HOST" 25
# Should connect successfully if IPv4 delivery is available
```

## Check MX Resolution and Address Preference

If you keep both IPv4 and IPv6 enabled, Postfix documents `smtp_address_preference = any` with `smtp_balance_inet_protocols = yes` as the safe setting. Verify the current Postfix address preference and the MX host's A/AAAA records:

```bash
# Show current Postfix address selection settings
postconf smtp_address_preference smtp_balance_inet_protocols

# Check the recipient domain's MX host and its IP records
MX_HOST="$(dig +short mx gmail.com | sort -n | awk 'NR==1 {sub(/\.$/, "", $2); print $2}')"
dig +short "$MX_HOST" A
dig +short "$MX_HOST" AAAA
```

## Debugging Delivery

```bash
# Enable verbose SMTP delivery logs temporarily for one MX host
MX_HOST="$(dig +short mx gmail.com | sort -n | awk 'NR==1 {sub(/\.$/, "", $2); print $2}')"
postconf -e "debug_peer_list = $MX_HOST"
postconf -e "debug_peer_level = 3"
sudo postfix reload

# Send a test email and watch verbose log
printf 'Subject: Debug\n\nDebug test\n' | sendmail -v test@gmail.com
sudo tail -f /var/log/mail.log

# Disable debug after investigation
postconf -e "debug_peer_list ="
postconf -e "debug_peer_level = 2"
sudo postfix reload
```

## Force IPv4 for Specific Destination Domains

Use transport maps for per-domain IPv4 forcing:

```bash
# /etc/postfix/main.cf
transport_maps = hash:/etc/postfix/transport

# /etc/postfix/transport
gmail.com     smtp4:
yahoo.com     smtp4:
hotmail.com   smtp4:
```

```bash
# /etc/postfix/master.cf
smtp4 unix - - n - - smtp
    -o inet_protocols=ipv4
```

```bash
sudo postmap hash:/etc/postfix/transport
sudo postfix reload
```

## Conclusion

Postfix IPv6 delivery failures can be worked around by setting `inet_protocols = ipv4` in `main.cf` and restarting Postfix. This disables IPv6 for Postfix. After fixing, run `postqueue -f` to immediately retry deferred messages. For targeted fixes without disabling IPv6 globally, use transport maps with a custom `smtp4` service definition that overrides `inet_protocols` per destination domain.

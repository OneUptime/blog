# How to Configure Sendmail DaemonPortOptions for IPv4 Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sendmail, IPv4, DaemonPortOptions, SMTP, Email, Configuration, Linux

Description: Learn how to configure Sendmail's DaemonPortOptions directive to bind the SMTP daemon to specific IPv4 addresses and ports.

---

Sendmail's `DaemonPortOptions` controls which IP address and port the SMTP daemon listens on. Sendmail can listen on both IPv4 and IPv6 when configured with separate daemon options; using `DaemonPortOptions` you can restrict it to specific IPv4 addresses.

## Default Behavior

Without explicit `DAEMON_OPTIONS` entries in the m4 configuration, Sendmail creates default IPv4 listeners for SMTP and MSA. IPv6 listeners require separate `Family=inet6` entries. To restrict this, add `DaemonPortOptions` entries to the Sendmail configuration.

## Locating the Sendmail Configuration

Sendmail commonly uses two configuration files:
- `/etc/mail/sendmail.cf` - generated text config (avoid editing directly when using `sendmail.mc`)
- `/etc/mail/sendmail.mc` - human-readable source (edit this, then recompile)

## Configuring DaemonPortOptions in sendmail.mc

```m4
# /etc/mail/sendmail.mc

# --- Bind SMTP to a specific IPv4 address on port 25 ---

DAEMON_OPTIONS(`Port=smtp, Addr=192.168.1.10, Name=MTA, Family=inet')dnl

# --- Also listen on localhost for local delivery ---
DAEMON_OPTIONS(`Port=smtp, Addr=127.0.0.1, Name=MTA-loopback, Family=inet')dnl

# --- Submission port 587 on the same IPv4 address ---
DAEMON_OPTIONS(`Port=submission, Addr=192.168.1.10, Name=MSA, M=Ea, Family=inet')dnl
```

Field meanings:
- `Port=smtp` - Port 25 (or use a number like `Port=587`)
- `Addr=` - IPv4 address to bind to (`0.0.0.0` for all interfaces)
- `Name=` - Descriptive name used in logs
- `Family=inet` - IPv4 only (use `inet6` for IPv6)
- `M=Ea` - MSA flags: `E` = no ETRN, `a` = require authentication

## Listen on All IPv4 Interfaces

```m4
# Bind to all IPv4 addresses (not IPv6)
DAEMON_OPTIONS(`Port=smtp, Addr=0.0.0.0, Name=MTA, Family=inet')dnl
```

## Recompiling the Configuration

After editing `sendmail.mc`, recompile it to generate `sendmail.cf`:

```bash
# Recompile the configuration
m4 /etc/mail/sendmail.mc > /etc/mail/sendmail.cf

# Or use the makefile provided by the sendmail package
cd /etc/mail && make

# Verify the generated config contains the DaemonPortOptions
grep "DaemonPortOptions" /etc/mail/sendmail.cf
```

## Restarting Sendmail

```bash
# Restart Sendmail to apply changes
systemctl restart sendmail

# Verify it's listening on the correct IPv4 address and port
ss -tlnp | grep sendmail
# Expected: 192.168.1.10:25, 127.0.0.1:25, and 192.168.1.10:587
```

## Testing Connectivity

```bash
# Test SMTP connection to the bound IPv4 address
telnet 192.168.1.10 25

# Send a test email from the command line
echo "Test from Sendmail" | sendmail -v recipient@example.com

# Watch the mail log
tail -f /var/log/maillog
```

## Key Takeaways

- `DaemonPortOptions` entries in `sendmail.mc` control IPv4 binding; use `Family=inet` for IPv4-only.
- If your system uses `sendmail.mc`, edit it and regenerate `sendmail.cf` instead of hand-editing the generated config.
- Add separate `DAEMON_OPTIONS` lines for port 25, port 587, and loopback as needed.
- Use `ss -tlnp | grep sendmail` to confirm Sendmail is bound to the correct IPv4 addresses after restart.

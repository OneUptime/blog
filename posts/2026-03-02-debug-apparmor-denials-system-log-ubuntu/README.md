# How to Debug AppArmor Denials in the System Log on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, AppArmor, Security, Linux, Logging

Description: Learn how to read, interpret, and debug AppArmor denial messages in the Ubuntu system log to fix permission issues without disabling security.

---

AppArmor is Ubuntu's mandatory access control (MAC) system. It restricts programs to a limited set of resources using profiles. When a program tries to access something outside its profile, AppArmor logs a denial. If you've ever seen an application fail silently or behave unexpectedly, an AppArmor denial might be the cause.

This post covers how to find, read, and act on those denial messages.

## Where AppArmor Logs Denials

AppArmor writes denial messages to the kernel audit log. On Ubuntu systems, this shows up in multiple places depending on what's installed:

- `/var/log/syslog` - general system log
- `/var/log/kern.log` - kernel messages
- `/var/log/audit/audit.log` - if `auditd` is installed
- `journalctl` output from systemd

The most reliable place to check is the kernel log via journalctl:

```bash
# Show all AppArmor denial messages from the current boot
sudo journalctl -k | grep -i "apparmor"

# Show only DENIED entries
sudo journalctl -k | grep "apparmor.*DENIED"

# Follow live denials (useful during testing)
sudo journalctl -k -f | grep "apparmor"
```

If you have `auditd` installed:

```bash
# Check audit log for AppArmor denials
sudo ausearch -m AVC | grep apparmor

# Filter by time range
sudo ausearch -m AVC --start recent | grep apparmor
```

## Reading a Denial Message

A typical AppArmor denial looks like this in the log:

```
kernel: audit: type=1400 audit(1709000000.123:456): apparmor="DENIED" operation="open" profile="/usr/bin/myapp" name="/etc/shadow" pid=1234 comm="myapp" requested_mask="r" denied_mask="r" fsuid=1000 ouid=0
```

Breaking this down:

- `apparmor="DENIED"` - the action was blocked
- `operation="open"` - what operation was attempted (open, exec, connect, etc.)
- `profile="/usr/bin/myapp"` - the AppArmor profile that denied the request
- `name="/etc/shadow"` - the resource that was being accessed
- `requested_mask="r"` - what permission was requested (r=read, w=write, x=execute, a=append, l=link, k=lock)
- `denied_mask="r"` - what was denied
- `pid=1234` - the process ID
- `comm="myapp"` - the command name
- `fsuid=1000` - the filesystem UID of the process

### Common Operation Types

| Operation | Meaning |
|-----------|---------|
| `open` | File open attempt |
| `exec` | Program execution |
| `connect` | Network connection |
| `bind` | Socket bind |
| `signal` | Sending a signal to another process |
| `ptrace` | Process tracing |
| `mount` | Filesystem mount |

## Using aa-notify for Real-Time Alerts

The `apparmor-notify` package provides a tool that shows denials as desktop notifications:

```bash
# Install apparmor-utils if not already installed
sudo apt install apparmor-utils apparmor-notify

# Run aa-notify to see recent denials
sudo aa-notify -s 1 -v

# Show denials from the past day
sudo aa-notify -s 24 -v
```

## Filtering Logs for Specific Applications

When debugging a specific application, filter by the profile name or command:

```bash
# Find denials for nginx
sudo journalctl -k | grep "apparmor.*DENIED" | grep "nginx"

# Find denials for a specific profile path
sudo journalctl -k | grep "profile=\"/usr/sbin/nginx\""

# Find denials involving a specific file path
sudo journalctl -k | grep "apparmor.*DENIED" | grep "/etc/ssl"
```

## Using aa-logprof to Analyze Denials

`aa-logprof` is the standard tool for reviewing denials and updating profiles:

```bash
# Install apparmor-utils
sudo apt install apparmor-utils

# Run aa-logprof to interactively process denial logs
sudo aa-logprof

# Process a specific log file
sudo aa-logprof -f /var/log/syslog
```

`aa-logprof` reads denial messages, groups them by profile, and prompts you to allow or deny each one. When you approve a rule, it adds it to the profile automatically.

### What aa-logprof Asks You

For each denial, you'll see something like:

```
Profile:  /usr/bin/myapp
Path:     /etc/myapp/config.json
Mode:     r
Severity: 4

[1 - /etc/myapp/config.json]
[2 - /etc/myapp/]
[3 - /etc/**]
[(A)llow] / (D)eny / (I)gnore / (G)lob / Glob with (E)xt / (N)ew / Audi(t) / (O)wner / Abo(r)t / (F)inish
```

Choosing the appropriate glob level lets you write a rule that's broad enough to work but narrow enough to stay secure.

## Checking Profile Status

Before debugging, confirm the profile is actually loaded and enforcing:

```bash
# List all loaded profiles and their status
sudo aa-status

# Check status of a specific profile
sudo aa-status | grep "nginx"

# Show profiles in enforce mode
sudo apparmor_status | grep enforce
```

Profile modes:
- `enforce` - actively blocks and logs denials
- `complain` - only logs, does not block (useful for debugging)
- `disabled` - not loaded at all

## Switching to Complain Mode for Debugging

If an application is broken and you need to quickly test whether AppArmor is the cause, switch the profile to complain mode:

```bash
# Put a specific profile in complain mode
sudo aa-complain /usr/bin/myapp

# Put nginx profile in complain mode
sudo aa-complain /etc/apparmor.d/usr.sbin.nginx

# Switch back to enforce mode
sudo aa-enforce /usr/bin/myapp
```

In complain mode, denials are logged but not enforced. If your application works in complain mode but not enforce mode, AppArmor is definitely the problem.

## Practical Debugging Workflow

A systematic approach to diagnosing AppArmor issues:

```bash
# Step 1: Check if AppArmor is running
sudo systemctl status apparmor

# Step 2: Reproduce the issue and capture logs
sudo journalctl -k -f | grep apparmor &

# Step 3: Run the failing command
/usr/bin/myapp --some-option

# Step 4: Review what was denied
sudo journalctl -k | grep "apparmor.*DENIED" | tail -20

# Step 5: Use aa-logprof to update the profile
sudo aa-logprof

# Step 6: Save and reload the profile
sudo apparmor_parser -r /etc/apparmor.d/usr.bin.myapp

# Step 7: Test the application again
/usr/bin/myapp --some-option
```

## Common Denial Scenarios and Fixes

### Application can't read its config file

```
apparmor="DENIED" operation="open" name="/etc/myapp/config.conf" requested_mask="r"
```

Add a read rule to the profile:

```
# In /etc/apparmor.d/usr.bin.myapp
/etc/myapp/config.conf r,
```

### Application can't connect to the network

```
apparmor="DENIED" operation="connect" profile="/usr/bin/myapp"
```

Add network access to the profile:

```
# Allow outbound TCP connections
network inet tcp,
network inet6 tcp,
```

### Application can't execute a helper binary

```
apparmor="DENIED" operation="exec" name="/usr/bin/helper" requested_mask="x"
```

Add an exec rule:

```
/usr/bin/helper Px,   # execute with helper's own profile
# or
/usr/bin/helper ix,   # execute inheriting current profile
```

## Reload Profiles After Changes

After editing any profile, reload it:

```bash
# Reload a specific profile
sudo apparmor_parser -r /etc/apparmor.d/usr.bin.myapp

# Reload all profiles
sudo systemctl reload apparmor

# Check for syntax errors before reloading
sudo apparmor_parser -p /etc/apparmor.d/usr.bin.myapp
```

AppArmor denials are often the silent culprit behind application failures on Ubuntu. The key is knowing where to look and how to read the log output. With `journalctl`, `aa-logprof`, and a bit of patience, you can track down and fix most denial issues without weakening your system's security posture.

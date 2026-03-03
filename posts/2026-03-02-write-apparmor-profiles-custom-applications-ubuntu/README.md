# How to Write AppArmor Profiles for Custom Applications on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, AppArmor, Security, Linux, Hardening

Description: A practical guide to writing custom AppArmor profiles for your own applications on Ubuntu, covering profile syntax, file permissions, network rules, and testing.

---

AppArmor ships with profiles for many common system applications on Ubuntu, but if you're running a custom application or a third-party binary without a profile, it runs completely unconfined. Writing a profile for your application adds a meaningful layer of defense-in-depth - if the application is compromised, the attacker's access is limited to what the profile allows.

This guide walks through writing AppArmor profiles from scratch.

## AppArmor Profile Basics

Profiles live in `/etc/apparmor.d/`. The filename is typically the full path of the binary with slashes replaced by dots:

- Binary: `/usr/local/bin/myapp`
- Profile filename: `usr.local.bin.myapp`

A minimal profile looks like this:

```text
#include <tunables/global>

/usr/local/bin/myapp {
  #include <abstractions/base>

  # File access rules go here
  /etc/myapp/config.json r,

  # Network access
  network inet tcp,
}
```

The profile name matches the binary path. Everything inside the braces defines what the application is allowed to do.

## Profile Syntax

### File Permission Rules

File rules follow this pattern:

```text
/path/to/file permissions,
```

Common permission flags:

| Flag | Meaning |
|------|---------|
| `r` | Read |
| `w` | Write |
| `a` | Append (write without truncate) |
| `x` | Execute |
| `l` | Link (hard link) |
| `k` | File locking |
| `m` | Memory map (mmap) |

Examples:

```text
# Read-only access to a config file
/etc/myapp/config.conf r,

# Read and write to a data directory
/var/lib/myapp/** rw,

# Write to a log file
/var/log/myapp.log w,

# Allow appending to logs (safer than full write)
/var/log/myapp/*.log a,

# Execute a helper script
/usr/lib/myapp/helper.sh ix,
```

### Glob Patterns

AppArmor supports glob patterns in file paths:

```text
# Match any file in a directory (not recursive)
/etc/myapp/* r,

# Match recursively
/var/lib/myapp/** rw,

# Match files with a specific extension
/etc/myapp/*.conf r,

# Match any directory path starting with /proc
/proc/*/net/if_inet6 r,
```

### Owner Matching

Use `owner` to restrict rules to files owned by the process's user:

```text
# Only allow writing files the user owns
owner /home/**/.myapp/** rw,

# Allow reading user config
owner @{HOME}/.config/myapp/ r,
owner @{HOME}/.config/myapp/** r,
```

`@{HOME}` is a variable defined in tunables that expands to the user's home directory.

### Capabilities

Linux capabilities control what privileged operations a process can perform:

```text
# Allow binding to ports below 1024
capability net_bind_service,

# Allow changing file ownership
capability chown,

# Allow killing other processes
capability kill,

# Allow setting file capabilities
capability setfcap,
```

### Network Rules

```text
# Allow all network access
network,

# Allow only outbound TCP over IPv4
network inet tcp,

# Allow UDP
network inet udp,

# Allow Unix domain sockets
network unix,
```

### Signal Rules

```text
# Allow sending SIGTERM to processes in the same profile
signal (send) set=(term) peer=/usr/local/bin/myapp,

# Allow receiving signals
signal (receive) set=(hup term) peer=/usr/bin/systemd,
```

## Using Abstractions

AppArmor provides pre-built abstraction snippets for common patterns. Including them saves writing dozens of rules manually:

```text
# Basic rules almost every application needs
#include <abstractions/base>

# For applications that use name resolution (DNS)
#include <abstractions/nameservice>

# For applications that use SSL/TLS
#include <abstractions/ssl_certs>

# For applications that use Python
#include <abstractions/python>

# For applications that open a user interface
#include <abstractions/X>

# For desktop applications
#include <abstractions/gnome>
```

View available abstractions:

```bash
ls /etc/apparmor.d/abstractions/
```

## Writing a Profile Step by Step

### Step 1: Create the Profile in Complain Mode

Start with a minimal profile in complain mode so the application can run while you collect what permissions it actually needs:

```bash
# Create a new empty profile
sudo nano /etc/apparmor.d/usr.local.bin.myapp
```

```text
#include <tunables/global>

/usr/local/bin/myapp {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  # Temporary: allow all file reads to get started
  # We'll narrow this down after observing behavior
}
```

Load it in complain mode:

```bash
sudo apparmor_parser -r /etc/apparmor.d/usr.local.bin.myapp
sudo aa-complain /usr/local/bin/myapp
```

### Step 2: Run the Application and Collect Denials

```bash
# Run the application through its normal workflows
/usr/local/bin/myapp --config /etc/myapp/config.json

# Check what was logged
sudo journalctl -k | grep "apparmor" | grep "myapp" | tail -30
```

### Step 3: Use aa-logprof to Build Rules

```bash
sudo aa-logprof
```

`aa-logprof` reads the denial logs and interactively asks you to approve or deny each access. It suggests appropriate rules and adds them to the profile automatically.

### Step 4: Review and Tighten the Profile

After `aa-logprof` runs, review what was added:

```bash
sudo cat /etc/apparmor.d/usr.local.bin.myapp
```

Look for overly broad rules and tighten them:

```text
# Too broad - allows reading everything under /etc
/etc/** r,

# Better - only what the app actually needs
/etc/myapp/config.json r,
/etc/ssl/certs/** r,
/etc/resolv.conf r,
```

### Step 5: Switch to Enforce Mode and Test

```bash
# Switch to enforce mode
sudo aa-enforce /usr/local/bin/myapp

# Test the application thoroughly
/usr/local/bin/myapp --config /etc/myapp/config.json

# Watch for any new denials
sudo journalctl -k -f | grep "apparmor.*DENIED"
```

If new denials appear, go back to complain mode, run `aa-logprof`, and repeat.

## A Complete Example Profile

Here's a complete profile for a hypothetical web service:

```text
#include <tunables/global>

/usr/local/bin/webservice {
  #include <abstractions/base>
  #include <abstractions/nameservice>
  #include <abstractions/ssl_certs>

  # Binary itself
  /usr/local/bin/webservice mr,

  # Config files (read-only)
  /etc/webservice/ r,
  /etc/webservice/** r,

  # Data directory (read-write)
  /var/lib/webservice/ r,
  /var/lib/webservice/** rw,

  # Log files (append-only)
  /var/log/webservice/ r,
  /var/log/webservice/*.log a,

  # PID file
  /run/webservice.pid rw,

  # Temp files
  /tmp/webservice-* rw,

  # Network access - bind to port 8080
  network inet tcp,
  network inet6 tcp,
  capability net_bind_service,

  # Shared libraries
  /usr/lib/** mr,
  /lib/** mr,

  # Proc filesystem for self-inspection
  /proc/self/fd/ r,
  /proc/self/maps r,
  /proc/self/status r,

  # Allow reading system time zone info
  /etc/localtime r,
  /usr/share/zoneinfo/** r,
}
```

## Testing Profile Syntax

Before loading a profile, check it for syntax errors:

```bash
# Parse and check for errors without loading
sudo apparmor_parser -p /etc/apparmor.d/usr.local.bin.myapp

# Parse, check, and load
sudo apparmor_parser -r /etc/apparmor.d/usr.local.bin.myapp
```

## Working with Child Profiles (Hats)

For applications that fork child processes, you can use "hats" to define different profiles for different parts of the application:

```text
/usr/local/bin/myapp {
  #include <abstractions/base>

  # Main application rules
  /etc/myapp/** r,

  # Child process (hat) for the worker subprocess
  ^worker {
    #include <abstractions/base>
    /var/lib/myapp/data/** rw,
    network inet tcp,
  }
}
```

The main application can "change hat" to the worker profile using the `aa_change_hat()` API call.

## Common Mistakes to Avoid

**Forgetting the trailing comma** - every rule must end with a comma. Missing commas cause parse errors.

**Using `rw` when `r` is enough** - give the minimum required permissions.

**Forgetting to allow the binary itself** - the application needs to be able to read its own executable:

```text
/usr/local/bin/myapp mr,
```

**Not including abstractions/base** - most applications need basic system access (proc, lib lookups) provided by this abstraction.

Writing a solid AppArmor profile takes some iteration, but the workflow of starting in complain mode, using `aa-logprof`, and progressively tightening the profile is reliable. The result is a confined application that can only do what it's supposed to do.

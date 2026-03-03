# How to Use aa-genprof to Auto-Generate AppArmor Profiles on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, AppArmor, Security, Linux

Description: Learn how to use aa-genprof to automatically generate AppArmor profiles for applications on Ubuntu by observing their runtime behavior.

---

Writing an AppArmor profile from scratch requires knowing exactly which files, capabilities, and network resources an application needs. For complex applications, that can mean hundreds of rules. `aa-genprof` automates the tedious part - it watches your application run, captures everything it tries to access, and builds the initial profile for you.

This guide covers how to use `aa-genprof` effectively.

## What aa-genprof Does

`aa-genprof` is an interactive tool that:

1. Creates an empty profile for your application
2. Puts the profile in complain mode (log-only)
3. Prompts you to run the application through its workflows
4. Reads the log entries generated during that run
5. Asks you to approve or deny each access interactively
6. Builds the profile based on your answers

The result is a profile tailored to what the application actually does, not a generic one based on guesswork.

## Prerequisites

Install `apparmor-utils`:

```bash
# Install the tools package
sudo apt update
sudo apt install apparmor-utils

# Verify aa-genprof is available
which aa-genprof
aa-genprof --help
```

Also make sure AppArmor is running:

```bash
sudo systemctl status apparmor
sudo aa-status | head -5
```

## Basic Usage

The simplest invocation:

```bash
# Generate a profile for an application
sudo aa-genprof /usr/local/bin/myapp
```

`aa-genprof` takes the full path to the binary as its argument.

### What You See When It Starts

```text
Writing updated profile for /usr/local/bin/myapp.
Setting /usr/local/bin/myapp to complain mode.

Before you begin, you may wish to check if a
profile already exists for the application you
wish to confine. See the following wiki page for
more information:
https://wiki.ubuntu.com/AppArmor

[(S)can system log for AppArmor events] / (F)inish
```

At this point, leave `aa-genprof` running and open another terminal to run your application.

## Running the Application During Profile Generation

In a second terminal, run your application through all its normal workflows:

```bash
# Open a second terminal and run the application
/usr/local/bin/myapp --config /etc/myapp/config.json

# If it's a daemon, start it and test its functionality
sudo systemctl start myapp
# Then use the application normally - make requests, trigger all code paths

# For a web app
curl http://localhost:8080/api/health
curl http://localhost:8080/api/data

# For a database tool
myapp query --database production

# Stop when done with all workflows
```

The more thoroughly you exercise the application, the more complete the generated profile will be. Cover startup, normal operation, error handling, and shutdown.

## Processing the Log Entries

Once you've run the application, go back to the `aa-genprof` terminal and press `S` to scan the system log:

```text
[(S)can system log for AppArmor events] / (F)inish
S
```

`aa-genprof` will then present each access event and ask what to do with it:

```text
Profile:  /usr/local/bin/myapp
Path:     /etc/myapp/config.json
Mode:     r
Severity: 4

  1 - #include <abstractions/apache2-common>
 [2 - /etc/myapp/config.json]
  3 - /etc/myapp/
  4 - /etc/myapp/**
  5 - /etc/**

(A)llow / [(D)eny] / (I)gnore / (G)lob / Glob with (E)xt / (N)ew / Abo(r)t / (F)inish
```

### Choosing the Right Option

For each access, you need to decide how to handle it:

**Allow (A)** - Creates a specific rule for this exact path. Good for config files, binaries.

**Glob (G)** - Creates a broader rule. If the app needs `/etc/myapp/config.json`, globbing to `/etc/myapp/*` allows all files in that directory.

**Glob with Ext (E)** - Preserves the file extension in the glob. `/etc/myapp/*.json` instead of `/etc/myapp/*`.

**Deny (D)** - Adds an explicit deny rule. The access is still blocked, but it won't generate log noise.

**Ignore (I)** - Skips this access without adding any rule. The access remains blocked.

**New (N)** - Lets you type a custom rule manually.

**Abstraction (use the number)** - If an abstraction covers this access, select it by number. Abstractions bundle related rules together.

### Decision Guidelines

```text
# Specific config files the app needs - Allow with specific path
Path: /etc/myapp/config.json  -> Allow (rule: /etc/myapp/config.json r,)

# System libraries - use an abstraction
Path: /usr/lib/x86_64-linux-gnu/libssl.so -> use abstractions/ssl

# Temp files with unique names - glob them
Path: /tmp/myapp-12345.tmp -> Glob -> /tmp/myapp-*.tmp

# Files in a data directory - glob recursively
Path: /var/lib/myapp/data/users.db -> Glob -> /var/lib/myapp/**

# Proc filesystem entries for self-inspection - Allow
Path: /proc/self/status -> Allow

# Suspicious paths (e.g., /etc/shadow) - Deny
Path: /etc/shadow -> Deny
```

## Handling Network Access

When the application makes network connections, `aa-genprof` will ask about those too:

```text
Profile:  /usr/local/bin/myapp
Network:  inet tcp
Severity: 6

[(A)llow] / (D)eny
```

For applications that need to make or accept TCP connections, allow network access. You can tighten this to specific addresses after the initial profile is done.

## Handling Capability Requests

Some operations require Linux capabilities:

```text
Profile:   /usr/local/bin/myapp
Capability: net_bind_service
Severity:  8

[(A)llow] / (D)eny
```

Only allow capabilities the application genuinely needs. `net_bind_service` is required to bind to ports below 1024. Others like `sys_admin` or `sys_ptrace` should be denied unless there's a clear reason.

## Finishing the Initial Scan

After handling all events from one run, `aa-genprof` asks if you want to scan again:

```text
[(S)can system log for AppArmor events] / (F)inish
```

If you want to exercise more of the application's functionality, go back to the application terminal, run more commands, then come back and press `S` again to process the new events.

When you're satisfied, press `F` to finish:

```text
Writing updated profile for /usr/local/bin/myapp.
Reloaded AppArmor profiles in enforce mode.
```

## After Generation: Review and Test

The generated profile is now in enforce mode. Review what was created:

```bash
# View the generated profile
sudo cat /etc/apparmor.d/usr.local.bin.myapp

# Check the current status
sudo aa-status | grep myapp
```

Run the application again and watch for denials you might have missed:

```bash
# Watch for new denials
sudo journalctl -k -f | grep "apparmor.*DENIED" | grep myapp

# Run the application
/usr/local/bin/myapp --config /etc/myapp/config.json
```

If new denials appear, use `aa-logprof` to process them:

```bash
# Process any new denials interactively
sudo aa-logprof
```

## Generating a Profile for a Running Service

For daemons that run as systemd services, the process is slightly different:

```bash
# Start the genprof session
sudo aa-genprof /usr/sbin/myserviced &

# Start the service
sudo systemctl start myserviced

# Run test workloads against the service
curl http://localhost:8080/test

# Send various requests to exercise all code paths

# Stop the service when done
sudo systemctl stop myserviced

# Process the logs
# Bring aa-genprof to foreground
fg
# Then press S, handle events, press F to finish
```

## Common Issues

### aa-genprof Not Finding Log Entries

If pressing `S` shows no events:

```bash
# Check if AppArmor is actually logging
sudo journalctl -k | grep apparmor | tail -10

# Make sure the profile is in complain mode
sudo aa-status | grep myapp

# Check if auditd might be capturing logs separately
sudo ausearch -m AVC | grep myapp
```

### Application Fails to Start During Profiling

If the application won't run even in complain mode:

```bash
# Check for error messages
sudo journalctl -u myapp --since "5 minutes ago"

# Complain mode shouldn't block anything - if it's failing, it's not AppArmor
# Check permissions on the binary itself
ls -la /usr/local/bin/myapp
```

### Profile Is Too Permissive After Generation

If `aa-genprof` generated very broad rules (like `/etc/**` or `/var/**`), manually tighten them:

```bash
sudo nano /etc/apparmor.d/usr.local.bin.myapp

# Replace broad rules with specific ones
# /etc/** r,  ->  /etc/myapp/config.json r,

# Reload after editing
sudo apparmor_parser -r /etc/apparmor.d/usr.local.bin.myapp
```

## Iterating With aa-logprof

`aa-genprof` creates the initial profile. For ongoing maintenance and adding new rules as the application evolves, use `aa-logprof`:

```bash
# Review and add new rules from recent log entries
sudo aa-logprof

# Process a specific log file
sudo aa-logprof -f /var/log/syslog
```

`aa-logprof` works exactly like the log-scanning part of `aa-genprof` but without the interactive application execution step. Use it whenever you update the application or notice new denials.

`aa-genprof` takes most of the grunt work out of profile creation. Running the application through realistic workflows during the session is the most important part - the more thoroughly you test, the better the generated profile will cover the application's actual behavior.

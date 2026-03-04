# How to Migrate from ntpd to Chrony on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ntpd, Chrony, Migration, NTP, Linux

Description: A step-by-step guide for migrating from ntpd (ntp) to chrony on RHEL, including configuration translation and validation.

---

If you are upgrading older RHEL systems (6 or 7) to RHEL, one of the changes you will hit is that ntpd is gone. Red Hat replaced it with chrony starting in RHEL 8, and on RHEL the ntp package is simply not available in the default repositories. The good news is that chrony handles the same job and the migration is straightforward once you know how the configuration maps.

## Why the Switch Happened

ntpd served the Linux world well for decades, but chrony solves several real problems:

- **Faster initial sync**: chrony can synchronize in seconds, while ntpd can take minutes
- **Better for intermittent connectivity**: chrony handles network interruptions, VMs getting suspended, and laptops going to sleep
- **Lower resource usage**: less memory, fewer open file descriptors
- **Better accuracy**: chrony typically achieves tighter synchronization under the same conditions

Red Hat made the decision based on practical engineering, not politics. chrony is simply a better fit for modern infrastructure.

## Migration Overview

```mermaid
graph LR
    A[Document ntpd config] --> B[Translate to chrony syntax]
    B --> C[Install and configure chrony]
    C --> D[Disable and remove ntpd]
    D --> E[Verify synchronization]
```

## Step 1: Document Your Current ntpd Configuration

Before changing anything, capture your existing setup:

```bash
# On the old RHEL 6/7 system, save the ntp configuration
cat /etc/ntp.conf
```

Note down:

- NTP servers and pools
- Access restrictions
- Drift file location
- Authentication keys
- Any custom options (burst, prefer, minpoll, maxpoll, etc.)

Also document the current synchronization state:

```bash
# Save current ntpd status (on the old system)
ntpq -p
ntpstat
```

## Step 2: Translate the Configuration

Here is how ntpd configuration maps to chrony:

### NTP Servers and Pools

ntpd (`/etc/ntp.conf`):
```bash
server 0.rhel.pool.ntp.org iburst
server 1.rhel.pool.ntp.org iburst
server ntp1.corp.example.com prefer
```

chrony (`/etc/chrony.conf`):
```bash
# Pool and server syntax is nearly identical
pool 0.rhel.pool.ntp.org iburst
pool 1.rhel.pool.ntp.org iburst
server ntp1.corp.example.com iburst prefer
```

The `iburst` and `prefer` options work the same way.

### Access Restrictions

ntpd:
```bash
restrict default nomodify notrap nopeer noquery
restrict 127.0.0.1
restrict 192.168.1.0 mask 255.255.255.0 nomodify notrap
```

chrony:
```bash
# chrony denies access by default, so you only need allow directives
allow 192.168.1.0/24
```

chrony is secure by default. It does not respond to NTP queries unless you explicitly add `allow` directives. The ntpd-style `restrict` lines are not needed.

### Drift File

ntpd:
```bash
driftfile /var/lib/ntp/drift
```

chrony:
```bash
driftfile /var/lib/chrony/drift
```

### Broadcast/Multicast (ntpd)

If you used ntpd's broadcast or multicast mode:

ntpd:
```bash
broadcast 192.168.1.255
```

chrony does not support NTP broadcast or multicast. You need to configure each client to point to the server individually. This is actually more reliable anyway.

### Authentication Keys

ntpd (`/etc/ntp/keys`):
```bash
1 MD5 mysecretkey
```

ntpd config:
```bash
keys /etc/ntp/keys
trustedkey 1
```

chrony (`/etc/chrony.keys`):
```bash
1 MD5 HEX:6D797365637265746B6579
```

chrony config:
```bash
keyfile /etc/chrony.keys
```

Note that chrony prefers SHA1 over MD5. If you are migrating, consider upgrading to SHA1 at the same time:

```bash
1 SHA1 HEX:A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2
```

### Step/Slew Behavior

ntpd:
```bash
tinker panic 0
tinker step 0.1
```

chrony:
```bash
# Allow stepping the clock if offset > 1 second, but only during first 3 updates
makestep 1.0 3
```

The `makestep` directive in chrony is cleaner. The first number is the threshold in seconds, the second is how many updates to allow stepping for (`-1` for unlimited).

### Local Clock Reference

ntpd:
```bash
server 127.127.1.0
fudge 127.127.1.0 stratum 10
```

chrony:
```bash
local stratum 10
```

Much simpler in chrony.

### Logging

ntpd:
```bash
logfile /var/log/ntp.log
statsdir /var/log/ntpstats/
```

chrony:
```bash
log tracking measurements statistics
logdir /var/log/chrony
```

## Step 3: Full Configuration Translation Example

Here is a complete ntpd config and its chrony equivalent:

**Original ntpd config (`/etc/ntp.conf`):**

```bash
driftfile /var/lib/ntp/drift
restrict default nomodify notrap nopeer noquery
restrict 127.0.0.1
restrict ::1
restrict 10.0.0.0 mask 255.0.0.0 nomodify notrap

server ntp1.corp.example.com iburst prefer
server ntp2.corp.example.com iburst
server 0.rhel.pool.ntp.org iburst

server 127.127.1.0
fudge 127.127.1.0 stratum 10

keys /etc/ntp/keys
trustedkey 1

logfile /var/log/ntp.log
```

**Equivalent chrony config (`/etc/chrony.conf`):**

```bash
# Upstream NTP servers
server ntp1.corp.example.com iburst prefer
server ntp2.corp.example.com iburst
pool 0.rhel.pool.ntp.org iburst

# Allow NTP clients from the internal network
allow 10.0.0.0/8

# Fall back to local clock if upstream is unreachable
local stratum 10

# Track clock drift
driftfile /var/lib/chrony/drift

# Allow large step during initial sync
makestep 1.0 3

# Sync hardware clock
rtcsync

# Authentication
keyfile /etc/chrony.keys

# Logging
log tracking measurements statistics
logdir /var/log/chrony
```

## Step 4: Install chrony on RHEL

chrony should already be installed on RHEL. Verify:

```bash
# Check if chrony is installed
rpm -q chrony
```

If not:

```bash
# Install chrony
sudo dnf install chrony
```

## Step 5: Apply Your Configuration

```bash
# Back up the default config
sudo cp /etc/chrony.conf /etc/chrony.conf.default

# Write your translated configuration
sudo vi /etc/chrony.conf
```

## Step 6: Disable ntpd (if present)

On RHEL, ntpd should not be installed, but if it is (from a third-party repo or leftover from an upgrade):

```bash
# Stop and disable ntpd
sudo systemctl stop ntpd
sudo systemctl disable ntpd

# Remove the ntp package
sudo dnf remove ntp
```

Also check for systemd-timesyncd, which can conflict:

```bash
# Make sure systemd-timesyncd is not running
sudo systemctl stop systemd-timesyncd
sudo systemctl disable systemd-timesyncd
```

## Step 7: Enable and Start chrony

```bash
# Enable and start chronyd
sudo systemctl enable --now chronyd
```

## Step 8: Open the Firewall (If Serving Clients)

If this system serves NTP to clients:

```bash
# Allow NTP through the firewall
sudo firewall-cmd --permanent --add-service=ntp
sudo firewall-cmd --reload
```

## Step 9: Verify Synchronization

```bash
# Check synchronization tracking
chronyc tracking

# Check NTP sources
chronyc sources -v

# Check the system time status
timedatectl
```

Compare the new chrony output with your documented ntpd output from Step 1. The server names, stratum values, and offsets should be comparable.

## Command Translation Reference

Here is how common ntpd commands map to chronyc:

| ntpd Command | chronyc Command | Purpose |
|-------------|----------------|---------|
| `ntpq -p` | `chronyc sources` | Show NTP sources |
| `ntpstat` | `chronyc tracking` | Show sync status |
| `ntpq -c rv` | `chronyc tracking` | Detailed status |
| `ntpq -c "lpeers"` | `chronyc sources -v` | Verbose source list |
| `ntpdc -c monlist` | `chronyc clients` | Show connected clients |
| `ntpdate -q server` | `chronyd -Q "server server iburst"` | Query without setting |

## Step 10: Update Monitoring

If you have monitoring scripts that check ntpd, update them for chrony:

Old ntpd check:

```bash
# Old ntpd monitoring (replace this)
ntpstat > /dev/null 2>&1 && echo "NTP OK" || echo "NTP FAIL"
```

New chrony check:

```bash
# New chrony monitoring
chronyc tracking | grep -q "Leap status.*Normal" && echo "NTP OK" || echo "NTP FAIL"
```

## Rollback Plan

If something goes wrong and you absolutely need ntpd back (on older RHEL versions, not RHEL):

```bash
# On RHEL 7 - roll back to ntpd
sudo systemctl stop chronyd
sudo systemctl disable chronyd
sudo systemctl enable --now ntpd
```

On RHEL, there is no rolling back to ntpd since it is not in the repos. Get chrony working - it will.

## Wrapping Up

Migrating from ntpd to chrony is mostly a configuration translation exercise. The concepts are the same, the syntax is slightly different, and chrony's defaults are more sensible. Most migrations take under 30 minutes per server, including verification. If you are managing a fleet, script the configuration translation and push it out with your configuration management tool. The biggest gotcha is usually broadcast/multicast mode, which chrony does not support, so plan for that if you relied on it.

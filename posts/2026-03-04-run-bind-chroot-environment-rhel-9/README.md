# How to Run BIND in a chroot Environment on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, BIND, Chroot, DNS Security, Linux

Description: Secure your BIND DNS server on RHEL by running it in a chroot jail, limiting the damage if the service is ever compromised.

---

Running BIND in a chroot environment means the named process sees a restricted view of the filesystem. If someone exploits a vulnerability in BIND, the chroot limits what files the process can see. It's not bulletproof security, but it adds a layer of defense when SELinux is not enough for your environment. RHEL makes this pretty easy with the `bind-chroot` package.

## What chroot Does

A chroot changes the apparent root directory for a process. When BIND runs in a chroot at `/var/named/chroot`, it sees that directory as `/`. It cannot access anything outside that tree.

```mermaid
flowchart TD
    A[Normal BIND] --> B[Full filesystem access]
    C[chroot BIND] --> D[/var/named/chroot/]
    D --> E[etc/named.conf]
    D --> F[var/named/zones]
    D --> G[var/named/log/]
    D --> H["Cannot see /root, /home, etc."]
```

## Installing bind-chroot

Install the chroot package alongside BIND:

```bash
dnf install bind bind-chroot bind-utils -y
```

The `bind-chroot` package creates the chroot directory structure and provides a systemd service unit that runs named inside the chroot. On RHEL, the service uses bind mounts to make the standard files and directories listed in `/etc/named-chroot.files` available inside `/var/named/chroot`.

## Understanding the chroot Directory Structure

After installation, the chroot lives at `/var/named/chroot`. The package sets up the necessary directory layout:

```bash
ls -la /var/named/chroot/
```

Key paths inside the chroot:

| chroot Path | Maps to |
|-------------|---------|
| `/var/named/chroot/etc/named.conf` | `/etc/named.conf` through a bind mount |
| `/var/named/chroot/var/named/` | `/var/named/` through a bind mount |
| `/var/named/chroot/var/named/log/` | `/var/named/log/` through the `/var/named` bind mount |
| `/var/named/chroot/run/named/` | PID and runtime files |

## Migrating Existing Configuration

If your existing BIND configuration uses the default RHEL locations, you usually do not need to copy it into the chroot. The `named-chroot` service bind-mounts the standard paths from `/etc/named-chroot.files`, including `/etc/named.conf` and `/var/named`, into `/var/named/chroot`.

Review the bind-mounted paths:

```bash
cat /etc/named-chroot.files
```

If your configuration references files outside the standard RHEL BIND paths, move them under `/etc/named` or `/var/named`, or add the required paths to `/etc/named-chroot.files` before starting `named-chroot`.

## Setting Up the chroot Environment

Create necessary directories in the standard RHEL BIND locations. The `named-chroot` service makes these available inside the chroot:

```bash
mkdir -p /var/named/log
mkdir -p /var/named/data
mkdir -p /var/named/dynamic
mkdir -p /var/named/slaves
```

Set ownership:

```bash
chown -R named:named /var/named/log
chown -R named:named /var/named/data
chown -R named:named /var/named/dynamic
chown -R named:named /var/named/slaves
```

## Configuring named.conf for chroot

The configuration file paths inside the chroot are relative to the chroot root. Since BIND sees `/var/named/chroot` as `/`, paths in named.conf remain the same as a non-chroot setup:

```bash
cat > /etc/named.conf << 'EOF'
options {
    listen-on port 53 { any; };
    listen-on-v6 port 53 { any; };
    directory "/var/named";
    dump-file "/var/named/data/cache_dump.db";
    statistics-file "/var/named/data/named_stats.txt";

    allow-query { localhost; 10.0.0.0/8; 192.168.0.0/16; };
    recursion yes;
    allow-recursion { localhost; 10.0.0.0/8; 192.168.0.0/16; };

    dnssec-validation auto;
    managed-keys-directory "/var/named/dynamic";
    pid-file "/run/named/named.pid";
    session-keyfile "/run/named/session.key";
};

logging {
    channel default_log {
        file "/var/named/log/default.log" versions 3 size 5m;
        severity info;
        print-time yes;
    };
    category default { default_log; };
};

zone "." IN {
    type hint;
    file "named.ca";
};

zone "example.com" IN {
    type primary;
    file "example.com.zone";
    allow-update { none; };
};
EOF
```

Notice the paths look normal. BIND doesn't know it's in a chroot.

## Switching to the chroot Service

Stop the regular named service and start the chroot version:

```bash
systemctl stop named
systemctl disable named

systemctl enable --now named-chroot
```

Verify it's running:

```bash
systemctl status named-chroot
```

Check that DNS is responding:

```bash
dig @localhost example.com
```

## Verifying the chroot

Confirm the process is running inside the chroot:

```bash
# Find the named PID

pidof named

# Check the root directory of the process
ls -la /proc/$(pidof named)/root
```

The root link should point to `/var/named/chroot`.

## Managing the chroot BIND

Day-to-day management is almost identical to non-chroot BIND because the standard RHEL BIND paths are bind-mounted into the chroot.

Edit zone files in the standard zone directory:

```bash
vi /var/named/example.com.zone
```

Check configuration:

```bash
named-checkconf -t /var/named/chroot /etc/named.conf
```

The `-t` flag tells named-checkconf to use the chroot directory as the root. If `named-chroot` is not running yet, use `named-checkconf` against `/etc/named.conf` before starting the service.

Validate zone files:

```bash
named-checkzone example.com /var/named/example.com.zone
```

Reload after changes:

```bash
systemctl reload named-chroot
```

The `rndc reload` command can also work if RNDC is configured correctly, but `systemctl reload named-chroot` matches the RHEL service you are running.

## Troubleshooting

**Service fails to start:** Check the journal for errors:

```bash
journalctl -u named-chroot --no-pager -n 30
```

Common issues are missing files or wrong permissions inside the chroot.

**Permission denied errors:** Make sure the named user owns the right directories:

```bash
chown -R named:named /var/named/log
chown -R named:named /var/named/data
chown -R named:named /var/named/dynamic
chown -R named:named /var/named/slaves
```

**SELinux denials:** The bind-chroot package includes the necessary SELinux policies, but if you've customized your setup:

```bash
ausearch -m avc -ts recent | grep named
```

**Missing device files:** BIND needs access to `/dev/random` and `/dev/null`. The chroot package usually handles this, but verify:

```bash
ls -la /var/named/chroot/dev/
```

## Limitations of chroot

Keep in mind that chroot is not a container. A process running as root inside a chroot can escape it. BIND mitigates this by dropping privileges to the named user. On RHEL, SELinux in enforcing mode is generally the stronger protection, so don't treat chroot as a replacement for SELinux, keeping BIND updated, and properly configuring DNS access controls. It's one layer in a defense-in-depth approach.

Running BIND in a chroot can be a sensible hardening measure in environments that require it, and it costs almost nothing in terms of performance or management overhead. The bind-chroot package does most of the heavy lifting, and once it's set up, you barely notice the difference.

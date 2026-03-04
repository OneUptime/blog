# How to Use chroot Jails to Restrict User Access on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Chroot, User Management, System Administration

Description: Learn how to set up chroot jails on Ubuntu to restrict user access to a limited environment, preventing them from accessing the broader filesystem.

---

A chroot jail confines a process or user to a specific directory tree. From inside the jail, that directory appears to be the root of the filesystem. This is a practical technique for isolating SFTP users, restricting shell access for untrusted accounts, or sandboxing services that don't need full filesystem access.

This tutorial covers setting up a chroot jail for SSH users using OpenSSH's built-in `ChrootDirectory` directive, as well as manually building a minimal chroot environment for shell users.

## Understanding How chroot Works

When a process is chrooted, calls to the filesystem resolve relative to the specified directory rather than the actual root. A user in `/var/chroot/jailuser` who tries to access `/etc/passwd` actually reads `/var/chroot/jailuser/etc/passwd`. They cannot traverse above their jail root.

The key limitation: chroot is not a security silver bullet. A process running as root can escape a chroot jail. The technique is most effective when combined with dropping privileges immediately after chrooting.

## Setting Up an SFTP-Only chroot Jail with OpenSSH

The simplest and most common use case is restricting users to SFTP access within a confined directory. OpenSSH handles this natively.

### Create the jail directory structure

```bash
# Create the chroot base directory
sudo mkdir -p /var/sftp/uploads

# The chroot directory must be owned by root with no write access for the group/others
sudo chown root:root /var/sftp
sudo chmod 755 /var/sftp

# Create the upload directory owned by the target user
sudo useradd -m -s /usr/sbin/nologin sftpuser
sudo chown sftpuser:sftpuser /var/sftp/uploads
```

### Configure OpenSSH for chroot

Open the SSH server configuration:

```bash
sudo nano /etc/ssh/sshd_config
```

Add or modify these directives at the end of the file:

```text
# Match block for the SFTP-only group
Match User sftpuser
    ChrootDirectory /var/sftp
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
```

Alternatively, apply the restriction to a group so you can add multiple users later:

```bash
# Create a dedicated group
sudo groupadd sftponly
sudo usermod -aG sftponly sftpuser
```

Then in sshd_config:

```text
Match Group sftponly
    ChrootDirectory /var/sftp
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
```

Restart SSH after making changes:

```bash
sudo systemctl restart sshd
```

Test connectivity from another machine:

```bash
sftp sftpuser@your-server-ip
# Should land in /var/sftp - user cannot navigate above this
```

## Building a Full Shell chroot Jail

For users who need an interactive shell but restricted to a limited set of commands, you need to build a more complete environment with binaries and their dependencies.

### Create the directory structure

```bash
# Define the jail root
JAIL=/var/chroot/restricted

# Create essential directories
sudo mkdir -p $JAIL/{bin,lib,lib64,etc,home,dev,proc,usr/bin}
```

### Copy binaries and their libraries

Every binary you want available inside the jail needs to be copied in, along with all shared libraries it depends on.

```bash
# Copy bash
sudo cp /bin/bash $JAIL/bin/

# Find bash's shared library dependencies
ldd /bin/bash
```

Example output:
```text
linux-vdso.so.1 (0x00007ffee3f45000)
libtinfo.so.6 => /lib/x86_64-linux-gnu/libtinfo.so.6
libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6
/lib64/ld-linux-x86-64.so.2
```

Copy each library:

```bash
sudo cp /lib/x86_64-linux-gnu/libtinfo.so.6 $JAIL/lib/x86_64-linux-gnu/
sudo cp /lib/x86_64-linux-gnu/libc.so.6 $JAIL/lib/x86_64-linux-gnu/
sudo cp /lib64/ld-linux-x86-64.so.2 $JAIL/lib64/
```

Repeat this process for each command you want to provide (ls, cat, etc.):

```bash
# Handy function to copy a binary and all its libs into the jail
copy_to_jail() {
    local binary="$1"
    local jail="$2"

    # Copy the binary itself
    cp "$binary" "$jail/bin/"

    # Copy each shared library
    ldd "$binary" | grep -oP '(?<=> )/[^ ]+' | while read lib; do
        local dest_dir="$jail$(dirname $lib)"
        mkdir -p "$dest_dir"
        cp "$lib" "$dest_dir/"
    done
}

copy_to_jail /bin/ls /var/chroot/restricted
copy_to_jail /bin/cat /var/chroot/restricted
copy_to_jail /usr/bin/id /var/chroot/restricted
```

### Set up /dev and /etc

```bash
# Create minimal device files
sudo mknod -m 666 $JAIL/dev/null c 1 3
sudo mknod -m 666 $JAIL/dev/zero c 1 5
sudo mknod -m 666 $JAIL/dev/tty c 5 0

# Copy passwd and group so commands like id work correctly
sudo cp /etc/passwd $JAIL/etc/
sudo cp /etc/group $JAIL/etc/
```

### Create a jail user home directory

```bash
sudo mkdir -p $JAIL/home/jailuser
sudo chown jailuser:jailuser $JAIL/home/jailuser
```

### Configure PAM and SSH to use the jail

Add to `/etc/ssh/sshd_config`:

```text
Match User jailuser
    ChrootDirectory /var/chroot/restricted
    AllowTcpForwarding no
```

## Using the jailkit Tool for Easier Setup

Manually tracking library dependencies gets tedious. The `jailkit` package automates much of this:

```bash
sudo apt install jailkit

# Initialize a jail with common utilities
sudo jk_init -v /var/chroot/restricted basicshell netutils editors

# Add a user to the jail
sudo jk_jailuser -m -j /var/chroot/restricted -s /bin/bash jailuser
```

## Testing and Verification

After configuring a jail, verify the user cannot escape:

```bash
# SSH in as the jailed user and try to navigate above jail root
ssh jailuser@localhost
cd /
ls     # Should only show jail contents, not the real filesystem
cd ..  # Should stay at /
```

Check the audit log to confirm chroot is active:

```bash
sudo grep -i chroot /var/log/auth.log
```

## Security Considerations

- Always use `ChrootDirectory` with `ForceCommand internal-sftp` for SFTP-only jails - this prevents the user from getting a shell at all
- The chroot directory and all parent directories must be owned by root and not writable by group or others, or OpenSSH will refuse to apply the chroot
- Combine chroot with AppArmor or seccomp for deeper isolation
- For services (not interactive users), consider systemd's `RootDirectory=` directive or Linux namespaces, which provide stronger isolation than chroot alone

chroot jails are a solid first layer of defense when you need to restrict what parts of your system a user or service can touch. They're straightforward to set up for SFTP use cases and more involved but still manageable for shell access scenarios.

# How to Set the SUID, SGID, and Sticky Bit on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, File Permissions, Security, Linux, System Administration

Description: Learn how SUID, SGID, and sticky bit work on Ubuntu, when to use them, how to set them with chmod, and why these special permission bits matter for system security.

---

Beyond the standard read/write/execute permissions, Linux has three special permission bits that modify how executables run and how directories behave. Understanding these is important both for setting them correctly in your own configurations and for spotting potential security issues during audits.

## SUID - Set User ID

When SUID is set on an executable file, the program runs with the permissions of the **file owner** rather than the user who launched it.

The most well-known example is `passwd`:

```bash
ls -la /usr/bin/passwd
# -rwsr-xr-x 1 root root 59976 Mar  2 09:00 /usr/bin/passwd
# Note the 's' in the owner execute position
```

The `s` in the owner's execute position indicates SUID is set. When a regular user runs `passwd`, the process temporarily runs as root (the file owner), which is necessary to write to `/etc/shadow`. Without SUID, regular users couldn't change their own passwords.

### Setting SUID

```bash
# Using octal - the 4 in the leading position is SUID
chmod 4755 myscript

# Using symbolic notation
chmod u+s myscript
```

### Removing SUID

```bash
chmod u-s myscript
# or
chmod 0755 myscript
```

### Viewing SUID on a file

```bash
ls -la myscript
# -rwsr-xr-x 1 alice alice 512 Mar 2 09:00 myscript
# 's' = SUID set and execute bit is set
# 'S' = SUID set but execute bit is NOT set (uncommon, potentially unintentional)
```

An `S` (capital) instead of `s` means SUID is set but the execute bit is missing - the file can't be executed, so SUID has no effect. This is usually a misconfiguration.

### SUID on directories

SUID on a directory is ignored on Linux (it has meaning on some other Unix systems). If you see SUID on a directory, it was likely set by mistake.

## SGID - Set Group ID

SGID behaves differently depending on whether it's applied to a file or a directory.

### SGID on executable files

Similar to SUID, but the program runs with the **file's group** rather than the executing user's primary group. Used by tools that need group-level access:

```bash
ls -la /usr/bin/write
# -rwxr-sr-x 1 root tty 14288 Mar 2 09:00 write
# 's' in the group execute position indicates SGID
```

### SGID on directories

This is where SGID becomes genuinely useful for shared directories. When SGID is set on a directory, files created inside inherit the directory's group rather than the creator's primary group.

```bash
# Create a shared team directory
sudo mkdir /srv/teamdata
sudo chown root:devteam /srv/teamdata
sudo chmod 2775 /srv/teamdata
# 2775 = SGID (2) + rwxrwxr-x (775)

ls -la /srv/
# drwxrwsr-x 2 root devteam 4096 Mar 2 09:00 teamdata
# 's' in the group execute position = SGID
```

Now when alice (a member of devteam) creates a file in `/srv/teamdata`:

```bash
su - alice
touch /srv/teamdata/alice-notes.txt
ls -la /srv/teamdata/
# -rw-rw-r-- 1 alice devteam 0 Mar 2 09:00 alice-notes.txt
# Group is devteam, not alice's primary group
```

This ensures all files in the directory belong to the devteam group, making them accessible to all team members without requiring explicit chgrp on each new file.

### Setting SGID

```bash
# Octal - the 2 in the leading position is SGID
chmod 2755 directory
chmod 2775 shared-directory

# Symbolic
chmod g+s directory
```

## Sticky Bit

The sticky bit on a directory prevents users from deleting or renaming files they don't own, even if they have write permission on the directory.

The classic example is `/tmp`:

```bash
ls -la /
# drwxrwxrwt 19 root root 4096 Mar 2 09:00 tmp
# The 't' at the end indicates the sticky bit is set
```

Everyone can write to `/tmp` (the `w` for group and others), but the `t` means you can only delete your own files. Without the sticky bit, any user with write access to the directory could delete anyone else's files.

### Setting the sticky bit

```bash
# Octal - the 1 in the leading position is sticky bit
chmod 1777 /tmp
chmod 1755 /srv/public

# Symbolic
chmod +t /srv/shared
```

### Where the sticky bit is useful

Any directory where multiple users write files and you don't want them deleting each other's work:

```bash
# Shared uploads directory
sudo mkdir /srv/uploads
sudo chmod 1777 /srv/uploads
# Users can add files, but can only delete their own
```

### Reading the sticky bit

```bash
ls -la /srv/uploads
# drwxrwxrwt 2 root root 4096 Mar 2 09:00 uploads
# 't' = sticky bit + execute bit set
# 'T' = sticky bit set but execute bit NOT set
```

## Combining Special Bits

You can combine all three special bits using the 4-digit octal notation. The first digit is the combination of SUID(4) + SGID(2) + Sticky(1):

| First digit | Meaning |
|---|---|
| 0 | No special bits |
| 1 | Sticky bit |
| 2 | SGID |
| 3 | SGID + Sticky |
| 4 | SUID |
| 5 | SUID + Sticky |
| 6 | SUID + SGID |
| 7 | SUID + SGID + Sticky |

```bash
# SGID + Sticky on a shared directory
chmod 3775 /srv/shared
# drwxrwsr-t
```

## Finding Files with Special Bits Set

During security audits, you should periodically find files with SUID or SGID set, as they can be vectors for privilege escalation if misconfigured:

```bash
# Find all SUID files
sudo find / -perm -4000 -type f -ls 2>/dev/null

# Find all SGID files
sudo find / -perm -2000 -type f -ls 2>/dev/null

# Find both SUID and SGID
sudo find / -perm /6000 -type f -ls 2>/dev/null

# Find SUID/SGID files not owned by root (potentially suspicious)
sudo find / -perm /6000 -not -user root -type f -ls 2>/dev/null
```

Compare the output against a known-good baseline. On a fresh Ubuntu install, these are the SUID binaries you'd typically see:

```bash
# Baseline for a typical Ubuntu system
/usr/bin/passwd
/usr/bin/sudo
/usr/bin/gpasswd
/usr/bin/chsh
/usr/bin/newgrp
/usr/bin/chfn
/usr/bin/mount
/usr/bin/umount
/usr/bin/su
/usr/bin/fusermount3
```

Any additional SUID files outside this list warrant investigation. A SUID shell or SUID script that you didn't put there is a serious red flag.

## Security Implications

SUID and SGID on executables are powerful mechanisms that should be used sparingly. Key practices:

- Never set SUID on shell scripts - the kernel ignores SUID on interpreted scripts for security reasons, but some systems have bugs around this
- Regularly audit SUID/SGID files with find and compare against baseline
- Remove SUID from binaries that don't need it
- Consider using capabilities (`setcap`) instead of SUID for binaries that only need specific privileges, as capabilities are more granular

```bash
# Example: give ping capability to send raw packets without SUID
sudo setcap cap_net_raw+ep /usr/bin/ping
```

Understanding these special bits helps you configure shared environments correctly (SGID on directories) and spot potential privilege escalation vectors (unexpected SUID files) during routine security reviews.

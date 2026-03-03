# How to Use ls -la to Read File Permission Outputs on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, File Permissions, Command Line, System Administration

Description: Learn to read and interpret the output of ls -la on Ubuntu, including file types, permission bits, ownership, link counts, and special indicators like ACL markers.

---

`ls -la` is probably the most frequently typed command in Linux administration. Most people know it shows "detailed file information," but being able to read every column quickly and accurately is a practical skill that helps you diagnose permission problems, understand filesystem layout, and spot potential security issues at a glance.

## The Command and Its Flags

```bash
ls -la /path/to/directory
```

- `-l` - long listing format (shows permissions, ownership, size, dates)
- `-a` - show all files including hidden ones (those starting with `.`)

Other useful combinations:

```bash
ls -lah   # -h for human-readable file sizes (KB, MB, GB)
ls -lat   # -t sorts by modification time (newest first)
ls -laS   # -S sorts by file size (largest first)
ls -lan   # -n shows numeric UID and GID instead of names
ls -laR   # -R recursive listing
```

## Anatomy of a Long Listing

```bash
ls -la /etc/nginx/
```

Output:

```text
total 72
drwxr-xr-x  6 root root  4096 Mar  2 09:00 .
drwxr-xr-x 85 root root  4096 Mar  1 08:00 ..
drwxr-xr-x  2 root root  4096 Mar  2 09:00 conf.d
-rw-r--r--  1 root root  1007 Feb 15 10:00 fastcgi_params
-rw-r--r--  1 root root  5349 Feb 15 10:00 mime.types
-rw-r--r--  1 root root  1490 Mar  2 09:00 nginx.conf
drwxr-xr-x  2 root root  4096 Feb 15 10:00 sites-available
drwxr-xr-x  2 root root  4096 Mar  2 09:00 sites-enabled
```

Each line has 9 fields. Let's take `nginx.conf` as the example:

```text
-rw-r--r--  1 root root  1490 Mar  2 09:00 nginx.conf
│           │ │    │     │    │              └── Filename
│           │ │    │     │    └────────────────── Last modification time
│           │ │    │     └─────────────────────── File size in bytes
│           │ │    └───────────────────────────── Group owner
│           │ └────────────────────────────────── User owner
│           └──────────────────────────────────── Hard link count
└──────────────────────────────────────────────── Type + permissions (10 chars)
```

## Field 1: Type and Permissions (10 Characters)

```text
- r w - r - - r - -
│ │   │ │   │ │   │
│ └───┘ └───┘ └───┘
│  user  group others
└── file type
```

### File type character

| Character | Meaning |
|-----------|---------|
| `-` | Regular file |
| `d` | Directory |
| `l` | Symbolic link |
| `b` | Block device |
| `c` | Character device |
| `p` | Named pipe (FIFO) |
| `s` | Unix domain socket |

### Permission characters

Each of the three groups (user, group, others) has three positions:

| Position | Character | Meaning |
|----------|-----------|---------|
| 1st | `r` or `-` | Read permission |
| 2nd | `w` or `-` | Write permission |
| 3rd (files) | `x` or `-` | Execute permission |
| 3rd (dirs) | `x` or `-` | Traverse permission |

### Special permission indicators in position 3

The third character of each group can show special bits:

| Character | Group | Meaning |
|-----------|-------|---------|
| `s` | User | SUID set and execute set |
| `S` | User | SUID set, execute NOT set |
| `s` | Group | SGID set and execute set |
| `S` | Group | SGID set, execute NOT set |
| `t` | Others | Sticky bit set and execute set |
| `T` | Others | Sticky bit set, execute NOT set |

```bash
# Examples:
ls -la /usr/bin/passwd      # -rwsr-xr-x (SUID)
ls -la /tmp                 # drwxrwxrwt (sticky bit)
ls -la /var/mail            # drwxrwsr-x (SGID)
```

### The ACL indicator

After the 10-character permissions field, you may see a `+` or `.`:

```text
-rw-r--r--+ 1 alice alice 1024 Mar 2 09:00 file-with-acl
-rw-r--r--. 1 root  root   512 Mar 2 09:00 file-with-selinux-context
```

- `+` means the file has extended ACLs (use `getfacl` to see them)
- `.` means the file has an SELinux security context (not common on Ubuntu without SELinux)

## Field 2: Hard Link Count

```text
-rw-r--r--  1 root root  1490 nginx.conf
            │
            └── 1 hard link (typical for regular files)
```

For directories, the link count is at least 2 (the directory itself and the `.` entry inside it), plus one more for each subdirectory it contains:

```text
drwxr-xr-x  6 root root nginx/
             │
             └── 6 links: nginx/ itself, ., conf.d, sites-available, sites-enabled, + parent's link
```

## Field 3 and 4: User and Group Owner

```text
-rw-r--r--  1 www-data www-data 10701 nginx.conf
              │        │
              │        └── Group owner
              └── User (owner)
```

Use `-n` to see numeric IDs instead of names - useful when user accounts have been deleted or when comparing across systems:

```bash
ls -lan /etc/nginx/nginx.conf
# -rw-r--r-- 1 33 33 1490 Mar 2 09:00 nginx.conf
# UID 33 = www-data on Ubuntu
```

## Field 5: Size

By default, size is in bytes. With `-h` flag:

```bash
ls -lah /var/log/syslog
# -rw-r----- 1 syslog adm 2.3M Mar 2 09:00 syslog
```

For directories, the size shown is the size of the directory metadata itself, not the total size of its contents. To see actual directory sizes, use `du`:

```bash
du -sh /var/log/
```

## Field 6 and 7: Timestamp

The timestamp shows when the file was last **modified** (content changed). Format depends on locale and how old the file is:

- Recent files (within the year): `Mar  2 09:00`
- Older files: `Feb 15  2025`

For full timestamp including seconds and year:

```bash
ls -la --full-time /etc/passwd
# -rw-r--r-- 1 root root 2345 2026-03-02 09:00:00.000000000 +0000 passwd
```

## The . and .. Entries

With `-a`, every directory listing shows `.` and `..`:

```text
drwxr-xr-x  6 root root 4096 Mar 2 09:00 .
drwxr-xr-x 85 root root 4096 Mar 1 08:00 ..
```

- `.` is the directory itself
- `..` is the parent directory

The permissions on `.` are the permissions of the current directory. This is important for diagnosing access issues - if `.` is `rwx------`, nobody but the owner can enter even if the files inside have permissive settings.

## Reading Symlinks

Symbolic links show the target after an arrow:

```bash
ls -la /etc/alternatives/python3
# lrwxrwxrwx 1 root root 9 Feb 10 2026 python3 -> python3.11
```

The permissions shown (`rwxrwxrwx`) are always the symlink's own permissions and are irrelevant - what matters is the target file's permissions.

## The total Line

The first line of a directory listing:

```text
total 72
```

This is the number of **512-byte blocks** used by all files listed. It's unrelated to the number of files. Use `du -sh directory/` for a more intuitive disk usage figure.

## Quick Reading Patterns

With practice, you read permission strings by pattern rather than character by character:

```text
-rw-r--r--   standard file (644)
-rwxr-xr-x   standard executable or directory (755)
-rw-------   private file (600)
drwx------   private directory (700)
drwxrwxrwt   world-writable directory with sticky bit (/tmp style)
-rwsr-xr-x   SUID executable (passwd, sudo style)
lrwxrwxrwx   symbolic link (permissions always show rwxrwxrwx)
```

Being able to read this output fluently cuts debugging time significantly. When you get a "permission denied" error, `ls -la` on the file and its parent directories usually shows the problem within seconds.

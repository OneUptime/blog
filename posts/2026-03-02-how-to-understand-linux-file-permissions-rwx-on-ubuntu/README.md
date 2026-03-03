# How to Understand Linux File Permissions (rwx) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, File Permissions, Linux Fundamentals, Security, System Administration

Description: A thorough explanation of Linux file permissions on Ubuntu, covering the rwx model, octal notation, and how permissions apply differently to files and directories.

---

Linux file permissions confuse new users largely because the same letters mean different things depending on whether you're looking at a file or a directory. Once that distinction clicks, the rest of the permission model is straightforward and logical.

## The Three Permission Groups

Every file and directory on Linux has permissions assigned to three groups:

1. **User (u)** - the file's owner
2. **Group (g)** - the group assigned to the file
3. **Others (o)** - everyone else on the system

You can see this with `ls -la`:

```bash
ls -la /var/www/html/index.html
```

Output:

```text
-rw-r--r-- 1 www-data www-data 10701 Mar  2 09:00 index.html
```

Breaking down `-rw-r--r--`:

```text
- rw- r-- r--
│  │   │   └── Others: read only
│  │   └────── Group: read only
│  └────────── User (owner): read and write
└───────────── File type (- = regular file, d = directory, l = symlink)
```

## The Three Permission Bits

For each of the three groups, there are three possible permission bits:

| Bit | Symbol | On files | On directories |
|-----|--------|----------|----------------|
| Read | r | Can view file contents | Can list directory contents (ls) |
| Write | w | Can modify file contents | Can create, delete, rename files inside |
| Execute | x | Can run the file as a program | Can enter the directory and access its contents (cd) |

The distinction for directories is critical:

- `r` without `x` on a directory: you can see the filenames with `ls` but cannot access the files themselves
- `x` without `r` on a directory: you can access files if you know their exact names, but `ls` won't show them
- `w` without `x` on a directory: you cannot create or delete files (write permission alone isn't enough)

In practice, `r` and `x` almost always appear together on directories.

## Octal Notation

Each permission bit has a numeric value:

| Permission | Value |
|-----------|-------|
| read (r) | 4 |
| write (w) | 2 |
| execute (x) | 1 |
| none (-) | 0 |

Add the values together for each group:

- `rwx` = 4+2+1 = **7**
- `rw-` = 4+2+0 = **6**
- `r-x` = 4+0+1 = **5**
- `r--` = 4+0+0 = **4**
- `-wx` = 0+2+1 = **3**
- `-w-` = 0+2+0 = **2**
- `--x` = 0+0+1 = **1**
- `---` = 0+0+0 = **0**

The three digits represent user, group, others:

- `644` = `rw-r--r--` (standard file)
- `755` = `rwxr-xr-x` (standard directory or executable)
- `700` = `rwx------` (private)
- `600` = `rw-------` (private file, no execute needed)
- `777` = `rwxrwxrwx` (fully open - rarely appropriate)

## Practical Permission Scenarios

### Regular configuration files

```bash
# Check nginx config
ls -la /etc/nginx/nginx.conf
# -rw-r--r-- 1 root root 1234 Mar 2 09:00 nginx.conf
# Owner (root) can read/write; group and others can read
# Octal: 644
```

### Web server document root

```bash
ls -la /var/www/html/
# drwxr-xr-x 2 www-data www-data 4096 Mar 2 09:00 .
# Directory: owner can do everything; group and others can list and enter
# Octal: 755
```

### SSH private keys

```bash
ls -la ~/.ssh/id_rsa
# -rw------- 1 alice alice 1675 Mar 2 09:00 id_rsa
# Only the owner can read/write; group and others have no access
# Octal: 600
```

### Scripts

```bash
ls -la /usr/local/bin/myscript.sh
# -rwxr-xr-x 1 root root 512 Mar 2 09:00 myscript.sh
# Executable by everyone; only owner can modify
# Octal: 755
```

## Interpreting Unusual Combinations

### A directory with permissions 000

```bash
sudo chmod 000 /tmp/testdir
ls -la /tmp/testdir
# d--------- 2 alice alice 4096 Mar 2 09:00 testdir
```

Nobody can enter or list this directory - not even the owner. Root can still access it because root bypasses permission checks.

### A file with permission 333

```bash
chmod 333 myfile
# --wx-wx-wx
```

Write and execute for everyone, but no read. For scripts, this means you can run the script but not see its source. For data files, you can append to the file but not read it. Rarely useful in practice.

### Execute without read on a script

```bash
chmod 111 script.sh
# --x--x--x
```

The kernel can execute compiled binaries without reading them (the binary format is interpreted by the kernel), but shell scripts are read and interpreted by the shell. To run a shell script, the shell itself needs read access. So `--x` works for compiled programs but not shell scripts.

## The File Type Character

The first character in the permissions string indicates the type:

```text
- regular file
d directory
l symbolic link
b block device (hard disk, USB drive)
c character device (terminal, serial port)
p named pipe (FIFO)
s socket
```

```bash
# See examples of different types
ls -la /dev/sda   # b for block device
ls -la /dev/tty   # c for character device
ls -la /run/systemd/private  # d for directory
ls -la /usr/bin/python3  # l for symlink (often)
```

## Permission Check Order

When the kernel checks if a process can access a file, it follows this order:

1. Is the process running as root (UID 0)? If yes, skip permission checks (mostly).
2. Is the process's UID the file's owner UID? If yes, apply **user** permissions.
3. Is the process's GID (or any supplementary GID) the file's group GID? If yes, apply **group** permissions.
4. Otherwise, apply **others** permissions.

The important implication: if you're the owner of a file but your group has more permissive access, you still get the **owner** permissions, not the group ones. This catches some people off guard.

Example:

```bash
# File owned by alice, group www-data
# Permissions: ---rw-r--
# alice is in the www-data group
ls -la myfile
# ---rw-r-- 1 alice www-data 0 Mar 2 09:00 myfile

# Can alice read the file? NO.
# She's the owner, so owner permissions (---) apply.
# Even though the group (which she's in) has rw- access.
```

## Checking What Permission Applies to a Process

```bash
# Use namei to trace access through a path
namei -l /var/www/html/index.html

# Use access to check if the current user can access a file
test -r /var/www/html/index.html && echo "readable" || echo "not readable"
test -w /var/www/html/index.html && echo "writable" || echo "not writable"
test -x /var/www/html/index.html && echo "executable" || echo "not executable"
```

Understanding permissions at this level makes it easier to diagnose "permission denied" errors quickly. Most permission problems come down to either the wrong owner, the wrong group, or execute bit missing on a directory in the path to the target file.

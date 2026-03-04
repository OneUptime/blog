# How to Practice Essential File Management Commands for the RHCSA Exam

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RHCSA, File Management, Linux, Certification

Description: Practice the core file management commands you need for the RHCSA exam, including creating, copying, moving, archiving, and setting permissions on files and directories.

---

File management is a fundamental skill tested on the RHCSA exam. This guide covers the essential commands you should practice until they become second nature.

## Creating Files and Directories

```bash
# Create a directory structure
mkdir -p /home/student/project/{src,docs,bin}

# Create empty files
touch /home/student/project/src/{main.c,utils.c,header.h}

# Create a file with content
echo "Project README" > /home/student/project/docs/README.txt
```

## Copying, Moving, and Removing

```bash
# Copy a file
cp /home/student/project/src/main.c /home/student/project/src/main.c.bak

# Copy a directory recursively
cp -r /home/student/project/src /home/student/project/src-backup

# Move (rename) a file
mv /home/student/project/docs/README.txt /home/student/project/docs/NOTES.txt

# Remove a file
rm /home/student/project/src/main.c.bak

# Remove a directory and its contents
rm -rf /home/student/project/src-backup
```

## Finding Files

```bash
# Find files by name
find /home/student -name "*.c" -type f

# Find files modified in the last 24 hours
find /home/student -mtime -1

# Find files larger than 1 MB
find / -size +1M -type f 2>/dev/null

# Find files owned by a specific user
find / -user student -type f 2>/dev/null | head -10
```

## Setting Permissions and Ownership

```bash
# Set read/write/execute for owner, read for group and others
chmod 744 /home/student/project/bin/run.sh

# Set permissions using symbolic notation
chmod u+x,g+r,o-w /home/student/project/docs/NOTES.txt

# Change ownership
sudo chown student:developers /home/student/project/src/main.c

# Set SGID on a directory so new files inherit the group
chmod g+s /home/student/project/src
```

## Archiving and Compression

```bash
# Create a tar archive
tar -cvf project.tar /home/student/project/

# Create a compressed tar archive with gzip
tar -czvf project.tar.gz /home/student/project/

# Extract an archive
tar -xzvf project.tar.gz -C /tmp/

# List contents of an archive without extracting
tar -tzvf project.tar.gz
```

## Hard and Soft Links

```bash
# Create a hard link
ln /home/student/project/src/main.c /home/student/project/main-hardlink.c

# Create a symbolic (soft) link
ln -s /home/student/project/src/main.c /home/student/project/main-symlink.c

# Verify with ls -li to see inode numbers
ls -li /home/student/project/main-*
```

Practice these commands repeatedly in a RHEL VM. The exam is time-limited, so speed matters.

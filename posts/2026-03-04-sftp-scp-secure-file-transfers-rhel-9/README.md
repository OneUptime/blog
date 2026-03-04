# How to Use SFTP and SCP for Secure File Transfers on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SFTP, SCP, File Transfer, Linux

Description: Learn how to use SFTP and SCP on RHEL for secure file transfers, including chroot jails, SFTP-only users, and batch operations.

---

SFTP and SCP use the SSH protocol for encrypted file transfers. No extra services to install, no extra ports to open. If you have SSH running, you already have SFTP and SCP available. This guide covers both tools and how to set up restricted SFTP-only access on RHEL.

## SCP - Quick File Transfers

SCP is the simplest way to copy files between systems. It works like `cp` but over SSH.

### Copy a file to a remote server

```bash
scp /path/to/local/file.txt admin@server:/path/to/remote/
```

### Copy a file from a remote server

```bash
scp admin@server:/path/to/remote/file.txt /path/to/local/
```

### Copy an entire directory

```bash
# -r for recursive
scp -r /path/to/local/directory admin@server:/path/to/remote/
```

### Use a specific SSH key and port

```bash
scp -i ~/.ssh/id_ed25519 -P 2222 file.txt admin@server:/tmp/
```

### Preserve file attributes

```bash
# -p preserves modification times, access times, and modes
scp -p file.txt admin@server:/tmp/
```

## SFTP - Interactive and Scripted Transfers

SFTP provides an interactive shell for file transfers, plus scripted batch mode.

### Interactive SFTP session

```bash
sftp admin@server
```

Common SFTP commands:

```
ls                    # List remote files
lls                   # List local files
cd /var/log           # Change remote directory
lcd /tmp              # Change local directory
get file.txt          # Download a file
put file.txt          # Upload a file
mget *.log            # Download multiple files
mput *.conf           # Upload multiple files
mkdir newdir          # Create remote directory
rm oldfile.txt        # Delete remote file
bye                   # Exit
```

### Batch mode SFTP

Create a batch file with commands:

```bash
vi sftp-batch.txt
```

```
cd /var/log
get messages
get secure
get audit/audit.log
bye
```

Run the batch:

```bash
sftp -b sftp-batch.txt admin@server
```

### SFTP with specific options

```bash
# Use a specific key and port
sftp -i ~/.ssh/id_ed25519 -P 2222 admin@server

# Resume a failed transfer
sftp admin@server <<< "reget largefile.iso"
```

## Setting Up SFTP-Only Users

For users who need file transfer access but should not get a shell.

### Create the user and group

```bash
sudo groupadd sftponly
sudo useradd -g sftponly -s /sbin/nologin sftpuser
sudo passwd sftpuser
```

### Set up the chroot directory

The chroot directory must be owned by root:

```bash
sudo mkdir -p /data/sftp/sftpuser/uploads
sudo chown root:root /data/sftp/sftpuser
sudo chmod 755 /data/sftp/sftpuser

# The user can write to the uploads subdirectory
sudo chown sftpuser:sftponly /data/sftp/sftpuser/uploads
sudo chmod 755 /data/sftp/sftpuser/uploads
```

### Configure SSH for SFTP-only access

```bash
sudo vi /etc/ssh/sshd_config.d/40-sftp.conf
```

```
# SFTP-only configuration for the sftponly group
Match Group sftponly
    ForceCommand internal-sftp
    ChrootDirectory /data/sftp/%u
    AllowTcpForwarding no
    X11Forwarding no
    PermitTunnel no
    AllowAgentForwarding no
```

```bash
sudo sshd -t && sudo systemctl restart sshd
```

### Test the SFTP-only user

```bash
# SFTP should work
sftp sftpuser@localhost
# They land in the chroot with access to /uploads

# SSH should be denied
ssh sftpuser@localhost
# Expected: This service allows sftp connections only.
```

## Automating File Transfers

### Script-based SFTP transfer

```bash
vi /usr/local/bin/backup-transfer.sh
```

```bash
#!/bin/bash
# Transfer daily backups to the backup server via SFTP
BACKUP_DIR="/var/backups"
REMOTE="backupuser@backup.example.com"
DATE=$(date +%Y%m%d)

sftp -i /root/.ssh/backup_key -b - "$REMOTE" <<EOF
cd /incoming
put ${BACKUP_DIR}/db-backup-${DATE}.sql.gz
put ${BACKUP_DIR}/files-backup-${DATE}.tar.gz
bye
EOF

if [ $? -eq 0 ]; then
    logger "Backup transfer completed successfully"
else
    logger -p user.err "Backup transfer failed"
fi
```

```bash
sudo chmod 700 /usr/local/bin/backup-transfer.sh
```

### Using rsync over SSH (alternative)

For large or incremental transfers, rsync over SSH is more efficient:

```bash
# Sync a directory using rsync over SSH
rsync -avz -e "ssh -i ~/.ssh/id_ed25519" /local/path/ admin@server:/remote/path/
```

## Transfer Performance Tuning

### Enable compression for slow links

```bash
scp -C largefile.iso admin@server:/data/
sftp -C admin@server
```

### Use a faster cipher for trusted networks

```bash
# AES-128 is faster than AES-256 with minimal security difference on LAN
scp -c aes128-gcm@openssh.com largefile.iso admin@server:/data/
```

### Increase buffer size

```bash
# Use a larger buffer for faster transfers
sftp -B 262144 admin@server
```

## Monitoring SFTP Activity

### Check SFTP connections in the logs

```bash
sudo grep "sftp" /var/log/secure | tail -20
```

### Enable detailed SFTP logging

```bash
sudo vi /etc/ssh/sshd_config.d/40-sftp.conf
```

Change the subsystem line:

```
Subsystem sftp internal-sftp -l INFO
```

This logs file operations (open, close, read, write) to syslog.

## Wrapping Up

SFTP and SCP cover most file transfer needs on RHEL without requiring additional services. Use SCP for quick one-off transfers and SFTP for interactive sessions or scripted batch jobs. For users who only need file transfer access, set up SFTP-only accounts with chroot jails to restrict them to their own directories. The fact that it all runs over SSH means you get encryption and authentication for free.

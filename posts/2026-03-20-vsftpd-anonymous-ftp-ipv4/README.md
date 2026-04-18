# How to Configure vsftpd Anonymous FTP Access on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: vsftpd, FTP, IPv4, Anonymous, Linux, Configuration, File Transfer

Description: Learn how to configure vsftpd to allow anonymous FTP access for distributing public files over IPv4, with appropriate security restrictions.

---

Anonymous FTP allows users to connect without a username/password, using "anonymous" as the username. It's appropriate for public file distribution (open-source packages, public datasets) when combined with read-only restrictions.

## Basic Anonymous FTP Configuration

```ini
# /etc/vsftpd.conf

# --- Network ---

listen=YES                    # IPv4 listener
listen_ipv6=NO                # Disable IPv6
# listen_address=203.0.113.10 # Bind to specific IPv4 (optional)

# --- Anonymous access ---
anonymous_enable=YES          # Allow anonymous logins
anon_root=/var/ftp/pub        # Root directory for anonymous users
no_anon_password=YES          # Don't prompt for email as password

# --- Read-only restrictions (safe defaults for public FTP) ---
write_enable=NO               # Global write disable
anon_upload_enable=NO         # No uploads by anonymous users
anon_mkdir_write_enable=NO    # No directory creation
anon_other_write_enable=NO    # No rename/delete

# --- Local users: disable for anonymous-only server ---
local_enable=NO

# --- Passive mode for clients behind NAT ---
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=50000
pasv_address=203.0.113.10     # Your public IPv4

# --- Logging ---
xferlog_enable=YES
xferlog_std_format=YES
xferlog_file=/var/log/vsftpd.log
dual_log_enable=YES           # Also write vsftpd-style protocol log to vsftpd_log_file
```

## Setting Up the Anonymous FTP Root

```bash
# Create the FTP root directory
mkdir -p /var/ftp/pub

# Set correct ownership (ftp user owns the root; nobody writes to it)
chown root:root /var/ftp
chmod 755 /var/ftp

# Create a public subdirectory for files
# Keep root ownership so the anonymous chroot root is NOT writable by the ftp user;
# otherwise vsftpd refuses to run (writable root inside chroot).
chown root:root /var/ftp/pub
chmod 755 /var/ftp/pub

# Add some public files
cp /path/to/public/files /var/ftp/pub/
```

## Allowing Anonymous Uploads to a Specific Directory

If you need an upload dropbox for anonymous users (collect files, don't list them):

```ini
# /etc/vsftpd.conf additions for upload dropbox
write_enable=YES
anon_upload_enable=YES
anon_world_readable_only=YES   # Users can upload but not read others' uploads

# Uploads land in /var/ftp/pub/incoming
```

```bash
# Create upload directory owned by the ftp user
mkdir -p /var/ftp/pub/incoming
chown ftp:ftp /var/ftp/pub/incoming
chmod 733 /var/ftp/pub/incoming  # Write+execute, no read (dropbox behavior)
```

## Limiting Anonymous Connection Rate and Count

```ini
# /etc/vsftpd.conf

# Limit bandwidth for anonymous users (bytes per second; 0 = unlimited)
anon_max_rate=102400    # 100 KB/s

# Limit total simultaneous anonymous connections
max_clients=50
max_per_ip=5
```

## Testing Anonymous FTP

```bash
# Restart vsftpd
systemctl restart vsftpd

# Test anonymous FTP connection
ftp 203.0.113.10
# Username: anonymous
# Password: (anything, usually your email)

# Or using curl
curl -s ftp://203.0.113.10/pub/ --user anonymous:
```

## Key Takeaways

- Set `anon_root` to a directory outside `/home` to isolate anonymous users.
- Disable all write permissions (`write_enable=NO`, `anon_upload_enable=NO`) for read-only public FTP.
- Use `pasv_address` to set the correct public IPv4 for passive mode behind NAT.
- Rate-limit anonymous transfers with `anon_max_rate` to prevent bandwidth abuse.

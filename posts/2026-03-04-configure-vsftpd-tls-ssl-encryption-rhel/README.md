# How to Configure vsftpd with TLS/SSL Encryption on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, vsftpd, FTP, TLS, SSL, Encryption, Security, Linux

Description: Secure vsftpd on RHEL by enabling TLS/SSL encryption to protect FTP credentials and file transfers from eavesdropping.

---

Plain FTP sends credentials and data in cleartext. Enabling TLS/SSL encryption in vsftpd (FTPS) protects everything in transit. This guide covers configuring explicit FTPS on RHEL.

## Generate SSL/TLS Certificates

```bash
# Create a directory for certificates
sudo mkdir -p /etc/vsftpd/ssl

# Generate a self-signed certificate (for testing)
sudo openssl req -x509 -nodes -days 3650 -newkey rsa:4096 \
  -keyout /etc/vsftpd/ssl/vsftpd.key \
  -out /etc/vsftpd/ssl/vsftpd.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=ftp.example.com"

# Set proper permissions
sudo chmod 600 /etc/vsftpd/ssl/vsftpd.key
sudo chmod 644 /etc/vsftpd/ssl/vsftpd.crt
```

For production, use a certificate from a trusted CA (such as Let's Encrypt):

```bash
# If you have Let's Encrypt certificates
# sudo cp /etc/letsencrypt/live/ftp.example.com/fullchain.pem /etc/vsftpd/ssl/vsftpd.crt
# sudo cp /etc/letsencrypt/live/ftp.example.com/privkey.pem /etc/vsftpd/ssl/vsftpd.key
```

## Configure vsftpd for TLS

```bash
sudo tee /etc/vsftpd/vsftpd.conf << 'CONF'
# Basic settings
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=022
chroot_local_user=YES
allow_writeable_chroot=YES

# User list
userlist_enable=YES
userlist_deny=NO
userlist_file=/etc/vsftpd/user_list

# TLS/SSL Configuration
ssl_enable=YES

# Force TLS for both login and data transfer
force_local_logins_ssl=YES
force_local_data_ssl=YES

# Certificate and key paths
rsa_cert_file=/etc/vsftpd/ssl/vsftpd.crt
rsa_private_key_file=/etc/vsftpd/ssl/vsftpd.key

# TLS protocol versions (disable older insecure versions)
ssl_tlsv1=NO
ssl_tlsv1_1=NO
ssl_tlsv1_2=YES
ssl_tlsv1_3=YES
ssl_sslv2=NO
ssl_sslv3=NO

# Cipher suite (strong ciphers only)
ssl_ciphers=HIGH:!aNULL:!MD5:!RC4

# Require TLS for data connections
require_ssl_reuse=NO

# Implicit FTPS (port 990) - uncomment if needed
# implicit_ssl=YES
# listen_port=990

# Explicit FTPS (default, uses port 21 with AUTH TLS)
listen=YES
listen_ipv6=NO
listen_port=21

# Passive mode with TLS
pasv_enable=YES
pasv_min_port=30000
pasv_max_port=30100

# Logging
xferlog_enable=YES
xferlog_file=/var/log/vsftpd.log
log_ftp_protocol=YES

# Banner
ftpd_banner=Secure FTP Server - Unauthorized access prohibited

# PAM service
pam_service_name=vsftpd
CONF
```

## Start vsftpd

```bash
sudo systemctl enable --now vsftpd
sudo systemctl status vsftpd
```

## Configure the Firewall

```bash
# Allow FTP control and passive data ports
sudo firewall-cmd --permanent --add-service=ftp
sudo firewall-cmd --permanent --add-port=30000-30100/tcp
sudo firewall-cmd --reload
```

## Test TLS Connection

```bash
# Test with curl (explicit FTPS)
curl --ftp-ssl -u ftpuser:password ftp://ftp.example.com/
curl --ftp-ssl -T testfile.txt -u ftpuser:password ftp://ftp.example.com/uploads/

# If using a self-signed certificate, add -k to skip verification
curl --ftp-ssl -k -u ftpuser:password ftp://ftp.example.com/

# Test with openssl to verify the TLS handshake
openssl s_client -connect ftp.example.com:21 -starttls ftp
```

## Test with lftp (Supports FTPS)

```bash
# Install lftp
sudo dnf install -y lftp

# Connect with explicit TLS
lftp -u ftpuser,password -e "set ftp:ssl-force true; set ssl:verify-certificate no; ls; quit" ftp://ftp.example.com
```

## Verify Plain FTP is Rejected

```bash
# Attempt a plain FTP connection (should fail)
ftp ftp.example.com
# Login should be rejected because force_local_logins_ssl=YES
```

## Troubleshooting

```bash
# Check vsftpd log for TLS errors
sudo tail -f /var/log/vsftpd.log

# Verify the certificate
openssl x509 -in /etc/vsftpd/ssl/vsftpd.crt -text -noout | head -20

# Check if vsftpd is listening on the correct port
ss -tlnp | grep vsftpd

# SELinux issues
sudo ausearch -m AVC -c vsftpd -ts recent
```

With TLS enabled and forced, all FTP communications are encrypted. This protects credentials and file contents from network eavesdropping.

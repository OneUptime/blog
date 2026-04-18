# How to Enable SSL/TLS (FTPS) on vsftpd for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: vsftpd, FTPS, SSL, TLS, IPv4, Encryption, Certificate

Description: Configure vsftpd to use SSL/TLS encryption (FTPS) on IPv4, generate or install a certificate, require encrypted connections, and verify with an FTPS client.

## Introduction

Plain FTP transmits credentials and data in cleartext. FTPS (FTP over SSL/TLS) adds TLS encryption to both the command and data channels. vsftpd supports FTPS with the `ssl_enable=YES` directive and a valid certificate.

## Generating a Self-Signed Certificate

```bash
# Generate a self-signed certificate (for testing/internal use)

sudo openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/ssl/private/vsftpd.key \
  -out /etc/ssl/certs/vsftpd.pem \
  -subj "/C=US/ST=State/L=City/O=Company/CN=ftp.example.com"

# Set permissions
sudo chmod 600 /etc/ssl/private/vsftpd.key
sudo chmod 644 /etc/ssl/certs/vsftpd.pem
```

## Using Let's Encrypt Certificate

```bash
# Get a Let's Encrypt certificate
sudo certbot certonly --standalone -d ftp.example.com

# Certificates are at:
# /etc/letsencrypt/live/ftp.example.com/fullchain.pem
# /etc/letsencrypt/live/ftp.example.com/privkey.pem

# Create combined PEM for vsftpd
sudo sh -c 'cat /etc/letsencrypt/live/ftp.example.com/fullchain.pem \
  /etc/letsencrypt/live/ftp.example.com/privkey.pem \
  > /etc/ssl/vsftpd-bundle.pem'
sudo chmod 600 /etc/ssl/vsftpd-bundle.pem
```

## vsftpd SSL Configuration

```bash
# /etc/vsftpd.conf

# IPv4 only
listen=YES
listen_ipv6=NO
listen_address=203.0.113.10

# Authentication
anonymous_enable=NO
local_enable=YES
write_enable=YES
chroot_local_user=YES
allow_writeable_chroot=YES

# SSL/TLS - Enable FTPS
ssl_enable=YES

# Certificate and key paths
rsa_cert_file=/etc/ssl/certs/vsftpd.pem
rsa_private_key_file=/etc/ssl/private/vsftpd.key

# Require SSL for both login and data
ssl_tlsv1=YES
ssl_sslv2=NO
ssl_sslv3=NO

# Force SSL for all connections
force_local_data_ssl=YES
force_local_logins_ssl=YES

# Use stronger ciphers
ssl_ciphers=HIGH

# Passive mode (required for most clients)
pasv_enable=YES
pasv_min_port=30000
pasv_max_port=31000
pasv_address=203.0.113.10

# Logging
xferlog_enable=YES
log_ftp_protocol=YES
```

## Firewall for FTPS

```bash
# FTPS uses port 21 (STARTTLS/AUTH TLS) or port 990 (implicit FTPS)
# vsftpd uses explicit FTPS on port 21 by default

sudo ufw allow 21/tcp
sudo ufw allow 30000:31000/tcp
sudo ufw reload

# For implicit FTPS on port 990 (add to vsftpd.conf):
# listen_port=990
# implicit_ssl=YES
```

## Testing FTPS Connection

```bash
# Test with lftp (supports explicit FTPS)
# Use ftp:// for explicit FTPS on port 21; ftps:// would use implicit FTPS on port 990
lftp -e "set ftp:ssl-force yes; set ssl:verify-certificate no; ls" \
  -u ftpuser,password ftp://203.0.113.10

# Test with curl (explicit FTPS)
curl -v --ssl-reqd ftp://203.0.113.10/ -u ftpuser:password

# Test with FileZilla:
# Protocol: FTP - File Transfer Protocol
# Encryption: Require explicit FTP over TLS
# Host: 203.0.113.10, Port: 21

# Test certificate
openssl s_client -connect 203.0.113.10:21 -starttls ftp
```

## Verify SSL is Working

```bash
# Restart vsftpd
sudo systemctl restart vsftpd

# Check vsftpd log for SSL handshakes
sudo tail -f /var/log/vsftpd.log | grep -i ssl

# Verify certificate details
openssl x509 -in /etc/ssl/certs/vsftpd.pem -noout -text | grep -E "Subject:|Not After"

# Test that plain FTP is rejected (if force_local_logins_ssl=YES)
ftp 203.0.113.10
# Should receive: 530 Non-anonymous sessions must use encryption.
```

## Conclusion

Enable FTPS on vsftpd by setting `ssl_enable=YES` and pointing `rsa_cert_file`/`rsa_private_key_file` to your certificate. Set `force_local_logins_ssl=YES` and `force_local_data_ssl=YES` to reject unencrypted connections. Disable SSLv2/SSLv3 and use TLS only. Verify with lftp or FileZilla using explicit FTPS on port 21.

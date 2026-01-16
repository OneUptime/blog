# How to Configure Syslog with TLS on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Syslog, TLS, Security, Encryption, Rsyslog, DevOps, Linux, Logging

Description: A comprehensive guide to securing your syslog infrastructure with TLS encryption on Ubuntu, covering rsyslog, syslog-ng, mutual TLS, and high availability configurations.

---

Syslog remains the backbone of centralized logging across Linux systems, network appliances, and enterprise infrastructure. However, by default, syslog transmits data in plaintext over UDP port 514, exposing sensitive operational data to potential interception and tampering. In an era of zero-trust networking and compliance mandates like PCI-DSS, HIPAA, and SOC 2, encrypting syslog traffic is no longer optional - it is essential.

This guide walks through configuring TLS-encrypted syslog on Ubuntu, covering both rsyslog (the default) and syslog-ng alternatives. We will generate certificates, configure servers and clients, implement mutual TLS authentication, and address real-world operational concerns like certificate rotation, firewall rules, and high availability.

---

## Why Encrypt Syslog Traffic

Before diving into configuration, understanding the risks of unencrypted syslog helps justify the effort:

- **Data exposure** - Syslog messages often contain IP addresses, usernames, application errors, authentication events, and security alerts. An attacker sniffing network traffic can harvest this intelligence for reconnaissance.
- **Man-in-the-middle attacks** - Without encryption and authentication, attackers can inject fake log entries or suppress real alerts, masking intrusion attempts.
- **Compliance requirements** - PCI-DSS Requirement 4.1 mandates encryption of cardholder data in transit. HIPAA requires encryption of protected health information. SOC 2 Trust Services Criteria expect secure transmission of sensitive data.
- **Lateral movement detection** - Security teams rely on syslog to detect lateral movement. If attackers can read or modify these logs, they can operate undetected.
- **Audit integrity** - Forensic investigations depend on log integrity. TLS provides assurance that logs were not modified during transit.

TLS encryption addresses all these concerns by encrypting the payload and authenticating the server (and optionally the client).

---

## Prerequisites

Before configuring TLS syslog, ensure you have the following:

- Ubuntu 22.04 LTS or 24.04 LTS (commands work on 20.04 with minor adjustments)
- Root or sudo access on both server and client systems
- Rsyslog version 8.x or later (ships by default on Ubuntu)
- OpenSSL installed for certificate generation
- Network connectivity between syslog clients and server on the chosen port (typically 6514 for TLS syslog)

Verify your rsyslog version and installed modules before proceeding. The version should be 8.x or higher for full TLS support with the gtls driver:

```bash
# Check rsyslog version - should be 8.x or higher for TLS support
rsyslogd -v | head -5

# Verify TLS modules are available
# The gtls module provides GnuTLS-based encryption
dpkg -l | grep rsyslog-gnutls
```

If the rsyslog-gnutls package is not installed, install it now. This package provides the gtls stream driver required for TLS encryption:

```bash
# Install the GnuTLS driver for rsyslog
# This package provides TLS/SSL encryption capabilities
sudo apt update
sudo apt install rsyslog-gnutls -y

# Restart rsyslog to load the new module
sudo systemctl restart rsyslog
```

---

## Generating Certificates

TLS requires X.509 certificates for encryption and authentication. For production environments, use certificates signed by your organization's Certificate Authority (CA) or a trusted public CA. For testing or internal use, self-signed certificates work but require distributing the CA certificate to all clients.

### Creating a Private Certificate Authority

First, create a directory structure to organize your PKI files. Keeping certificates organized prevents confusion and simplifies management:

```bash
# Create directory structure for certificate management
# Using /etc/ssl/syslog keeps files secure with proper ownership
sudo mkdir -p /etc/ssl/syslog/{ca,server,clients}

# Set restrictive permissions - only root should access private keys
sudo chmod 700 /etc/ssl/syslog
```

Generate a private CA that will sign both server and client certificates. The CA's private key must be protected carefully since anyone with access can issue trusted certificates:

```bash
# Generate CA private key
# Using 4096 bits for long-term security (2048 minimum for compliance)
sudo openssl genrsa -out /etc/ssl/syslog/ca/ca.key 4096

# Set restrictive permissions on CA private key
# This key can sign any certificate, so protect it carefully
sudo chmod 400 /etc/ssl/syslog/ca/ca.key

# Generate self-signed CA certificate
# Valid for 10 years (adjust -days for your security policy)
# The subject DN identifies this as a syslog CA
sudo openssl req -x509 -new -nodes \
    -key /etc/ssl/syslog/ca/ca.key \
    -sha256 \
    -days 3650 \
    -out /etc/ssl/syslog/ca/ca.crt \
    -subj "/C=US/ST=California/L=San Francisco/O=YourCompany/OU=Infrastructure/CN=Syslog CA"

# Verify the CA certificate was created correctly
openssl x509 -in /etc/ssl/syslog/ca/ca.crt -text -noout | head -20
```

### Generating the Server Certificate

Create a certificate for the syslog server. The Common Name (CN) or Subject Alternative Name (SAN) must match the hostname clients use to connect:

```bash
# Generate server private key
sudo openssl genrsa -out /etc/ssl/syslog/server/server.key 2048

# Protect the server private key
sudo chmod 400 /etc/ssl/syslog/server/server.key

# Create a certificate signing request (CSR)
# Replace 'syslog.example.com' with your actual server hostname
sudo openssl req -new \
    -key /etc/ssl/syslog/server/server.key \
    -out /etc/ssl/syslog/server/server.csr \
    -subj "/C=US/ST=California/L=San Francisco/O=YourCompany/OU=Infrastructure/CN=syslog.example.com"
```

Create an OpenSSL extensions file to add Subject Alternative Names. SANs allow the certificate to be valid for multiple hostnames and IP addresses:

```bash
# Create extensions file for Subject Alternative Names
# SANs allow one certificate to cover multiple hostnames/IPs
cat << 'EOF' | sudo tee /etc/ssl/syslog/server/server.ext
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
# Add all hostnames clients might use to connect
DNS.1 = syslog.example.com
DNS.2 = syslog
DNS.3 = localhost
# Add IP addresses if clients connect by IP
IP.1 = 10.0.0.100
IP.2 = 127.0.0.1
EOF
```

Sign the server certificate with your CA. This creates a trusted certificate that clients will accept:

```bash
# Sign the server certificate with the CA
# Valid for 1 year (365 days) - adjust based on your rotation policy
sudo openssl x509 -req \
    -in /etc/ssl/syslog/server/server.csr \
    -CA /etc/ssl/syslog/ca/ca.crt \
    -CAkey /etc/ssl/syslog/ca/ca.key \
    -CAcreateserial \
    -out /etc/ssl/syslog/server/server.crt \
    -days 365 \
    -sha256 \
    -extfile /etc/ssl/syslog/server/server.ext

# Verify the certificate chain
openssl verify -CAfile /etc/ssl/syslog/ca/ca.crt /etc/ssl/syslog/server/server.crt

# Check certificate details including SANs
openssl x509 -in /etc/ssl/syslog/server/server.crt -text -noout | grep -A1 "Subject Alternative Name"
```

### Setting Proper File Ownership

Rsyslog runs as the syslog user, so certificates must be readable by that user while private keys remain protected:

```bash
# Set ownership for rsyslog to read certificates
# The syslog user needs read access to certs and keys
sudo chown -R syslog:syslog /etc/ssl/syslog/

# CA certificate - world-readable is fine (it's public)
sudo chmod 644 /etc/ssl/syslog/ca/ca.crt

# Server certificate - readable by syslog user
sudo chmod 644 /etc/ssl/syslog/server/server.crt

# Server private key - readable only by syslog user
sudo chmod 400 /etc/ssl/syslog/server/server.key
sudo chown syslog:syslog /etc/ssl/syslog/server/server.key
```

---

## Rsyslog TLS Server Configuration

With certificates ready, configure the rsyslog server to accept TLS-encrypted connections. Create a dedicated configuration file to keep TLS settings organized:

```bash
# Create the TLS configuration file for the syslog server
# Using a separate file in /etc/rsyslog.d/ keeps the main config clean
cat << 'EOF' | sudo tee /etc/rsyslog.d/10-tls-server.conf
#####################################
# Rsyslog TLS Server Configuration
#####################################

# Load the input module for TCP connections
# imtcp is required for TLS - UDP does not support encryption
module(load="imtcp")

# Load GnuTLS driver for TLS support
# This module provides certificate-based encryption
module(load="gtls"
    StreamDriver.Name="gtls"
    StreamDriver.Mode="1"
    StreamDriver.AuthMode="x509/name")

# Configure the TLS stream driver globally
# These settings apply to all TCP listeners
global(
    DefaultNetstreamDriver="gtls"
    DefaultNetstreamDriverCAFile="/etc/ssl/syslog/ca/ca.crt"
    DefaultNetstreamDriverCertFile="/etc/ssl/syslog/server/server.crt"
    DefaultNetstreamDriverKeyFile="/etc/ssl/syslog/server/server.key"
)

# Listen for TLS connections on port 6514
# Port 6514 is the IANA-registered port for syslog over TLS
input(type="imtcp" port="6514"
    StreamDriver.Name="gtls"
    StreamDriver.Mode="1"
    StreamDriver.AuthMode="x509/name"
    PermittedPeer=["*.example.com", "client1.example.com", "client2.example.com"]
)

# Optional: Also listen on port 514 for legacy unencrypted connections
# Remove this section if you want to enforce TLS-only
# input(type="imtcp" port="514")
EOF
```

Understanding the key configuration options:

- **StreamDriver.Mode="1"** - Enables TLS encryption (0 would be plaintext)
- **StreamDriver.AuthMode** - Controls certificate validation:
  - `anon` - No authentication (only encryption)
  - `x509/fingerprint` - Authenticate based on certificate fingerprint
  - `x509/name` - Authenticate based on certificate CN/SAN
- **PermittedPeer** - Whitelist of allowed client certificate names (wildcards supported)

Validate the configuration and restart rsyslog to apply changes:

```bash
# Validate the rsyslog configuration syntax
# This catches errors before restarting the service
sudo rsyslogd -N1

# If validation succeeds, restart rsyslog
sudo systemctl restart rsyslog

# Verify rsyslog is running and listening on port 6514
sudo systemctl status rsyslog
sudo ss -tlnp | grep 6514
```

---

## Rsyslog TLS Client Configuration

On each client that should send logs to the TLS server, install the GnuTLS module and copy the CA certificate. The client needs the CA certificate to verify the server's identity:

```bash
# Install rsyslog TLS support on the client
sudo apt update
sudo apt install rsyslog-gnutls -y

# Create directory for certificates
sudo mkdir -p /etc/ssl/syslog/ca

# Copy the CA certificate from the server
# Use SCP, Ansible, Puppet, or your configuration management tool
# The CA cert is public, so it does not need encryption during transfer
sudo scp user@syslog-server:/etc/ssl/syslog/ca/ca.crt /etc/ssl/syslog/ca/

# Set proper permissions
sudo chown -R syslog:syslog /etc/ssl/syslog/
sudo chmod 644 /etc/ssl/syslog/ca/ca.crt
```

Create the client configuration to forward logs over TLS:

```bash
# Create TLS client configuration
cat << 'EOF' | sudo tee /etc/rsyslog.d/10-tls-client.conf
#####################################
# Rsyslog TLS Client Configuration
#####################################

# Load GnuTLS driver for TLS support
module(load="gtls"
    StreamDriver.Name="gtls"
    StreamDriver.Mode="1"
    StreamDriver.AuthMode="x509/name")

# Configure the default stream driver
global(
    DefaultNetstreamDriver="gtls"
    DefaultNetstreamDriverCAFile="/etc/ssl/syslog/ca/ca.crt"
)

# Define the action to forward logs to the TLS server
# The @@@ prefix denotes TCP with TLS (@ = UDP, @@ = TCP, @@@ = TLS)
# However, for clarity, we use the action() syntax below

# Forward all logs to the syslog server over TLS
action(
    type="omfwd"
    target="syslog.example.com"
    port="6514"
    protocol="tcp"
    StreamDriver="gtls"
    StreamDriverMode="1"
    StreamDriverAuthMode="x509/name"
    StreamDriverPermittedPeers="syslog.example.com"
    queue.type="LinkedList"
    queue.size="10000"
    queue.filename="syslog_queue"
    queue.saveonshutdown="on"
    action.resumeRetryCount="-1"
    action.resumeInterval="30"
)
EOF
```

Key configuration details:

- **StreamDriverPermittedPeers** - Must match the server certificate's CN or SAN
- **queue.type="LinkedList"** - Enables memory-efficient queuing
- **queue.saveonshutdown="on"** - Preserves queued messages across restarts
- **action.resumeRetryCount="-1"** - Infinite retries on connection failure
- **action.resumeInterval="30"** - Wait 30 seconds between retry attempts

Apply the client configuration:

```bash
# Validate and restart rsyslog on the client
sudo rsyslogd -N1
sudo systemctl restart rsyslog

# Check for any TLS-related errors in the logs
sudo journalctl -u rsyslog -n 50 --no-pager | grep -i tls
```

---

## Testing Secure Syslog Transmission

Verify that TLS encryption is working correctly using multiple methods.

### Basic Connectivity Test

Send a test message from the client and verify it appears on the server:

```bash
# On the client: send a test message using logger
# The -p flag sets facility.severity (local0.info in this case)
logger -p local0.info "TLS syslog test message from $(hostname) at $(date)"

# On the server: check for the test message
# Adjust the log file path based on your rsyslog configuration
sudo tail -f /var/log/syslog | grep "TLS syslog test"
```

### Verify TLS Connection with OpenSSL

Use OpenSSL s_client to verify the TLS handshake and certificate chain:

```bash
# Test TLS connection from client to server
# This verifies certificates are valid and the connection can be established
openssl s_client -connect syslog.example.com:6514 \
    -CAfile /etc/ssl/syslog/ca/ca.crt \
    -verify_return_error \
    -brief

# For more detailed output including certificate chain
openssl s_client -connect syslog.example.com:6514 \
    -CAfile /etc/ssl/syslog/ca/ca.crt \
    -showcerts

# Send a test syslog message through the SSL connection
echo '<14>1 2026-01-15T10:00:00Z testhost test - - - OpenSSL test message' | \
    openssl s_client -connect syslog.example.com:6514 \
    -CAfile /etc/ssl/syslog/ca/ca.crt \
    -quiet
```

### Packet Capture Verification

Confirm that syslog traffic is actually encrypted by capturing packets:

```bash
# Capture syslog traffic on the server (run as root)
# On port 514 you would see plaintext; on 6514 you should see encrypted data
sudo tcpdump -i any port 6514 -A -c 20

# Compare with unencrypted traffic (if you have legacy port 514 enabled)
# You will see readable syslog messages in the capture
sudo tcpdump -i any port 514 -A -c 20
```

### Check Connection Statistics

Monitor active TLS connections on the server:

```bash
# View established connections on the TLS syslog port
sudo ss -tlnp | grep 6514

# Count active client connections
sudo ss -tn state established '( sport = :6514 )' | wc -l

# View connection details including remote addresses
sudo ss -tn state established '( sport = :6514 )'
```

---

## Certificate Management and Rotation

Production TLS deployments require ongoing certificate maintenance. Certificates expire, keys may be compromised, and CA hierarchies change. Implement a certificate rotation process before you need it.

### Monitoring Certificate Expiration

Create a script to check certificate expiration dates and alert when renewal is needed:

```bash
# Save this script to /usr/local/bin/check-syslog-certs.sh
cat << 'EOF' | sudo tee /usr/local/bin/check-syslog-certs.sh
#!/bin/bash
# Certificate expiration check script for syslog TLS
# Run daily via cron: 0 6 * * * /usr/local/bin/check-syslog-certs.sh

CERT_DIR="/etc/ssl/syslog"
WARN_DAYS=30  # Alert this many days before expiration
CRIT_DAYS=7   # Critical alert threshold

check_cert() {
    local cert_path="$1"
    local cert_name="$2"

    if [[ ! -f "$cert_path" ]]; then
        echo "ERROR: Certificate not found: $cert_path"
        return 1
    fi

    # Get expiration date in epoch seconds
    local expiry_date
    expiry_date=$(openssl x509 -enddate -noout -in "$cert_path" | cut -d= -f2)
    local expiry_epoch
    expiry_epoch=$(date -d "$expiry_date" +%s)
    local now_epoch
    now_epoch=$(date +%s)
    local days_remaining=$(( (expiry_epoch - now_epoch) / 86400 ))

    if [[ $days_remaining -lt 0 ]]; then
        echo "EXPIRED: $cert_name expired $((-days_remaining)) days ago"
        return 2
    elif [[ $days_remaining -lt $CRIT_DAYS ]]; then
        echo "CRITICAL: $cert_name expires in $days_remaining days"
        return 2
    elif [[ $days_remaining -lt $WARN_DAYS ]]; then
        echo "WARNING: $cert_name expires in $days_remaining days"
        return 1
    else
        echo "OK: $cert_name valid for $days_remaining days"
        return 0
    fi
}

# Check all certificates
check_cert "$CERT_DIR/ca/ca.crt" "CA Certificate"
check_cert "$CERT_DIR/server/server.crt" "Server Certificate"

# Check client certificates if they exist
for client_cert in "$CERT_DIR"/clients/*.crt; do
    if [[ -f "$client_cert" ]]; then
        check_cert "$client_cert" "Client: $(basename "$client_cert" .crt)"
    fi
done
EOF

# Make the script executable
sudo chmod +x /usr/local/bin/check-syslog-certs.sh

# Add to cron for daily execution
echo "0 6 * * * root /usr/local/bin/check-syslog-certs.sh | logger -t syslog-certs" | \
    sudo tee /etc/cron.d/check-syslog-certs
```

### Rotating Server Certificates

When renewing server certificates, follow this process to minimize disruption:

```bash
# Step 1: Generate new certificate (before old one expires)
sudo openssl genrsa -out /etc/ssl/syslog/server/server.key.new 2048

sudo openssl req -new \
    -key /etc/ssl/syslog/server/server.key.new \
    -out /etc/ssl/syslog/server/server.csr.new \
    -subj "/C=US/ST=California/L=San Francisco/O=YourCompany/OU=Infrastructure/CN=syslog.example.com"

sudo openssl x509 -req \
    -in /etc/ssl/syslog/server/server.csr.new \
    -CA /etc/ssl/syslog/ca/ca.crt \
    -CAkey /etc/ssl/syslog/ca/ca.key \
    -CAcreateserial \
    -out /etc/ssl/syslog/server/server.crt.new \
    -days 365 \
    -sha256 \
    -extfile /etc/ssl/syslog/server/server.ext

# Step 2: Verify the new certificate
openssl verify -CAfile /etc/ssl/syslog/ca/ca.crt /etc/ssl/syslog/server/server.crt.new

# Step 3: Backup old certificates
sudo cp /etc/ssl/syslog/server/server.key "/etc/ssl/syslog/server/server.key.$(date +%Y%m%d)"
sudo cp /etc/ssl/syslog/server/server.crt "/etc/ssl/syslog/server/server.crt.$(date +%Y%m%d)"

# Step 4: Activate new certificates
sudo mv /etc/ssl/syslog/server/server.key.new /etc/ssl/syslog/server/server.key
sudo mv /etc/ssl/syslog/server/server.crt.new /etc/ssl/syslog/server/server.crt

# Step 5: Set proper permissions
sudo chown syslog:syslog /etc/ssl/syslog/server/server.*
sudo chmod 400 /etc/ssl/syslog/server/server.key
sudo chmod 644 /etc/ssl/syslog/server/server.crt

# Step 6: Restart rsyslog to load new certificates
sudo systemctl restart rsyslog

# Step 7: Verify service is running
sudo systemctl status rsyslog
sudo ss -tlnp | grep 6514
```

---

## syslog-ng TLS Configuration (Alternative)

While rsyslog is Ubuntu's default syslog daemon, syslog-ng offers an alternative with different syntax and features. Some organizations prefer syslog-ng for its flexible message routing and parsing capabilities.

### Installing syslog-ng

First, install syslog-ng and disable rsyslog to avoid conflicts:

```bash
# Install syslog-ng
sudo apt update
sudo apt install syslog-ng -y

# Stop and disable rsyslog to avoid conflicts
sudo systemctl stop rsyslog
sudo systemctl disable rsyslog

# Enable and start syslog-ng
sudo systemctl enable syslog-ng
sudo systemctl start syslog-ng
```

### syslog-ng TLS Server Configuration

Create a syslog-ng configuration file for TLS server functionality:

```bash
# Create syslog-ng TLS configuration
cat << 'EOF' | sudo tee /etc/syslog-ng/conf.d/tls-server.conf
#####################################
# syslog-ng TLS Server Configuration
#####################################

# Define TLS settings
tls tls_settings {
    # Path to CA certificate for client verification
    ca-dir("/etc/ssl/syslog/ca/");

    # Server certificate and key
    cert-file("/etc/ssl/syslog/server/server.crt");
    key-file("/etc/ssl/syslog/server/server.key");

    # Require client certificate verification
    # Options: optional-trusted, optional-untrusted, required-trusted, required-untrusted
    peer-verify(required-trusted);

    # TLS protocol version (disable older insecure versions)
    ssl-options(no-sslv2, no-sslv3, no-tlsv1, no-tlsv11);

    # Strong cipher suites only
    cipher-suite("ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256");
};

# TLS source - listens for encrypted syslog messages
source s_tls {
    network(
        ip("0.0.0.0")
        port(6514)
        transport("tls")
        tls(tls_settings)
        max-connections(500)
        log-fetch-limit(1000)
    );
};

# Destination for received logs
destination d_tls_logs {
    file("/var/log/remote/${HOST}/${YEAR}${MONTH}${DAY}.log"
        create-dirs(yes)
        dir-perm(0755)
        perm(0644)
    );
};

# Log path connecting source to destination
log {
    source(s_tls);
    destination(d_tls_logs);
};
EOF
```

### syslog-ng TLS Client Configuration

Configure syslog-ng clients to forward logs over TLS:

```bash
# Create syslog-ng TLS client configuration
cat << 'EOF' | sudo tee /etc/syslog-ng/conf.d/tls-client.conf
#####################################
# syslog-ng TLS Client Configuration
#####################################

# TLS settings for client
tls tls_client_settings {
    # CA certificate to verify server identity
    ca-dir("/etc/ssl/syslog/ca/");

    # Client certificate and key (for mutual TLS)
    cert-file("/etc/ssl/syslog/clients/client.crt");
    key-file("/etc/ssl/syslog/clients/client.key");

    # Verify server certificate
    peer-verify(required-trusted);

    # TLS protocol and cipher settings
    ssl-options(no-sslv2, no-sslv3, no-tlsv1, no-tlsv11);
    cipher-suite("ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256");
};

# TLS destination - forwards logs to syslog server
destination d_tls_remote {
    network(
        "syslog.example.com"
        port(6514)
        transport("tls")
        tls(tls_client_settings)

        # Disk buffer for reliability during network outages
        disk-buffer(
            mem-buf-size(10485760)     # 10MB memory buffer
            disk-buf-size(1073741824)  # 1GB disk buffer
            reliable(yes)
            dir("/var/spool/syslog-ng/")
        )
    );
};

# Forward all logs to remote server
log {
    source(s_sys);    # Built-in local system source
    destination(d_tls_remote);
};
EOF
```

Restart syslog-ng to apply the configuration:

```bash
# Validate syslog-ng configuration
sudo syslog-ng --syntax-only

# Restart syslog-ng
sudo systemctl restart syslog-ng

# Verify it is running and listening
sudo systemctl status syslog-ng
sudo ss -tlnp | grep 6514
```

---

## Mutual TLS (Client Certificates)

For environments requiring stronger authentication, mutual TLS (mTLS) requires clients to present valid certificates. This prevents unauthorized systems from sending logs to your server, even if they can reach the network.

### Generating Client Certificates

Create certificates for each client that needs to send logs:

```bash
# Generate client private key
sudo openssl genrsa -out /etc/ssl/syslog/clients/client1.key 2048

# Create certificate signing request
# The CN should identify the client (hostname or service name)
sudo openssl req -new \
    -key /etc/ssl/syslog/clients/client1.key \
    -out /etc/ssl/syslog/clients/client1.csr \
    -subj "/C=US/ST=California/L=San Francisco/O=YourCompany/OU=Servers/CN=webserver01.example.com"

# Create client extensions file
cat << 'EOF' | sudo tee /etc/ssl/syslog/clients/client.ext
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = webserver01.example.com
IP.1 = 10.0.1.10
EOF

# Sign the client certificate with the CA
sudo openssl x509 -req \
    -in /etc/ssl/syslog/clients/client1.csr \
    -CA /etc/ssl/syslog/ca/ca.crt \
    -CAkey /etc/ssl/syslog/ca/ca.key \
    -CAcreateserial \
    -out /etc/ssl/syslog/clients/client1.crt \
    -days 365 \
    -sha256 \
    -extfile /etc/ssl/syslog/clients/client.ext

# Set proper permissions
sudo chmod 400 /etc/ssl/syslog/clients/client1.key
sudo chmod 644 /etc/ssl/syslog/clients/client1.crt
```

### Server Configuration for mTLS

Update the rsyslog server configuration to require client certificates:

```bash
# Update server configuration for mutual TLS
cat << 'EOF' | sudo tee /etc/rsyslog.d/10-mtls-server.conf
#####################################
# Rsyslog Mutual TLS Configuration
#####################################

module(load="imtcp")
module(load="gtls"
    StreamDriver.Name="gtls"
    StreamDriver.Mode="1"
    StreamDriver.AuthMode="x509/name")

global(
    DefaultNetstreamDriver="gtls"
    DefaultNetstreamDriverCAFile="/etc/ssl/syslog/ca/ca.crt"
    DefaultNetstreamDriverCertFile="/etc/ssl/syslog/server/server.crt"
    DefaultNetstreamDriverKeyFile="/etc/ssl/syslog/server/server.key"
)

# Listen with mutual TLS requiring client certificates
# AuthMode x509/name validates client certificate CN against PermittedPeer list
input(type="imtcp" port="6514"
    StreamDriver.Name="gtls"
    StreamDriver.Mode="1"
    StreamDriver.AuthMode="x509/name"
    PermittedPeer=["webserver01.example.com", "webserver02.example.com", "dbserver01.example.com"]
)
EOF
```

### Client Configuration for mTLS

Update the client configuration to present its certificate:

```bash
# Update client configuration for mutual TLS
cat << 'EOF' | sudo tee /etc/rsyslog.d/10-mtls-client.conf
#####################################
# Rsyslog Mutual TLS Client
#####################################

module(load="gtls"
    StreamDriver.Name="gtls"
    StreamDriver.Mode="1"
    StreamDriver.AuthMode="x509/name")

global(
    DefaultNetstreamDriver="gtls"
    # CA certificate to verify server
    DefaultNetstreamDriverCAFile="/etc/ssl/syslog/ca/ca.crt"
    # Client certificate and key for authentication
    DefaultNetstreamDriverCertFile="/etc/ssl/syslog/clients/client1.crt"
    DefaultNetstreamDriverKeyFile="/etc/ssl/syslog/clients/client1.key"
)

# Forward logs with mutual TLS authentication
action(
    type="omfwd"
    target="syslog.example.com"
    port="6514"
    protocol="tcp"
    StreamDriver="gtls"
    StreamDriverMode="1"
    StreamDriverAuthMode="x509/name"
    StreamDriverPermittedPeers="syslog.example.com"
    queue.type="LinkedList"
    queue.size="10000"
    queue.filename="syslog_queue"
    queue.saveonshutdown="on"
    action.resumeRetryCount="-1"
)
EOF
```

---

## Firewall Configuration

Proper firewall rules ensure only legitimate traffic reaches your syslog server while blocking unauthorized access.

### UFW Configuration (Ubuntu Default Firewall)

Configure Ubuntu's Uncomplicated Firewall (UFW) for syslog TLS:

```bash
# Enable UFW if not already enabled
sudo ufw enable

# Allow TLS syslog connections from specific networks
# Replace 10.0.0.0/8 with your actual internal network ranges
sudo ufw allow from 10.0.0.0/8 to any port 6514 proto tcp comment 'Syslog TLS from internal network'

# Allow from specific hosts only (more restrictive)
sudo ufw allow from 10.0.1.10 to any port 6514 proto tcp comment 'Syslog from webserver01'
sudo ufw allow from 10.0.1.11 to any port 6514 proto tcp comment 'Syslog from webserver02'

# Block legacy unencrypted syslog (if you want to enforce TLS-only)
sudo ufw deny 514/tcp comment 'Block unencrypted syslog TCP'
sudo ufw deny 514/udp comment 'Block unencrypted syslog UDP'

# Verify firewall rules
sudo ufw status verbose
```

### iptables Configuration (Advanced)

For environments using iptables directly, configure rules with rate limiting to prevent abuse:

```bash
# Create a new chain for syslog traffic
sudo iptables -N SYSLOG_TLS

# Allow established connections
sudo iptables -A SYSLOG_TLS -m state --state ESTABLISHED,RELATED -j ACCEPT

# Rate limit new connections to prevent DoS
# Allow 20 new connections per minute from each source IP
sudo iptables -A SYSLOG_TLS -m state --state NEW -m recent --set
sudo iptables -A SYSLOG_TLS -m state --state NEW -m recent --update --seconds 60 --hitcount 20 -j DROP

# Allow from trusted network ranges
sudo iptables -A SYSLOG_TLS -s 10.0.0.0/8 -m state --state NEW -j ACCEPT

# Drop everything else
sudo iptables -A SYSLOG_TLS -j DROP

# Apply chain to INPUT for port 6514
sudo iptables -A INPUT -p tcp --dport 6514 -j SYSLOG_TLS

# Save rules to persist across reboots
sudo netfilter-persistent save
```

### Network Segmentation Considerations

For enhanced security, consider:

- Placing syslog servers in a dedicated management VLAN
- Using VPN tunnels for syslog from remote sites
- Implementing network access control lists (ACLs) on switches and routers
- Monitoring for unusual syslog traffic patterns that might indicate compromise

---

## Troubleshooting TLS Issues

TLS syslog issues often involve certificate problems, network connectivity, or configuration errors. Use these techniques to diagnose problems.

### Common Error Messages and Solutions

Review rsyslog error messages and their solutions:

```bash
# Check rsyslog logs for TLS-related errors
sudo journalctl -u rsyslog -n 100 --no-pager | grep -i -E "(tls|ssl|gnutls|certificate|error)"

# Common error patterns and solutions:
#
# "certificate verification failed"
#   - CA certificate not found or incorrect path
#   - Certificate expired or not yet valid
#   - CN/SAN mismatch with PermittedPeer
#
# "unable to load private key"
#   - Wrong file permissions on key file
#   - Key file corrupted or wrong format
#
# "connection refused"
#   - Server not listening on port 6514
#   - Firewall blocking the connection
#
# "peer did not return a certificate"
#   - Client not configured with certificate for mTLS
#   - Certificate path incorrect on client
```

### Debugging Certificate Issues

Verify certificate validity and chain:

```bash
# Check certificate expiration
openssl x509 -in /etc/ssl/syslog/server/server.crt -noout -dates

# Verify certificate chain
openssl verify -CAfile /etc/ssl/syslog/ca/ca.crt /etc/ssl/syslog/server/server.crt

# Check certificate subject and issuer
openssl x509 -in /etc/ssl/syslog/server/server.crt -noout -subject -issuer

# Display full certificate details
openssl x509 -in /etc/ssl/syslog/server/server.crt -text -noout

# Check if certificate matches private key
CERT_MOD=$(openssl x509 -noout -modulus -in /etc/ssl/syslog/server/server.crt | md5sum)
KEY_MOD=$(openssl rsa -noout -modulus -in /etc/ssl/syslog/server/server.key | md5sum)
if [ "$CERT_MOD" == "$KEY_MOD" ]; then
    echo "Certificate and key match"
else
    echo "ERROR: Certificate and key DO NOT match"
fi
```

### Testing TLS Handshake

Debug TLS handshake failures:

```bash
# Verbose TLS connection test
openssl s_client -connect syslog.example.com:6514 \
    -CAfile /etc/ssl/syslog/ca/ca.crt \
    -state \
    -debug \
    -msg

# Test with specific TLS version
openssl s_client -connect syslog.example.com:6514 \
    -CAfile /etc/ssl/syslog/ca/ca.crt \
    -tls1_2

# Check supported cipher suites
openssl s_client -connect syslog.example.com:6514 \
    -CAfile /etc/ssl/syslog/ca/ca.crt \
    -cipher 'ALL:!aNULL' \
    -showcerts
```

### Enabling Debug Logging

Temporarily enable debug logging to diagnose issues:

```bash
# Add debug logging to rsyslog configuration
cat << 'EOF' | sudo tee /etc/rsyslog.d/00-debug.conf
# Temporary debug configuration - remove after troubleshooting
global(debug.logfile="/var/log/rsyslog-debug.log")
$DebugLevel 2
EOF

# Restart rsyslog to enable debug logging
sudo systemctl restart rsyslog

# Watch debug log for TLS-related messages
sudo tail -f /var/log/rsyslog-debug.log | grep -i tls

# IMPORTANT: Remove debug config when done (it generates lots of output)
sudo rm /etc/rsyslog.d/00-debug.conf
sudo systemctl restart rsyslog
```

---

## Performance Considerations

TLS encryption adds CPU overhead and latency to syslog operations. Plan capacity and optimize performance for production workloads.

### CPU and Memory Impact

Understand the performance impact of TLS:

```bash
# Monitor rsyslog CPU usage under load
top -p $(pgrep rsyslogd)

# Check rsyslog memory consumption
ps aux | grep rsyslogd

# Monitor TLS handshakes per second (network traffic)
sudo ss -tn state established '( sport = :6514 )' | wc -l
```

### Optimizing Rsyslog for High Volume

Configure rsyslog for high-volume TLS syslog environments:

```bash
# High-performance rsyslog configuration
cat << 'EOF' | sudo tee /etc/rsyslog.d/05-performance.conf
#####################################
# Performance Optimization Settings
#####################################

# Main message queue settings
main_queue(
    queue.type="LinkedList"       # Memory-efficient queue type
    queue.size="500000"           # Maximum queue size
    queue.dequeuebatchsize="2000" # Process messages in batches
    queue.workerthreads="4"       # Worker threads for processing
    queue.workerThreadMinimumMessages="10000"  # Min messages before adding workers
)

# Global processing settings
global(
    processInternalMessages="on"
    workDirectory="/var/spool/rsyslog"
    maxMessageSize="64k"          # Max message size
)

# Action queue for network destinations (prevents blocking)
module(load="omfwd")
EOF
```

### Connection Pooling and Batching

Optimize client-side performance with connection persistence:

```bash
# Client configuration with connection optimization
cat << 'EOF' | sudo tee /etc/rsyslog.d/15-optimized-client.conf
#####################################
# Optimized TLS Client Configuration
#####################################

module(load="gtls")

global(
    DefaultNetstreamDriver="gtls"
    DefaultNetstreamDriverCAFile="/etc/ssl/syslog/ca/ca.crt"
)

# Optimized forwarding action with batching
action(
    type="omfwd"
    target="syslog.example.com"
    port="6514"
    protocol="tcp"
    StreamDriver="gtls"
    StreamDriverMode="1"
    StreamDriverAuthMode="x509/name"
    StreamDriverPermittedPeers="syslog.example.com"

    # Queue configuration for performance
    queue.type="LinkedList"
    queue.size="100000"           # Large queue for burst handling
    queue.filename="syslog_fwd"
    queue.saveonshutdown="on"
    queue.maxdiskspace="1g"       # Max disk space for queue
    queue.timeoutenqueue="0"      # Don't block if queue is full

    # Batching for network efficiency
    action.resumeRetryCount="-1"
    action.resumeInterval="10"

    # Keep connection alive
    RebindInterval="0"            # Don't reconnect periodically
)
EOF
```

### Benchmarking TLS Syslog

Measure your TLS syslog throughput:

```bash
# Generate test load and measure throughput
# Install logger-benchmark tool or use a loop

# Simple benchmark script
cat << 'EOF' | sudo tee /usr/local/bin/syslog-benchmark.sh
#!/bin/bash
# Syslog throughput benchmark

MESSAGES=10000
START=$(date +%s.%N)

for i in $(seq 1 $MESSAGES); do
    logger -p local0.info "Benchmark message $i - timestamp $(date +%s.%N)"
done

END=$(date +%s.%N)
DURATION=$(echo "$END - $START" | bc)
RATE=$(echo "scale=2; $MESSAGES / $DURATION" | bc)

echo "Sent $MESSAGES messages in $DURATION seconds"
echo "Throughput: $RATE messages/second"
EOF

sudo chmod +x /usr/local/bin/syslog-benchmark.sh

# Run the benchmark
/usr/local/bin/syslog-benchmark.sh
```

---

## High Availability Setup

Production syslog infrastructure requires redundancy to ensure log collection continues during failures.

### Active-Passive Configuration with Keepalived

Set up a floating IP address that moves between syslog servers:

```bash
# Install keepalived on both primary and secondary syslog servers
sudo apt install keepalived -y

# Primary server configuration
cat << 'EOF' | sudo tee /etc/keepalived/keepalived.conf
# Keepalived configuration for syslog HA
# Primary server configuration

global_defs {
    router_id SYSLOG_PRIMARY
}

vrrp_script check_rsyslog {
    script "/usr/bin/systemctl is-active rsyslog"
    interval 2      # Check every 2 seconds
    weight -50      # Reduce priority by 50 if rsyslog is down
}

vrrp_instance SYSLOG_VIP {
    state MASTER
    interface eth0              # Change to your network interface
    virtual_router_id 51
    priority 100                # Higher priority = master
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass syslog_secret  # Change this password
    }

    virtual_ipaddress {
        10.0.0.200/24           # Virtual IP for syslog service
    }

    track_script {
        check_rsyslog
    }
}
EOF

# Secondary server configuration (slightly different)
# Priority is lower (90 vs 100) and state is BACKUP
```

### Load Balancing with HAProxy

For higher throughput, use HAProxy to distribute connections across multiple syslog servers:

```bash
# Install HAProxy
sudo apt install haproxy -y

# HAProxy configuration for syslog load balancing
cat << 'EOF' | sudo tee /etc/haproxy/haproxy.cfg
global
    log /dev/log local0
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # TLS settings
    ssl-default-bind-ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256
    ssl-default-bind-options no-sslv3 no-tlsv10 no-tlsv11
    tune.ssl.default-dh-param 2048

defaults
    log     global
    mode    tcp
    option  tcplog
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms

# Syslog TLS frontend
frontend syslog_tls_frontend
    bind *:6514 ssl crt /etc/ssl/syslog/server/server.pem ca-file /etc/ssl/syslog/ca/ca.crt verify required
    default_backend syslog_servers

# Backend syslog servers
backend syslog_servers
    balance roundrobin
    option tcp-check

    # Health check on TLS port
    server syslog1 10.0.0.101:6514 check port 6514 inter 5000 rise 2 fall 3
    server syslog2 10.0.0.102:6514 check port 6514 inter 5000 rise 2 fall 3
    server syslog3 10.0.0.103:6514 check port 6514 inter 5000 rise 2 fall 3

# Statistics page
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    stats admin if LOCALHOST
EOF

# Create combined certificate file for HAProxy
# HAProxy requires certificate and key in a single PEM file
sudo cat /etc/ssl/syslog/server/server.crt /etc/ssl/syslog/server/server.key | \
    sudo tee /etc/ssl/syslog/server/server.pem
sudo chmod 600 /etc/ssl/syslog/server/server.pem
sudo chown haproxy:haproxy /etc/ssl/syslog/server/server.pem

# Restart HAProxy
sudo systemctl restart haproxy
```

### Client Configuration for HA

Configure clients to failover between syslog servers:

```bash
# Client configuration with failover servers
cat << 'EOF' | sudo tee /etc/rsyslog.d/10-tls-client-ha.conf
#####################################
# HA-aware TLS Client Configuration
#####################################

module(load="gtls")

global(
    DefaultNetstreamDriver="gtls"
    DefaultNetstreamDriverCAFile="/etc/ssl/syslog/ca/ca.crt"
)

# Primary syslog server
action(
    type="omfwd"
    target="syslog-primary.example.com"
    port="6514"
    protocol="tcp"
    StreamDriver="gtls"
    StreamDriverMode="1"
    StreamDriverAuthMode="x509/name"
    StreamDriverPermittedPeers="syslog-primary.example.com"
    queue.type="LinkedList"
    queue.size="50000"
    queue.filename="syslog_primary"
    queue.saveonshutdown="on"
    action.resumeRetryCount="3"      # Try 3 times before failover
    action.resumeInterval="5"
    action.execOnlyWhenPreviousIsSuspended="off"
)

# Failover to secondary server if primary fails
action(
    type="omfwd"
    target="syslog-secondary.example.com"
    port="6514"
    protocol="tcp"
    StreamDriver="gtls"
    StreamDriverMode="1"
    StreamDriverAuthMode="x509/name"
    StreamDriverPermittedPeers="syslog-secondary.example.com"
    queue.type="LinkedList"
    queue.size="50000"
    queue.filename="syslog_secondary"
    queue.saveonshutdown="on"
    action.resumeRetryCount="-1"
    action.resumeInterval="10"
    action.execOnlyWhenPreviousIsSuspended="on"  # Only use when primary is down
)
EOF
```

---

## Summary

Securing syslog with TLS on Ubuntu involves several key steps:

1. **Certificate infrastructure** - Generate a private CA and issue server/client certificates with proper Subject Alternative Names.

2. **Server configuration** - Configure rsyslog or syslog-ng to listen on port 6514 with TLS encryption, specifying certificate paths and authentication modes.

3. **Client configuration** - Set up forwarding with TLS enabled, including disk-based queues for reliability during network outages.

4. **Mutual TLS** - For high-security environments, require client certificates to authenticate syslog sources.

5. **Certificate management** - Implement monitoring for certificate expiration and establish rotation procedures before you need them.

6. **Firewall rules** - Restrict access to the TLS syslog port from trusted networks only.

7. **High availability** - Deploy redundant syslog servers with keepalived or HAProxy for production resilience.

TLS encryption ensures your log data remains confidential and tamper-evident during transit. Combined with proper certificate management and access controls, you can build a syslog infrastructure that meets compliance requirements while providing reliable centralized logging.

---

## Monitor Your TLS Syslog Infrastructure with OneUptime

Once you have TLS syslog configured, [OneUptime](https://oneuptime.com) can help you monitor and observe your entire logging infrastructure:

- **Native syslog ingestion** - Forward your TLS-encrypted syslog directly to OneUptime over HTTPS. We parse RFC3164 and RFC5424 messages automatically, extracting severity, facility, and structured data into searchable attributes.

- **Certificate expiration alerts** - Create monitors that alert your team before TLS certificates expire, preventing unexpected outages.

- **Log volume monitoring** - Track syslog message rates and alert on anomalies that might indicate logging failures or security incidents.

- **Unified observability** - Combine syslog data with metrics, traces, and application logs in a single platform. Query across all your telemetry without switching tools.

- **Incident management** - When syslog alerts fire, OneUptime routes notifications to on-call engineers, tracks incident status, and updates status pages automatically.

OneUptime is open source and can be self-hosted or used as a managed service. Visit [oneuptime.com](https://oneuptime.com) to get started with comprehensive infrastructure monitoring.

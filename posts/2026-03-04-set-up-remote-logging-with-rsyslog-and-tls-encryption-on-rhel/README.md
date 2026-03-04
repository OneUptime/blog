# How to Set Up Remote Logging with rsyslog and TLS Encryption on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, rsyslog, TLS, Encryption, Logging, Security

Description: Secure your centralized log collection by configuring rsyslog with TLS encryption on RHEL, preventing log data from being intercepted or tampered with in transit.

---

Sending logs in plain text across a network is a security risk. Anyone with network access can read sensitive information in your log messages. TLS encryption for rsyslog solves this by encrypting log traffic between clients and the central log server.

## Generate TLS Certificates

You need a CA certificate, a server certificate, and client certificates.

```bash
# Install the certificate generation tool
sudo dnf install -y openssl

# Create a directory for certificates
sudo mkdir -p /etc/rsyslog-tls

# Generate a CA key and certificate
sudo openssl genrsa -out /etc/rsyslog-tls/ca-key.pem 2048
sudo openssl req -new -x509 -key /etc/rsyslog-tls/ca-key.pem \
    -out /etc/rsyslog-tls/ca.pem -days 3650 \
    -subj "/CN=Syslog CA"

# Generate server key and certificate
sudo openssl genrsa -out /etc/rsyslog-tls/server-key.pem 2048
sudo openssl req -new -key /etc/rsyslog-tls/server-key.pem \
    -out /etc/rsyslog-tls/server-req.pem \
    -subj "/CN=logserver.example.com"
sudo openssl x509 -req -in /etc/rsyslog-tls/server-req.pem \
    -CA /etc/rsyslog-tls/ca.pem -CAkey /etc/rsyslog-tls/ca-key.pem \
    -CAcreateserial -out /etc/rsyslog-tls/server-cert.pem -days 3650

# Generate client key and certificate
sudo openssl genrsa -out /etc/rsyslog-tls/client-key.pem 2048
sudo openssl req -new -key /etc/rsyslog-tls/client-key.pem \
    -out /etc/rsyslog-tls/client-req.pem \
    -subj "/CN=client.example.com"
sudo openssl x509 -req -in /etc/rsyslog-tls/client-req.pem \
    -CA /etc/rsyslog-tls/ca.pem -CAkey /etc/rsyslog-tls/ca-key.pem \
    -CAcreateserial -out /etc/rsyslog-tls/client-cert.pem -days 3650
```

## Configure the Log Server

```bash
# Install the TLS module for rsyslog
sudo dnf install -y rsyslog-gnutls

# Create /etc/rsyslog.d/tls-server.conf
sudo tee /etc/rsyslog.d/tls-server.conf << 'EOF'
# Load the GnuTLS stream driver
global(
    DefaultNetstreamDriver="gtls"
    DefaultNetstreamDriverCAFile="/etc/rsyslog-tls/ca.pem"
    DefaultNetstreamDriverCertFile="/etc/rsyslog-tls/server-cert.pem"
    DefaultNetstreamDriverKeyFile="/etc/rsyslog-tls/server-key.pem"
)

# Listen on TCP port 6514 with TLS
module(load="imtcp" StreamDriver.Name="gtls"
    StreamDriver.Mode="1" StreamDriver.AuthMode="x509/name")

input(type="imtcp" port="6514")
EOF

# Restart rsyslog
sudo systemctl restart rsyslog
```

## Configure the Client

Copy `ca.pem`, `client-cert.pem`, and `client-key.pem` to each client server.

```bash
# Install the TLS module on the client
sudo dnf install -y rsyslog-gnutls

# Create /etc/rsyslog.d/tls-client.conf
sudo tee /etc/rsyslog.d/tls-client.conf << 'EOF'
global(
    DefaultNetstreamDriver="gtls"
    DefaultNetstreamDriverCAFile="/etc/rsyslog-tls/ca.pem"
    DefaultNetstreamDriverCertFile="/etc/rsyslog-tls/client-cert.pem"
    DefaultNetstreamDriverKeyFile="/etc/rsyslog-tls/client-key.pem"
)

# Forward all logs over TLS
action(
    type="omfwd"
    target="logserver.example.com"
    port="6514"
    protocol="tcp"
    StreamDriver="gtls"
    StreamDriverMode="1"
    StreamDriverAuthMode="x509/name"
    StreamDriverPermittedPeers="logserver.example.com"
)
EOF

sudo systemctl restart rsyslog
```

## Open the Firewall

```bash
# On the server, allow port 6514
sudo firewall-cmd --permanent --add-port=6514/tcp
sudo firewall-cmd --reload
```

## Verify TLS Logging

```bash
# Send a test message from the client
logger "TLS test from $(hostname)"

# Check on the server
sudo tail -f /var/log/messages
```

All log traffic between client and server is now encrypted, protecting sensitive information in transit.

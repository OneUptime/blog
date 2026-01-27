# How to Secure RabbitMQ with TLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, TLS, Security, Message Queue, Encryption, Certificates, DevOps

Description: A comprehensive guide to securing RabbitMQ with TLS encryption, covering certificate generation, server configuration, client connections, mutual TLS, cipher suites, and certificate rotation.

---

> Transport Layer Security (TLS) is not optional for production message queues. Every message passing through RabbitMQ without encryption is a potential data breach waiting to happen. This guide walks you through securing RabbitMQ properly.

## Why TLS for RabbitMQ?

RabbitMQ often handles sensitive data - user events, payment notifications, authentication tokens. Without TLS:

- Messages travel in plaintext across the network
- Credentials are exposed during connection handshakes
- Man-in-the-middle attacks become trivial
- Compliance requirements (PCI-DSS, HIPAA, SOC2) are violated

## Certificate Generation

Before configuring RabbitMQ, you need certificates. For production, use a proper Certificate Authority (CA). For development and testing, self-signed certificates work.

### Creating a Self-Signed CA

```bash
# Create directory structure for certificates
mkdir -p /etc/rabbitmq/ssl
cd /etc/rabbitmq/ssl

# Generate the CA private key (4096 bits for stronger security)
openssl genrsa -out ca.key 4096

# Generate the CA certificate (valid for 10 years)
# The CA certificate is used to sign server and client certificates
openssl req -x509 -new -nodes \
    -key ca.key \
    -sha256 \
    -days 3650 \
    -out ca.crt \
    -subj "/C=US/ST=California/L=San Francisco/O=MyOrg/OU=Infrastructure/CN=RabbitMQ-CA"
```

### Generating Server Certificates

```bash
# Generate server private key
openssl genrsa -out server.key 4096

# Create a certificate signing request (CSR)
# Replace rabbitmq.example.com with your actual hostname
openssl req -new \
    -key server.key \
    -out server.csr \
    -subj "/C=US/ST=California/L=San Francisco/O=MyOrg/OU=Infrastructure/CN=rabbitmq.example.com"

# Create a configuration file for Subject Alternative Names (SAN)
# This allows the certificate to be valid for multiple hostnames
cat > server.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
# Add all hostnames and IPs that clients will use to connect
DNS.1 = rabbitmq.example.com
DNS.2 = localhost
DNS.3 = rabbitmq
IP.1 = 127.0.0.1
IP.2 = 192.168.1.100
EOF

# Sign the server certificate with the CA
# Valid for 1 year - plan for rotation before expiry
openssl x509 -req \
    -in server.csr \
    -CA ca.crt \
    -CAkey ca.key \
    -CAcreateserial \
    -out server.crt \
    -days 365 \
    -sha256 \
    -extfile server.ext
```

### Generating Client Certificates (for Mutual TLS)

```bash
# Generate client private key
openssl genrsa -out client.key 4096

# Create client CSR
# Use a descriptive CN to identify the client application
openssl req -new \
    -key client.key \
    -out client.csr \
    -subj "/C=US/ST=California/L=San Francisco/O=MyOrg/OU=Applications/CN=my-app-client"

# Create client certificate extensions
cat > client.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
EOF

# Sign the client certificate
openssl x509 -req \
    -in client.csr \
    -CA ca.crt \
    -CAkey ca.key \
    -CAcreateserial \
    -out client.crt \
    -days 365 \
    -sha256 \
    -extfile client.ext
```

### Verifying Certificates

```bash
# Verify the certificate chain
openssl verify -CAfile ca.crt server.crt
openssl verify -CAfile ca.crt client.crt

# View certificate details
openssl x509 -in server.crt -text -noout

# Check certificate expiration date
openssl x509 -in server.crt -noout -enddate

# Set proper file permissions
chmod 600 *.key
chmod 644 *.crt
chown rabbitmq:rabbitmq /etc/rabbitmq/ssl/*
```

## RabbitMQ TLS Configuration

Configure TLS in the RabbitMQ configuration file. Modern RabbitMQ versions use `rabbitmq.conf` (sysctl format) or `advanced.config` for complex settings.

### Basic TLS Configuration (rabbitmq.conf)

```ini
# /etc/rabbitmq/rabbitmq.conf

# ===========================================
# TLS/SSL Configuration
# ===========================================

# Enable TLS listener on port 5671 (standard AMQPS port)
listeners.ssl.default = 5671

# Disable non-TLS listener for security
# Comment this out if you need plaintext connections during migration
listeners.tcp.default = none

# Path to SSL certificates
ssl_options.cacertfile = /etc/rabbitmq/ssl/ca.crt
ssl_options.certfile   = /etc/rabbitmq/ssl/server.crt
ssl_options.keyfile    = /etc/rabbitmq/ssl/server.key

# Require client certificate verification (for mutual TLS)
# Set to verify_none to allow connections without client certs
ssl_options.verify     = verify_peer

# Reject connections if client does not provide a valid certificate
ssl_options.fail_if_no_peer_cert = true

# TLS version - only allow TLS 1.2 and 1.3
ssl_options.versions.1 = tlsv1.3
ssl_options.versions.2 = tlsv1.2

# Server name indication (SNI) for virtual hosts
ssl_options.honor_cipher_order = true

# ===========================================
# Management Plugin TLS (Web UI and API)
# ===========================================

management.ssl.port       = 15671
management.ssl.cacertfile = /etc/rabbitmq/ssl/ca.crt
management.ssl.certfile   = /etc/rabbitmq/ssl/server.crt
management.ssl.keyfile    = /etc/rabbitmq/ssl/server.key
management.ssl.versions.1 = tlsv1.3
management.ssl.versions.2 = tlsv1.2
```

### Advanced Configuration (advanced.config)

For complex cipher suite configuration, use `advanced.config` in Erlang term format:

```erlang
%% /etc/rabbitmq/advanced.config

[
  {rabbit, [
    %% Additional SSL options not available in rabbitmq.conf
    {ssl_options, [
      %% Depth of certificate chain verification
      %% 1 = CA + server cert, increase for intermediate CAs
      {depth, 2},

      %% CRL (Certificate Revocation List) checking
      {crl_check, peer},

      %% Customize SSL handshake timeout (milliseconds)
      {handshake_timeout, 10000},

      %% Enable secure renegotiation
      {secure_renegotiate, true},

      %% Reuse sessions for performance
      {reuse_sessions, true}
    ]}
  ]},

  {rabbitmq_management, [
    {ssl_config, [
      {depth, 2},
      {crl_check, peer}
    ]}
  ]}
].
```

### Inter-Node TLS (Clustering)

For RabbitMQ clusters, encrypt inter-node communication:

```ini
# /etc/rabbitmq/rabbitmq.conf

# Enable TLS for Erlang distribution (inter-node communication)
cluster_formation.peer_discovery_backend = rabbit_peer_discovery_classic_config

# Specify cluster nodes
cluster_formation.classic_config.nodes.1 = rabbit@node1.example.com
cluster_formation.classic_config.nodes.2 = rabbit@node2.example.com
cluster_formation.classic_config.nodes.3 = rabbit@node3.example.com
```

Create an Erlang SSL configuration file for distribution:

```erlang
%% /etc/rabbitmq/inter_node_tls.config

[
  {server, [
    {cacertfile, "/etc/rabbitmq/ssl/ca.crt"},
    {certfile,   "/etc/rabbitmq/ssl/server.crt"},
    {keyfile,    "/etc/rabbitmq/ssl/server.key"},
    {secure_renegotiate, true},
    {verify, verify_peer},
    {fail_if_no_peer_cert, true}
  ]},
  {client, [
    {cacertfile, "/etc/rabbitmq/ssl/ca.crt"},
    {certfile,   "/etc/rabbitmq/ssl/server.crt"},
    {keyfile,    "/etc/rabbitmq/ssl/server.key"},
    {secure_renegotiate, true},
    {verify, verify_peer}
  ]}
].
```

Set the environment variable to enable inter-node TLS:

```bash
# /etc/rabbitmq/rabbitmq-env.conf
RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS="-proto_dist inet_tls -ssl_dist_optfile /etc/rabbitmq/inter_node_tls.config"
RABBITMQ_CTL_ERL_ARGS="-proto_dist inet_tls -ssl_dist_optfile /etc/rabbitmq/inter_node_tls.config"
```

## Client Connection Configuration

### Python (pika)

```python
import ssl
import pika

# Create SSL context with certificate verification
ssl_context = ssl.create_default_context(
    cafile="/path/to/ca.crt"
)

# For mutual TLS, load client certificate
ssl_context.load_cert_chain(
    certfile="/path/to/client.crt",
    keyfile="/path/to/client.key"
)

# Enforce TLS 1.2 minimum
ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2

# Create connection parameters
credentials = pika.PlainCredentials('username', 'password')
parameters = pika.ConnectionParameters(
    host='rabbitmq.example.com',
    port=5671,  # AMQPS port
    virtual_host='/',
    credentials=credentials,
    ssl_options=pika.SSLOptions(ssl_context)
)

# Connect to RabbitMQ
connection = pika.BlockingConnection(parameters)
channel = connection.channel()

# Declare a queue and publish a message
channel.queue_declare(queue='secure_queue', durable=True)
channel.basic_publish(
    exchange='',
    routing_key='secure_queue',
    body='Encrypted message!'
)

connection.close()
```

### Node.js (amqplib)

```javascript
const amqp = require('amqplib');
const fs = require('fs');

async function connectToRabbitMQ() {
  // TLS connection options
  const options = {
    // CA certificate for server verification
    ca: [fs.readFileSync('/path/to/ca.crt')],

    // Client certificate for mutual TLS
    cert: fs.readFileSync('/path/to/client.crt'),
    key: fs.readFileSync('/path/to/client.key'),

    // Verify server certificate
    rejectUnauthorized: true,

    // Server name for SNI
    servername: 'rabbitmq.example.com'
  };

  // Connection URL with amqps:// scheme
  const url = 'amqps://username:password@rabbitmq.example.com:5671/';

  try {
    // Connect with TLS options
    const connection = await amqp.connect(url, options);
    const channel = await connection.createChannel();

    // Declare queue and publish message
    await channel.assertQueue('secure_queue', { durable: true });
    channel.sendToQueue('secure_queue', Buffer.from('Encrypted message!'));

    console.log('Message sent securely');

    await channel.close();
    await connection.close();
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

connectToRabbitMQ();
```

### Java (Spring AMQP)

```java
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import java.io.FileInputStream;
import java.security.KeyStore;

@Configuration
public class RabbitMQTLSConfig {

    @Bean
    public CachingConnectionFactory connectionFactory() throws Exception {
        // Load CA certificate into trust store
        KeyStore trustStore = KeyStore.getInstance("PKCS12");
        trustStore.load(
            new FileInputStream("/path/to/truststore.p12"),
            "truststorepassword".toCharArray()
        );

        TrustManagerFactory tmf = TrustManagerFactory
            .getInstance(TrustManagerFactory.getDefaultAlgorithm());
        tmf.init(trustStore);

        // Load client certificate for mutual TLS
        KeyStore keyStore = KeyStore.getInstance("PKCS12");
        keyStore.load(
            new FileInputStream("/path/to/keystore.p12"),
            "keystorepassword".toCharArray()
        );

        KeyManagerFactory kmf = KeyManagerFactory
            .getInstance(KeyManagerFactory.getDefaultAlgorithm());
        kmf.init(keyStore, "keystorepassword".toCharArray());

        // Create SSL context with TLS 1.2+
        SSLContext sslContext = SSLContext.getInstance("TLSv1.3");
        sslContext.init(kmf.getKeyManagers(), tmf.getTrustManagers(), null);

        // Configure connection factory
        CachingConnectionFactory factory = new CachingConnectionFactory();
        factory.setHost("rabbitmq.example.com");
        factory.setPort(5671);
        factory.setUsername("username");
        factory.setPassword("password");
        factory.getRabbitConnectionFactory().useSslProtocol(sslContext);

        return factory;
    }

    @Bean
    public RabbitTemplate rabbitTemplate(CachingConnectionFactory factory) {
        return new RabbitTemplate(factory);
    }
}
```

### Go (amqp091-go)

```go
package main

import (
    "crypto/tls"
    "crypto/x509"
    "log"
    "os"

    amqp "github.com/rabbitmq/amqp091-go"
)

func main() {
    // Load CA certificate
    caCert, err := os.ReadFile("/path/to/ca.crt")
    if err != nil {
        log.Fatal(err)
    }
    caCertPool := x509.NewCertPool()
    caCertPool.AppendCertsFromPEM(caCert)

    // Load client certificate for mutual TLS
    clientCert, err := tls.LoadX509KeyPair(
        "/path/to/client.crt",
        "/path/to/client.key",
    )
    if err != nil {
        log.Fatal(err)
    }

    // Configure TLS
    tlsConfig := &tls.Config{
        RootCAs:      caCertPool,
        Certificates: []tls.Certificate{clientCert},
        MinVersion:   tls.VersionTLS12,
        ServerName:   "rabbitmq.example.com",
    }

    // Connect to RabbitMQ with TLS
    conn, err := amqp.DialTLS(
        "amqps://username:password@rabbitmq.example.com:5671/",
        tlsConfig,
    )
    if err != nil {
        log.Fatal("Failed to connect:", err)
    }
    defer conn.Close()

    ch, err := conn.Channel()
    if err != nil {
        log.Fatal("Failed to open channel:", err)
    }
    defer ch.Close()

    // Declare queue and publish message
    q, err := ch.QueueDeclare("secure_queue", true, false, false, false, nil)
    if err != nil {
        log.Fatal(err)
    }

    err = ch.Publish("", q.Name, false, false, amqp.Publishing{
        ContentType: "text/plain",
        Body:        []byte("Encrypted message!"),
    })
    if err != nil {
        log.Fatal(err)
    }

    log.Println("Message sent securely")
}
```

## Mutual TLS (mTLS) Configuration

Mutual TLS provides two-way authentication - the server verifies the client, and the client verifies the server.

### Server Configuration for mTLS

```ini
# /etc/rabbitmq/rabbitmq.conf

# Require client certificate verification
ssl_options.verify = verify_peer
ssl_options.fail_if_no_peer_cert = true

# Certificate depth for chain validation
ssl_options.depth = 2
```

### Extracting Username from Client Certificate

RabbitMQ can extract the username from the client certificate CN field:

```ini
# /etc/rabbitmq/rabbitmq.conf

# Use certificate CN as username
auth_mechanisms.1 = EXTERNAL
ssl_cert_login_from = common_name

# Or use the full distinguished name
# ssl_cert_login_from = distinguished_name
```

```erlang
%% /etc/rabbitmq/advanced.config

[
  {rabbit, [
    {ssl_cert_login_from, common_name},
    {auth_mechanisms, ['EXTERNAL', 'PLAIN']}
  ]}
].
```

Create a user that matches the certificate CN:

```bash
# Create user matching the certificate CN
rabbitmqctl add_user my-app-client ""

# Set permissions
rabbitmqctl set_permissions -p / my-app-client ".*" ".*" ".*"

# Tag as management user if needed
rabbitmqctl set_user_tags my-app-client monitoring
```

## Cipher Suite Configuration

Control which cipher suites RabbitMQ accepts to ensure strong encryption.

### Recommended Cipher Suites

```erlang
%% /etc/rabbitmq/advanced.config

[
  {rabbit, [
    {ssl_options, [
      {versions, ['tlsv1.3', 'tlsv1.2']},

      %% TLS 1.3 cipher suites (configured automatically)
      %% TLS_AES_256_GCM_SHA384
      %% TLS_AES_128_GCM_SHA256
      %% TLS_CHACHA20_POLY1305_SHA256

      %% TLS 1.2 cipher suites - only strong ciphers
      {ciphers, [
        %% ECDHE with AES-GCM (preferred)
        "ECDHE-ECDSA-AES256-GCM-SHA384",
        "ECDHE-RSA-AES256-GCM-SHA384",
        "ECDHE-ECDSA-AES128-GCM-SHA256",
        "ECDHE-RSA-AES128-GCM-SHA256",

        %% ECDHE with ChaCha20-Poly1305
        "ECDHE-ECDSA-CHACHA20-POLY1305",
        "ECDHE-RSA-CHACHA20-POLY1305"
      ]},

      %% Prefer server cipher order
      {honor_cipher_order, true},

      %% Secure elliptic curves
      {eccs, [secp384r1, secp256r1]}
    ]}
  ]}
].
```

### Disabling Weak Ciphers

```bash
# Test current cipher support
openssl s_client -connect rabbitmq.example.com:5671 -tls1_2

# List available ciphers
rabbitmq-diagnostics cipher_suites --format openssl

# Verify no weak ciphers are enabled
nmap --script ssl-enum-ciphers -p 5671 rabbitmq.example.com
```

### Cipher Suite Best Practices

Ciphers to avoid:

- **RC4** - Broken, disable completely
- **DES/3DES** - Weak, vulnerable to SWEET32
- **MD5** - Weak hash, easily collided
- **SHA1** - Deprecated for certificates
- **Export ciphers** - Intentionally weak
- **NULL ciphers** - No encryption
- **Anonymous ciphers** - No authentication

## Certificate Rotation

Certificates expire. Plan for rotation before they do.

### Automated Rotation Script

```bash
#!/bin/bash
# rotate-rabbitmq-certs.sh
# Run this script before certificates expire

set -euo pipefail

SSL_DIR="/etc/rabbitmq/ssl"
BACKUP_DIR="/etc/rabbitmq/ssl/backup/$(date +%Y%m%d)"
CA_KEY="${SSL_DIR}/ca.key"
CA_CRT="${SSL_DIR}/ca.crt"
NEW_SERVER_KEY="${SSL_DIR}/server.key.new"
NEW_SERVER_CRT="${SSL_DIR}/server.crt.new"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup current certificates
echo "Backing up current certificates..."
cp "${SSL_DIR}/server.key" "${BACKUP_DIR}/"
cp "${SSL_DIR}/server.crt" "${BACKUP_DIR}/"

# Generate new server key
echo "Generating new server key..."
openssl genrsa -out "${NEW_SERVER_KEY}" 4096

# Generate CSR with existing subject
SUBJECT=$(openssl x509 -in "${SSL_DIR}/server.crt" -noout -subject | sed 's/subject=//')
openssl req -new -key "${NEW_SERVER_KEY}" -out "${SSL_DIR}/server.csr.new" -subj "${SUBJECT}"

# Sign new certificate
echo "Signing new certificate..."
openssl x509 -req \
    -in "${SSL_DIR}/server.csr.new" \
    -CA "${CA_CRT}" \
    -CAkey "${CA_KEY}" \
    -CAcreateserial \
    -out "${NEW_SERVER_CRT}" \
    -days 365 \
    -sha256 \
    -extfile "${SSL_DIR}/server.ext"

# Verify new certificate
echo "Verifying new certificate..."
openssl verify -CAfile "${CA_CRT}" "${NEW_SERVER_CRT}"

# Rotate certificates atomically
echo "Rotating certificates..."
mv "${NEW_SERVER_KEY}" "${SSL_DIR}/server.key"
mv "${NEW_SERVER_CRT}" "${SSL_DIR}/server.crt"

# Set permissions
chown rabbitmq:rabbitmq "${SSL_DIR}/server.key" "${SSL_DIR}/server.crt"
chmod 600 "${SSL_DIR}/server.key"
chmod 644 "${SSL_DIR}/server.crt"

# Clean up
rm -f "${SSL_DIR}/server.csr.new"

echo "Certificate rotation complete. Restart RabbitMQ to apply changes."
echo "New certificate expires: $(openssl x509 -in ${SSL_DIR}/server.crt -noout -enddate)"
```

### Zero-Downtime Rotation with Clustering

For clustered RabbitMQ, rotate certificates one node at a time:

```bash
#!/bin/bash
# cluster-cert-rotation.sh

NODES=("rabbit@node1" "rabbit@node2" "rabbit@node3")

for NODE in "${NODES[@]}"; do
    echo "Rotating certificates on ${NODE}..."

    # Copy new certificates to node
    scp /etc/rabbitmq/ssl/server.* "${NODE}:/etc/rabbitmq/ssl/"

    # Restart the node gracefully
    ssh "${NODE}" "rabbitmqctl stop_app && rabbitmqctl start_app"

    # Wait for node to rejoin cluster
    sleep 30

    # Verify cluster health
    rabbitmqctl cluster_status

    echo "Node ${NODE} updated successfully"
done
```

### Monitoring Certificate Expiration

```bash
#!/bin/bash
# check-cert-expiry.sh
# Run daily via cron, alert if expiring within 30 days

CERT_FILE="/etc/rabbitmq/ssl/server.crt"
WARN_DAYS=30

expiry_date=$(openssl x509 -in "${CERT_FILE}" -noout -enddate | cut -d= -f2)
expiry_epoch=$(date -d "${expiry_date}" +%s)
current_epoch=$(date +%s)
days_left=$(( (expiry_epoch - current_epoch) / 86400 ))

if [ "${days_left}" -lt "${WARN_DAYS}" ]; then
    echo "WARNING: RabbitMQ certificate expires in ${days_left} days"
    # Send alert to monitoring system
    curl -X POST "https://oneuptime.com/api/webhooks/your-webhook" \
        -H "Content-Type: application/json" \
        -d "{\"message\": \"RabbitMQ certificate expires in ${days_left} days\"}"
fi
```

## Verifying TLS Configuration

### Test TLS Connection

```bash
# Test TLS handshake with OpenSSL
openssl s_client -connect rabbitmq.example.com:5671 \
    -CAfile /path/to/ca.crt \
    -cert /path/to/client.crt \
    -key /path/to/client.key \
    -servername rabbitmq.example.com

# Check TLS version negotiated
openssl s_client -connect rabbitmq.example.com:5671 2>/dev/null | grep "Protocol"

# Verify certificate chain
openssl s_client -connect rabbitmq.example.com:5671 -showcerts 2>/dev/null | \
    openssl x509 -noout -subject -issuer
```

### RabbitMQ Diagnostics

```bash
# Check TLS listeners
rabbitmq-diagnostics listeners

# Verify TLS settings
rabbitmq-diagnostics tls_versions

# List enabled cipher suites
rabbitmq-diagnostics cipher_suites

# Check node health
rabbitmq-diagnostics check_running
rabbitmq-diagnostics check_local_alarms
```

### Management UI Check

Access the management UI via HTTPS:

```
https://rabbitmq.example.com:15671/
```

Check the browser certificate indicator to verify the TLS connection.

## Best Practices Summary

**Certificate Management**

- Use a proper CA for production (not self-signed)
- Generate keys with at least 4096 bits for RSA or 256 bits for ECDSA
- Set certificate validity to 1 year maximum
- Implement automated rotation before expiry
- Store private keys securely with proper file permissions (600)

**TLS Configuration**

- Disable TLS 1.0 and 1.1 - only use TLS 1.2 and 1.3
- Use strong cipher suites only (AES-GCM, ChaCha20)
- Enable perfect forward secrecy (ECDHE key exchange)
- Disable plaintext listeners in production
- Enable inter-node TLS for clusters

**Mutual TLS**

- Require client certificates for sensitive environments
- Use certificate CN for authentication when possible
- Maintain a separate CA for client certificates
- Implement certificate revocation checking (CRL or OCSP)

**Monitoring and Operations**

- Monitor certificate expiration dates
- Alert at least 30 days before expiry
- Test TLS configuration after changes
- Document your certificate chain and renewal process
- Keep backup copies of certificates

**Compliance**

- Meet PCI-DSS requirements for data-in-transit encryption
- Satisfy HIPAA security requirements
- Enable audit logging for TLS connections
- Regularly scan for TLS vulnerabilities

---

Securing RabbitMQ with TLS protects your message queue infrastructure from eavesdropping and tampering. Start with server-side TLS, then add mutual TLS for high-security environments. Monitor your certificates and rotate them before they expire. Your compliance team and security auditors will thank you.

For comprehensive monitoring of your RabbitMQ infrastructure, including certificate expiration alerts and TLS health checks, explore [OneUptime](https://oneuptime.com) - the open-source observability platform.

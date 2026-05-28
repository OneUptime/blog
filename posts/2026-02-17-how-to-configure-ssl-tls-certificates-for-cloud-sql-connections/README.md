# How to Configure SSL/TLS Certificates for Cloud SQL Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, SSL, TLS, Security, Certificate

Description: A complete guide to configuring SSL/TLS certificates for Cloud SQL connections, including server CA certificates, client certificates, and enforcement settings.

---

Every production database should encrypt connections in transit. Cloud SQL supports SSL/TLS for all database engines, and you can enforce it so that unencrypted connections are rejected entirely. This post covers how to configure SSL certificates, connect with them, and manage certificate rotation.

## Understanding Cloud SQL SSL/TLS

Cloud SQL uses a standard SSL/TLS architecture:

- **Server CA certificate**: Issued by Google, authenticates the Cloud SQL instance to your client
- **Client certificate**: Issued per-client for PostgreSQL and MySQL, authenticates your client to Cloud SQL (optional but recommended)
- **SSL enforcement**: Requires all connections to use SSL

```mermaid
graph LR
    A[Client Application] -->|TLS Handshake| B[Cloud SQL Instance]
    B -->|Server Certificate| A
    A -->|Client Certificate| B
    C[Server CA] -->|Validates| B
```

When you use the Cloud SQL Auth Proxy, it handles SSL automatically and you do not need to manage certificates yourself. Manual certificate configuration is needed when you connect directly without the proxy.

## Checking Current SSL Configuration

```bash
# Check the SSL configuration of your instance

gcloud sql instances describe my-instance \
    --format="json(settings.ipConfiguration.sslMode, serverCaCert)"
```

## Step 1: Download the Server CA Certificate

Every Cloud SQL instance has server CA information. For the default per-instance CA mode, download it:

```bash
# Download the server CA certificate
gcloud sql ssl server-ca-certs list \
    --instance=my-instance \
    --format="value(cert)" > server-ca.pem
```

You can also get it from the Cloud Console under your instance's Connections tab. For instances that use shared CAs or customer-managed CAs, use the `gcloud sql ssl server-certs list --format="value(ca_cert.cert)"` command instead.

## Step 2: Create a Client Certificate

For PostgreSQL and MySQL, client certificates provide mutual TLS (mTLS), where both the server and client authenticate each other:

```bash
# Create a client certificate
gcloud sql ssl client-certs create my-client-cert \
    --instance=my-instance \
    client-key.pem
```

This creates the private key locally (`client-key.pem`) and the certificate on the server. Download the certificate:

```bash
# Download the client certificate
gcloud sql ssl client-certs describe my-client-cert \
    --instance=my-instance \
    --format="value(cert)" > client-cert.pem
```

You now have three files:

- `server-ca.pem` - Server CA certificate (verifies the server)
- `client-cert.pem` - Client certificate (authenticates the client)
- `client-key.pem` - Client private key (keep this secure)

Set proper permissions on the key file:

```bash
# Restrict access to the private key
chmod 600 client-key.pem
```

## Step 3: Enforce SSL Connections

By default, Cloud SQL accepts both SSL and non-SSL connections. Enforce SSL to reject unencrypted connections:

```bash
# Require encrypted connections
gcloud sql instances patch my-instance \
    --ssl-mode=ENCRYPTED_ONLY
```

For PostgreSQL and MySQL, use `--ssl-mode=TRUSTED_CLIENT_CERTIFICATE_REQUIRED` if you want to require valid client certificates for every direct connection. Google recommends using `--ssl-mode` instead of the legacy `--require-ssl` flag.

With Terraform:

```hcl
# Terraform - Enforce SSL connections
resource "google_sql_database_instance" "main" {
  name             = "my-instance"
  database_version = "POSTGRES_15"
  region           = "us-central1"

  settings {
    tier = "db-custom-4-16384"

    ip_configuration {
      ssl_mode = "ENCRYPTED_ONLY"

      # Authorized networks for public IP
      authorized_networks {
        name  = "office"
        value = "203.0.113.0/24"
      }
    }
  }
}
```

## Connecting with SSL Certificates

### PostgreSQL

```bash
# Connect to PostgreSQL with SSL certificates
psql "host=INSTANCE_IP \
      port=5432 \
      dbname=mydb \
      user=myuser \
      sslmode=verify-ca \
      sslrootcert=server-ca.pem \
      sslcert=client-cert.pem \
      sslkey=client-key.pem"
```

The `sslmode` options for PostgreSQL:

- `disable` - No SSL (rejected if SSL is required)
- `allow` - Try non-SSL first, fall back to SSL
- `prefer` - Try SSL first, fall back to non-SSL
- `require` - SSL required, but do not verify the server certificate
- `verify-ca` - SSL required, verify the server CA certificate
- `verify-full` - SSL required, verify server CA and hostname

For production, use `verify-ca` or `verify-full`.

### MySQL

```bash
# Connect to MySQL with SSL certificates
mysql --host=INSTANCE_IP \
      --port=3306 \
      --user=myuser \
      --password \
      --ssl-mode=VERIFY_CA \
      --ssl-ca=server-ca.pem \
      --ssl-cert=client-cert.pem \
      --ssl-key=client-key.pem \
      mydb
```

Verify the connection is using SSL:

```sql
-- Check SSL status in MySQL
SHOW STATUS LIKE 'Ssl_cipher';
-- Should return a cipher name like TLS_AES_256_GCM_SHA384
```

### SQL Server

```bash
# Connect to SQL Server with encryption
sqlcmd -S INSTANCE_IP,1433 \
       -U myuser \
       -P mypassword \
       -d mydb \
       -N  # Encrypt connection
```

## Application Connection Strings

### Python (psycopg2)

```python
# Connect to PostgreSQL with SSL certificates
import psycopg2

conn = psycopg2.connect(
    host="INSTANCE_IP",
    port=5432,
    dbname="mydb",
    user="myuser",
    password="password",
    sslmode="verify-ca",
    sslrootcert="/path/to/server-ca.pem",
    sslcert="/path/to/client-cert.pem",
    sslkey="/path/to/client-key.pem"
)
```

### Python (SQLAlchemy)

```python
# SQLAlchemy connection with SSL
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql://myuser:password@INSTANCE_IP:5432/mydb",
    connect_args={
        "sslmode": "verify-ca",
        "sslrootcert": "/path/to/server-ca.pem",
        "sslcert": "/path/to/client-cert.pem",
        "sslkey": "/path/to/client-key.pem"
    }
)
```

### Node.js

```javascript
// Node.js connection with SSL certificates
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'INSTANCE_IP',
  port: 5432,
  database: 'mydb',
  user: 'myuser',
  password: 'password',
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/server-ca.pem').toString(),
    cert: fs.readFileSync('/path/to/client-cert.pem').toString(),
    key: fs.readFileSync('/path/to/client-key.pem').toString(),
  },
});
```

### Java (JDBC)

```java
// Java JDBC connection with SSL
// Add the server CA to a truststore first:
// keytool -importcert -file server-ca.pem -keystore truststore.jks

String url = "jdbc:postgresql://INSTANCE_IP:5432/mydb"
    + "?sslmode=verify-ca"
    + "&sslrootcert=/path/to/server-ca.pem"
    + "&sslcert=/path/to/client-cert.pem"
    + "&sslkey=/path/to/client-key.pk8";  // PKCS8 format required

Connection conn = DriverManager.getConnection(url, "myuser", "password");
```

For Java, you need to convert the client key to PKCS8 format:

```bash
# Convert the client key to PKCS8 format for Java
openssl pkcs8 -topk8 -inform PEM -outform DER \
    -in client-key.pem -out client-key.pk8 -nocrypt
```

## Certificate Rotation

Cloud SQL server certificates expire after 10 years for per-instance CAs and after 1 year for shared CAs or customer-managed CAs. Client certificates expire after 10 years from creation by default. Google may rotate the server certificate before expiration.

### Rotating the Server CA Certificate

When Google issues a new server CA:

```bash
# Check available server CA certificates
gcloud sql ssl server-ca-certs list --instance=my-instance

# Create a new server CA if one has not already been created
gcloud sql ssl server-ca-certs create --instance=my-instance

# Download the updated CA certificate information
gcloud sql ssl server-ca-certs list --instance=my-instance \
    --format="value(cert)" > server-ca.pem

# Update your applications to use the updated server CA file
# Then rotate the active CA
gcloud sql ssl server-ca-certs rotate --instance=my-instance
```

For instances that use shared CAs or customer-managed CAs, use the `gcloud sql ssl server-certs` commands instead of `server-ca-certs`.

### Rotating Client Certificates

```bash
# Create a new client certificate before the old one expires
gcloud sql ssl client-certs create my-new-client-cert \
    --instance=my-instance \
    new-client-key.pem

# Download the new certificate
gcloud sql ssl client-certs describe my-new-client-cert \
    --instance=my-instance \
    --format="value(cert)" > new-client-cert.pem

# Update your applications to use the new certificates
# Then delete the old certificate
gcloud sql ssl client-certs delete my-client-cert --instance=my-instance
```

### Listing Client Certificates

```bash
# List all client certificates for an instance
gcloud sql ssl client-certs list --instance=my-instance
```

## Storing Certificates Securely

Do not store certificates in your application code or container images. Use Secret Manager:

```bash
# Store certificates in Secret Manager
gcloud secrets create cloudsql-server-ca --data-file=server-ca.pem
gcloud secrets create cloudsql-client-cert --data-file=client-cert.pem
gcloud secrets create cloudsql-client-key --data-file=client-key.pem
```

In Kubernetes, mount them as secrets:

```yaml
# kubernetes secret from files
apiVersion: v1
kind: Secret
metadata:
  name: cloudsql-certs
type: Opaque
data:
  server-ca.pem: <base64-encoded>
  client-cert.pem: <base64-encoded>
  client-key.pem: <base64-encoded>
```

## When to Use SSL vs Auth Proxy

| Aspect | Manual SSL | Auth Proxy |
|--------|-----------|------------|
| Certificate management | You manage it | Automatic |
| IAM authentication | Not available | Built-in |
| Setup complexity | Higher | Lower |
| Certificate rotation | Manual | Automatic |
| Connection overhead | None | Minimal (proxy process) |
| Works without proxy | Yes | No |

For most use cases, the Auth Proxy is simpler and more secure. Use manual SSL certificates when:

- You cannot run the Auth Proxy (some managed environments)
- You need direct database connections from external tools
- Your organization requires explicit certificate management for compliance

## Summary

SSL/TLS for Cloud SQL involves downloading server CA certificates, optionally creating client certificates for mutual authentication, and configuring your application to use them. Enforce SSL on the instance to prevent unencrypted connections. Plan for certificate rotation by updating clients with the latest server CA information before rotating the active certificate. And if the Auth Proxy is an option for your setup, prefer it over manual certificate management - it does all of this automatically.

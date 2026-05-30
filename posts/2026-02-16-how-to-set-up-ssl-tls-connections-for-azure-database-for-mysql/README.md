# How to Set Up SSL/TLS Connections for Azure Database for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, SSL, TLS, Security, Encryption, Database Security

Description: A complete guide to configuring and enforcing SSL/TLS encrypted connections for Azure Database for MySQL Flexible Server.

---

Encrypting database connections with SSL/TLS is not optional anymore. Data in transit between your application and database is vulnerable to interception, and regulatory frameworks like PCI DSS, HIPAA, and GDPR all require encryption of sensitive data in transit. Azure Database for MySQL Flexible Server supports SSL/TLS encryption and enforces it by default, which is the right starting point.

In this post, I will explain how SSL/TLS works with Azure Database for MySQL, how to configure it, and how to set up your applications to connect securely.

## Default SSL/TLS Behavior

When you create an Azure Database for MySQL Flexible Server, SSL enforcement is enabled by default. This means:

- Unencrypted connections are rejected.
- TLS 1.2 is the minimum supported version.
- The server presents a certificate chain anchored by trusted root Certificate Authorities (DigiCert Global Root G2 and Microsoft RSA Root CA 2017).

You can check the current SSL enforcement status:

```bash
# Check if SSL is required

az mysql flexible-server parameter show \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name require_secure_transport
```

If the value is ON, SSL is required. I strongly recommend keeping it that way.

## Understanding the TLS Versions

Azure Database for MySQL Flexible Server supports TLS 1.2 and TLS 1.3. TLS 1.3 is recommended for Azure Database for MySQL Flexible Server version 8.0 and later. Older versions (TLS 1.0 and 1.1) are no longer available because they have known security vulnerabilities.

To check which TLS version your connection uses:

```sql
-- Check the current connection's SSL/TLS details
SHOW STATUS LIKE 'Ssl_version';
SHOW STATUS LIKE 'Ssl_cipher';
```

If you want to enforce a minimum TLS version:

```bash
# Enforce TLS 1.2 as minimum (this is the default)
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name tls_version \
  --value "TLS 1.2"
```

## Downloading the CA Certificate

To verify the server's identity, your client needs the root Certificate Authority (CA) certificates used by Azure Database for MySQL. Azure currently uses certificates anchored by DigiCert Global Root G2 and Microsoft RSA Root CA 2017.

```bash
# Download the Azure root CA certificates
curl -o DigiCertGlobalRootG2.crt.pem \
  https://cacerts.digicert.com/DigiCertGlobalRootG2.crt.pem
curl -o MicrosoftRSARootCA2017.crt \
  "https://www.microsoft.com/pkiops/certs/Microsoft%20RSA%20Root%20Certificate%20Authority%202017.crt"
openssl x509 -inform DER -in MicrosoftRSARootCA2017.crt -out MicrosoftRSARootCA2017.crt.pem
cat DigiCertGlobalRootG2.crt.pem MicrosoftRSARootCA2017.crt.pem > azure-mysql-ca-bundle.pem

# Verify the downloaded certificate
openssl x509 -in DigiCertGlobalRootG2.crt.pem -text -noout | head -20
openssl x509 -in MicrosoftRSARootCA2017.crt.pem -text -noout | head -20
```

Store this CA bundle in a secure location accessible to your application. Common locations:

- `/etc/ssl/certs/` on Linux
- Your application's configuration directory
- A secrets manager or key vault

## Connecting with SSL from the mysql Client

The basic connection with SSL verification:

```bash
# Connect with SSL certificate verification
mysql -h my-mysql-server.mysql.database.azure.com \
  -u myadmin \
  -p \
  --ssl-mode=VERIFY_CA \
  --ssl-ca=azure-mysql-ca-bundle.pem
```

The `--ssl-mode` parameter controls the level of SSL enforcement:

| Mode | Encryption | Server Verification | Use Case |
|------|-----------|---------------------|----------|
| DISABLED | No | No | Never use this |
| PREFERRED | Yes if supported | No | Not recommended |
| REQUIRED | Yes | No | Minimum for production |
| VERIFY_CA | Yes | Yes (CA) | Recommended |
| VERIFY_IDENTITY | Yes | Yes (CA + hostname) | Most secure |

For production, use VERIFY_CA or VERIFY_IDENTITY. REQUIRED encrypts the connection but does not verify the server's identity, which leaves you vulnerable to man-in-the-middle attacks.

## Application Connection Examples

### Python with mysql-connector-python

```python
import mysql.connector

# Connect with full SSL verification
# ssl_ca points to the downloaded Azure CA bundle
connection = mysql.connector.connect(
    host="my-mysql-server.mysql.database.azure.com",
    user="myadmin",
    password="StrongPassword123!",
    database="myapp",
    ssl_ca="/path/to/azure-mysql-ca-bundle.pem",
    ssl_verify_cert=True,
    ssl_verify_identity=True
)

# Verify SSL is being used
cursor = connection.cursor()
cursor.execute("SHOW STATUS LIKE 'Ssl_cipher'")
print(cursor.fetchone())  # Should show a cipher name, not empty
cursor.close()
connection.close()
```

### Node.js with mysql2

```javascript
const mysql = require('mysql2');
const fs = require('fs');

// Read the CA bundle
const caCert = fs.readFileSync('/path/to/azure-mysql-ca-bundle.pem');

// Create a connection pool with SSL enabled
const pool = mysql.createPool({
    host: 'my-mysql-server.mysql.database.azure.com',
    user: 'myadmin',
    password: 'StrongPassword123!',
    database: 'myapp',
    ssl: {
        // Provide the CA bundle for server verification
        ca: caCert,
        rejectUnauthorized: true  // Enforce certificate validation
    },
    waitForConnections: true,
    connectionLimit: 10
});

// Test the connection
pool.query('SELECT 1', (err, results) => {
    if (err) {
        console.error('Connection failed:', err);
    } else {
        console.log('Connected with SSL successfully');
    }
});
```

### Java with JDBC

```java
import java.sql.*;
import java.util.Properties;

public class MySQLSSLConnection {
    public static Connection getConnection() throws SQLException {
        String url = "jdbc:mysql://my-mysql-server.mysql.database.azure.com:3306/myapp";

        Properties props = new Properties();
        props.setProperty("user", "myadmin");
        props.setProperty("password", "StrongPassword123!");

        // Enable SSL with certificate verification
        props.setProperty("sslMode", "VERIFY_IDENTITY");

        // Point to the Java truststore containing the CA certificates
        props.setProperty("trustCertificateKeyStoreUrl",
            "file:///path/to/truststore.jks");
        props.setProperty("trustCertificateKeyStorePassword", "changeit");

        return DriverManager.getConnection(url, props);
    }
}
```

For Java, you need to import the CA certificates into a Java truststore:

```bash
# Import the CA certificates into a Java truststore
keytool -importcert \
  -alias DigiCertGlobalRootG2 \
  -file DigiCertGlobalRootG2.crt.pem \
  -keystore truststore.jks \
  -storetype JKS \
  -storepass changeit \
  -noprompt

keytool -importcert \
  -alias MicrosoftRSARootCA2017 \
  -file MicrosoftRSARootCA2017.crt.pem \
  -keystore truststore.jks \
  -storetype JKS \
  -storepass changeit \
  -noprompt
```

### C# with .NET

```csharp
using MySql.Data.MySqlClient;

// Build the connection string with SSL settings
var connectionString = new MySqlConnectionStringBuilder
{
    Server = "my-mysql-server.mysql.database.azure.com",
    UserID = "myadmin",
    Password = "StrongPassword123!",
    Database = "myapp",
    SslMode = MySqlSslMode.VerifyCA,
    SslCa = "/path/to/azure-mysql-ca-bundle.pem"
}.ConnectionString;

using var connection = new MySqlConnection(connectionString);
connection.Open();

// Verify SSL is active
using var cmd = new MySqlCommand("SHOW STATUS LIKE 'Ssl_cipher'", connection);
using var reader = cmd.ExecuteReader();
while (reader.Read())
{
    Console.WriteLine($"SSL Cipher: {reader.GetString(1)}");
}
```

## Disabling SSL Enforcement (Not Recommended)

In some rare cases, you might need to temporarily disable SSL enforcement - for example, when testing with a legacy client that does not support TLS 1.2. I want to stress that this should only be temporary.

```bash
# Disable SSL enforcement (NOT recommended for production)
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name require_secure_transport \
  --value OFF
```

To re-enable:

```bash
# Re-enable SSL enforcement
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name require_secure_transport \
  --value ON
```

## Certificate Rotation

Azure periodically rotates the server certificates. When this happens:

- The root CA set normally stays the same when Azure rotates intermediate CAs or server certificates.
- The server's leaf certificate or intermediate certificate can change.
- If your application uses VERIFY_CA mode, the rotation is transparent because you trust the CA, not the specific server certificate.
- If you have pinned the server certificate directly (which you should not do), you will need to update it.

This is why VERIFY_CA is recommended over certificate pinning. It handles rotation gracefully.

## Verifying SSL Configuration

After setting everything up, verify that SSL is working correctly:

```sql
-- Check all SSL-related status variables
SHOW STATUS WHERE Variable_name LIKE 'Ssl%';

-- Check which TLS version is in use
SHOW STATUS LIKE 'Ssl_version';

-- Check the cipher in use
SHOW STATUS LIKE 'Ssl_cipher';
```

You can also check from the Azure side:

```bash
# Verify the require_secure_transport parameter
az mysql flexible-server parameter show \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name require_secure_transport \
  --query "value"
```

## Troubleshooting Common SSL Issues

**Error: SSL connection error - unable to get local issuer certificate**: The client cannot find the CA certificate. Make sure you have downloaded the Azure CA bundle and the path in your connection configuration is correct.

**Error: SSL peer certificate validation failed**: The certificate chain is invalid. This can happen if you are using an outdated CA bundle or if the certificate file is corrupted. Re-download it.

**Connection works but SSL is not being used**: Check your ssl-mode setting. PREFERRED mode will silently fall back to unencrypted if there is any issue with SSL negotiation.

**Slow connection establishment**: The TLS handshake adds a small amount of latency to each new connection. Use connection pooling to minimize the number of handshakes.

## Summary

SSL/TLS for Azure Database for MySQL Flexible Server is straightforward to set up and should be non-negotiable for production workloads. Keep `require_secure_transport` enabled, use the VERIFY_CA or VERIFY_IDENTITY ssl-mode in your applications, download the Azure CA bundle, and make sure your connection pooling strategy minimizes the overhead of TLS handshakes. Security is not something you bolt on later - build it into your database connectivity from day one.

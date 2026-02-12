# How to Enable RDS Encryption in Transit (SSL/TLS)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Security, SSL, Database

Description: Complete guide to enabling and enforcing SSL/TLS encryption for connections to Amazon RDS databases including MySQL, PostgreSQL, and SQL Server.

---

Data encryption at rest gets a lot of attention, but encryption in transit is just as important. Without SSL/TLS, every query and result set traveling between your application and database is sent in plaintext. Anyone with access to the network path - whether through a compromised host, misconfigured VPC, or packet capture - can read everything.

Amazon RDS supports SSL/TLS connections for all major database engines. The good news is that the certificates are already there. The tricky part is making sure your applications actually use them and that you enforce encrypted connections so nothing slips through unencrypted.

## How SSL/TLS Works with RDS

Every RDS instance comes with a server certificate installed automatically. AWS manages these certificates through the Amazon RDS Certificate Authority. Your application connects using the certificate to verify it's talking to the real database server, and the connection is encrypted end-to-end.

The certificate chain can be downloaded from AWS. As of 2024, AWS moved to regional certificate bundles, so you'll want to use the right one for your region.

Download the certificate bundle for your application to use:

```bash
# Download the global certificate bundle (works for all regions)
wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Or download a region-specific bundle
wget https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem
```

## Enabling SSL for MySQL on RDS

MySQL on RDS supports SSL out of the box. You don't need to enable anything on the server side - you just need to configure your client to use it.

To test a connection with SSL from the command line:

```bash
# Connect to MySQL RDS with SSL enabled
mysql -h mydb.abc123xyz.us-east-1.rds.amazonaws.com \
  -u admin -p \
  --ssl-ca=global-bundle.pem \
  --ssl-mode=VERIFY_IDENTITY
```

Once connected, verify that SSL is active:

```sql
-- Check the current connection's SSL status
SHOW STATUS LIKE 'Ssl_cipher';
```

If SSL is working, you'll see a cipher name like `TLS_AES_256_GCM_SHA384`. If it's empty, the connection isn't encrypted.

### Forcing SSL for All MySQL Connections

By default, MySQL on RDS allows both encrypted and unencrypted connections. To require SSL for all connections, you need to modify the RDS parameter group.

Using the CLI:

```bash
# Create a custom parameter group (if you don't have one already)
aws rds create-db-parameter-group \
  --db-parameter-group-name require-ssl-mysql \
  --db-parameter-group-family mysql8.0 \
  --description "MySQL parameter group that requires SSL"

# Set the require_secure_transport parameter to ON
aws rds modify-db-parameter-group \
  --db-parameter-group-name require-ssl-mysql \
  --parameters "ParameterName=require_secure_transport,ParameterValue=ON,ApplyMethod=immediate"
```

Then apply the parameter group to your instance:

```bash
# Associate the parameter group with your RDS instance
aws rds modify-db-instance \
  --db-instance-identifier my-mysql-db \
  --db-parameter-group-name require-ssl-mysql \
  --apply-immediately
```

You can also enforce SSL at the user level. This is useful if you want to require SSL for specific users but not others:

```sql
-- Require SSL for a specific MySQL user
ALTER USER 'app_user'@'%' REQUIRE SSL;

-- Or require a specific certificate
ALTER USER 'app_user'@'%' REQUIRE X509;
```

## Enabling SSL for PostgreSQL on RDS

PostgreSQL handles SSL configuration through the `rds.force_ssl` parameter. Setting this to 1 makes SSL mandatory for all connections.

```bash
# Create a custom parameter group for PostgreSQL
aws rds create-db-parameter-group \
  --db-parameter-group-name require-ssl-postgres \
  --db-parameter-group-family postgres16 \
  --description "PostgreSQL parameter group that requires SSL"

# Force SSL connections
aws rds modify-db-parameter-group \
  --db-parameter-group-name require-ssl-postgres \
  --parameters "ParameterName=rds.force_ssl,ParameterValue=1,ApplyMethod=immediate"
```

To connect from the command line with SSL:

```bash
# Connect to PostgreSQL with SSL mode set to verify-full
psql "host=mydb.abc123xyz.us-east-1.rds.amazonaws.com \
  port=5432 \
  dbname=myapp \
  user=admin \
  sslmode=verify-full \
  sslrootcert=global-bundle.pem"
```

PostgreSQL supports several SSL modes:

- `disable` - No SSL at all
- `allow` - Try non-SSL first, fall back to SSL
- `prefer` - Try SSL first, fall back to non-SSL (this is the default)
- `require` - Must use SSL, but don't verify the certificate
- `verify-ca` - Must use SSL and verify the CA
- `verify-full` - Must use SSL, verify CA, and verify hostname

For production, always use `verify-full`. Anything less leaves you vulnerable to man-in-the-middle attacks.

Check the SSL status from within PostgreSQL:

```sql
-- Check if the current connection is using SSL
SELECT ssl, version, cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid();
```

## Configuring Application Connection Strings

### Node.js with MySQL

```javascript
const mysql = require('mysql2');
const fs = require('fs');

// Read the RDS certificate bundle
const caCert = fs.readFileSync('/path/to/global-bundle.pem');

const connection = mysql.createConnection({
  host: 'mydb.abc123xyz.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: process.env.DB_PASSWORD,
  database: 'myapp',
  ssl: {
    ca: caCert,
    rejectUnauthorized: true  // Verify the server certificate
  }
});
```

### Python with PostgreSQL (psycopg2)

```python
import psycopg2

# Connect to PostgreSQL with full certificate verification
conn = psycopg2.connect(
    host='mydb.abc123xyz.us-east-1.rds.amazonaws.com',
    port=5432,
    dbname='myapp',
    user='admin',
    password=os.environ['DB_PASSWORD'],
    sslmode='verify-full',
    sslrootcert='/path/to/global-bundle.pem'
)
```

### Java JDBC with MySQL

```java
// JDBC connection string with SSL parameters
String url = "jdbc:mysql://mydb.abc123xyz.us-east-1.rds.amazonaws.com:3306/myapp"
    + "?useSSL=true"
    + "&requireSSL=true"
    + "&verifyServerCertificate=true"
    + "&trustCertificateKeyStoreUrl=file:/path/to/truststore.jks"
    + "&trustCertificateKeyStorePassword=changeit";
```

For Java, you'll need to import the RDS CA certificate into a Java truststore first:

```bash
# Import the RDS certificate bundle into a Java truststore
keytool -importcert \
  -alias rds-ca \
  -file global-bundle.pem \
  -keystore truststore.jks \
  -storepass changeit \
  -noprompt
```

## Certificate Rotation

AWS periodically rotates the RDS CA certificates. When this happens, you need to update your application's certificate bundles. AWS gives advance notice before rotating certificates, but you should plan for it.

Check the current CA certificate on your RDS instance:

```bash
# Check which CA certificate your RDS instance is using
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].CACertificateIdentifier'
```

To rotate the certificate:

```bash
# Update the RDS instance to use a new CA certificate
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --ca-certificate-identifier rds-ca-rsa2048-g1 \
  --apply-immediately
```

## Verifying SSL is Enforced

After setting up SSL enforcement, you should verify that unencrypted connections are actually rejected. Try connecting without SSL:

```bash
# This should fail if SSL is enforced
mysql -h mydb.abc123xyz.us-east-1.rds.amazonaws.com \
  -u admin -p \
  --ssl-mode=DISABLED
```

If your enforcement is working, this connection will be refused.

## Performance Impact

SSL adds some overhead. The TLS handshake adds latency to new connections, and encryption/decryption uses CPU. In practice, the impact is minimal - usually 5-10% overhead on connection establishment and negligible impact on data transfer for modern instance types.

Using connection pooling significantly reduces the impact since the TLS handshake only happens once per pooled connection rather than on every query.

## Monitoring SSL Connections

Keep an eye on your connections to make sure everything is encrypted. For PostgreSQL, you can query `pg_stat_ssl` to see which connections are using SSL and which aren't. For MySQL, check `performance_schema` or the `SHOW STATUS` output.

For broader monitoring of your RDS instances, including connection metrics and performance, check out our guide on [monitoring RDS with Performance Insights](https://oneuptime.com/blog/post/monitor-rds-with-performance-insights/view).

Enabling SSL/TLS on RDS is one of those things that's relatively easy to set up but easy to forget about. Make it part of your standard database provisioning process, enforce it at the parameter group level, and test that unencrypted connections are actually blocked. Your security team will thank you.

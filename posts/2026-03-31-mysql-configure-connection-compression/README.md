# How to Configure MySQL Connection Compression

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Compression, Connection, Configuration, Network

Description: Learn how to configure MySQL connection compression to reduce network bandwidth between clients and the server, especially over slow or metered networks.

---

MySQL supports compressing the data sent over the client-server protocol, reducing network bandwidth at the cost of CPU overhead on both the client and server. This is valuable when transferring large result sets over slow networks or cloud environments with metered bandwidth.

## How MySQL Connection Compression Works

MySQL supports two compression algorithms:
- **zlib** - The classic algorithm, supported since early MySQL versions
- **zstd** - Added in MySQL 8.0.18, offering better compression ratios and performance

Compression applies to the MySQL protocol layer - both query results sent to the client and data received from the client are compressed.

## Checking Compression Status for a Connection

```sql
SHOW STATUS LIKE 'Compression';
```

Output:
- `ON` - The current connection uses compression
- `OFF` - No compression

## Enabling Compression from the mysql Client

```bash
mysql -u root -p --compress mydb
```

> **Note:** The `--compress` option is deprecated as of MySQL 8.0.18. Use `--compression-algorithms` instead:

```bash
mysql -u root -p --compression-algorithms=zlib mydb
```

For zstd with a specific compression level:

```bash
mysql -u root -p --compression-algorithms=zstd --zstd-compression-level=3 mydb
```

## Configuring Compression for mysqldump

Compressing exports over the network:

```bash
mysqldump -u root -p --compression-algorithms=zlib mydb > mydb_backup.sql
```

## Server-Side Compression Configuration

In MySQL 8.0.18+, configure which algorithms the server accepts:

```ini
[mysqld]
protocol_compression_algorithms = zstd,zlib,uncompressed
```

The server lists algorithms in order of preference. Clients negotiate with the server to select a mutually supported algorithm.

The zstd compression level is configured on the client side, not the server. Clients set it using the `--zstd-compression-level` option (values 1–22, default 3). Higher levels yield better compression at the cost of more CPU.

## Requiring Compression for All Connections

MySQL does not support requiring compression on a per-user basis. To require compression for all connections, remove `uncompressed` from the server's permitted algorithms:

```ini
[mysqld]
protocol_compression_algorithms = zstd,zlib
```

With this configuration, clients that do not request compression will be unable to connect.

## Application Driver Configuration

In the Node.js `mysql2` driver:

```javascript
const connection = mysql.createConnection({
  host: 'db.example.com',
  user: 'app_user',
  password: 'secret',
  database: 'mydb',
  compress: true
});
```

In JDBC (Java):

```java
String url = "jdbc:mysql://db.example.com/mydb?useCompression=true";
```

In Python with `mysql-connector-python`:

```python
import mysql.connector
conn = mysql.connector.connect(
    host='db.example.com',
    user='app_user',
    password='secret',
    database='mydb',
    compress=True
)
```

## When to Use Compression

Compression is beneficial when:
- Clients connect over a WAN or the internet
- Result sets contain large text or JSON fields
- Network bandwidth is a bottleneck (not CPU)

Compression adds CPU overhead on both sides and has minimal benefit when:
- Client and server are on the same host or local network
- Result sets are small
- The server is already CPU-bound

## Summary

MySQL connection compression reduces bandwidth by compressing the protocol payload using zlib or zstd. Enable it per-client with `--compress` or `--compression-algorithms`, or configure server-side defaults with `protocol_compression_algorithms` in `my.cnf`. Use compression when transferring large result sets over slow or metered networks, and prefer zstd over zlib in MySQL 8.0.18+ for better compression ratios with less CPU overhead.

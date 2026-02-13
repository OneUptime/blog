# How to Set Up a Lightsail Database

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lightsail, Database, MySQL, PostgreSQL

Description: Create and configure a managed database on Amazon Lightsail with MySQL or PostgreSQL, including backups, connecting from instances, and performance tuning.

---

Lightsail managed databases give you MySQL or PostgreSQL without the operational overhead of setting up and maintaining RDS. You get automated backups, maintenance windows, and high availability options at predictable monthly prices. Here's how to set one up and connect it to your application.

## Available Database Options

Lightsail offers two database engines:
- **MySQL 8.0** (and older versions)
- **PostgreSQL 14** (and older versions)

Both come in Standard and High Availability configurations. High availability gives you a standby instance in a different AZ for automatic failover.

## Pricing Overview

| Plan     | RAM    | Disk   | Transfer | Monthly (Standard) | Monthly (HA) |
|----------|--------|--------|----------|-------------------|--------------|
| Micro    | 1GB    | 40GB   | 100GB    | $15               | $30          |
| Small    | 2GB    | 80GB   | 100GB    | $30               | $60          |
| Medium   | 4GB    | 120GB  | 100GB    | $60               | $120         |
| Large    | 8GB    | 240GB  | 200GB    | $115              | $230         |

## Creating a Database

Create a MySQL database with the CLI.

```bash
# Create a standard MySQL database
aws lightsail create-relational-database \
  --relational-database-name my-app-db \
  --availability-zone us-east-1a \
  --relational-database-blueprint-id mysql_8_0 \
  --relational-database-bundle-id micro_2_0 \
  --master-database-name appdb \
  --master-username admin \
  --master-user-password "YourStr0ngP@ssword!" \
  --tags key=Environment,value=production
```

For PostgreSQL, change the blueprint ID.

```bash
# Create a PostgreSQL database
aws lightsail create-relational-database \
  --relational-database-name my-postgres-db \
  --availability-zone us-east-1a \
  --relational-database-blueprint-id postgres_14 \
  --relational-database-bundle-id small_2_0 \
  --master-database-name appdb \
  --master-username admin \
  --master-user-password "YourStr0ngP@ssword!"
```

For high availability, add the `--no-publicly-accessible` flag (recommended for production) and create it as a multi-AZ deployment.

```bash
# Create a high availability database
aws lightsail create-relational-database \
  --relational-database-name prod-db \
  --availability-zone us-east-1a \
  --relational-database-blueprint-id mysql_8_0 \
  --relational-database-bundle-id medium_ha_2_0 \
  --master-database-name production \
  --master-username admin \
  --master-user-password "YourStr0ngP@ssword!" \
  --no-publicly-accessible
```

## Checking Database Status

Wait for the database to become available (takes 5-10 minutes).

```bash
# Check database status and connection details
aws lightsail get-relational-database \
  --relational-database-name my-app-db \
  --query 'relationalDatabase.{
    State: state,
    Engine: engine,
    EngineVersion: engineVersion,
    Endpoint: masterEndpoint.address,
    Port: masterEndpoint.port,
    PubliclyAccessible: publiclyAccessible
  }'
```

## Connecting from a Lightsail Instance

If you made the database publicly accessible, you can connect from anywhere. If not (which is more secure), you can connect from Lightsail instances in the same region.

First, get the connection details.

```bash
# Get the database endpoint and port
aws lightsail get-relational-database \
  --relational-database-name my-app-db \
  --query 'relationalDatabase.masterEndpoint'
```

SSH into your Lightsail instance and connect.

```bash
# Install MySQL client on your Lightsail instance
sudo apt update
sudo apt install -y mysql-client

# Connect to the Lightsail database
mysql -h ls-abc123.us-east-1.rds.amazonaws.com \
  -u admin \
  -p \
  appdb
```

For PostgreSQL:

```bash
# Install PostgreSQL client
sudo apt install -y postgresql-client

# Connect to the Lightsail PostgreSQL database
psql -h ls-abc123.us-east-1.rds.amazonaws.com \
  -U admin \
  -d appdb
```

## Connecting from Your Application

Here's how to connect from a Node.js application.

```javascript
// Database connection for a Node.js application
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'ls-abc123.us-east-1.rds.amazonaws.com',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'appdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
});

// Test the connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    console.log('Test query result:', rows[0].result);
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }
}

testConnection();
```

And for Python with PostgreSQL:

```python
import psycopg2
import os

# Connect to Lightsail PostgreSQL database
conn = psycopg2.connect(
    host=os.environ.get('DB_HOST', 'ls-abc123.us-east-1.rds.amazonaws.com'),
    port=os.environ.get('DB_PORT', 5432),
    user=os.environ.get('DB_USER', 'admin'),
    password=os.environ.get('DB_PASSWORD'),
    database=os.environ.get('DB_NAME', 'appdb'),
    connect_timeout=10
)

cursor = conn.cursor()
cursor.execute('SELECT version()')
version = cursor.fetchone()
print(f'Connected to: {version[0]}')

cursor.close()
conn.close()
```

## Configuring Backups

Lightsail databases have automatic daily backups enabled by default. You can also create manual snapshots.

```bash
# Create a manual snapshot before a major change
aws lightsail create-relational-database-snapshot \
  --relational-database-name my-app-db \
  --relational-database-snapshot-name pre-migration-backup

# Check snapshot status
aws lightsail get-relational-database-snapshot \
  --relational-database-snapshot-name pre-migration-backup \
  --query 'relationalDatabaseSnapshot.{State: state, SizeInGb: sizeInGb, CreatedAt: createdAt}'

# List all snapshots
aws lightsail get-relational-database-snapshots \
  --query 'relationalDatabaseSnapshots[].{Name: name, State: state, Created: createdAt, Engine: engine}' \
  --output table
```

Configure the backup window and maintenance window.

```bash
# Set the preferred backup window (in UTC)
aws lightsail update-relational-database \
  --relational-database-name my-app-db \
  --preferred-backup-window "03:00-03:30"

# Set the preferred maintenance window
aws lightsail update-relational-database \
  --relational-database-name my-app-db \
  --preferred-maintenance-window "sun:05:00-sun:05:30"
```

## Restoring from a Snapshot

If you need to restore, create a new database from the snapshot.

```bash
# Restore a database from a snapshot
aws lightsail create-relational-database-from-snapshot \
  --relational-database-name my-app-db-restored \
  --relational-database-snapshot-name pre-migration-backup \
  --availability-zone us-east-1a \
  --relational-database-bundle-id micro_2_0
```

## Modifying Database Parameters

You can customize database parameters using parameter groups.

```bash
# Update database parameters (example: increasing max_connections)
aws lightsail update-relational-database-parameters \
  --relational-database-name my-app-db \
  --parameters '[
    {
      "parameterName": "max_connections",
      "parameterValue": "200",
      "applyMethod": "pending-reboot"
    },
    {
      "parameterName": "slow_query_log",
      "parameterValue": "1",
      "applyMethod": "immediate"
    },
    {
      "parameterName": "long_query_time",
      "parameterValue": "2",
      "applyMethod": "immediate"
    }
  ]'
```

Some parameters require a reboot to take effect.

```bash
# Reboot the database to apply pending parameter changes
aws lightsail reboot-relational-database \
  --relational-database-name my-app-db
```

## Monitoring Database Performance

Check database metrics to understand performance.

```bash
# Get CPU utilization for the last hour
aws lightsail get-relational-database-metric-data \
  --relational-database-name my-app-db \
  --metric-name CPUUtilization \
  --period 300 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --statistics Average \
  --unit Percent

# Check database connections
aws lightsail get-relational-database-metric-data \
  --relational-database-name my-app-db \
  --metric-name DatabaseConnections \
  --period 300 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --statistics Maximum \
  --unit Count

# Check free storage space
aws lightsail get-relational-database-metric-data \
  --relational-database-name my-app-db \
  --metric-name FreeStorageSpace \
  --period 3600 \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --statistics Minimum \
  --unit Bytes
```

## Security Best Practices

1. **Disable public access**: Use `--no-publicly-accessible` unless you specifically need external access
2. **Strong passwords**: Use at least 16 characters with mixed case, numbers, and symbols
3. **Rotate passwords**: Change the master password periodically
4. **Use environment variables**: Never hardcode credentials in your application code
5. **Limit connections**: Set `max_connections` to what your app actually needs

```bash
# Change the master password
aws lightsail update-relational-database \
  --relational-database-name my-app-db \
  --master-user-password "NewStr0ngerP@ssword!2026"

# Disable public access
aws lightsail update-relational-database \
  --relational-database-name my-app-db \
  --no-publicly-accessible
```

## Troubleshooting Checklist

1. Can't connect? Check if the database is publicly accessible or if you're connecting from within the same region
2. Connection timeouts? Verify the Lightsail instance can reach the database endpoint
3. Authentication errors? Double-check username, password, and database name
4. Performance issues? Check CPU and connection metrics, consider upgrading the plan
5. Running out of storage? Create a snapshot and upgrade to a larger bundle

Lightsail databases are a great fit when you want managed database simplicity without the pricing complexity of RDS. For load balancing your application in front of the database, check out our guide on [setting up a Lightsail load balancer](https://oneuptime.com/blog/post/2026-02-12-setup-lightsail-load-balancer/view).

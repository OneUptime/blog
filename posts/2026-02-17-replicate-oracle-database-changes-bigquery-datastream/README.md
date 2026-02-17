# How to Replicate Oracle Database Changes to BigQuery Using Datastream

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Datastream, Oracle, BigQuery, CDC, Change Data Capture, Database Replication

Description: Learn how to set up Google Cloud Datastream to replicate Oracle database changes to BigQuery for real-time analytics and reporting.

---

Oracle databases are still everywhere in enterprise environments, and getting data out of them for analytics has historically been painful. Traditional approaches involve complex ETL tools, Oracle GoldenGate licenses, or custom scripts that read from Oracle's redo logs. Datastream simplifies this dramatically by providing a managed CDC service that reads Oracle's LogMiner output and streams changes directly to BigQuery.

This guide covers the complete setup process, including the Oracle-specific configuration that tends to trip people up.

## How Datastream Reads from Oracle

Datastream uses Oracle LogMiner to capture changes from the redo logs. LogMiner is a built-in Oracle utility that interprets the binary redo log files and presents changes as SQL statements. Datastream connects to your Oracle instance, enables supplemental logging for the tables you want to replicate, and continuously reads new changes from LogMiner.

This approach does not require Oracle GoldenGate or any additional Oracle licensing beyond your existing database license.

## Step 1: Configure Oracle for CDC

Oracle requires several configuration changes to support change data capture through LogMiner.

First, enable archive log mode if it is not already enabled:

```sql
-- Check current archive log mode
SELECT LOG_MODE FROM V$DATABASE;

-- If not in ARCHIVELOG mode, enable it (requires restart)
SHUTDOWN IMMEDIATE;
STARTUP MOUNT;
ALTER DATABASE ARCHIVELOG;
ALTER DATABASE OPEN;

-- Verify the change
SELECT LOG_MODE FROM V$DATABASE;
-- Should return ARCHIVELOG
```

Next, enable supplemental logging at the database level:

```sql
-- Enable minimum supplemental logging
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA;

-- Enable supplemental logging for all columns (recommended for CDC)
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (ALL) COLUMNS;

-- Verify supplemental logging is enabled
SELECT SUPPLEMENTAL_LOG_DATA_MIN, SUPPLEMENTAL_LOG_DATA_ALL
FROM V$DATABASE;
```

## Step 2: Create a Datastream User in Oracle

Create a dedicated Oracle user with the specific privileges Datastream needs:

```sql
-- Create the Datastream user
CREATE USER datastream_user IDENTIFIED BY "StrongPassword123";

-- Grant basic connect and session privileges
GRANT CREATE SESSION TO datastream_user;

-- Grant LogMiner privileges
GRANT EXECUTE_CATALOG_ROLE TO datastream_user;
GRANT SELECT ANY TRANSACTION TO datastream_user;
GRANT SELECT ANY DICTIONARY TO datastream_user;
GRANT LOGMINING TO datastream_user;

-- Grant SELECT on the tables to replicate
GRANT SELECT ON schema_owner.orders TO datastream_user;
GRANT SELECT ON schema_owner.customers TO datastream_user;
GRANT SELECT ON schema_owner.products TO datastream_user;

-- Grant flashback for consistent reads during backfill
GRANT FLASHBACK ON schema_owner.orders TO datastream_user;
GRANT FLASHBACK ON schema_owner.customers TO datastream_user;
GRANT FLASHBACK ON schema_owner.products TO datastream_user;
```

For Oracle 12c and later with multitenant architecture (CDB/PDB), the user setup is slightly different:

```sql
-- Connect to the CDB root
ALTER SESSION SET CONTAINER = CDB$ROOT;

-- Create a common user
CREATE USER C##DATASTREAM IDENTIFIED BY "StrongPassword123";
GRANT CREATE SESSION TO C##DATASTREAM CONTAINER = ALL;
GRANT SET CONTAINER TO C##DATASTREAM CONTAINER = ALL;
GRANT SELECT ANY DICTIONARY TO C##DATASTREAM CONTAINER = ALL;
GRANT LOGMINING TO C##DATASTREAM CONTAINER = ALL;
GRANT EXECUTE_CATALOG_ROLE TO C##DATASTREAM CONTAINER = ALL;

-- Switch to the PDB and grant object-level permissions
ALTER SESSION SET CONTAINER = MY_PDB;
GRANT SELECT ON schema_owner.orders TO C##DATASTREAM;
GRANT SELECT ON schema_owner.customers TO C##DATASTREAM;
```

## Step 3: Configure Redo Log Retention

Datastream reads from Oracle's redo logs, so you need to ensure logs are retained long enough for Datastream to process them. If logs are recycled before Datastream reads them, you will lose data.

```sql
-- Check current redo log retention (in minutes)
SELECT VALUE FROM V$PARAMETER WHERE NAME = 'db_flashback_retention_target';

-- Set log retention to at least 4 hours (240 minutes)
ALTER SYSTEM SET DB_FLASHBACK_RETENTION_TARGET = 240 SCOPE = BOTH;
```

For Amazon RDS Oracle instances, configure the retention through RDS:

```bash
# Set archive log retention for RDS Oracle (in hours)
aws rds modify-db-instance \
  --db-instance-identifier my-oracle-instance \
  --cloudwatch-logs-export-configuration '{"EnableLogTypes":["alert","trace","audit"]}' \
  --backup-retention-period 7
```

## Step 4: Network Connectivity

Oracle databases are often in private networks with strict firewall rules. Datastream needs to reach Oracle on the listener port (typically 1521).

```bash
# Create a private connectivity configuration for VPC peering
gcloud datastream private-connections create oracle-private-conn \
  --display-name="Oracle Private Connection" \
  --location=us-central1 \
  --vpc=projects/my-project/global/networks/default \
  --subnet=10.3.0.0/29 \
  --project=my-project
```

If your Oracle instance is on-premises, you will need a VPN tunnel or Cloud Interconnect between your data center and GCP.

## Step 5: Create Connection Profiles and Stream

Set up the Oracle source connection profile:

```bash
# Create Oracle connection profile
gcloud datastream connection-profiles create oracle-source \
  --display-name="Production Oracle" \
  --type=oracle \
  --oracle-hostname=10.0.0.20 \
  --oracle-port=1521 \
  --oracle-username=datastream_user \
  --oracle-password=StrongPassword123 \
  --oracle-database-service=ORCL \
  --location=us-central1 \
  --private-connection=oracle-private-conn \
  --project=my-project
```

Create the BigQuery destination profile and the stream:

```bash
# Create BigQuery destination profile
gcloud datastream connection-profiles create bq-oracle-dest \
  --display-name="BigQuery for Oracle Data" \
  --type=bigquery \
  --location=us-central1 \
  --project=my-project

# Create the stream
gcloud datastream streams create oracle-to-bq-stream \
  --display-name="Oracle to BigQuery CDC" \
  --location=us-central1 \
  --source=oracle-source \
  --oracle-source-config='{
    "includeObjects": {
      "oracleSchemas": [
        {
          "schema": "SCHEMA_OWNER",
          "oracleTables": [
            {"table": "ORDERS"},
            {"table": "CUSTOMERS"},
            {"table": "PRODUCTS"}
          ]
        }
      ]
    }
  }' \
  --destination=bq-oracle-dest \
  --bigquery-destination-config='{
    "dataFreshness": "300s",
    "singleTargetDataset": {
      "datasetId": "projects/my-project/datasets/oracle_replicated"
    }
  }' \
  --project=my-project
```

## Oracle Data Type Mapping

Oracle has some unique data types that get mapped to BigQuery types:

| Oracle Type | BigQuery Type | Notes |
|------------|---------------|-------|
| NUMBER | NUMERIC or INT64 | Depends on scale and precision |
| VARCHAR2 | STRING | |
| DATE | TIMESTAMP | Oracle DATE includes time |
| TIMESTAMP | TIMESTAMP | |
| CLOB | STRING | Up to 10 MB |
| BLOB | BYTES | Up to 10 MB |
| RAW | BYTES | |
| XMLTYPE | STRING | Serialized as text |
| INTERVAL | STRING | No direct BQ mapping |

Oracle's NUMBER type is particularly interesting. A NUMBER(10,0) maps to INT64, while a NUMBER(38,10) maps to NUMERIC. If you have NUMBER columns without precision (just plain NUMBER), they map to FLOAT64, which can cause precision loss for large integers.

## Handling Oracle-Specific Challenges

There are several Oracle-specific issues you may encounter.

Supplemental logging per table can be more efficient than database-level if you only need a few tables:

```sql
-- Enable supplemental logging on specific tables only
ALTER TABLE schema_owner.orders ADD SUPPLEMENTAL LOG DATA (ALL) COLUMNS;
ALTER TABLE schema_owner.customers ADD SUPPLEMENTAL LOG DATA (ALL) COLUMNS;
```

Oracle sequences are not replicated by Datastream since they are not table data. If your BigQuery consumers need sequence values, you will need to handle those through the application layer.

Tables with LOB columns (CLOB, BLOB) require extra attention. Large LOBs can slow down replication significantly. Consider excluding very large LOB columns if they are not needed in BigQuery.

```sql
-- Check LOB column sizes to identify potential bottlenecks
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE,
  AVG_COL_LEN, NUM_DISTINCT
FROM ALL_TAB_COLUMNS
WHERE DATA_TYPE IN ('CLOB', 'BLOB', 'NCLOB')
AND OWNER = 'SCHEMA_OWNER';
```

## Monitoring the Oracle Stream

Monitor the stream health and replication lag:

```bash
# Describe stream status
gcloud datastream streams describe oracle-to-bq-stream \
  --location=us-central1 \
  --project=my-project \
  --format="yaml(state, errors, backfillAll)"
```

Also monitor Oracle's side to ensure LogMiner is keeping up:

```sql
-- Check LogMiner session status
SELECT * FROM V$LOGMNR_SESSION;

-- Check archive log generation rate
SELECT
  TO_CHAR(COMPLETION_TIME, 'YYYY-MM-DD HH24') AS hour,
  COUNT(*) AS log_switches,
  SUM(BLOCKS * BLOCK_SIZE) / 1024 / 1024 AS total_mb
FROM V$ARCHIVED_LOG
WHERE COMPLETION_TIME > SYSDATE - 1
GROUP BY TO_CHAR(COMPLETION_TIME, 'YYYY-MM-DD HH24')
ORDER BY 1;
```

## Wrapping Up

Replicating Oracle to BigQuery with Datastream removes the need for expensive third-party CDC tools and complex custom pipelines. The Oracle setup is more involved than MySQL or PostgreSQL due to LogMiner requirements and the supplemental logging configuration, but once running, the stream is reliable and low-maintenance. The main things to watch are redo log retention and LOB column sizes. If you are migrating analytics workloads off Oracle, Datastream provides a clean path to get your data into BigQuery where you can take advantage of BigQuery's scale and pricing model.

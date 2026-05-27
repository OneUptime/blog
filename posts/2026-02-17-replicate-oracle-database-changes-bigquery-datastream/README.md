# How to Replicate Oracle Database Changes to BigQuery Using Datastream

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Datastream, Oracle, BigQuery, CDC, Change Data Capture, Database Replication

Description: Learn how to set up Google Cloud Datastream to replicate Oracle database changes to BigQuery for real-time analytics and reporting.

---

Oracle databases are still everywhere in enterprise environments, and getting data out of them for analytics has historically been painful. Traditional approaches involve complex ETL tools, Oracle GoldenGate licenses, or custom scripts that read from Oracle's redo logs. Datastream simplifies this dramatically by providing a managed CDC service that reads Oracle's LogMiner output and streams changes directly to BigQuery.

This guide covers the complete setup process, including the Oracle-specific configuration that tends to trip people up.

## How Datastream Reads from Oracle

Datastream can use Oracle LogMiner to capture changes from archived redo logs. LogMiner is a built-in Oracle utility that interprets the binary redo log files and presents changes as SQL statements. Datastream connects to your Oracle instance and reads changes from LogMiner after you configure supplemental logging for the tables you want to replicate.

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
GRANT CONNECT TO datastream_user;
GRANT SELECT ON SYS.V_$DATABASE TO datastream_user;
GRANT SELECT ON SYS.V_$LOG TO datastream_user;
GRANT SELECT ON SYS.V_$LOGFILE TO datastream_user;
GRANT SELECT ON SYS.V_$ARCHIVED_LOG TO datastream_user;
GRANT SELECT ON SYS.V_$LOGMNR_CONTENTS TO datastream_user;
GRANT SELECT ON SYS.V_$PARAMETER TO datastream_user;
GRANT EXECUTE ON DBMS_LOGMNR TO datastream_user;
GRANT EXECUTE ON DBMS_LOGMNR_D TO datastream_user;
GRANT SELECT ANY TRANSACTION TO datastream_user;
GRANT SELECT ANY TABLE TO datastream_user;
GRANT LOGMINING TO datastream_user;
GRANT SELECT ON DBA_EXTENTS TO datastream_user;

-- If the database uses Transparent Data Encryption (TDE)
GRANT SELECT ON DBA_TABLESPACES TO datastream_user;
GRANT SELECT ON DBA_ENCRYPTED_COLUMNS TO datastream_user;
```

For Oracle 12c and later with multitenant architecture (CDB/PDB), the user setup is slightly different:

```sql
-- Connect to the CDB root
ALTER SESSION SET CONTAINER = CDB$ROOT;

-- Create a common user
CREATE USER C##DATASTREAM IDENTIFIED BY "StrongPassword123";
GRANT CREATE SESSION TO C##DATASTREAM;
GRANT SET CONTAINER TO C##DATASTREAM;
GRANT SELECT ON SYS.V_$DATABASE TO C##DATASTREAM;
GRANT SELECT ON SYS.V_$LOGMNR_CONTENTS TO C##DATASTREAM;
GRANT EXECUTE ON DBMS_LOGMNR TO C##DATASTREAM;
GRANT EXECUTE ON DBMS_LOGMNR_D TO C##DATASTREAM;
GRANT LOGMINING TO C##DATASTREAM;
GRANT EXECUTE_CATALOG_ROLE TO C##DATASTREAM;

-- Switch to the PDB and grant object-level permissions
ALTER SESSION SET CONTAINER = MY_PDB;
GRANT CREATE SESSION TO C##DATASTREAM;
GRANT SET CONTAINER TO C##DATASTREAM;
GRANT SELECT ANY TABLE TO C##DATASTREAM;
GRANT SELECT ON SYS.V_$DATABASE TO C##DATASTREAM;
GRANT SELECT ON SYS.V_$LOG TO C##DATASTREAM;
GRANT SELECT ON SYS.V_$LOGFILE TO C##DATASTREAM;
GRANT SELECT ON SYS.V_$ARCHIVED_LOG TO C##DATASTREAM;
GRANT SELECT ON DBA_SUPPLEMENTAL_LOGGING TO C##DATASTREAM;
GRANT SELECT ON SYS.V_$PARAMETER TO C##DATASTREAM;
GRANT SELECT ON DBA_EXTENTS TO C##DATASTREAM;
```

## Step 3: Configure Redo Log Retention

Datastream reads from Oracle's archived redo logs when using LogMiner, so you need to ensure archive logs are retained long enough for Datastream to process them. If logs are deleted before Datastream reads them, you will lose data.

```bash
rman target / <<'RMAN'
CONFIGURE RETENTION POLICY TO RECOVERY WINDOW OF 4 DAYS;
RMAN
```

For Amazon RDS Oracle instances, configure the retention through RDS:

```sql
-- Set archive log retention for RDS Oracle (in hours)
BEGIN
  rdsadmin.rdsadmin_util.set_configuration(
    name  => 'archivelog retention hours',
    value => '24');
END;
/
COMMIT;

-- Verify the current RDS archived redo log retention
SET SERVEROUTPUT ON
EXEC rdsadmin.rdsadmin_util.show_configuration;
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
  --database-service=ORCL \
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

cat > oracle-source-config.json <<'JSON'
{
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
  },
  "logMiner": {}
}
JSON

cat > bigquery-destination-config.json <<'JSON'
{
  "dataFreshness": "300s",
  "singleTargetDataset": {
    "datasetId": "my-project:oracle_replicated"
  },
  "merge": {}
}
JSON

# Create the stream
gcloud datastream streams create oracle-to-bq-stream \
  --display-name="Oracle to BigQuery CDC" \
  --location=us-central1 \
  --source=oracle-source \
  --oracle-source-config=oracle-source-config.json \
  --destination=bq-oracle-dest \
  --bigquery-destination-config=bigquery-destination-config.json \
  --project=my-project
```

## Oracle Data Type Mapping

Oracle has some unique data types that get mapped to BigQuery types:

| Oracle Type | BigQuery Type | Notes |
|------------|---------------|-------|
| NUMBER | STRING, INT64, NUMERIC, or BIGNUMERIC | Depends on scale and precision |
| VARCHAR2 | STRING | |
| DATE | DATETIME | Oracle DATE includes time |
| TIMESTAMP | TIMESTAMP | |
| CLOB | STRING | Requires `streamLargeObjects` in the stream configuration |
| BLOB | BYTES | Requires `streamLargeObjects` in the stream configuration |
| RAW | STRING | |
| XMLTYPE | UNSUPPORTED | Replaced with NULL |
| INTERVAL | UNSUPPORTED | Replaced with NULL |

Oracle's NUMBER type is particularly interesting. A NUMBER(10,0) maps to INT64, while NUMBER columns with positive scale map to BigQuery parameterized decimal types when the precision is within BigQuery's supported range. If you have NUMBER columns without precision (just plain NUMBER), Datastream maps them to STRING to avoid precision loss.

## Handling Oracle-Specific Challenges

There are several Oracle-specific issues you may encounter.

Supplemental logging per table can be more efficient than database-level if you only need a few tables:

```sql
-- Enable supplemental logging on specific tables only
ALTER TABLE schema_owner.orders ADD SUPPLEMENTAL LOG DATA (ALL) COLUMNS;
ALTER TABLE schema_owner.customers ADD SUPPLEMENTAL LOG DATA (ALL) COLUMNS;
```

Oracle sequences are not replicated by Datastream since they are not table data. If your BigQuery consumers need sequence values, you will need to handle those through the application layer.

Tables with LOB columns (CLOB, BLOB) require extra attention. Datastream only streams LOB values when you include `streamLargeObjects` in the Oracle source configuration; otherwise, LOB columns are written as NULL in the destination. Large LOBs can slow down replication significantly. Consider excluding very large LOB columns if they are not needed in BigQuery.

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

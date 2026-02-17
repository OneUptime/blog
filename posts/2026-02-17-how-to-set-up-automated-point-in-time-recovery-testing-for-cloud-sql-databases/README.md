# How to Set Up Automated Point-in-Time Recovery Testing for Cloud SQL Databases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Point-in-Time Recovery, Backup Testing, Database Reliability

Description: Learn how to automate point-in-time recovery testing for Cloud SQL databases to verify your backups actually work before you need them in a real disaster scenario.

---

Every database team says they have backups. Far fewer can prove those backups actually work. Point-in-time recovery (PITR) is one of the most powerful backup features in Cloud SQL - it lets you restore your database to any second within the retention window. But if you have never tested a PITR restore, you have no idea whether it will work when you actually need it.

This guide shows you how to build an automated PITR testing pipeline that regularly restores your databases, validates the data, and reports the results. Think of it as a fire drill for your database backups.

## Why Automated Testing Matters

Manual backup testing has a tendency to never happen. It is always on the to-do list but never urgent enough to prioritize over feature work. Then one day your production database gets corrupted, you try to restore from a backup, and you discover the backups have been silently failing for three months.

Automated testing removes the human factor. The tests run on a schedule, validate the restore, and alert you if anything is wrong.

## Step 1: Enable Point-in-Time Recovery

First, make sure PITR is enabled on your Cloud SQL instance. It requires binary logging (MySQL) or WAL archiving (PostgreSQL).

```bash
# Enable PITR for a PostgreSQL instance
gcloud sql instances patch my-production-db \
  --enable-point-in-time-recovery \
  --retained-transaction-log-days=7

# Enable PITR for a MySQL instance
gcloud sql instances patch my-mysql-db \
  --enable-bin-log \
  --retained-transaction-log-days=7

# Verify PITR is enabled
gcloud sql instances describe my-production-db \
  --format="yaml(settings.backupConfiguration)"
```

## Step 2: Build the PITR Test Framework

Create a Cloud Function that orchestrates the PITR test process.

```python
# pitr_test/main.py
import json
import time
import datetime
from google.cloud import sqladmin_v1
from google.cloud import monitoring_v3
from google.cloud import secretmanager

class PITRTester:
    """Automated PITR testing for Cloud SQL instances."""

    def __init__(self, project_id):
        self.project_id = project_id
        self.sql_client = sqladmin_v1.SqlInstancesServiceClient()
        self.monitoring_client = monitoring_v3.MetricServiceClient()

    def run_pitr_test(self, source_instance, target_zone="us-central1-c"):
        """Run a complete PITR test cycle."""
        results = {
            "source_instance": source_instance,
            "test_started": datetime.datetime.utcnow().isoformat(),
            "steps": {},
        }

        # Step 1: Create a PITR restore to a test instance
        restore_target_time = (
            datetime.datetime.utcnow() - datetime.timedelta(minutes=5)
        )
        test_instance_name = f"pitr-test-{int(time.time())}"

        print(f"Restoring {source_instance} to {test_instance_name} "
              f"at {restore_target_time}")

        try:
            restore_start = time.time()
            self.create_pitr_clone(
                source_instance,
                test_instance_name,
                restore_target_time,
                target_zone,
            )
            restore_duration = time.time() - restore_start

            results["steps"]["restore"] = {
                "status": "SUCCESS",
                "duration_seconds": round(restore_duration, 1),
                "target_time": restore_target_time.isoformat(),
            }
        except Exception as e:
            results["steps"]["restore"] = {
                "status": "FAILED",
                "error": str(e),
            }
            self.report_failure(source_instance, "restore", str(e))
            return results

        # Step 2: Validate the restored database
        try:
            validation_start = time.time()
            validation_results = self.validate_restored_database(
                test_instance_name
            )
            validation_duration = time.time() - validation_start

            results["steps"]["validation"] = {
                "status": "SUCCESS" if validation_results["passed"] else "FAILED",
                "duration_seconds": round(validation_duration, 1),
                "checks": validation_results["checks"],
            }
        except Exception as e:
            results["steps"]["validation"] = {
                "status": "FAILED",
                "error": str(e),
            }

        # Step 3: Clean up the test instance
        try:
            self.cleanup_test_instance(test_instance_name)
            results["steps"]["cleanup"] = {"status": "SUCCESS"}
        except Exception as e:
            results["steps"]["cleanup"] = {
                "status": "FAILED",
                "error": str(e),
            }

        results["test_completed"] = datetime.datetime.utcnow().isoformat()
        results["overall_status"] = (
            "PASSED" if all(
                s.get("status") == "SUCCESS"
                for s in results["steps"].values()
            ) else "FAILED"
        )

        # Report metrics
        self.report_metrics(results)

        return results

    def create_pitr_clone(self, source, target, restore_time, zone):
        """Create a Cloud SQL clone using PITR."""
        request = sqladmin_v1.SqlInstancesCloneRequest(
            project=self.project_id,
            instance=source,
            body=sqladmin_v1.InstancesCloneRequest(
                clone_context=sqladmin_v1.CloneContext(
                    destination_instance_name=target,
                    point_in_time=restore_time.strftime(
                        "%Y-%m-%dT%H:%M:%S.000Z"
                    ),
                    preferred_zone=zone,
                )
            ),
        )

        operation = self.sql_client.clone(request=request)

        # Wait for the clone operation to complete
        self.wait_for_operation(operation.name)

    def wait_for_operation(self, operation_name, timeout=1800):
        """Wait for a Cloud SQL operation to complete."""
        op_client = sqladmin_v1.SqlOperationsServiceClient()
        start_time = time.time()

        while time.time() - start_time < timeout:
            op = op_client.get(
                project=self.project_id,
                operation=operation_name.split("/")[-1],
            )
            if op.status == sqladmin_v1.Operation.SqlOperationStatus.DONE:
                if op.error:
                    raise Exception(f"Operation failed: {op.error}")
                return
            time.sleep(30)

        raise TimeoutError(
            f"Operation {operation_name} did not complete within {timeout}s"
        )
```

## Step 3: Implement Database Validation

After the restore completes, validate that the database is actually usable and contains expected data.

```python
import psycopg2
import mysql.connector

class DatabaseValidator:
    """Validate a restored Cloud SQL database."""

    def __init__(self, instance_ip, db_name, db_type="postgresql"):
        self.instance_ip = instance_ip
        self.db_name = db_name
        self.db_type = db_type

    def get_connection(self):
        """Get a database connection."""
        password = get_secret("pitr-test-db-password")

        if self.db_type == "postgresql":
            return psycopg2.connect(
                host=self.instance_ip,
                database=self.db_name,
                user="postgres",
                password=password,
            )
        elif self.db_type == "mysql":
            return mysql.connector.connect(
                host=self.instance_ip,
                database=self.db_name,
                user="root",
                password=password,
            )

    def run_all_checks(self):
        """Run all validation checks."""
        checks = []

        # Check 1: Can we connect?
        checks.append(self.check_connectivity())

        # Check 2: Do key tables exist?
        checks.append(self.check_table_existence([
            "users", "orders", "products", "transactions"
        ]))

        # Check 3: Do tables have data?
        checks.append(self.check_table_row_counts())

        # Check 4: Are recent records present?
        checks.append(self.check_recent_data())

        # Check 5: Do indexes exist?
        checks.append(self.check_indexes())

        # Check 6: Can we run a complex query?
        checks.append(self.check_query_execution())

        passed = all(c["passed"] for c in checks)
        return {"passed": passed, "checks": checks}

    def check_connectivity(self):
        """Verify we can connect to the database."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            conn.close()
            return {"name": "connectivity", "passed": True}
        except Exception as e:
            return {"name": "connectivity", "passed": False, "error": str(e)}

    def check_table_existence(self, expected_tables):
        """Verify expected tables exist."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            if self.db_type == "postgresql":
                cursor.execute("""
                    SELECT table_name FROM information_schema.tables
                    WHERE table_schema = 'public'
                """)
            else:
                cursor.execute("SHOW TABLES")

            existing_tables = {row[0] for row in cursor.fetchall()}
            missing = set(expected_tables) - existing_tables

            cursor.close()
            conn.close()

            return {
                "name": "table_existence",
                "passed": len(missing) == 0,
                "missing_tables": list(missing) if missing else None,
            }
        except Exception as e:
            return {"name": "table_existence", "passed": False, "error": str(e)}

    def check_table_row_counts(self):
        """Verify tables have reasonable row counts."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Get row counts for important tables
            tables_to_check = ["users", "orders", "products"]
            row_counts = {}

            for table in tables_to_check:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                row_counts[table] = count

            cursor.close()
            conn.close()

            # Check that no table is empty (assuming production has data)
            empty_tables = [t for t, c in row_counts.items() if c == 0]

            return {
                "name": "row_counts",
                "passed": len(empty_tables) == 0,
                "counts": row_counts,
                "empty_tables": empty_tables if empty_tables else None,
            }
        except Exception as e:
            return {"name": "row_counts", "passed": False, "error": str(e)}

    def check_recent_data(self):
        """Verify that recent data exists (within last 24 hours)."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT COUNT(*) FROM orders
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            """)
            recent_count = cursor.fetchone()[0]

            cursor.close()
            conn.close()

            return {
                "name": "recent_data",
                "passed": recent_count > 0,
                "recent_records": recent_count,
            }
        except Exception as e:
            return {"name": "recent_data", "passed": False, "error": str(e)}

    def check_indexes(self):
        """Verify that important indexes exist."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT indexname, tablename
                FROM pg_indexes
                WHERE schemaname = 'public'
            """)
            indexes = cursor.fetchall()

            cursor.close()
            conn.close()

            return {
                "name": "indexes",
                "passed": len(indexes) > 0,
                "index_count": len(indexes),
            }
        except Exception as e:
            return {"name": "indexes", "passed": False, "error": str(e)}

    def check_query_execution(self):
        """Verify that a representative complex query executes correctly."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Run a query that exercises joins and aggregations
            cursor.execute("""
                SELECT
                    u.id,
                    COUNT(o.id) AS order_count,
                    COALESCE(SUM(o.total_amount), 0) AS total_spent
                FROM users u
                LEFT JOIN orders o ON u.id = o.user_id
                GROUP BY u.id
                ORDER BY total_spent DESC
                LIMIT 10
            """)
            results = cursor.fetchall()

            cursor.close()
            conn.close()

            return {
                "name": "query_execution",
                "passed": len(results) > 0,
                "rows_returned": len(results),
            }
        except Exception as e:
            return {"name": "query_execution", "passed": False, "error": str(e)}
```

## Step 4: Schedule Automated Tests

```bash
# Deploy the PITR test as a Cloud Function
gcloud functions deploy pitr-test \
  --gen2 \
  --runtime=python311 \
  --region=us-central1 \
  --source=./pitr_test \
  --entry-point=run_test \
  --trigger-topic=pitr-test-trigger \
  --timeout=1800 \
  --memory=512MB \
  --service-account=pitr-tester@PROJECT_ID.iam.gserviceaccount.com

# Schedule weekly PITR tests
gcloud scheduler jobs create pubsub weekly-pitr-test \
  --schedule="0 3 * * 0" \
  --topic=pitr-test-trigger \
  --message-body='{"instance": "my-production-db", "database": "myapp"}' \
  --location=us-central1 \
  --time-zone="UTC"
```

## Step 5: Report and Alert on Results

```python
def report_metrics(self, results):
    """Report PITR test results to Cloud Monitoring."""
    project_name = f"projects/{self.project_id}"

    # Report test result (1 = passed, 0 = failed)
    series = monitoring_v3.TimeSeries()
    series.metric.type = "custom.googleapis.com/cloud_sql/pitr_test_result"
    series.metric.labels["instance"] = results["source_instance"]
    series.resource.type = "global"

    point = monitoring_v3.Point()
    point.value.int64_value = 1 if results["overall_status"] == "PASSED" else 0
    now = time.time()
    point.interval.end_time.seconds = int(now)
    series.points = [point]

    self.monitoring_client.create_time_series(
        name=project_name, time_series=[series]
    )
```

Automated PITR testing gives you confidence that your Cloud SQL backups actually work. Instead of hoping for the best during a real disaster, you have weekly proof that you can restore your databases to any point in time. The few dollars spent on test instances each week is trivial compared to the cost of discovering your backups are broken during an actual outage.

# How to Create Restore Testing Schedules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Backup, Testing, Disaster Recovery, Validation

Description: Learn how to schedule and conduct regular restore tests for backup validation.

---

Backups are worthless if they cannot be restored. The only way to know your backups work is to test them regularly. Here is how to create and maintain effective restore testing schedules.

## Why Restore Testing Matters

```mermaid
flowchart TB
    subgraph "Without Testing"
        B1[Create Backup] --> B2[Store Backup]
        B2 --> B3[Disaster Strikes]
        B3 --> B4[Attempt Restore]
        B4 --> B5[Restore Fails]
        B5 --> B6[Data Lost Forever]
    end

    subgraph "With Testing"
        T1[Create Backup] --> T2[Store Backup]
        T2 --> T3[Test Restore]
        T3 --> T4{Success?}
        T4 -->|Yes| T5[Backup Verified]
        T4 -->|No| T6[Fix Issues]
        T6 --> T1
        T5 --> T7[Disaster Strikes]
        T7 --> T8[Restore Succeeds]
        T8 --> T9[Business Continues]
    end
```

Common backup failures discovered during testing:
- Corrupted backup files
- Missing dependencies or configuration
- Insufficient storage space
- Credential or permission issues
- Incompatible software versions
- Network connectivity problems

## Test Frequency Determination

The frequency of restore testing depends on several factors:

### Risk-Based Testing Schedule

```mermaid
flowchart LR
    subgraph "Data Classification"
        C1[Critical - RPO < 1hr]
        C2[Important - RPO < 24hr]
        C3[Standard - RPO < 7 days]
        C4[Archive - RPO > 30 days]
    end

    subgraph "Test Frequency"
        F1[Weekly]
        F2[Monthly]
        F3[Quarterly]
        F4[Annually]
    end

    C1 --> F1
    C2 --> F2
    C3 --> F3
    C4 --> F4
```

### Calculating Test Frequency

Consider these factors when determining how often to test:

```python
# restore_frequency_calculator.py

from dataclasses import dataclass
from enum import Enum
from typing import List

class DataCriticality(Enum):
    CRITICAL = 4      # Business cannot operate without it
    IMPORTANT = 3     # Significant impact if lost
    STANDARD = 2      # Moderate impact
    ARCHIVE = 1       # Minimal immediate impact

class ChangeFrequency(Enum):
    HOURLY = 4
    DAILY = 3
    WEEKLY = 2
    MONTHLY = 1

class ComplianceRequirement(Enum):
    SOC2 = 3
    HIPAA = 4
    PCI_DSS = 4
    GDPR = 3
    NONE = 1

@dataclass
class BackupSystem:
    name: str
    data_criticality: DataCriticality
    change_frequency: ChangeFrequency
    compliance: List[ComplianceRequirement]
    last_restore_test: str  # ISO date

def calculate_test_frequency_days(system: BackupSystem) -> int:
    """
    Calculate recommended restore test frequency in days.
    Lower score = more frequent testing needed.
    """
    # Base frequency based on criticality
    base_frequencies = {
        DataCriticality.CRITICAL: 7,      # Weekly
        DataCriticality.IMPORTANT: 30,    # Monthly
        DataCriticality.STANDARD: 90,     # Quarterly
        DataCriticality.ARCHIVE: 365      # Annually
    }

    base_days = base_frequencies[system.data_criticality]

    # Adjust for change frequency
    change_multipliers = {
        ChangeFrequency.HOURLY: 0.5,
        ChangeFrequency.DAILY: 0.75,
        ChangeFrequency.WEEKLY: 1.0,
        ChangeFrequency.MONTHLY: 1.25
    }

    adjusted_days = base_days * change_multipliers[system.change_frequency]

    # Adjust for compliance (use strictest requirement)
    if system.compliance:
        max_compliance = max(c.value for c in system.compliance)
        compliance_multiplier = 1 - (max_compliance - 1) * 0.15
        adjusted_days *= compliance_multiplier

    return max(7, int(adjusted_days))  # Minimum weekly for any system

# Example usage
database_system = BackupSystem(
    name="Production PostgreSQL",
    data_criticality=DataCriticality.CRITICAL,
    change_frequency=ChangeFrequency.HOURLY,
    compliance=[ComplianceRequirement.SOC2, ComplianceRequirement.GDPR],
    last_restore_test="2026-01-15"
)

frequency = calculate_test_frequency_days(database_system)
print(f"Recommended test frequency for {database_system.name}: every {frequency} days")
# Output: Recommended test frequency for Production PostgreSQL: every 7 days
```

### Sample Testing Schedule

| System Type | Criticality | Test Frequency | Test Type |
|------------|-------------|----------------|-----------|
| Production Database | Critical | Weekly | Full + Partial |
| Application Configs | Important | Monthly | Full |
| User Data | Important | Monthly | Partial |
| Log Archives | Standard | Quarterly | Sampling |
| Cold Storage | Archive | Annually | Full |

## Full vs Partial Restore Tests

### Full Restore Test

A complete restoration of all backup data to verify end-to-end recovery:

```mermaid
flowchart TB
    subgraph "Full Restore Test"
        F1[Provision Test Environment] --> F2[Download Complete Backup]
        F2 --> F3[Restore All Data]
        F3 --> F4[Verify Data Integrity]
        F4 --> F5[Test Application Functionality]
        F5 --> F6[Measure Recovery Time]
        F6 --> F7[Document Results]
        F7 --> F8[Tear Down Environment]
    end
```

```bash
#!/bin/bash
# full_restore_test.sh

set -euo pipefail

# Configuration
BACKUP_SOURCE="s3://company-backups/production"
TEST_ENV="restore-test-$(date +%Y%m%d)"
RESTORE_DIR="/mnt/restore-test"
REPORT_DIR="/var/log/restore-tests"

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$REPORT_DIR/$TEST_ENV.log"
}

# Create test environment
setup_environment() {
    log "Setting up test environment: $TEST_ENV"

    mkdir -p "$RESTORE_DIR"
    mkdir -p "$REPORT_DIR"

    # Record start time
    echo "START_TIME=$(date +%s)" > "$REPORT_DIR/$TEST_ENV.metrics"
}

# Download and restore backup
perform_restore() {
    log "Starting full restore from $BACKUP_SOURCE"

    local download_start=$(date +%s)

    # Download backup
    aws s3 sync "$BACKUP_SOURCE/latest/" "$RESTORE_DIR/" \
        --quiet \
        2>> "$REPORT_DIR/$TEST_ENV.log"

    local download_end=$(date +%s)
    echo "DOWNLOAD_TIME=$((download_end - download_start))" >> "$REPORT_DIR/$TEST_ENV.metrics"

    log "Download completed in $((download_end - download_start)) seconds"

    # Restore database
    local restore_start=$(date +%s)

    PGPASSWORD="${DB_PASSWORD}" pg_restore \
        --host=localhost \
        --port=5433 \
        --username=restore_test \
        --dbname=restore_test_db \
        --verbose \
        "$RESTORE_DIR/database.dump" \
        2>> "$REPORT_DIR/$TEST_ENV.log"

    local restore_end=$(date +%s)
    echo "RESTORE_TIME=$((restore_end - restore_start))" >> "$REPORT_DIR/$TEST_ENV.metrics"

    log "Restore completed in $((restore_end - restore_start)) seconds"
}

# Verify data integrity
verify_integrity() {
    log "Verifying data integrity"

    local errors=0

    # Check row counts match expected
    local actual_users=$(psql -h localhost -p 5433 -U restore_test -d restore_test_db \
        -t -c "SELECT COUNT(*) FROM users;")
    local expected_users=$(cat "$RESTORE_DIR/checksums/users.count")

    if [ "$actual_users" -ne "$expected_users" ]; then
        log "ERROR: User count mismatch. Expected: $expected_users, Got: $actual_users"
        ((errors++))
    fi

    # Verify checksums for critical tables
    for table in users orders products; do
        local actual_checksum=$(psql -h localhost -p 5433 -U restore_test -d restore_test_db \
            -t -c "SELECT md5(string_agg(t::text, '')) FROM $table t;")
        local expected_checksum=$(cat "$RESTORE_DIR/checksums/$table.md5")

        if [ "$actual_checksum" != "$expected_checksum" ]; then
            log "ERROR: Checksum mismatch for table $table"
            ((errors++))
        else
            log "Checksum verified for table $table"
        fi
    done

    echo "INTEGRITY_ERRORS=$errors" >> "$REPORT_DIR/$TEST_ENV.metrics"

    return $errors
}

# Test application functionality
test_application() {
    log "Testing application functionality"

    # Start application with restored data
    docker run -d \
        --name "$TEST_ENV-app" \
        --network restore-test-network \
        -e DATABASE_URL="postgresql://restore_test:${DB_PASSWORD}@localhost:5433/restore_test_db" \
        company/application:latest

    sleep 30  # Wait for application to start

    # Run health checks
    local health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)

    if [ "$health_status" -eq 200 ]; then
        log "Application health check passed"
        echo "APP_HEALTH=PASS" >> "$REPORT_DIR/$TEST_ENV.metrics"
    else
        log "ERROR: Application health check failed with status $health_status"
        echo "APP_HEALTH=FAIL" >> "$REPORT_DIR/$TEST_ENV.metrics"
    fi

    # Run functional tests
    npm run test:smoke 2>> "$REPORT_DIR/$TEST_ENV.log" && \
        echo "FUNCTIONAL_TESTS=PASS" >> "$REPORT_DIR/$TEST_ENV.metrics" || \
        echo "FUNCTIONAL_TESTS=FAIL" >> "$REPORT_DIR/$TEST_ENV.metrics"
}

# Cleanup
cleanup() {
    log "Cleaning up test environment"

    docker stop "$TEST_ENV-app" 2>/dev/null || true
    docker rm "$TEST_ENV-app" 2>/dev/null || true

    rm -rf "$RESTORE_DIR"

    # Record end time
    echo "END_TIME=$(date +%s)" >> "$REPORT_DIR/$TEST_ENV.metrics"

    log "Cleanup completed"
}

# Generate report
generate_report() {
    log "Generating restore test report"

    source "$REPORT_DIR/$TEST_ENV.metrics"

    local total_time=$((END_TIME - START_TIME))

    cat > "$REPORT_DIR/$TEST_ENV-report.json" << EOF
{
    "test_id": "$TEST_ENV",
    "timestamp": "$(date -Iseconds)",
    "backup_source": "$BACKUP_SOURCE",
    "metrics": {
        "total_time_seconds": $total_time,
        "download_time_seconds": $DOWNLOAD_TIME,
        "restore_time_seconds": $RESTORE_TIME,
        "integrity_errors": $INTEGRITY_ERRORS,
        "application_health": "$APP_HEALTH",
        "functional_tests": "$FUNCTIONAL_TESTS"
    },
    "status": "$([ $INTEGRITY_ERRORS -eq 0 ] && [ "$APP_HEALTH" = "PASS" ] && echo "SUCCESS" || echo "FAILED")"
}
EOF

    log "Report saved to $REPORT_DIR/$TEST_ENV-report.json"
}

# Main execution
main() {
    trap cleanup EXIT

    setup_environment
    perform_restore
    verify_integrity
    test_application
    generate_report

    log "Full restore test completed"
}

main "$@"
```

### Partial Restore Test

Testing restoration of specific data subsets for faster validation:

```bash
#!/bin/bash
# partial_restore_test.sh

set -euo pipefail

# Configuration
BACKUP_SOURCE="s3://company-backups/production"
TEST_TABLES=("users" "orders" "products")
SAMPLE_SIZE=10000

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Restore specific tables only
partial_database_restore() {
    local table=$1

    log "Restoring table: $table"

    # Extract single table from backup
    pg_restore \
        --host=localhost \
        --port=5433 \
        --username=restore_test \
        --dbname=partial_restore_db \
        --table="$table" \
        --verbose \
        /tmp/backup.dump

    # Verify row count
    local count=$(psql -h localhost -p 5433 -U restore_test -d partial_restore_db \
        -t -c "SELECT COUNT(*) FROM $table;")

    log "Restored $count rows to table $table"
}

# Sample-based verification
verify_sample() {
    local table=$1

    log "Verifying sample from table: $table"

    # Get random sample and verify against checksums
    psql -h localhost -p 5433 -U restore_test -d partial_restore_db << EOF
        SELECT md5(string_agg(row_hash, '')) as sample_checksum
        FROM (
            SELECT md5(t::text) as row_hash
            FROM $table t
            ORDER BY RANDOM()
            LIMIT $SAMPLE_SIZE
        ) samples;
EOF
}

# Point-in-time restore test
pitr_restore_test() {
    local target_time=$1

    log "Testing point-in-time restore to: $target_time"

    # Restore to specific point in time
    pg_restore \
        --host=localhost \
        --port=5433 \
        --username=restore_test \
        --dbname=pitr_restore_db \
        --target-time="$target_time" \
        /tmp/backup.dump

    # Verify no data after target time exists
    local future_records=$(psql -h localhost -p 5433 -U restore_test -d pitr_restore_db \
        -t -c "SELECT COUNT(*) FROM audit_log WHERE created_at > '$target_time';")

    if [ "$future_records" -gt 0 ]; then
        log "ERROR: Found $future_records records after target time"
        return 1
    fi

    log "PITR verification passed"
}

main() {
    for table in "${TEST_TABLES[@]}"; do
        partial_database_restore "$table"
        verify_sample "$table"
    done

    # Test point-in-time restore
    pitr_restore_test "2026-01-29 12:00:00"

    log "Partial restore tests completed"
}

main "$@"
```

## Automated Restore Testing

### Kubernetes CronJob for Automated Testing

```yaml
# restore-test-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: automated-restore-test
  namespace: backup-testing
spec:
  schedule: "0 2 * * 0"  # Weekly on Sunday at 2 AM
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 14400  # 4 hours max
      template:
        spec:
          serviceAccountName: restore-test-sa
          containers:
            - name: restore-tester
              image: company/restore-tester:latest
              env:
                - name: BACKUP_SOURCE
                  value: "s3://company-backups/production"
                - name: SLACK_WEBHOOK
                  valueFrom:
                    secretKeyRef:
                      name: notification-secrets
                      key: slack-webhook
                - name: DB_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: restore-test-secrets
                      key: db-password
              resources:
                requests:
                  memory: "2Gi"
                  cpu: "1000m"
                limits:
                  memory: "8Gi"
                  cpu: "4000m"
              volumeMounts:
                - name: restore-workspace
                  mountPath: /mnt/restore
                - name: test-scripts
                  mountPath: /scripts
          volumes:
            - name: restore-workspace
              emptyDir:
                sizeLimit: 100Gi
            - name: test-scripts
              configMap:
                name: restore-test-scripts
          restartPolicy: Never
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: restore-test-scripts
  namespace: backup-testing
data:
  run-tests.sh: |
    #!/bin/bash
    set -euo pipefail

    # Run restore test
    /scripts/full_restore_test.sh

    # Send notification
    RESULT=$(cat /var/log/restore-tests/*-report.json | jq -r '.status')

    curl -X POST "$SLACK_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "{
        \"text\": \"Restore Test Result: $RESULT\",
        \"attachments\": [{
          \"color\": \"$([ \"$RESULT\" = \"SUCCESS\" ] && echo \"good\" || echo \"danger\")\",
          \"fields\": [
            {\"title\": \"Status\", \"value\": \"$RESULT\", \"short\": true},
            {\"title\": \"Duration\", \"value\": \"$(jq -r '.metrics.total_time_seconds' /var/log/restore-tests/*-report.json) seconds\", \"short\": true}
          ]
        }]
      }"
```

### GitHub Actions Workflow for Restore Testing

```yaml
# .github/workflows/restore-test.yml
name: Automated Restore Testing

on:
  schedule:
    - cron: '0 3 * * 1'  # Weekly on Monday at 3 AM
  workflow_dispatch:
    inputs:
      backup_date:
        description: 'Specific backup date to test (YYYY-MM-DD)'
        required: false
      test_type:
        description: 'Type of restore test'
        required: true
        default: 'full'
        type: choice
        options:
          - full
          - partial
          - pitr

env:
  AWS_REGION: us-east-1
  TEST_DB_HOST: localhost
  TEST_DB_PORT: 5432

jobs:
  prepare:
    runs-on: ubuntu-latest
    outputs:
      backup_path: ${{ steps.find-backup.outputs.path }}
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Find latest backup
        id: find-backup
        run: |
          if [ -n "${{ github.event.inputs.backup_date }}" ]; then
            BACKUP_PATH="s3://company-backups/production/${{ github.event.inputs.backup_date }}"
          else
            BACKUP_PATH=$(aws s3 ls s3://company-backups/production/ | sort | tail -1 | awk '{print "s3://company-backups/production/"$4}')
          fi
          echo "path=$BACKUP_PATH" >> $GITHUB_OUTPUT
          echo "Using backup: $BACKUP_PATH"

  restore-test:
    needs: prepare
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: restore_test
          POSTGRES_PASSWORD: ${{ secrets.TEST_DB_PASSWORD }}
          POSTGRES_DB: restore_test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Download backup
        run: |
          mkdir -p /tmp/restore
          aws s3 sync ${{ needs.prepare.outputs.backup_path }} /tmp/restore/
          echo "DOWNLOAD_SIZE=$(du -sh /tmp/restore | cut -f1)" >> $GITHUB_ENV

      - name: Restore database
        env:
          PGPASSWORD: ${{ secrets.TEST_DB_PASSWORD }}
        run: |
          START_TIME=$(date +%s)

          pg_restore \
            --host=${{ env.TEST_DB_HOST }} \
            --port=${{ env.TEST_DB_PORT }} \
            --username=restore_test \
            --dbname=restore_test_db \
            --verbose \
            /tmp/restore/database.dump

          END_TIME=$(date +%s)
          echo "RESTORE_DURATION=$((END_TIME - START_TIME))" >> $GITHUB_ENV

      - name: Verify data integrity
        env:
          PGPASSWORD: ${{ secrets.TEST_DB_PASSWORD }}
        run: |
          # Run verification queries
          USERS_COUNT=$(psql -h ${{ env.TEST_DB_HOST }} -U restore_test -d restore_test_db \
            -t -c "SELECT COUNT(*) FROM users;")

          ORDERS_COUNT=$(psql -h ${{ env.TEST_DB_HOST }} -U restore_test -d restore_test_db \
            -t -c "SELECT COUNT(*) FROM orders;")

          echo "Users restored: $USERS_COUNT"
          echo "Orders restored: $ORDERS_COUNT"

          # Verify against expected counts
          EXPECTED_USERS=$(cat /tmp/restore/checksums/users.count)
          if [ "$USERS_COUNT" -ne "$EXPECTED_USERS" ]; then
            echo "::error::User count mismatch"
            exit 1
          fi

      - name: Run application tests
        run: |
          npm ci
          npm run test:restore-validation

      - name: Generate report
        if: always()
        run: |
          cat > restore-report.json << EOF
          {
            "timestamp": "$(date -Iseconds)",
            "backup_source": "${{ needs.prepare.outputs.backup_path }}",
            "test_type": "${{ github.event.inputs.test_type || 'full' }}",
            "download_size": "${{ env.DOWNLOAD_SIZE }}",
            "restore_duration_seconds": ${{ env.RESTORE_DURATION }},
            "status": "${{ job.status }}"
          }
          EOF

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: restore-test-report
          path: restore-report.json

      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Restore Test Failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Restore Test Failed*\nBackup: ${{ needs.prepare.outputs.backup_path }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Test Environment Setup

### Infrastructure as Code for Test Environment

```mermaid
flowchart TB
    subgraph "Production Environment"
        P1[(Production DB)]
        P2[Production App]
        P3[Production Storage]
    end

    subgraph "Backup Storage"
        B1[S3 Bucket]
        B2[Backup Snapshots]
    end

    subgraph "Test Environment"
        T1[(Test DB)]
        T2[Test App]
        T3[Test Storage]
        T4[Validation Scripts]
    end

    P1 --> B1
    P2 --> B1
    P3 --> B1

    B1 --> T1
    B2 --> T1
    B1 --> T3

    T1 --> T2
    T2 --> T4
    T4 --> Report[Test Report]
```

### Terraform Configuration for Test Environment

```hcl
# restore-test-environment.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "environment_name" {
  description = "Name for the restore test environment"
  type        = string
  default     = "restore-test"
}

variable "backup_bucket" {
  description = "S3 bucket containing backups"
  type        = string
}

# VPC for isolated testing
resource "aws_vpc" "restore_test" {
  cidr_block           = "10.99.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.environment_name}-vpc"
    Purpose     = "restore-testing"
    AutoDestroy = "true"
  }
}

resource "aws_subnet" "restore_test" {
  vpc_id            = aws_vpc.restore_test.id
  cidr_block        = "10.99.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "${var.environment_name}-subnet"
  }
}

# RDS instance for database restore testing
resource "aws_db_instance" "restore_test" {
  identifier           = "${var.environment_name}-db"
  instance_class       = "db.t3.medium"
  allocated_storage    = 100
  engine               = "postgres"
  engine_version       = "15"
  username             = "restore_test"
  password             = random_password.db_password.result
  skip_final_snapshot  = true
  deletion_protection  = false

  vpc_security_group_ids = [aws_security_group.restore_test_db.id]
  db_subnet_group_name   = aws_db_subnet_group.restore_test.name

  tags = {
    Name        = "${var.environment_name}-db"
    Purpose     = "restore-testing"
    AutoDestroy = "true"
  }

  lifecycle {
    prevent_destroy = false
  }
}

resource "random_password" "db_password" {
  length  = 32
  special = false
}

# Security group for test database
resource "aws_security_group" "restore_test_db" {
  name        = "${var.environment_name}-db-sg"
  description = "Security group for restore test database"
  vpc_id      = aws_vpc.restore_test.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.restore_test_runner.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 instance for running restore tests
resource "aws_instance" "restore_runner" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.large"
  subnet_id     = aws_subnet.restore_test.id

  vpc_security_group_ids = [aws_security_group.restore_test_runner.id]
  iam_instance_profile   = aws_iam_instance_profile.restore_runner.name

  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    yum install -y postgresql15 awscli jq

    # Download and run restore tests
    aws s3 cp s3://${var.backup_bucket}/scripts/restore-test.sh /opt/
    chmod +x /opt/restore-test.sh
  EOF

  tags = {
    Name        = "${var.environment_name}-runner"
    Purpose     = "restore-testing"
    AutoDestroy = "true"
  }

  lifecycle {
    prevent_destroy = false
  }
}

# IAM role for restore runner
resource "aws_iam_role" "restore_runner" {
  name = "${var.environment_name}-runner-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "restore_runner" {
  name = "${var.environment_name}-runner-policy"
  role = aws_iam_role.restore_runner.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.backup_bucket}",
          "arn:aws:s3:::${var.backup_bucket}/*"
        ]
      }
    ]
  })
}

# Auto-destroy after testing
resource "aws_cloudwatch_event_rule" "auto_destroy" {
  name                = "${var.environment_name}-auto-destroy"
  description         = "Destroy restore test environment after 4 hours"
  schedule_expression = "rate(4 hours)"
}

output "test_db_endpoint" {
  value = aws_db_instance.restore_test.endpoint
}

output "runner_public_ip" {
  value = aws_instance.restore_runner.public_ip
}
```

### Docker Compose for Local Testing

```yaml
# docker-compose.restore-test.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: restore-test-db
    environment:
      POSTGRES_USER: restore_test
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: restore_test_db
    ports:
      - "5433:5432"
    volumes:
      - restore_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U restore_test -d restore_test_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    container_name: restore-test-redis
    ports:
      - "6380:6379"
    volumes:
      - restore_redis:/data

  minio:
    image: minio/minio
    container_name: restore-test-s3
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - restore_s3:/data
    command: server /data --console-address ":9001"

  restore-runner:
    build:
      context: .
      dockerfile: Dockerfile.restore-test
    container_name: restore-runner
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: restore_test
      DB_PASSWORD: test_password
      DB_NAME: restore_test_db
      S3_ENDPOINT: http://minio:9000
      AWS_ACCESS_KEY_ID: minioadmin
      AWS_SECRET_ACCESS_KEY: minioadmin
    volumes:
      - ./backups:/backups
      - ./scripts:/scripts
      - ./reports:/reports

volumes:
  restore_data:
  restore_redis:
  restore_s3:
```

## Success Criteria Definition

### Defining What Makes a Restore Successful

```mermaid
flowchart TB
    subgraph "Success Criteria"
        C1[Data Completeness]
        C2[Data Integrity]
        C3[Recovery Time]
        C4[Application Function]
        C5[Performance Baseline]
    end

    C1 --> V1{All records present?}
    C2 --> V2{Checksums match?}
    C3 --> V3{Within RTO?}
    C4 --> V4{App works?}
    C5 --> V5{Acceptable speed?}

    V1 -->|Yes| P1[Pass]
    V1 -->|No| F1[Fail]
    V2 -->|Yes| P2[Pass]
    V2 -->|No| F2[Fail]
    V3 -->|Yes| P3[Pass]
    V3 -->|No| F3[Fail]
    V4 -->|Yes| P4[Pass]
    V4 -->|No| F4[Fail]
    V5 -->|Yes| P5[Pass]
    V5 -->|No| F5[Fail]

    P1 & P2 & P3 & P4 & P5 --> Success[Test Success]
    F1 --> Failure[Test Failed]
    F2 --> Failure
    F3 --> Failure
    F4 --> Failure
    F5 --> Failure
```

### Success Criteria Configuration

```yaml
# restore-test-criteria.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: restore-success-criteria
  namespace: backup-testing
data:
  criteria.yaml: |
    success_criteria:
      # Data completeness - all expected data must be present
      data_completeness:
        enabled: true
        threshold: 100  # percentage
        tables:
          - name: users
            minimum_records: 1000000
          - name: orders
            minimum_records: 5000000
          - name: products
            minimum_records: 50000

      # Data integrity - checksums must match
      data_integrity:
        enabled: true
        verification_method: md5
        tables:
          - users
          - orders
          - products
          - inventory

      # Recovery time - must complete within RTO
      recovery_time:
        enabled: true
        rto_minutes: 60
        include_verification: true

      # Application functionality - critical paths must work
      application_tests:
        enabled: true
        tests:
          - name: user_authentication
            endpoint: /api/auth/login
            expected_status: 200
          - name: order_retrieval
            endpoint: /api/orders/1
            expected_status: 200
          - name: product_search
            endpoint: /api/products?q=test
            expected_status: 200

      # Performance baseline - queries must perform acceptably
      performance:
        enabled: true
        queries:
          - name: user_lookup
            query: "SELECT * FROM users WHERE email = 'test@example.com'"
            max_duration_ms: 100
          - name: order_history
            query: "SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at DESC LIMIT 100"
            max_duration_ms: 500
          - name: product_search
            query: "SELECT * FROM products WHERE name ILIKE '%test%' LIMIT 50"
            max_duration_ms: 200
```

### Validation Script

```python
# validate_restore.py

import yaml
import psycopg2
import hashlib
import time
import requests
from dataclasses import dataclass
from typing import List, Dict, Any
from enum import Enum

class TestResult(Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    SKIP = "SKIP"

@dataclass
class ValidationResult:
    criterion: str
    result: TestResult
    details: str
    duration_ms: float

class RestoreValidator:
    def __init__(self, config_path: str, db_connection: Dict[str, Any]):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)['success_criteria']

        self.conn = psycopg2.connect(**db_connection)
        self.results: List[ValidationResult] = []

    def validate_all(self) -> bool:
        """Run all validation checks and return overall success."""

        if self.config.get('data_completeness', {}).get('enabled'):
            self._validate_completeness()

        if self.config.get('data_integrity', {}).get('enabled'):
            self._validate_integrity()

        if self.config.get('application_tests', {}).get('enabled'):
            self._validate_application()

        if self.config.get('performance', {}).get('enabled'):
            self._validate_performance()

        return all(r.result == TestResult.PASS for r in self.results)

    def _validate_completeness(self):
        """Check that all expected data is present."""

        config = self.config['data_completeness']

        for table_config in config['tables']:
            table_name = table_config['name']
            min_records = table_config['minimum_records']

            start = time.time()

            with self.conn.cursor() as cur:
                cur.execute(f"SELECT COUNT(*) FROM {table_name}")
                actual_count = cur.fetchone()[0]

            duration = (time.time() - start) * 1000

            if actual_count >= min_records:
                result = TestResult.PASS
                details = f"Found {actual_count} records (minimum: {min_records})"
            else:
                result = TestResult.FAIL
                details = f"Only {actual_count} records found (minimum: {min_records})"

            self.results.append(ValidationResult(
                criterion=f"completeness_{table_name}",
                result=result,
                details=details,
                duration_ms=duration
            ))

    def _validate_integrity(self):
        """Verify data integrity using checksums."""

        config = self.config['data_integrity']

        for table_name in config['tables']:
            start = time.time()

            with self.conn.cursor() as cur:
                # Calculate checksum for table
                cur.execute(f"""
                    SELECT md5(string_agg(row_hash, ''))
                    FROM (
                        SELECT md5(t::text) as row_hash
                        FROM {table_name} t
                        ORDER BY 1
                    ) hashes
                """)
                actual_checksum = cur.fetchone()[0]

            # Load expected checksum
            try:
                with open(f'/backups/checksums/{table_name}.md5', 'r') as f:
                    expected_checksum = f.read().strip()

                if actual_checksum == expected_checksum:
                    result = TestResult.PASS
                    details = f"Checksum verified: {actual_checksum[:16]}..."
                else:
                    result = TestResult.FAIL
                    details = f"Checksum mismatch: expected {expected_checksum[:16]}..., got {actual_checksum[:16]}..."
            except FileNotFoundError:
                result = TestResult.SKIP
                details = "Expected checksum file not found"

            duration = (time.time() - start) * 1000

            self.results.append(ValidationResult(
                criterion=f"integrity_{table_name}",
                result=result,
                details=details,
                duration_ms=duration
            ))

    def _validate_application(self):
        """Test critical application endpoints."""

        config = self.config['application_tests']
        base_url = "http://localhost:8080"

        for test in config['tests']:
            start = time.time()

            try:
                response = requests.get(
                    f"{base_url}{test['endpoint']}",
                    timeout=30
                )

                if response.status_code == test['expected_status']:
                    result = TestResult.PASS
                    details = f"Status {response.status_code} as expected"
                else:
                    result = TestResult.FAIL
                    details = f"Expected status {test['expected_status']}, got {response.status_code}"
            except Exception as e:
                result = TestResult.FAIL
                details = f"Request failed: {str(e)}"

            duration = (time.time() - start) * 1000

            self.results.append(ValidationResult(
                criterion=f"app_test_{test['name']}",
                result=result,
                details=details,
                duration_ms=duration
            ))

    def _validate_performance(self):
        """Check query performance meets baseline."""

        config = self.config['performance']

        for query_config in config['queries']:
            start = time.time()

            with self.conn.cursor() as cur:
                cur.execute(query_config['query'])
                cur.fetchall()

            duration = (time.time() - start) * 1000
            max_duration = query_config['max_duration_ms']

            if duration <= max_duration:
                result = TestResult.PASS
                details = f"Query completed in {duration:.2f}ms (max: {max_duration}ms)"
            else:
                result = TestResult.FAIL
                details = f"Query took {duration:.2f}ms, exceeds max of {max_duration}ms"

            self.results.append(ValidationResult(
                criterion=f"performance_{query_config['name']}",
                result=result,
                details=details,
                duration_ms=duration
            ))

    def generate_report(self) -> Dict[str, Any]:
        """Generate a structured validation report."""

        passed = sum(1 for r in self.results if r.result == TestResult.PASS)
        failed = sum(1 for r in self.results if r.result == TestResult.FAIL)
        skipped = sum(1 for r in self.results if r.result == TestResult.SKIP)

        return {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "summary": {
                "total_tests": len(self.results),
                "passed": passed,
                "failed": failed,
                "skipped": skipped,
                "success_rate": f"{(passed / len(self.results) * 100):.1f}%"
            },
            "overall_result": "PASS" if failed == 0 else "FAIL",
            "results": [
                {
                    "criterion": r.criterion,
                    "result": r.result.value,
                    "details": r.details,
                    "duration_ms": r.duration_ms
                }
                for r in self.results
            ]
        }

# Usage
if __name__ == "__main__":
    validator = RestoreValidator(
        config_path="/config/criteria.yaml",
        db_connection={
            "host": "localhost",
            "port": 5433,
            "user": "restore_test",
            "password": "test_password",
            "database": "restore_test_db"
        }
    )

    success = validator.validate_all()
    report = validator.generate_report()

    print(yaml.dump(report, default_flow_style=False))

    exit(0 if success else 1)
```

## Documentation and Reporting

### Automated Report Generation

```mermaid
flowchart LR
    subgraph "Test Execution"
        T1[Run Tests]
        T2[Collect Metrics]
        T3[Validate Results]
    end

    subgraph "Report Generation"
        R1[JSON Report]
        R2[HTML Dashboard]
        R3[PDF Summary]
    end

    subgraph "Distribution"
        D1[Email Stakeholders]
        D2[Slack Notification]
        D3[Archive to S3]
        D4[Update Dashboard]
    end

    T1 --> T2 --> T3
    T3 --> R1 & R2 & R3
    R1 --> D3 & D4
    R2 --> D1
    R3 --> D1
    R1 --> D2
```

### Report Generator

```python
# report_generator.py

import json
import jinja2
from datetime import datetime
from typing import Dict, Any, List
import boto3
from weasyprint import HTML

class RestoreTestReporter:
    def __init__(self, test_results: Dict[str, Any]):
        self.results = test_results
        self.timestamp = datetime.utcnow()

    def generate_json_report(self, output_path: str):
        """Generate JSON report for programmatic consumption."""

        report = {
            "report_version": "1.0",
            "generated_at": self.timestamp.isoformat(),
            "test_execution": self.results,
            "metadata": {
                "environment": "restore-test",
                "backup_source": self.results.get("backup_source", "unknown"),
                "test_type": self.results.get("test_type", "full")
            }
        }

        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)

        return output_path

    def generate_html_report(self, output_path: str):
        """Generate HTML report for human consumption."""

        template = jinja2.Template('''
<!DOCTYPE html>
<html>
<head>
    <title>Restore Test Report - {{ timestamp }}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #ecf0f1; padding: 20px; border-radius: 5px; flex: 1; }
        .metric h3 { margin: 0; color: #7f8c8d; }
        .metric .value { font-size: 36px; font-weight: bold; }
        .pass { color: #27ae60; }
        .fail { color: #e74c3c; }
        .results-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .results-table th, .results-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .results-table th { background: #34495e; color: white; }
        .results-table tr:nth-child(even) { background: #f9f9f9; }
        .status-pass { background: #d4edda; color: #155724; padding: 5px 10px; border-radius: 3px; }
        .status-fail { background: #f8d7da; color: #721c24; padding: 5px 10px; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Restore Test Report</h1>
        <p>Generated: {{ timestamp }}</p>
        <p>Backup Source: {{ backup_source }}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Overall Status</h3>
            <div class="value {{ 'pass' if overall_result == 'PASS' else 'fail' }}">
                {{ overall_result }}
            </div>
        </div>
        <div class="metric">
            <h3>Tests Passed</h3>
            <div class="value pass">{{ passed }}/{{ total }}</div>
        </div>
        <div class="metric">
            <h3>Recovery Time</h3>
            <div class="value">{{ recovery_time }}</div>
        </div>
        <div class="metric">
            <h3>Data Size</h3>
            <div class="value">{{ data_size }}</div>
        </div>
    </div>

    <h2>Test Results</h2>
    <table class="results-table">
        <thead>
            <tr>
                <th>Test</th>
                <th>Status</th>
                <th>Details</th>
                <th>Duration</th>
            </tr>
        </thead>
        <tbody>
            {% for result in results %}
            <tr>
                <td>{{ result.criterion }}</td>
                <td>
                    <span class="status-{{ result.result.lower() }}">{{ result.result }}</span>
                </td>
                <td>{{ result.details }}</td>
                <td>{{ "%.2f"|format(result.duration_ms) }}ms</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <h2>Recommendations</h2>
    <ul>
        {% for rec in recommendations %}
        <li>{{ rec }}</li>
        {% endfor %}
    </ul>
</body>
</html>
        ''')

        summary = self.results.get('summary', {})

        html_content = template.render(
            timestamp=self.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
            backup_source=self.results.get('backup_source', 'Unknown'),
            overall_result=self.results.get('overall_result', 'UNKNOWN'),
            passed=summary.get('passed', 0),
            total=summary.get('total_tests', 0),
            recovery_time=self._format_duration(self.results.get('recovery_time_seconds', 0)),
            data_size=self.results.get('data_size', 'Unknown'),
            results=self.results.get('results', []),
            recommendations=self._generate_recommendations()
        )

        with open(output_path, 'w') as f:
            f.write(html_content)

        return output_path

    def generate_pdf_report(self, output_path: str):
        """Generate PDF report from HTML."""

        html_path = output_path.replace('.pdf', '.html')
        self.generate_html_report(html_path)

        HTML(html_path).write_pdf(output_path)

        return output_path

    def _format_duration(self, seconds: int) -> str:
        """Format duration in human-readable format."""
        if seconds < 60:
            return f"{seconds}s"
        elif seconds < 3600:
            return f"{seconds // 60}m {seconds % 60}s"
        else:
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            return f"{hours}h {minutes}m"

    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results."""

        recommendations = []

        for result in self.results.get('results', []):
            if result.get('result') == 'FAIL':
                if 'completeness' in result.get('criterion', ''):
                    recommendations.append(
                        f"Investigate data completeness issue in {result['criterion']}: {result['details']}"
                    )
                elif 'integrity' in result.get('criterion', ''):
                    recommendations.append(
                        f"Data integrity check failed - verify backup process for {result['criterion']}"
                    )
                elif 'performance' in result.get('criterion', ''):
                    recommendations.append(
                        f"Query performance degraded - consider index optimization for {result['criterion']}"
                    )

        if not recommendations:
            recommendations.append("All tests passed. Continue regular testing schedule.")

        return recommendations

    def upload_to_s3(self, report_path: str, bucket: str, prefix: str):
        """Upload report to S3 for archival."""

        s3 = boto3.client('s3')

        key = f"{prefix}/{self.timestamp.strftime('%Y/%m/%d')}/{report_path.split('/')[-1]}"

        s3.upload_file(report_path, bucket, key)

        return f"s3://{bucket}/{key}"

    def send_slack_notification(self, webhook_url: str):
        """Send summary notification to Slack."""

        import requests

        summary = self.results.get('summary', {})
        overall = self.results.get('overall_result', 'UNKNOWN')

        color = "good" if overall == "PASS" else "danger"

        payload = {
            "attachments": [{
                "color": color,
                "title": f"Restore Test {'Passed' if overall == 'PASS' else 'Failed'}",
                "fields": [
                    {
                        "title": "Tests Passed",
                        "value": f"{summary.get('passed', 0)}/{summary.get('total_tests', 0)}",
                        "short": True
                    },
                    {
                        "title": "Recovery Time",
                        "value": self._format_duration(self.results.get('recovery_time_seconds', 0)),
                        "short": True
                    },
                    {
                        "title": "Backup Source",
                        "value": self.results.get('backup_source', 'Unknown'),
                        "short": False
                    }
                ],
                "footer": f"Generated at {self.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}"
            }]
        }

        requests.post(webhook_url, json=payload)

# Usage
if __name__ == "__main__":
    # Load test results
    with open('/reports/test-results.json', 'r') as f:
        results = json.load(f)

    reporter = RestoreTestReporter(results)

    # Generate reports
    reporter.generate_json_report('/reports/restore-test-report.json')
    reporter.generate_html_report('/reports/restore-test-report.html')
    reporter.generate_pdf_report('/reports/restore-test-report.pdf')

    # Distribute
    reporter.upload_to_s3('/reports/restore-test-report.json', 'company-reports', 'restore-tests')
    reporter.send_slack_notification(os.environ['SLACK_WEBHOOK'])
```

### Tracking Historical Results

```sql
-- restore_test_results.sql
-- Schema for tracking restore test history

CREATE TABLE restore_test_runs (
    id SERIAL PRIMARY KEY,
    run_id UUID DEFAULT gen_random_uuid(),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    backup_source VARCHAR(500) NOT NULL,
    backup_date DATE NOT NULL,
    test_type VARCHAR(50) NOT NULL,  -- full, partial, pitr
    overall_result VARCHAR(20),  -- PASS, FAIL
    recovery_time_seconds INTEGER,
    data_size_bytes BIGINT,
    environment VARCHAR(100),
    triggered_by VARCHAR(100),  -- scheduled, manual, ci
    notes TEXT
);

CREATE TABLE restore_test_details (
    id SERIAL PRIMARY KEY,
    run_id UUID REFERENCES restore_test_runs(run_id),
    criterion VARCHAR(100) NOT NULL,
    result VARCHAR(20) NOT NULL,
    details TEXT,
    duration_ms DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying test history
CREATE INDEX idx_restore_tests_date ON restore_test_runs(started_at DESC);
CREATE INDEX idx_restore_tests_result ON restore_test_runs(overall_result);
CREATE INDEX idx_restore_details_run ON restore_test_details(run_id);

-- View for dashboard
CREATE VIEW restore_test_summary AS
SELECT
    DATE_TRUNC('week', started_at) as week,
    COUNT(*) as total_tests,
    COUNT(*) FILTER (WHERE overall_result = 'PASS') as passed,
    COUNT(*) FILTER (WHERE overall_result = 'FAIL') as failed,
    AVG(recovery_time_seconds) as avg_recovery_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY recovery_time_seconds) as p95_recovery_time
FROM restore_test_runs
WHERE started_at > NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', started_at)
ORDER BY week DESC;

-- Alert query: No successful test in 7 days
SELECT
    CASE
        WHEN MAX(completed_at) < NOW() - INTERVAL '7 days'
        THEN 'ALERT: No successful restore test in 7 days'
        ELSE 'OK'
    END as status,
    MAX(completed_at) as last_successful_test
FROM restore_test_runs
WHERE overall_result = 'PASS';
```

## Best Practices Summary

1. **Test frequently** - Weekly for critical systems, monthly for others
2. **Automate everything** - Manual testing does not scale
3. **Use isolated environments** - Never restore to production
4. **Define clear success criteria** - Know what success looks like before testing
5. **Document and track results** - Build a history of restore performance
6. **Alert on failures** - Know immediately when tests fail
7. **Test different scenarios** - Full restores, partial restores, point-in-time recovery
8. **Include application validation** - Data integrity alone is not enough
9. **Measure recovery time** - Track against your RTO commitments
10. **Review and improve** - Use test results to improve backup processes

---

A backup you have never tested is a backup you cannot trust. Regular restore testing is not optional - it is the only way to ensure your disaster recovery plan will work when you need it most. Start with weekly tests of your most critical systems and build from there.

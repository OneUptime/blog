# How to Back Up and Restore Redis Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Backup, Restore, Disaster Recovery, DevOps, Database

Description: A comprehensive guide to backing up and restoring Redis data, including BGSAVE strategies, automated backup scripts, cloud storage integration, and disaster recovery procedures.

---

Backing up Redis data is essential for disaster recovery, data migration, and compliance requirements. This guide covers backup strategies using RDB snapshots, AOF files, and automated backup pipelines for production environments.

## Redis Backup Methods Overview

Redis offers several approaches to data backup:

| Method | Use Case | Recovery Time | Data Loss Risk |
|--------|----------|---------------|----------------|
| RDB Snapshots | Point-in-time backups | Fast | Minutes of data |
| AOF Files | Continuous backups | Slower | Seconds of data |
| SYNC/REPLICATION | Real-time backup | Instant failover | Minimal |
| redis-dump | Logical backups | Variable | Depends on frequency |

## Manual RDB Backup

### Using BGSAVE

The simplest backup method triggers a background save:

```bash
# Trigger background save
redis-cli BGSAVE

# Check save status
redis-cli LASTSAVE

# Wait for completion and copy the file
cp /var/lib/redis/dump.rdb /backup/redis/dump_$(date +%Y%m%d_%H%M%S).rdb
```

### Using SAVE (Blocking)

For guaranteed consistency during maintenance windows:

```bash
# Block all clients and save
redis-cli SAVE

# Copy immediately after
cp /var/lib/redis/dump.rdb /backup/redis/dump_$(date +%Y%m%d_%H%M%S).rdb
```

## Python Backup Manager

Here is a comprehensive Python backup solution:

```python
import redis
import os
import shutil
import time
import hashlib
import gzip
import boto3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List
from dataclasses import dataclass

@dataclass
class BackupResult:
    success: bool
    filename: str
    size_bytes: int
    checksum: str
    timestamp: datetime
    duration_seconds: float
    error: Optional[str] = None

class RedisBackupManager:
    def __init__(self, host='localhost', port=6379, password=None,
                 redis_data_dir='/var/lib/redis',
                 backup_dir='/backup/redis'):
        self.client = redis.Redis(
            host=host,
            port=port,
            password=password,
            decode_responses=True
        )
        self.redis_data_dir = Path(redis_data_dir)
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def get_rdb_path(self) -> Path:
        """Get the path to the RDB file."""
        config = self.client.config_get('dbfilename')
        filename = config.get('dbfilename', 'dump.rdb')
        return self.redis_data_dir / filename

    def wait_for_save(self, timeout=300) -> bool:
        """Wait for a background save to complete."""
        initial_lastsave = self.client.lastsave()
        start_time = time.time()

        while time.time() - start_time < timeout:
            info = self.client.info('persistence')
            if not info.get('rdb_bgsave_in_progress', 0):
                current_lastsave = self.client.lastsave()
                if current_lastsave > initial_lastsave:
                    return True
            time.sleep(1)

        return False

    def calculate_checksum(self, filepath: Path) -> str:
        """Calculate MD5 checksum of a file."""
        hash_md5 = hashlib.md5()
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    def create_backup(self, compress=True, blocking=False) -> BackupResult:
        """Create a Redis backup."""
        start_time = time.time()
        timestamp = datetime.now()

        try:
            # Trigger save
            if blocking:
                self.client.save()
            else:
                self.client.bgsave()
                if not self.wait_for_save():
                    return BackupResult(
                        success=False,
                        filename='',
                        size_bytes=0,
                        checksum='',
                        timestamp=timestamp,
                        duration_seconds=time.time() - start_time,
                        error='Background save timeout'
                    )

            # Generate backup filename
            rdb_path = self.get_rdb_path()
            backup_name = f"dump_{timestamp.strftime('%Y%m%d_%H%M%S')}.rdb"
            if compress:
                backup_name += '.gz'
            backup_path = self.backup_dir / backup_name

            # Copy and optionally compress
            if compress:
                with open(rdb_path, 'rb') as f_in:
                    with gzip.open(backup_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
            else:
                shutil.copy2(rdb_path, backup_path)

            # Calculate checksum and size
            checksum = self.calculate_checksum(backup_path)
            size = backup_path.stat().st_size

            return BackupResult(
                success=True,
                filename=str(backup_path),
                size_bytes=size,
                checksum=checksum,
                timestamp=timestamp,
                duration_seconds=time.time() - start_time
            )

        except Exception as e:
            return BackupResult(
                success=False,
                filename='',
                size_bytes=0,
                checksum='',
                timestamp=timestamp,
                duration_seconds=time.time() - start_time,
                error=str(e)
            )

    def list_backups(self) -> List[dict]:
        """List all available backups."""
        backups = []
        for f in self.backup_dir.glob('dump_*.rdb*'):
            stat = f.stat()
            backups.append({
                'filename': f.name,
                'path': str(f),
                'size_bytes': stat.st_size,
                'created': datetime.fromtimestamp(stat.st_mtime)
            })
        return sorted(backups, key=lambda x: x['created'], reverse=True)

    def cleanup_old_backups(self, retention_days=7) -> int:
        """Remove backups older than retention period."""
        cutoff = datetime.now() - timedelta(days=retention_days)
        removed = 0

        for f in self.backup_dir.glob('dump_*.rdb*'):
            if datetime.fromtimestamp(f.stat().st_mtime) < cutoff:
                f.unlink()
                removed += 1

        return removed


class S3BackupManager(RedisBackupManager):
    """Redis backup manager with S3 upload capability."""

    def __init__(self, s3_bucket, s3_prefix='redis-backups/', **kwargs):
        super().__init__(**kwargs)
        self.s3 = boto3.client('s3')
        self.s3_bucket = s3_bucket
        self.s3_prefix = s3_prefix

    def upload_to_s3(self, local_path: Path) -> dict:
        """Upload backup to S3."""
        s3_key = f"{self.s3_prefix}{local_path.name}"

        self.s3.upload_file(
            str(local_path),
            self.s3_bucket,
            s3_key,
            ExtraArgs={
                'ServerSideEncryption': 'AES256',
                'StorageClass': 'STANDARD_IA'
            }
        )

        return {
            'bucket': self.s3_bucket,
            'key': s3_key,
            'url': f"s3://{self.s3_bucket}/{s3_key}"
        }

    def create_backup_with_upload(self, compress=True) -> dict:
        """Create backup and upload to S3."""
        # Create local backup
        result = self.create_backup(compress=compress)

        if not result.success:
            return {'backup': result, 'upload': None}

        # Upload to S3
        upload_result = self.upload_to_s3(Path(result.filename))

        return {
            'backup': result,
            'upload': upload_result
        }

    def list_s3_backups(self) -> List[dict]:
        """List backups in S3."""
        response = self.s3.list_objects_v2(
            Bucket=self.s3_bucket,
            Prefix=self.s3_prefix
        )

        backups = []
        for obj in response.get('Contents', []):
            backups.append({
                'key': obj['Key'],
                'size_bytes': obj['Size'],
                'last_modified': obj['LastModified']
            })

        return sorted(backups, key=lambda x: x['last_modified'], reverse=True)

    def download_from_s3(self, s3_key: str, local_path: str):
        """Download backup from S3."""
        self.s3.download_file(self.s3_bucket, s3_key, local_path)


# Usage example
if __name__ == "__main__":
    # Basic local backup
    manager = RedisBackupManager(
        redis_data_dir='/var/lib/redis',
        backup_dir='/backup/redis'
    )

    print("Creating backup...")
    result = manager.create_backup(compress=True)

    if result.success:
        print(f"Backup created: {result.filename}")
        print(f"Size: {result.size_bytes / 1024 / 1024:.2f} MB")
        print(f"Checksum: {result.checksum}")
        print(f"Duration: {result.duration_seconds:.2f} seconds")
    else:
        print(f"Backup failed: {result.error}")

    # List backups
    print("\nAvailable backups:")
    for backup in manager.list_backups():
        print(f"  {backup['filename']} - {backup['size_bytes'] / 1024 / 1024:.2f} MB")

    # Cleanup old backups
    removed = manager.cleanup_old_backups(retention_days=7)
    print(f"\nRemoved {removed} old backup(s)")
```

## Node.js Backup Solution

```javascript
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { promisify } = require('util');
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const gzip = promisify(zlib.gzip);

class RedisBackupManager {
    constructor(options = {}) {
        this.client = new Redis({
            host: options.host || 'localhost',
            port: options.port || 6379,
            password: options.password
        });

        this.redisDataDir = options.redisDataDir || '/var/lib/redis';
        this.backupDir = options.backupDir || '/backup/redis';

        // Ensure backup directory exists
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    async getRdbPath() {
        const config = await this.client.config('GET', 'dbfilename');
        const filename = config[1] || 'dump.rdb';
        return path.join(this.redisDataDir, filename);
    }

    async waitForSave(timeoutMs = 300000) {
        const initialLastsave = await this.client.lastsave();
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            const info = await this.client.info('persistence');
            const bgsaveInProgress = info.includes('rdb_bgsave_in_progress:1');

            if (!bgsaveInProgress) {
                const currentLastsave = await this.client.lastsave();
                if (currentLastsave > initialLastsave) {
                    return true;
                }
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return false;
    }

    calculateChecksum(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('md5');
            const stream = fs.createReadStream(filePath);

            stream.on('data', data => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    async createBackup(options = {}) {
        const { compress = true, blocking = false } = options;
        const startTime = Date.now();
        const timestamp = new Date();

        try {
            // Trigger save
            if (blocking) {
                await this.client.save();
            } else {
                await this.client.bgsave();
                const saved = await this.waitForSave();
                if (!saved) {
                    return {
                        success: false,
                        error: 'Background save timeout'
                    };
                }
            }

            // Generate backup filename
            const rdbPath = await this.getRdbPath();
            const dateStr = timestamp.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            let backupName = `dump_${dateStr}.rdb`;
            if (compress) {
                backupName += '.gz';
            }
            const backupPath = path.join(this.backupDir, backupName);

            // Copy and optionally compress
            if (compress) {
                const content = fs.readFileSync(rdbPath);
                const compressed = await gzip(content);
                fs.writeFileSync(backupPath, compressed);
            } else {
                fs.copyFileSync(rdbPath, backupPath);
            }

            const stats = fs.statSync(backupPath);
            const checksum = await this.calculateChecksum(backupPath);

            return {
                success: true,
                filename: backupPath,
                sizeBytes: stats.size,
                checksum,
                timestamp,
                durationMs: Date.now() - startTime
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                durationMs: Date.now() - startTime
            };
        }
    }

    listBackups() {
        const files = fs.readdirSync(this.backupDir)
            .filter(f => f.startsWith('dump_') && f.includes('.rdb'));

        return files.map(filename => {
            const filePath = path.join(this.backupDir, filename);
            const stats = fs.statSync(filePath);
            return {
                filename,
                path: filePath,
                sizeBytes: stats.size,
                created: stats.mtime
            };
        }).sort((a, b) => b.created - a.created);
    }

    cleanupOldBackups(retentionDays = 7) {
        const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        let removed = 0;

        for (const backup of this.listBackups()) {
            if (backup.created < cutoff) {
                fs.unlinkSync(backup.path);
                removed++;
            }
        }

        return removed;
    }

    async close() {
        await this.client.quit();
    }
}

class S3BackupManager extends RedisBackupManager {
    constructor(options = {}) {
        super(options);
        this.s3Client = new S3Client({ region: options.region || 'us-east-1' });
        this.s3Bucket = options.s3Bucket;
        this.s3Prefix = options.s3Prefix || 'redis-backups/';
    }

    async uploadToS3(localPath) {
        const filename = path.basename(localPath);
        const s3Key = `${this.s3Prefix}${filename}`;

        const fileContent = fs.readFileSync(localPath);

        await this.s3Client.send(new PutObjectCommand({
            Bucket: this.s3Bucket,
            Key: s3Key,
            Body: fileContent,
            ServerSideEncryption: 'AES256',
            StorageClass: 'STANDARD_IA'
        }));

        return {
            bucket: this.s3Bucket,
            key: s3Key,
            url: `s3://${this.s3Bucket}/${s3Key}`
        };
    }

    async createBackupWithUpload(options = {}) {
        const backupResult = await this.createBackup(options);

        if (!backupResult.success) {
            return { backup: backupResult, upload: null };
        }

        const uploadResult = await this.uploadToS3(backupResult.filename);

        return {
            backup: backupResult,
            upload: uploadResult
        };
    }

    async listS3Backups() {
        const response = await this.s3Client.send(new ListObjectsV2Command({
            Bucket: this.s3Bucket,
            Prefix: this.s3Prefix
        }));

        return (response.Contents || [])
            .map(obj => ({
                key: obj.Key,
                sizeBytes: obj.Size,
                lastModified: obj.LastModified
            }))
            .sort((a, b) => b.lastModified - a.lastModified);
    }
}

// Usage example
async function main() {
    const manager = new RedisBackupManager({
        redisDataDir: '/var/lib/redis',
        backupDir: '/backup/redis'
    });

    try {
        console.log('Creating backup...');
        const result = await manager.createBackup({ compress: true });

        if (result.success) {
            console.log(`Backup created: ${result.filename}`);
            console.log(`Size: ${(result.sizeBytes / 1024 / 1024).toFixed(2)} MB`);
            console.log(`Checksum: ${result.checksum}`);
            console.log(`Duration: ${result.durationMs}ms`);
        } else {
            console.log(`Backup failed: ${result.error}`);
        }

        console.log('\nAvailable backups:');
        for (const backup of manager.listBackups()) {
            console.log(`  ${backup.filename} - ${(backup.sizeBytes / 1024 / 1024).toFixed(2)} MB`);
        }

        const removed = manager.cleanupOldBackups(7);
        console.log(`\nRemoved ${removed} old backup(s)`);

    } finally {
        await manager.close();
    }
}

main().catch(console.error);
```

## Automated Backup Script

Here is a production-ready bash script for cron-based backups:

```bash
#!/bin/bash
# redis-backup.sh - Automated Redis backup script

set -e

# Configuration
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_DATA_DIR="${REDIS_DATA_DIR:-/var/lib/redis}"
BACKUP_DIR="${BACKUP_DIR:-/backup/redis}"
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-redis-backups/}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
COMPRESS="${COMPRESS:-true}"
LOG_FILE="${LOG_FILE:-/var/log/redis-backup.log}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Redis CLI wrapper
redis_cmd() {
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" "$@" 2>/dev/null
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" "$@"
    fi
}

# Create backup directory
mkdir -p "$BACKUP_DIR" || error_exit "Cannot create backup directory"

# Get RDB filename from Redis config
RDB_FILENAME=$(redis_cmd CONFIG GET dbfilename | tail -1)
RDB_FILENAME="${RDB_FILENAME:-dump.rdb}"
RDB_PATH="$REDIS_DATA_DIR/$RDB_FILENAME"

# Record initial LASTSAVE timestamp
INITIAL_LASTSAVE=$(redis_cmd LASTSAVE)
log "Starting backup. Initial LASTSAVE: $INITIAL_LASTSAVE"

# Trigger background save
log "Triggering BGSAVE..."
redis_cmd BGSAVE || error_exit "BGSAVE command failed"

# Wait for save to complete
TIMEOUT=300
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
    CURRENT_LASTSAVE=$(redis_cmd LASTSAVE)

    if [ "$CURRENT_LASTSAVE" -gt "$INITIAL_LASTSAVE" ]; then
        log "BGSAVE completed. New LASTSAVE: $CURRENT_LASTSAVE"
        break
    fi

    sleep 1
    ELAPSED=$((ELAPSED + 1))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    error_exit "BGSAVE timeout after ${TIMEOUT}s"
fi

# Generate backup filename
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_NAME="dump_${TIMESTAMP}.rdb"

if [ "$COMPRESS" = "true" ]; then
    BACKUP_NAME="${BACKUP_NAME}.gz"
fi

BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Copy and compress
log "Creating backup: $BACKUP_PATH"

if [ "$COMPRESS" = "true" ]; then
    gzip -c "$RDB_PATH" > "$BACKUP_PATH" || error_exit "Compression failed"
else
    cp "$RDB_PATH" "$BACKUP_PATH" || error_exit "Copy failed"
fi

# Calculate checksum
CHECKSUM=$(md5sum "$BACKUP_PATH" | cut -d' ' -f1)
SIZE=$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH")

log "Backup created successfully"
log "  File: $BACKUP_PATH"
log "  Size: $((SIZE / 1024 / 1024)) MB"
log "  Checksum: $CHECKSUM"

# Upload to S3 if configured
if [ -n "$S3_BUCKET" ]; then
    log "Uploading to S3: s3://$S3_BUCKET/$S3_PREFIX$BACKUP_NAME"

    aws s3 cp "$BACKUP_PATH" "s3://$S3_BUCKET/$S3_PREFIX$BACKUP_NAME" \
        --storage-class STANDARD_IA \
        --sse AES256 \
        || error_exit "S3 upload failed"

    log "S3 upload completed"
fi

# Cleanup old local backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
DELETED=$(find "$BACKUP_DIR" -name "dump_*.rdb*" -mtime +$RETENTION_DAYS -delete -print | wc -l)
log "Deleted $DELETED old backup(s)"

# Cleanup old S3 backups
if [ -n "$S3_BUCKET" ]; then
    CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" '+%Y-%m-%d' 2>/dev/null || \
                  date -v-${RETENTION_DAYS}d '+%Y-%m-%d')

    aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX" | while read -r line; do
        FILE_DATE=$(echo "$line" | awk '{print $1}')
        FILE_NAME=$(echo "$line" | awk '{print $4}')

        if [[ "$FILE_DATE" < "$CUTOFF_DATE" ]]; then
            log "Deleting old S3 backup: $FILE_NAME"
            aws s3 rm "s3://$S3_BUCKET/$S3_PREFIX$FILE_NAME"
        fi
    done
fi

log "Backup completed successfully"
```

Set up a cron job:

```bash
# Run backup every 6 hours
0 */6 * * * /usr/local/bin/redis-backup.sh >> /var/log/redis-backup.log 2>&1
```

## Restoring Redis Data

### Restore from RDB

```bash
#!/bin/bash
# redis-restore.sh - Restore Redis from RDB backup

BACKUP_FILE="$1"
REDIS_DATA_DIR="${REDIS_DATA_DIR:-/var/lib/redis}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Stop Redis
echo "Stopping Redis..."
sudo systemctl stop redis

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Decompressing backup..."
    gunzip -c "$BACKUP_FILE" > "$REDIS_DATA_DIR/dump.rdb"
else
    echo "Copying backup..."
    cp "$BACKUP_FILE" "$REDIS_DATA_DIR/dump.rdb"
fi

# Set permissions
chown redis:redis "$REDIS_DATA_DIR/dump.rdb"
chmod 660 "$REDIS_DATA_DIR/dump.rdb"

# Start Redis
echo "Starting Redis..."
sudo systemctl start redis

# Verify
sleep 2
DBSIZE=$(redis-cli DBSIZE)
echo "Restore completed. $DBSIZE"
```

### Restore from S3

```bash
#!/bin/bash
# Restore from S3 backup

S3_BUCKET="your-bucket"
S3_KEY="redis-backups/dump_20260121_120000.rdb.gz"
LOCAL_PATH="/tmp/restore.rdb.gz"

# Download from S3
aws s3 cp "s3://$S3_BUCKET/$S3_KEY" "$LOCAL_PATH"

# Restore
./redis-restore.sh "$LOCAL_PATH"
```

## Monitoring Backup Health

### Prometheus Alerting Rules

```yaml
groups:
  - name: redis_backup_alerts
    rules:
      - alert: RedisBackupMissing
        expr: time() - redis_rdb_last_save_timestamp > 86400
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: No Redis backup in 24 hours
          description: "Last backup was {{ $value | humanizeDuration }} ago"

      - alert: RedisBackupFailed
        expr: redis_rdb_last_bgsave_status != 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: Redis BGSAVE failed
          description: "BGSAVE failed on {{ $labels.instance }}"

      - alert: RedisBackupSlow
        expr: redis_rdb_last_bgsave_duration_sec > 300
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Redis backup taking too long
          description: "Last BGSAVE took {{ $value }}s on {{ $labels.instance }}"
```

### Backup Verification Script

```python
import redis
import boto3
import gzip
from datetime import datetime, timedelta

def verify_backup_health(redis_host, s3_bucket, s3_prefix):
    """Verify backup health and recency."""
    issues = []

    # Check Redis persistence status
    client = redis.Redis(host=redis_host, decode_responses=True)
    info = client.info('persistence')

    # Check last save time
    last_save = datetime.fromtimestamp(info['rdb_last_save_time'])
    age = datetime.now() - last_save

    if age > timedelta(hours=24):
        issues.append(f"Last RDB save was {age.total_seconds() / 3600:.1f} hours ago")

    # Check last save status
    if info.get('rdb_last_bgsave_status') != 'ok':
        issues.append("Last BGSAVE failed")

    # Check S3 backups
    s3 = boto3.client('s3')
    response = s3.list_objects_v2(
        Bucket=s3_bucket,
        Prefix=s3_prefix
    )

    backups = response.get('Contents', [])
    if not backups:
        issues.append("No backups found in S3")
    else:
        latest = max(backups, key=lambda x: x['LastModified'])
        s3_age = datetime.now(latest['LastModified'].tzinfo) - latest['LastModified']

        if s3_age > timedelta(hours=24):
            issues.append(f"Latest S3 backup is {s3_age.total_seconds() / 3600:.1f} hours old")

    return {
        'healthy': len(issues) == 0,
        'issues': issues,
        'last_local_save': last_save,
        'backup_count': len(backups)
    }

# Run verification
result = verify_backup_health('localhost', 'my-bucket', 'redis-backups/')
print(f"Backup Health: {'OK' if result['healthy'] else 'ISSUES FOUND'}")
for issue in result['issues']:
    print(f"  - {issue}")
```

## Best Practices

1. **Test restores regularly**: Verify that backups can be successfully restored

2. **Use multiple backup locations**: Store backups locally and in cloud storage

3. **Encrypt backups**: Use server-side encryption for cloud storage

4. **Monitor backup freshness**: Alert when backups are too old

5. **Document recovery procedures**: Have runbooks for disaster recovery

6. **Consider replication**: Use replicas as live backups for instant failover

7. **Verify checksums**: Always verify backup integrity before and after transfer

8. **Automate everything**: Use cron jobs or orchestration tools for consistency

## Conclusion

A robust Redis backup strategy combines automated RDB snapshots, cloud storage replication, and regular verification. By implementing the backup solutions and monitoring described in this guide, you can ensure your Redis data is protected against hardware failures, human errors, and disasters. Remember to regularly test your restore procedures - a backup is only valuable if you can successfully recover from it.

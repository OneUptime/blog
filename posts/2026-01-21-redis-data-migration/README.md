# How to Migrate Redis Data Between Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Migration, Data Transfer, DevOps, Database, Replication

Description: A comprehensive guide to migrating Redis data between servers using MIGRATE, DUMP/RESTORE, replication-based migration, and zero-downtime strategies for production environments.

---

Migrating Redis data between servers is a common requirement during infrastructure upgrades, cloud migrations, or scaling operations. This guide covers multiple migration strategies, from simple key transfers to zero-downtime live migrations using replication.

## Migration Methods Overview

| Method | Downtime | Complexity | Best For |
|--------|----------|------------|----------|
| RDB Copy | Minutes | Low | Small datasets, maintenance windows |
| MIGRATE Command | Variable | Medium | Selective key migration |
| DUMP/RESTORE | Variable | Medium | Cross-cluster migration |
| Replication | Near-zero | High | Live migration, large datasets |
| redis-shake | Near-zero | Medium | Cross-version migration |

## Method 1: RDB File Copy

The simplest migration method for small datasets or during maintenance windows.

### Step-by-Step RDB Migration

```bash
#!/bin/bash
# rdb-migrate.sh - Simple RDB-based migration

SOURCE_HOST="source-redis.example.com"
TARGET_HOST="target-redis.example.com"
SSH_KEY="~/.ssh/redis_migration"

echo "Step 1: Trigger BGSAVE on source..."
redis-cli -h $SOURCE_HOST BGSAVE

echo "Waiting for BGSAVE to complete..."
while [ "$(redis-cli -h $SOURCE_HOST INFO persistence | grep rdb_bgsave_in_progress:1)" ]; do
    sleep 1
done

echo "Step 2: Stop target Redis..."
ssh -i $SSH_KEY $TARGET_HOST "sudo systemctl stop redis"

echo "Step 3: Copy RDB file..."
scp -i $SSH_KEY $SOURCE_HOST:/var/lib/redis/dump.rdb /tmp/dump.rdb
scp -i $SSH_KEY /tmp/dump.rdb $TARGET_HOST:/var/lib/redis/dump.rdb

echo "Step 4: Fix permissions..."
ssh -i $SSH_KEY $TARGET_HOST "sudo chown redis:redis /var/lib/redis/dump.rdb"

echo "Step 5: Start target Redis..."
ssh -i $SSH_KEY $TARGET_HOST "sudo systemctl start redis"

echo "Step 6: Verify..."
SOURCE_KEYS=$(redis-cli -h $SOURCE_HOST DBSIZE)
TARGET_KEYS=$(redis-cli -h $TARGET_HOST DBSIZE)
echo "Source: $SOURCE_KEYS, Target: $TARGET_KEYS"
```

## Method 2: MIGRATE Command

The MIGRATE command atomically transfers keys between Redis instances.

### Basic MIGRATE Usage

```bash
# Migrate a single key
redis-cli -h source MIGRATE target-host 6379 mykey 0 5000

# Migrate multiple keys (Redis 3.0.6+)
redis-cli -h source MIGRATE target-host 6379 "" 0 5000 KEYS key1 key2 key3

# Migrate with COPY (keep source key)
redis-cli -h source MIGRATE target-host 6379 mykey 0 5000 COPY

# Migrate with REPLACE (overwrite target key)
redis-cli -h source MIGRATE target-host 6379 mykey 0 5000 REPLACE

# Migrate with authentication
redis-cli -h source MIGRATE target-host 6379 mykey 0 5000 AUTH target-password
```

### Python MIGRATE Manager

```python
import redis
import time
from typing import List, Optional, Generator

class RedisMigrationManager:
    def __init__(self, source_host: str, target_host: str,
                 source_port: int = 6379, target_port: int = 6379,
                 source_password: Optional[str] = None,
                 target_password: Optional[str] = None,
                 batch_size: int = 100):
        self.source = redis.Redis(
            host=source_host,
            port=source_port,
            password=source_password,
            decode_responses=True
        )
        self.target_host = target_host
        self.target_port = target_port
        self.target_password = target_password
        self.batch_size = batch_size

        # Stats
        self.migrated = 0
        self.failed = 0
        self.skipped = 0

    def scan_keys(self, pattern: str = '*') -> Generator[str, None, None]:
        """Scan keys matching pattern."""
        cursor = 0
        while True:
            cursor, keys = self.source.scan(cursor, match=pattern, count=1000)
            for key in keys:
                yield key
            if cursor == 0:
                break

    def migrate_key(self, key: str, timeout_ms: int = 5000,
                    copy: bool = False, replace: bool = True) -> bool:
        """Migrate a single key using MIGRATE command."""
        try:
            args = [self.target_host, self.target_port, key, 0, timeout_ms]

            if copy:
                args.append('COPY')
            if replace:
                args.append('REPLACE')
            if self.target_password:
                args.extend(['AUTH', self.target_password])

            self.source.execute_command('MIGRATE', *args)
            self.migrated += 1
            return True

        except redis.ResponseError as e:
            if 'NOKEY' in str(e):
                self.skipped += 1
                return True
            self.failed += 1
            print(f"Failed to migrate {key}: {e}")
            return False

    def migrate_keys(self, keys: List[str], timeout_ms: int = 5000,
                     copy: bool = False, replace: bool = True) -> dict:
        """Migrate multiple keys using MIGRATE with KEYS option."""
        try:
            args = [self.target_host, self.target_port, '', 0, timeout_ms]

            if copy:
                args.append('COPY')
            if replace:
                args.append('REPLACE')
            if self.target_password:
                args.extend(['AUTH', self.target_password])

            args.append('KEYS')
            args.extend(keys)

            self.source.execute_command('MIGRATE', *args)
            self.migrated += len(keys)
            return {'success': True, 'count': len(keys)}

        except redis.ResponseError as e:
            self.failed += len(keys)
            return {'success': False, 'error': str(e)}

    def migrate_pattern(self, pattern: str = '*',
                        progress_callback=None) -> dict:
        """Migrate all keys matching pattern."""
        batch = []
        total_processed = 0

        for key in self.scan_keys(pattern):
            batch.append(key)

            if len(batch) >= self.batch_size:
                self.migrate_keys(batch)
                total_processed += len(batch)

                if progress_callback:
                    progress_callback(total_processed, self.migrated,
                                     self.failed, self.skipped)
                batch = []

        # Migrate remaining keys
        if batch:
            self.migrate_keys(batch)
            total_processed += len(batch)

        return {
            'total_processed': total_processed,
            'migrated': self.migrated,
            'failed': self.failed,
            'skipped': self.skipped
        }

    def verify_migration(self, sample_size: int = 100) -> dict:
        """Verify migration by sampling keys."""
        target = redis.Redis(
            host=self.target_host,
            port=self.target_port,
            password=self.target_password,
            decode_responses=True
        )

        # Sample random keys from source
        all_keys = list(self.source.scan_iter(count=sample_size * 10))[:sample_size]

        matches = 0
        mismatches = []

        for key in all_keys:
            source_type = self.source.type(key)
            target_type = target.type(key)

            if source_type == target_type:
                if source_type == 'string':
                    if self.source.get(key) == target.get(key):
                        matches += 1
                    else:
                        mismatches.append(key)
                else:
                    # For non-string types, just check existence
                    matches += 1
            else:
                mismatches.append(key)

        return {
            'sampled': len(all_keys),
            'matches': matches,
            'mismatches': mismatches,
            'success_rate': matches / len(all_keys) if all_keys else 1.0
        }


# Usage example
if __name__ == "__main__":
    def progress(total, migrated, failed, skipped):
        print(f"Progress: {total} processed, {migrated} migrated, "
              f"{failed} failed, {skipped} skipped")

    manager = RedisMigrationManager(
        source_host='source-redis.example.com',
        target_host='target-redis.example.com',
        target_password='target-secret'
    )

    print("Starting migration...")
    result = manager.migrate_pattern('*', progress_callback=progress)
    print(f"\nMigration complete: {result}")

    print("\nVerifying migration...")
    verification = manager.verify_migration(sample_size=100)
    print(f"Verification: {verification['success_rate']*100:.1f}% success rate")
```

## Method 3: DUMP/RESTORE

For cross-cluster or cross-version migrations where MIGRATE is not available.

### Python DUMP/RESTORE Migration

```python
import redis
import time
from typing import Generator, Optional

class DumpRestoreMigration:
    def __init__(self, source_host: str, target_host: str,
                 source_port: int = 6379, target_port: int = 6379,
                 source_password: Optional[str] = None,
                 target_password: Optional[str] = None):
        self.source = redis.Redis(
            host=source_host,
            port=source_port,
            password=source_password
        )
        self.target = redis.Redis(
            host=target_host,
            port=target_port,
            password=target_password
        )

    def migrate_key(self, key: str, replace: bool = True) -> bool:
        """Migrate a single key using DUMP/RESTORE."""
        try:
            # Get TTL
            ttl = self.source.pttl(key)
            if ttl == -2:  # Key doesn't exist
                return False
            if ttl == -1:  # No expiration
                ttl = 0

            # Dump the key
            dump = self.source.dump(key)
            if dump is None:
                return False

            # Restore to target
            if replace:
                self.target.restore(key, ttl, dump, replace=True)
            else:
                try:
                    self.target.restore(key, ttl, dump)
                except redis.ResponseError as e:
                    if 'BUSYKEY' in str(e):
                        return False  # Key exists, skip
                    raise

            return True

        except Exception as e:
            print(f"Error migrating {key}: {e}")
            return False

    def migrate_all(self, pattern: str = '*', batch_size: int = 100) -> dict:
        """Migrate all keys matching pattern."""
        migrated = 0
        failed = 0
        cursor = 0

        while True:
            cursor, keys = self.source.scan(cursor, match=pattern, count=batch_size)

            pipe = self.target.pipeline()

            for key in keys:
                if self.migrate_key(key):
                    migrated += 1
                else:
                    failed += 1

            if cursor == 0:
                break

            print(f"Progress: {migrated} migrated, {failed} failed")

        return {'migrated': migrated, 'failed': failed}


class PipelinedDumpRestoreMigration:
    """Faster migration using pipelining."""

    def __init__(self, source_host: str, target_host: str,
                 batch_size: int = 100, **kwargs):
        self.source = redis.Redis(host=source_host, **kwargs.get('source', {}))
        self.target = redis.Redis(host=target_host, **kwargs.get('target', {}))
        self.batch_size = batch_size

    def migrate_batch(self, keys: list) -> dict:
        """Migrate a batch of keys using pipelining."""
        # Pipeline: get dumps and TTLs
        source_pipe = self.source.pipeline()
        for key in keys:
            source_pipe.dump(key)
            source_pipe.pttl(key)

        results = source_pipe.execute()

        # Restore to target
        target_pipe = self.target.pipeline()
        migrated = 0
        failed = 0

        for i, key in enumerate(keys):
            dump = results[i * 2]
            ttl = results[i * 2 + 1]

            if dump is None:
                failed += 1
                continue

            if ttl < 0:
                ttl = 0

            target_pipe.restore(key, ttl, dump, replace=True)
            migrated += 1

        try:
            target_pipe.execute()
        except Exception as e:
            print(f"Batch restore error: {e}")
            failed = len(keys)
            migrated = 0

        return {'migrated': migrated, 'failed': failed}

    def migrate_all(self, pattern: str = '*') -> dict:
        """Migrate all keys matching pattern."""
        total_migrated = 0
        total_failed = 0
        batch = []

        for key in self.source.scan_iter(match=pattern, count=self.batch_size):
            batch.append(key)

            if len(batch) >= self.batch_size:
                result = self.migrate_batch(batch)
                total_migrated += result['migrated']
                total_failed += result['failed']
                print(f"Progress: {total_migrated} migrated, {total_failed} failed")
                batch = []

        if batch:
            result = self.migrate_batch(batch)
            total_migrated += result['migrated']
            total_failed += result['failed']

        return {'migrated': total_migrated, 'failed': total_failed}
```

## Method 4: Replication-Based Migration

Zero-downtime migration using Redis replication.

### Setting Up Replication

```bash
# On the target server, make it a replica of the source
redis-cli -h target REPLICAOF source-host 6379

# If source requires authentication
redis-cli -h target CONFIG SET masterauth source-password

# Monitor replication progress
redis-cli -h target INFO replication
```

### Python Replication Migration Manager

```python
import redis
import time
from typing import Optional

class ReplicationMigration:
    def __init__(self, source_host: str, target_host: str,
                 source_port: int = 6379, target_port: int = 6379,
                 source_password: Optional[str] = None,
                 target_password: Optional[str] = None):
        self.source = redis.Redis(
            host=source_host,
            port=source_port,
            password=source_password,
            decode_responses=True
        )
        self.target = redis.Redis(
            host=target_host,
            port=target_port,
            password=target_password,
            decode_responses=True
        )
        self.source_host = source_host
        self.source_port = source_port
        self.source_password = source_password

    def start_replication(self) -> bool:
        """Configure target as replica of source."""
        try:
            # Set master authentication if needed
            if self.source_password:
                self.target.config_set('masterauth', self.source_password)

            # Start replication
            self.target.execute_command('REPLICAOF', self.source_host,
                                         self.source_port)
            print(f"Replication started: target -> {self.source_host}:{self.source_port}")
            return True

        except Exception as e:
            print(f"Failed to start replication: {e}")
            return False

    def get_replication_status(self) -> dict:
        """Get current replication status."""
        info = self.target.info('replication')
        return {
            'role': info.get('role'),
            'master_host': info.get('master_host'),
            'master_port': info.get('master_port'),
            'master_link_status': info.get('master_link_status'),
            'master_sync_in_progress': info.get('master_sync_in_progress'),
            'slave_repl_offset': info.get('slave_repl_offset'),
            'master_repl_offset': info.get('master_repl_offset'),
        }

    def wait_for_sync(self, timeout_seconds: int = 3600) -> bool:
        """Wait for replication to be fully synced."""
        start_time = time.time()

        while time.time() - start_time < timeout_seconds:
            status = self.get_replication_status()

            # Check if initial sync is complete
            if status.get('master_link_status') == 'up':
                # Check replication lag
                source_info = self.source.info('replication')
                source_offset = source_info.get('master_repl_offset', 0)
                target_offset = status.get('slave_repl_offset', 0)

                lag = source_offset - target_offset
                print(f"Replication lag: {lag} bytes")

                if lag == 0:
                    print("Replication fully synced!")
                    return True

            time.sleep(1)

        return False

    def promote_to_master(self) -> bool:
        """Promote target to master (stop replication)."""
        try:
            self.target.execute_command('REPLICAOF', 'NO', 'ONE')
            print("Target promoted to master")
            return True
        except Exception as e:
            print(f"Failed to promote: {e}")
            return False

    def verify_data_consistency(self, sample_size: int = 100) -> dict:
        """Verify data consistency between source and target."""
        # Sample keys from source
        keys = list(self.source.scan_iter(count=sample_size))[:sample_size]

        matches = 0
        mismatches = []

        for key in keys:
            source_val = self.source.dump(key)
            target_val = self.target.dump(key)

            if source_val == target_val:
                matches += 1
            else:
                mismatches.append(key)

        return {
            'sampled': len(keys),
            'matches': matches,
            'mismatches': mismatches,
            'consistency': matches / len(keys) if keys else 1.0
        }

    def execute_migration(self, cutover_callback=None) -> dict:
        """Execute full migration with optional cutover callback."""
        print("Step 1: Starting replication...")
        if not self.start_replication():
            return {'success': False, 'error': 'Failed to start replication'}

        print("Step 2: Waiting for sync...")
        if not self.wait_for_sync():
            return {'success': False, 'error': 'Sync timeout'}

        print("Step 3: Verifying data consistency...")
        verification = self.verify_data_consistency()
        print(f"Consistency: {verification['consistency']*100:.1f}%")

        if verification['consistency'] < 0.99:
            return {'success': False, 'error': 'Data consistency check failed'}

        # Optional: Execute cutover callback (e.g., switch DNS, update app config)
        if cutover_callback:
            print("Step 4: Executing cutover...")
            cutover_callback()

        print("Step 5: Promoting target to master...")
        if not self.promote_to_master():
            return {'success': False, 'error': 'Failed to promote'}

        return {
            'success': True,
            'verification': verification
        }


# Usage example
if __name__ == "__main__":
    def cutover():
        print("Switching application to new Redis...")
        # Update DNS, config, etc.

    migration = ReplicationMigration(
        source_host='old-redis.example.com',
        target_host='new-redis.example.com',
        source_password='source-secret',
        target_password='target-secret'
    )

    result = migration.execute_migration(cutover_callback=cutover)
    print(f"Migration result: {result}")
```

## Node.js Migration Tool

```javascript
const Redis = require('ioredis');

class RedisMigration {
    constructor(sourceConfig, targetConfig) {
        this.source = new Redis(sourceConfig);
        this.target = new Redis(targetConfig);
        this.stats = { migrated: 0, failed: 0, skipped: 0 };
    }

    async migrateKey(key) {
        try {
            const ttl = await this.source.pttl(key);
            const dump = await this.source.dump(key);

            if (!dump) {
                this.stats.skipped++;
                return false;
            }

            const restoreTtl = ttl > 0 ? ttl : 0;
            await this.target.restore(key, restoreTtl, dump, 'REPLACE');

            this.stats.migrated++;
            return true;
        } catch (error) {
            this.stats.failed++;
            console.error(`Failed to migrate ${key}:`, error.message);
            return false;
        }
    }

    async migrateAll(pattern = '*', batchSize = 100) {
        let cursor = '0';
        let processed = 0;

        do {
            const [newCursor, keys] = await this.source.scan(
                cursor, 'MATCH', pattern, 'COUNT', batchSize
            );
            cursor = newCursor;

            // Process batch with pipelining
            const sourcePipe = this.source.pipeline();
            const targetPipe = this.target.pipeline();

            for (const key of keys) {
                sourcePipe.dump(key);
                sourcePipe.pttl(key);
            }

            const results = await sourcePipe.exec();

            for (let i = 0; i < keys.length; i++) {
                const dump = results[i * 2][1];
                const ttl = results[i * 2 + 1][1];

                if (dump) {
                    const restoreTtl = ttl > 0 ? ttl : 0;
                    targetPipe.restore(keys[i], restoreTtl, dump, 'REPLACE');
                }
            }

            await targetPipe.exec();

            processed += keys.length;
            this.stats.migrated += keys.length;

            console.log(`Progress: ${processed} keys processed`);
        } while (cursor !== '0');

        return this.stats;
    }

    async startReplication(sourceHost, sourcePort, sourcePassword) {
        if (sourcePassword) {
            await this.target.config('SET', 'masterauth', sourcePassword);
        }
        await this.target.slaveof(sourceHost, sourcePort);
        console.log('Replication started');
    }

    async waitForSync(timeoutMs = 3600000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            const info = await this.target.info('replication');
            const linkStatus = info.match(/master_link_status:(\w+)/);

            if (linkStatus && linkStatus[1] === 'up') {
                const sourceInfo = await this.source.info('replication');
                const sourceOffset = parseInt(
                    sourceInfo.match(/master_repl_offset:(\d+)/)?.[1] || '0'
                );
                const targetOffset = parseInt(
                    info.match(/slave_repl_offset:(\d+)/)?.[1] || '0'
                );

                const lag = sourceOffset - targetOffset;
                console.log(`Replication lag: ${lag} bytes`);

                if (lag === 0) {
                    console.log('Replication synced!');
                    return true;
                }
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        return false;
    }

    async promoteToMaster() {
        await this.target.slaveof('NO', 'ONE');
        console.log('Promoted to master');
    }

    async close() {
        await this.source.quit();
        await this.target.quit();
    }
}

// Usage example
async function main() {
    const migration = new RedisMigration(
        { host: 'old-redis.example.com', password: 'source-secret' },
        { host: 'new-redis.example.com', password: 'target-secret' }
    );

    try {
        // Option 1: DUMP/RESTORE migration
        console.log('Starting DUMP/RESTORE migration...');
        const stats = await migration.migrateAll('*');
        console.log('Migration complete:', stats);

        // Option 2: Replication-based migration
        // await migration.startReplication('old-redis.example.com', 6379, 'source-secret');
        // await migration.waitForSync();
        // await migration.promoteToMaster();

    } finally {
        await migration.close();
    }
}

main().catch(console.error);
```

## Zero-Downtime Migration Checklist

### Pre-Migration

1. **Verify network connectivity** between source and target
2. **Ensure sufficient resources** on target (memory, CPU, disk)
3. **Configure authentication** on both instances
4. **Test replication** in a staging environment
5. **Document rollback procedure**

### During Migration

1. **Start replication** and monitor progress
2. **Wait for full sync** before proceeding
3. **Verify data consistency** with sampling
4. **Prepare application cutover** (DNS, config)
5. **Execute cutover** during low-traffic period

### Post-Migration

1. **Verify application connectivity**
2. **Monitor error rates** and latency
3. **Keep source available** for rollback
4. **Clean up replication** after verification
5. **Document the migration**

## Monitoring Migration Progress

```bash
# Monitor replication status
watch -n 1 'redis-cli -h target INFO replication | grep -E "(role|master_link_status|slave_repl_offset)"'

# Monitor memory usage
redis-cli -h target INFO memory | grep used_memory_human

# Monitor key count
redis-cli -h target DBSIZE
```

## Best Practices

1. **Test in staging first**: Always validate migration procedures in a non-production environment

2. **Use replication for large datasets**: Replication provides the safest path for large migrations

3. **Monitor throughout**: Watch memory, CPU, and network during migration

4. **Have a rollback plan**: Keep the source available until migration is verified

5. **Schedule during low traffic**: Execute cutover during maintenance windows

6. **Verify thoroughly**: Sample data comparison before and after migration

7. **Document everything**: Record procedures for future reference

## Conclusion

Redis data migration requires careful planning and the right approach based on your requirements. For small datasets or maintenance windows, simple RDB copy works well. For live migrations with minimal downtime, replication-based migration is the safest approach. Always test your migration procedure thoroughly and have a rollback plan ready before executing in production.

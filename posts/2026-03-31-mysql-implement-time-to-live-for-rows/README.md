# How to Implement Time-to-Live (TTL) for MySQL Rows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, TTL, Data Retention, Event Scheduler, Expiry

Description: Implement row-level TTL in MySQL using expires_at columns, the Event Scheduler, and efficient indexed deletion to automatically expire old records.

---

## Row-Level TTL in MySQL

Unlike Redis, MySQL does not have native TTL support for individual rows. However, you can implement TTL by adding an `expires_at` timestamp column and using the MySQL Event Scheduler to periodically delete expired rows. This pattern works well for sessions, temporary tokens, rate limiting counters, and cached records.

## Adding TTL to a Table

Add an `expires_at` column with an index for efficient expiry queries:

```sql
ALTER TABLE user_sessions
  ADD COLUMN expires_at DATETIME NOT NULL
    COMMENT 'Row expires and becomes eligible for deletion after this time';

-- Critical: index on expires_at for efficient TTL queries
ALTER TABLE user_sessions
  ADD INDEX idx_expires_at (expires_at);
```

## Setting TTL on Insert

Set the expiry time at insert time:

```sql
-- Session expires in 30 days
INSERT INTO user_sessions (user_id, token, created_at, expires_at)
VALUES (
  42,
  'abc123token',
  NOW(),
  DATE_ADD(NOW(), INTERVAL 30 DAY)
);

-- Temporary access token expires in 15 minutes
INSERT INTO password_reset_tokens (user_id, token, expires_at)
VALUES (
  42,
  SHA2(UUID(), 256),
  DATE_ADD(NOW(), INTERVAL 15 MINUTE)
);
```

## Application-Level TTL Check

Always check `expires_at` in queries to treat expired rows as if they don't exist:

```sql
-- Valid session lookup (excludes expired sessions)
SELECT user_id, token
FROM user_sessions
WHERE token = ?
  AND expires_at > NOW();

-- Valid password reset token
SELECT user_id
FROM password_reset_tokens
WHERE token = ?
  AND used_at IS NULL
  AND expires_at > NOW();
```

## Automated Expiry with Event Scheduler

Use the MySQL Event Scheduler for automatic cleanup:

```sql
-- Enable Event Scheduler
SET GLOBAL event_scheduler = ON;

-- Delete expired sessions in batches every 5 minutes
CREATE EVENT expire_user_sessions
ON SCHEDULE EVERY 5 MINUTE
DO
  DELETE FROM user_sessions
  WHERE expires_at < NOW()
  LIMIT 5000;

-- Delete expired password reset tokens hourly
CREATE EVENT expire_password_reset_tokens
ON SCHEDULE EVERY 1 HOUR
DO
  DELETE FROM password_reset_tokens
  WHERE expires_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
  LIMIT 1000;
```

## Sliding Expiry (Refresh TTL on Access)

For sessions that refresh their expiry on use:

```sql
-- Extend the session by 30 days on each request
UPDATE user_sessions
SET expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY),
    last_accessed_at = NOW()
WHERE token = ?
  AND expires_at > NOW();
```

## TTL for Rate Limiting

Use TTL rows for rate limiting counters:

```sql
CREATE TABLE rate_limit_counters (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  key_hash   VARCHAR(64) NOT NULL,
  count      INT NOT NULL DEFAULT 1,
  window_start DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  UNIQUE KEY uk_key_window (key_hash, window_start),
  INDEX idx_expires (expires_at)
);

-- Increment counter or insert for new window
INSERT INTO rate_limit_counters (key_hash, count, window_start, expires_at)
VALUES (SHA2(CONCAT(?, '-', DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:00')), 256), 1, DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:00'), DATE_ADD(NOW(), INTERVAL 2 MINUTE))
ON DUPLICATE KEY UPDATE count = count + 1;
```

## Monitoring TTL Cleanup

```sql
-- Check how many expired rows are pending deletion
SELECT COUNT(*) AS expired_sessions FROM user_sessions WHERE expires_at < NOW();

-- View event execution status
SELECT event_name, last_executed, status
FROM information_schema.EVENTS
WHERE event_schema = 'myapp';
```

## Summary

MySQL row TTL is implemented by adding an indexed `expires_at` column and excluding expired rows in queries with `expires_at > NOW()`. The Event Scheduler handles background cleanup using batch deletions to minimize lock contention. This pattern supports fixed TTLs, sliding window TTLs, and TTL-based rate limiting counters, all with the performance guaranteed by the `expires_at` index.

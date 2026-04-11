# How to Implement Rate Limiting with MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, Pattern, Security, Counter

Description: Learn how to implement sliding window and fixed window rate limiting directly in MySQL to protect APIs and prevent abuse.

---

## Why Database-Level Rate Limiting?

While Redis is the go-to for rate limiting, MySQL can handle rate limiting for moderate traffic when you already have MySQL in your stack and want to avoid adding infrastructure. Two common algorithms are fixed window and sliding window.

## Fixed Window Rate Limiting

Fixed window counting resets the counter every N seconds. Simple but can allow burst traffic at window boundaries.

```sql
CREATE TABLE rate_limits (
    identifier VARCHAR(255) NOT NULL,  -- IP, user_id, API key
    window_start TIMESTAMP NOT NULL,
    request_count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (identifier, window_start),
    INDEX idx_identifier (identifier)
);
```

Rate limit check and increment stored procedure:

```sql
DELIMITER $$

CREATE PROCEDURE check_rate_limit(
    IN p_identifier VARCHAR(255),
    IN p_limit INT,
    IN p_window_seconds INT,
    OUT p_allowed BOOLEAN,
    OUT p_remaining INT
)
BEGIN
    DECLARE v_window_start TIMESTAMP;
    DECLARE v_count INT DEFAULT 0;

    -- Calculate current window start
    SET v_window_start = FROM_UNIXTIME(
        FLOOR(UNIX_TIMESTAMP(NOW()) / p_window_seconds) * p_window_seconds
    );

    -- Insert or increment the counter for this window
    INSERT INTO rate_limits (identifier, window_start, request_count)
    VALUES (p_identifier, v_window_start, 1)
    ON DUPLICATE KEY UPDATE
        request_count = request_count + 1;

    -- Get current count
    SELECT request_count INTO v_count
    FROM rate_limits
    WHERE identifier = p_identifier
      AND window_start = v_window_start;

    SET p_allowed = (v_count <= p_limit);
    SET p_remaining = GREATEST(0, p_limit - v_count);
END$$

DELIMITER ;

-- Check if user '192.168.1.1' is within 100 requests per 60 seconds
CALL check_rate_limit('192.168.1.1', 100, 60, @allowed, @remaining);
SELECT @allowed, @remaining;
```

## Sliding Window Rate Limiting

Sliding window tracks individual request timestamps for more accurate rate limiting:

```sql
CREATE TABLE request_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    requested_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_identifier_time (identifier, requested_at)
);
```

```sql
DELIMITER $$

CREATE PROCEDURE check_sliding_rate_limit(
    IN p_identifier VARCHAR(255),
    IN p_limit INT,
    IN p_window_seconds INT,
    OUT p_allowed BOOLEAN,
    OUT p_count INT
)
BEGIN
    DECLARE v_window_start TIMESTAMP(3);

    SET v_window_start = DATE_SUB(NOW(3), INTERVAL p_window_seconds SECOND);

    -- Count requests in the sliding window
    SELECT COUNT(*) INTO p_count
    FROM request_log
    WHERE identifier = p_identifier
      AND requested_at >= v_window_start;

    IF p_count < p_limit THEN
        -- Record this request
        INSERT INTO request_log (identifier)
        VALUES (p_identifier);
        SET p_allowed = TRUE;
    ELSE
        SET p_allowed = FALSE;
    END IF;
END$$

DELIMITER ;
```

## Application Integration

```python
import mysql.connector

def is_allowed(conn, identifier, limit=100, window_seconds=60):
    cursor = conn.cursor()
    result_args = cursor.callproc('check_rate_limit',
                                  [identifier, limit, window_seconds, 0, 0])

    allowed = bool(result_args[3])
    remaining = result_args[4]
    return allowed, remaining

# In your API handler
allowed, remaining = is_allowed(conn, request.remote_addr)
if not allowed:
    return {"error": "Rate limit exceeded"}, 429
```

## Cleanup of Old Records

```sql
-- Clean up old fixed-window records (run periodically)
DELETE FROM rate_limits
WHERE window_start < NOW() - INTERVAL 1 HOUR;

-- Clean up old sliding window records
DELETE FROM request_log
WHERE requested_at < NOW() - INTERVAL 1 HOUR;

-- Schedule automatic cleanup
DELIMITER $$

CREATE EVENT cleanup_rate_limits
ON SCHEDULE EVERY 5 MINUTE
DO BEGIN
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL 1 HOUR;
    DELETE FROM request_log WHERE requested_at < NOW() - INTERVAL 1 HOUR;
END$$

DELIMITER ;
```

## Choosing Between Fixed and Sliding Windows

Fixed window is simpler and faster (fewer rows scanned) but allows burst traffic of up to 2x the limit at window boundaries. Sliding window is more accurate but requires storing individual timestamps and scanning more rows.

For most MySQL-based rate limiting, fixed window at 60-second granularity is sufficient and performs well.

## Summary

MySQL rate limiting uses `INSERT ... ON DUPLICATE KEY UPDATE` for efficient atomic counter increments in fixed window scenarios, or timestamp tracking for sliding windows. Stored procedures encapsulate the logic for clean application integration. Scheduled cleanup events prevent table growth. While Redis handles higher throughput, MySQL rate limiting works well for moderate traffic where simplicity and minimal infrastructure matter.

# How to Use SET Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Type, Set, Database Design

Description: Learn how to use the SET data type in MySQL to store multiple values from a predefined list in a single column using bit-flag storage.

---

## What Is the SET Data Type?

`SET` is a string type that allows a column to contain zero or more values from a predefined list. MySQL stores it as a bitmap internally - each member in the SET corresponds to one bit. A SET can have up to 64 members, and the storage size ranges from 1 to 8 bytes depending on the number of members.

```sql
CREATE TABLE user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50),
    notifications SET('email', 'sms', 'push', 'in_app') DEFAULT 'email,push',
    days_available SET('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')
);
```

## Inserting SET Values

Provide comma-separated values as a single string:

```sql
-- Insert multiple values
INSERT INTO user_preferences (username, notifications, days_available)
VALUES ('alice', 'email,push', 'Mon,Wed,Fri');

-- Insert single value
INSERT INTO user_preferences (username, notifications)
VALUES ('bob', 'sms');

-- Insert all values
INSERT INTO user_preferences (username, notifications, days_available)
VALUES ('carol', 'email,sms,push,in_app', 'Mon,Tue,Wed,Thu,Fri');

-- Insert empty set
INSERT INTO user_preferences (username, notifications)
VALUES ('dave', '');
```

## Querying SET Columns

```sql
-- Find users who have email notification enabled
SELECT username FROM user_preferences
WHERE FIND_IN_SET('email', notifications) > 0;

-- Find users available on Mondays
SELECT username FROM user_preferences
WHERE FIND_IN_SET('Mon', days_available) > 0;

-- Alternative using LIKE (less efficient)
SELECT username FROM user_preferences
WHERE notifications LIKE '%email%';
```

## Using FIND_IN_SET for Filtering

`FIND_IN_SET()` is the standard function for searching within SET columns:

```sql
-- Users with both email AND push notifications
SELECT username FROM user_preferences
WHERE FIND_IN_SET('email', notifications) > 0
  AND FIND_IN_SET('push', notifications) > 0;

-- Users with email OR sms
SELECT username FROM user_preferences
WHERE FIND_IN_SET('email', notifications) > 0
   OR FIND_IN_SET('sms', notifications) > 0;
```

## Bitwise Operations with SET

Because SET uses a bitmap, you can use bitwise operators to filter efficiently:

```sql
-- Get the numeric value of the SET column
SELECT username, notifications + 0 AS bitmask
FROM user_preferences;

-- 'email' = bit 0 (value 1), 'sms' = bit 1 (value 2),
-- 'push' = bit 2 (value 4), 'in_app' = bit 3 (value 8)

-- Find users with email (bit 0) using bitwise AND
SELECT username FROM user_preferences
WHERE (notifications + 0) & 1 = 1;

-- Find users with push (bit 2, value 4)
SELECT username FROM user_preferences
WHERE (notifications + 0) & 4 = 4;
```

## Modifying SET Values

You can add or remove individual members from a SET value using string operations or bitwise operators:

```sql
-- Add 'sms' to notifications for a user
UPDATE user_preferences
SET notifications = TRIM(BOTH ',' FROM CONCAT(notifications, ',sms'))
WHERE username = 'alice'
  AND FIND_IN_SET('sms', notifications) = 0;

-- Remove 'sms' from notifications
UPDATE user_preferences
SET notifications = TRIM(BOTH ',' FROM
    REPLACE(CONCAT(',', notifications, ','), ',sms,', ','))
WHERE username = 'alice';
```

## SET vs Multiple Boolean Columns vs Junction Table

```sql
-- SET: compact, single column, but limited to 64 values and not easily indexed
CREATE TABLE users_set (
    id INT PRIMARY KEY,
    features SET('feature_a', 'feature_b', 'feature_c', 'feature_d')
);

-- Multiple BOOLEAN columns: flexible, indexable, but wide for many features
CREATE TABLE users_bool (
    id INT PRIMARY KEY,
    feature_a TINYINT(1) DEFAULT 0,
    feature_b TINYINT(1) DEFAULT 0,
    feature_c TINYINT(1) DEFAULT 0
);

-- Junction table: most flexible, normalized, best for large or dynamic lists
CREATE TABLE user_features (
    user_id INT,
    feature VARCHAR(50),
    PRIMARY KEY (user_id, feature)
);
```

## Summary

The SET data type is useful for storing multiple selections from a small, stable list within a single column. It uses compact bitmap storage and works well with `FIND_IN_SET()` for querying. However, SET values cannot be efficiently indexed for individual member lookups - for large or frequently queried multi-value fields, consider a normalized junction table instead.

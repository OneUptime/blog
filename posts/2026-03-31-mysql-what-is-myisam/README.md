# What Is MyISAM in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MyISAM, Storage Engine, Table Lock, Database

Description: MyISAM is a non-transactional MySQL storage engine known for fast read performance and full-text search, but lacks ACID support and uses table-level locking.

---

## Overview

MyISAM was the default MySQL storage engine before version 5.5, when InnoDB took over that role. Despite being superseded, MyISAM remains available in modern MySQL installations and is still encountered in legacy applications and databases migrated from older MySQL versions.

MyISAM is derived from the older ISAM (Indexed Sequential Access Method) engine and was designed for speed in read-heavy workloads. It trades transactional safety and crash recovery for simplicity and fast sequential reads.

## Key Characteristics

MyISAM does not support transactions. There is no `COMMIT`, `ROLLBACK`, or `SAVEPOINT`. Every statement executes immediately and cannot be undone. This means a failed multi-statement operation can leave your data in a partially updated state.

MyISAM uses table-level locking. Any write operation - `INSERT`, `UPDATE`, or `DELETE` - locks the entire table. No other session can read or write to the table until the lock is released. This severely limits write concurrency but simplifies the locking mechanism.

```sql
CREATE TABLE article_views (
  article_id INT NOT NULL,
  view_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_viewed DATETIME,
  PRIMARY KEY (article_id)
) ENGINE=MyISAM;
```

## MyISAM File Structure

Each MyISAM table consists of three files on disk:

- `.frm` - table definition (format file, replaced by `.sdi` in MySQL 8.0)
- `.MYD` - data file (MyISAM Data)
- `.MYI` - index file (MyISAM Index)

In MySQL 8.0 and later, the `.frm` file no longer exists. The data dictionary is stored internally, and MyISAM tables include a `.sdi` (Serialized Dictionary Information) file instead.

This separation makes it straightforward to copy or back up individual tables by copying these files.

```bash
# MyISAM table files in the MySQL data directory
ls -la /var/lib/mysql/mydb/
# article_views.frm
# article_views.MYD
# article_views.MYI
```

## Full-Text Search

One area where MyISAM historically excelled was full-text search. Before InnoDB added full-text search support in MySQL 5.6, MyISAM was the only option for `FULLTEXT` indexes.

```sql
CREATE TABLE articles (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (id),
  FULLTEXT INDEX ft_title_body (title, body)
) ENGINE=MyISAM;

SELECT id, title
FROM articles
WHERE MATCH(title, body) AGAINST('MySQL storage engine' IN NATURAL LANGUAGE MODE);
```

## Checking and Repairing MyISAM Tables

MyISAM tables can become corrupted after a crash because there is no crash recovery mechanism. MySQL provides tools to check and repair them.

```sql
-- Check a MyISAM table for errors
CHECK TABLE article_views;

-- Repair a corrupted MyISAM table
REPAIR TABLE article_views;

-- Optimize a MyISAM table (reclaims space after deletes)
OPTIMIZE TABLE article_views;
```

## When to Use MyISAM vs InnoDB

MyISAM is appropriate for read-only or read-mostly workloads where data integrity is not critical, such as logging tables written by a single process or static reference data. For virtually any application with concurrent writes, foreign keys, or transactional requirements, InnoDB is the correct choice.

```sql
-- Convert a MyISAM table to InnoDB
ALTER TABLE article_views ENGINE=InnoDB;

-- Verify the engine
SELECT TABLE_NAME, ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 'article_views';
```

## Summary

MyISAM is a legacy MySQL storage engine that prioritizes fast reads over transactional safety. It uses table-level locking, has no crash recovery, and does not support foreign keys or transactions. While it was the default engine for many years and still appears in legacy systems, InnoDB is preferred for modern applications. MyISAM's primary remaining use cases are full-text search in older MySQL versions and read-only datasets where its simpler architecture provides a performance edge.

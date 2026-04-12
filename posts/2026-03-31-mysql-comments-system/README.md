# How to Implement a Comments System in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Schema, Pattern, Hierarchy, Relationship

Description: Learn how to design a MySQL comments system that supports nested replies, threading, and efficient retrieval for articles or posts.

---

## Comments System Schema

A comments system needs to handle flat comments and optionally threaded (nested) replies. The key design decision is how deep to allow nesting.

```sql
-- Parent content table
CREATE TABLE articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments table with optional parent for threading
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    article_id INT NOT NULL,
    parent_id INT NULL DEFAULT NULL,  -- NULL = top-level comment
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_article_parent (article_id, parent_id),
    INDEX idx_parent (parent_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE SET NULL
);
```

## Inserting Comments

```sql
-- Top-level comment on article 1
INSERT INTO comments (article_id, parent_id, user_id, content)
VALUES (1, NULL, 101, 'Great article about MySQL!');

-- Reply to comment ID 1
INSERT INTO comments (article_id, parent_id, user_id, content)
VALUES (1, 1, 102, 'I agree, very helpful explanation.');

-- Reply to comment ID 2 (nested reply)
INSERT INTO comments (article_id, parent_id, user_id, content)
VALUES (1, 2, 103, 'Especially the code examples.');
```

## Fetching Flat Comments (No Threading)

```sql
-- Get all top-level comments for an article
SELECT
    c.id,
    c.user_id,
    c.content,
    c.created_at,
    COUNT(r.id) AS reply_count
FROM comments c
LEFT JOIN comments r ON r.parent_id = c.id AND r.is_deleted = 0
WHERE c.article_id = 1
  AND c.parent_id IS NULL
  AND c.is_deleted = 0
GROUP BY c.id, c.user_id, c.content, c.created_at
ORDER BY c.created_at DESC;
```

## Fetching Threaded Comments with CTE

For nested threading (comments and replies at any depth), use a recursive CTE:

```sql
WITH RECURSIVE comment_tree AS (
    -- Anchor: top-level comments
    SELECT
        id,
        parent_id,
        user_id,
        content,
        created_at,
        0 AS depth,
        CAST(LPAD(id, 10, '0') AS CHAR(200)) AS path
    FROM comments
    WHERE article_id = 1
      AND parent_id IS NULL
      AND is_deleted = 0

    UNION ALL

    -- Recursive: replies
    SELECT
        c.id,
        c.parent_id,
        c.user_id,
        c.content,
        c.created_at,
        ct.depth + 1,
        CONCAT(ct.path, ',', LPAD(c.id, 10, '0'))
    FROM comments c
    JOIN comment_tree ct ON c.parent_id = ct.id
    WHERE c.is_deleted = 0
      AND ct.depth < 5  -- Limit nesting depth
)
SELECT * FROM comment_tree
ORDER BY path;
```

## Soft Deleting Comments

When a comment with replies is deleted, preserve the thread structure:

```sql
-- Soft delete: mark as deleted but keep the record for thread continuity
UPDATE comments
SET is_deleted = 1,
    content = '[deleted]'
WHERE id = 2;

-- Hard delete: only safe for childless comments
DELETE FROM comments
WHERE id = 5
  AND NOT EXISTS (
    SELECT 1 FROM comments c2
    WHERE c2.parent_id = 5
  );
```

## Comment Count per Article

```sql
-- Get comment counts for multiple articles efficiently
SELECT
    article_id,
    COUNT(*) AS total_comments
FROM comments
WHERE article_id IN (1, 2, 3, 4, 5)
  AND is_deleted = 0
GROUP BY article_id;
```

## Recent Comments Feed

```sql
-- Latest comments across all articles with article info
SELECT
    c.id,
    c.article_id,
    a.title AS article_title,
    c.user_id,
    SUBSTRING(c.content, 1, 100) AS excerpt,
    c.created_at
FROM comments c
JOIN articles a ON c.article_id = a.id
WHERE c.is_deleted = 0
ORDER BY c.created_at DESC
LIMIT 20;
```

## Summary

A well-designed MySQL comments system uses a self-referencing `parent_id` column to support threaded replies. Recursive CTEs make it straightforward to fetch nested comment trees with configurable depth limits. Soft deletes preserve thread continuity when parent comments are removed, and composite indexes on `(article_id, parent_id)` keep comment loading fast even as volumes grow.

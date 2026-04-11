# How to Implement a Likes/Votes System in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Schema, Pattern, Counter, Relationship

Description: Learn how to implement a flexible likes and votes system in MySQL that prevents duplicate votes and supports both upvotes and downvotes.

---

## Schema Design

A likes/votes system has two core requirements: prevent a user from voting twice on the same item, and efficiently count total votes. The design uses a junction table for vote tracking and a denormalized counter for performance.

```sql
-- Content table (polymorphic - can handle multiple entity types)
CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author_id INT NOT NULL,
    like_count INT NOT NULL DEFAULT 0,
    dislike_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vote tracking table
CREATE TABLE votes (
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    vote_type TINYINT NOT NULL,  -- 1 = like/upvote, -1 = dislike/downvote
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id),
    INDEX idx_post (post_id)
);
```

## Adding a Vote (Like)

Use a stored procedure to handle vote changes atomically within a transaction:

```sql
DELIMITER $$

CREATE PROCEDURE cast_vote(
    IN p_user_id INT,
    IN p_post_id INT,
    IN p_vote_type TINYINT  -- 1 or -1
)
BEGIN
    DECLARE existing_vote TINYINT DEFAULT NULL;

    START TRANSACTION;

    -- Get current vote if any (lock the row to prevent races)
    SELECT vote_type INTO existing_vote
    FROM votes
    WHERE user_id = p_user_id AND post_id = p_post_id
    FOR UPDATE;

    IF existing_vote IS NULL THEN
        -- New vote
        INSERT INTO votes (user_id, post_id, vote_type)
        VALUES (p_user_id, p_post_id, p_vote_type);

        IF p_vote_type = 1 THEN
            UPDATE posts SET like_count = like_count + 1 WHERE id = p_post_id;
        ELSE
            UPDATE posts SET dislike_count = dislike_count + 1 WHERE id = p_post_id;
        END IF;

    ELSEIF existing_vote = p_vote_type THEN
        -- Remove vote (toggle off)
        DELETE FROM votes WHERE user_id = p_user_id AND post_id = p_post_id;

        IF p_vote_type = 1 THEN
            UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = p_post_id;
        ELSE
            UPDATE posts SET dislike_count = GREATEST(0, dislike_count - 1) WHERE id = p_post_id;
        END IF;

    ELSE
        -- Change vote direction
        UPDATE votes SET vote_type = p_vote_type
        WHERE user_id = p_user_id AND post_id = p_post_id;

        IF p_vote_type = 1 THEN
            UPDATE posts
            SET like_count = like_count + 1,
                dislike_count = GREATEST(0, dislike_count - 1)
            WHERE id = p_post_id;
        ELSE
            UPDATE posts
            SET dislike_count = dislike_count + 1,
                like_count = GREATEST(0, like_count - 1)
            WHERE id = p_post_id;
        END IF;
    END IF;

    COMMIT;
END$$

DELIMITER ;

-- Usage
CALL cast_vote(101, 5, 1);   -- User 101 likes post 5
CALL cast_vote(101, 5, -1);  -- User 101 changes to dislike
CALL cast_vote(101, 5, -1);  -- User 101 removes their dislike (toggle)
```

## Querying with User Vote State

```sql
-- Get posts with current user's vote status
SELECT
    p.id,
    p.title,
    p.like_count,
    p.dislike_count,
    p.like_count - p.dislike_count AS score,
    v.vote_type AS user_vote  -- NULL if not voted, 1 if liked, -1 if disliked
FROM posts p
LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = 101  -- Current user
WHERE p.id IN (1, 2, 3, 4, 5)
ORDER BY score DESC;
```

## Top-Rated Posts

```sql
-- Posts ranked by score (upvotes minus downvotes)
SELECT
    id,
    title,
    like_count,
    dislike_count,
    like_count - dislike_count AS score,
    like_count + dislike_count AS total_votes
FROM posts
ORDER BY score DESC, total_votes DESC
LIMIT 10;
```

## Checking Vote Counts Without Denormalized Counter

If you prefer accuracy over performance, compute counts directly:

```sql
-- Count votes without relying on denormalized columns
SELECT
    post_id,
    SUM(CASE WHEN vote_type = 1 THEN 1 ELSE 0 END) AS likes,
    SUM(CASE WHEN vote_type = -1 THEN 1 ELSE 0 END) AS dislikes
FROM votes
WHERE post_id IN (1, 2, 3)
GROUP BY post_id;
```

## Recount and Reconcile (Maintenance)

```sql
-- Resync denormalized counters from source of truth
UPDATE posts p
LEFT JOIN (
    SELECT
        post_id,
        SUM(CASE WHEN vote_type = 1 THEN 1 ELSE 0 END) AS likes,
        SUM(CASE WHEN vote_type = -1 THEN 1 ELSE 0 END) AS dislikes
    FROM votes
    GROUP BY post_id
) AS v ON p.id = v.post_id
SET p.like_count = COALESCE(v.likes, 0),
    p.dislike_count = COALESCE(v.dislikes, 0);
```

## Summary

A MySQL likes/votes system uses a junction table with a composite primary key to enforce one-vote-per-user-per-item uniqueness. Denormalized counters on the content table provide O(1) count reads, while the stored procedure handles all vote state transitions atomically. A periodic reconciliation query keeps the denormalized counts accurate if any drift occurs.

# How to Design a Schema for a Chat Application in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Chat, Schema Design, Messaging

Description: Learn how to design a scalable chat application schema in MySQL with conversations, messages, read receipts, and participant management.

---

A chat application schema must efficiently support creating conversations, sending messages, tracking read state, and querying recent message history. The key design decisions are around denormalization for performance and how to represent both direct messages and group chats.

## Users

```sql
CREATE TABLE users (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username   VARCHAR(50)  NOT NULL,
    avatar_url VARCHAR(512) NULL,
    last_seen  DATETIME     NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_username (username)
);
```

## Conversations

A conversation can be a direct message between two users or a group chat.

```sql
CREATE TABLE conversations (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    type         ENUM('direct', 'group') NOT NULL DEFAULT 'direct',
    name         VARCHAR(150) NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME  NULL,
    PRIMARY KEY (id),
    KEY idx_last_message (last_message_at)
);
```

## Participants

```sql
CREATE TABLE conversation_participants (
    conversation_id INT UNSIGNED NOT NULL,
    user_id         INT UNSIGNED NOT NULL,
    joined_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role            ENUM('member', 'admin') NOT NULL DEFAULT 'member',
    PRIMARY KEY (conversation_id, user_id),
    KEY idx_user_conv (user_id, conversation_id),
    CONSTRAINT fk_cp_conv FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
    CONSTRAINT fk_cp_user FOREIGN KEY (user_id)         REFERENCES users          (id) ON DELETE CASCADE
);
```

## Messages

```sql
CREATE TABLE messages (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    conversation_id INT UNSIGNED    NOT NULL,
    sender_id       INT UNSIGNED    NOT NULL,
    body            TEXT            NOT NULL,
    type            ENUM('text', 'image', 'file') NOT NULL DEFAULT 'text',
    sent_at         DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    deleted_at      DATETIME        NULL,
    PRIMARY KEY (id),
    KEY idx_conv_sent (conversation_id, sent_at),
    CONSTRAINT fk_msg_conv   FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id)       REFERENCES users          (id)
);
```

## Read Receipts

```sql
CREATE TABLE message_reads (
    message_id BIGINT UNSIGNED NOT NULL,
    user_id    INT UNSIGNED NOT NULL,
    read_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (message_id, user_id),
    KEY idx_user_read (user_id, message_id),
    CONSTRAINT fk_mr_message FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
    CONSTRAINT fk_mr_user    FOREIGN KEY (user_id)    REFERENCES users     (id) ON DELETE CASCADE
);
```

## Common Queries

```sql
-- Load 50 messages for a conversation (newest first)
SELECT m.id, m.body, m.sent_at, u.username AS sender
FROM   messages m
JOIN   users u ON u.id = m.sender_id
WHERE  m.conversation_id = 12
  AND  m.deleted_at IS NULL
ORDER BY m.sent_at DESC
LIMIT 50;

-- Count unread messages per conversation for a user
SELECT m.conversation_id, COUNT(*) AS unread
FROM   messages m
LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.user_id = 7
WHERE  m.conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = 7)
  AND  mr.message_id IS NULL
  AND  m.sender_id != 7
GROUP BY m.conversation_id;
```

## Summary

A chat schema centers on `conversations`, `conversation_participants`, and `messages`. Index `(conversation_id, sent_at)` for efficient paginated message retrieval. Use `DATETIME(3)` for millisecond-precision timestamps. Denormalize `last_message_at` onto conversations to quickly sort the inbox. Soft-delete messages with a `deleted_at` column to preserve read receipts and message threading.

# How to Design a Schema for User Authentication in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Authentication, Schema Design, Security

Description: Learn how to design a secure user authentication schema in MySQL with password hashing, sessions, refresh tokens, and MFA support.

---

A secure authentication schema goes beyond a simple `users` table. It must handle password storage, session management, refresh tokens, account lockout, and optionally multi-factor authentication.

## Users Table

Never store plaintext passwords. Store only the bcrypt or Argon2 hash.

```sql
CREATE TABLE users (
    id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email             VARCHAR(255) NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    email_verified    TINYINT(1)   NOT NULL DEFAULT 0,
    failed_attempts   TINYINT UNSIGNED NOT NULL DEFAULT 0,
    locked_until      DATETIME     NULL,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_email (email)
);
```

## Email Verification Tokens

```sql
CREATE TABLE email_verifications (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    INT UNSIGNED NOT NULL,
    token      CHAR(64)     NOT NULL,
    expires_at DATETIME     NOT NULL,
    used_at    DATETIME     NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_token (token),
    KEY idx_user (user_id),
    CONSTRAINT fk_ev_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

## Sessions (Server-Side)

```sql
CREATE TABLE sessions (
    id          CHAR(64)     NOT NULL,
    user_id     INT UNSIGNED NOT NULL,
    ip_address  VARCHAR(45)  NULL,
    user_agent  VARCHAR(512) NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at  DATETIME     NOT NULL,
    last_active DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user    (user_id),
    KEY idx_expires (expires_at),
    CONSTRAINT fk_sess_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

## Refresh Tokens (JWT or OAuth)

```sql
CREATE TABLE refresh_tokens (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED    NOT NULL,
    token_hash  CHAR(64)        NOT NULL,
    expires_at  DATETIME        NOT NULL,
    revoked_at  DATETIME        NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_token_hash (token_hash),
    KEY idx_user_expires (user_id, expires_at),
    CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

## MFA Secrets

```sql
CREATE TABLE mfa_secrets (
    user_id     INT UNSIGNED NOT NULL,
    secret      VARCHAR(32)  NOT NULL,
    enabled     TINYINT(1)   NOT NULL DEFAULT 0,
    verified_at DATETIME     NULL,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_mfa_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

## Account Lockout Logic

```sql
-- After a failed login attempt:
UPDATE users
SET   failed_attempts = failed_attempts + 1,
      locked_until    = CASE
          WHEN failed_attempts >= 5 THEN NOW() + INTERVAL 15 MINUTE
          ELSE locked_until
      END
WHERE id = ?;

-- Check lockout before authenticating:
SELECT id, password_hash, locked_until
FROM   users
WHERE  email = ?
  AND (locked_until IS NULL OR locked_until < NOW());
```

## Cleaning Expired Sessions

```sql
DELETE FROM sessions  WHERE expires_at  < NOW();
DELETE FROM refresh_tokens WHERE expires_at < NOW() AND revoked_at IS NULL;
```

## Summary

A robust authentication schema includes a `users` table with hashed passwords, a `sessions` or `refresh_tokens` table for stateful auth, email verification tokens with expiry, and MFA secrets. Implement account lockout using `failed_attempts` and `locked_until`. Purge expired tokens regularly to keep the tables lean.

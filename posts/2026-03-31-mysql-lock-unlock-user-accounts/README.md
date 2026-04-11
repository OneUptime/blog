# How to Lock and Unlock User Accounts in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, User, Security, Authentication, Database Administration

Description: Learn how to lock and unlock MySQL user accounts using ALTER USER ACCOUNT LOCK and ACCOUNT UNLOCK to temporarily disable access without dropping the account.

---

## Why Lock User Accounts?

Locking a MySQL account is a non-destructive way to disable access for a user without deleting the account or revoking privileges. This is useful for:

- Suspending a contractor whose engagement ends
- Disabling accounts during security investigations
- Temporarily blocking a service account while updating its password
- Enforcing a "disabled by default" security policy for newly created accounts

## Locking an Account

```sql
ALTER USER 'alice'@'localhost' ACCOUNT LOCK;
```

After this, any connection attempt by Alice returns:

```text
ERROR 3118 (HY000): Access denied for user 'alice'@'localhost'.
Account is locked.
```

## Creating a New Account in Locked State

You can create an account in a locked state from the start - useful for pre-provisioning:

```sql
CREATE USER 'new_contractor'@'%'
  IDENTIFIED BY 'TempPass!'
  ACCOUNT LOCK;
```

The account exists but cannot be used until explicitly unlocked.

## Unlocking an Account

```sql
ALTER USER 'alice'@'localhost' ACCOUNT UNLOCK;
```

Alice can now connect immediately without any server restart.

## Combining ACCOUNT LOCK with Password Reset

Lock the account and force a password reset simultaneously:

```sql
ALTER USER 'alice'@'localhost'
  IDENTIFIED BY 'NewTempPass!'
  PASSWORD EXPIRE
  ACCOUNT LOCK;
```

Then unlock and let Alice set a new password on first login:

```sql
ALTER USER 'alice'@'localhost' ACCOUNT UNLOCK;
```

## Checking Whether an Account Is Locked

```sql
SELECT user, host, account_locked
FROM mysql.user
WHERE user = 'alice';
```

Output:

```text
+-------+-----------+----------------+
| user  | host      | account_locked |
+-------+-----------+----------------+
| alice | localhost | Y              |
+-------+-----------+----------------+
```

`Y` means locked; `N` means unlocked (active).

## Listing All Locked Accounts

```sql
SELECT user, host
FROM mysql.user
WHERE account_locked = 'Y'
  AND user NOT IN ('mysql.sys', 'mysql.session', 'mysql.infoschema');
```

## Automatic Locking After Failed Login Attempts

MySQL 8.0.19 introduced failed-login tracking. Lock an account after a number of consecutive failures:

```sql
ALTER USER 'alice'@'localhost'
  FAILED_LOGIN_ATTEMPTS 5
  PASSWORD_LOCK_TIME 1;  -- lock for 1 day
```

The account automatically unlocks after the specified time. To unlock immediately:

```sql
ALTER USER 'alice'@'localhost' ACCOUNT UNLOCK;
```

## Pre-Provisioning Service Accounts with Socket Auth

For service accounts that should authenticate via a socket and remain disabled until needed, combine socket auth with account locking:

```sql
CREATE USER 'monitoring'@'localhost'
  IDENTIFIED WITH auth_socket
  ACCOUNT LOCK;  -- locked until explicitly unlocked
```

While locked, the account cannot connect using any authentication method, including socket auth. Once unlocked, it will only accept socket-based authentication — no password login is possible.

## Summary

`ALTER USER 'user'@'host' ACCOUNT LOCK` and `ACCOUNT UNLOCK` provide a lightweight mechanism to disable and re-enable MySQL accounts without removing them. Check lock status via `mysql.user.account_locked`, list all locked accounts with a simple query, and combine with `FAILED_LOGIN_ATTEMPTS` in MySQL 8.0.19+ for automated account protection.

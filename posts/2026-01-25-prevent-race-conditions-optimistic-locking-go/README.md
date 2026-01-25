# How to Prevent Race Conditions with Optimistic Locking in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Race Conditions, Optimistic Locking, Concurrency, Database

Description: Learn how to implement optimistic locking in Go to prevent race conditions in concurrent database operations without sacrificing performance.

---

Race conditions are among the trickiest bugs to track down. Two goroutines read the same data, both modify it, and whoever writes last wins - silently overwriting the other's changes. In database-backed applications, this often leads to lost updates, incorrect balances, and frustrated users.

Pessimistic locking solves this by acquiring locks before reading data, but it kills performance under high concurrency. Optimistic locking takes a different approach: assume conflicts are rare, let everyone read freely, but detect and reject conflicting writes. This guide shows you how to implement optimistic locking in Go with practical examples you can use today.

## How Optimistic Locking Works

The concept is straightforward. Every record has a version number (or timestamp). When you read a record, you note its version. When you write, you include that version in your update condition. If the version changed between your read and write, someone else modified the record, and your update fails.

| Step | Action | Result |
|------|--------|--------|
| 1 | Read record with version=5 | Got current state |
| 2 | Modify data locally | Changes ready |
| 3 | UPDATE WHERE version=5, SET version=6 | Success if unchanged |
| 4 | Check rows affected | 0 = conflict, retry needed |

## Database Schema Design

Your table needs a version column. An integer that increments on each update works well. Some teams prefer timestamps, but integers avoid clock synchronization issues.

```sql
-- Schema with version column for optimistic locking
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
```

## Basic Implementation in Go

Let's start with a simple account balance update. The key is checking how many rows the UPDATE affected - if zero, someone else modified the record.

```go
package main

import (
    "database/sql"
    "errors"
    "fmt"

    _ "github.com/lib/pq"
)

// ErrConflict indicates another transaction modified the record
var ErrConflict = errors.New("optimistic lock conflict: record was modified")

// Account represents a user account with optimistic locking
type Account struct {
    ID      int64
    UserID  int64
    Balance float64
    Version int
}

// UpdateBalance attempts to update the account balance
// Returns ErrConflict if the record was modified by another transaction
func UpdateBalance(db *sql.DB, account *Account, newBalance float64) error {
    result, err := db.Exec(`
        UPDATE accounts
        SET balance = $1, version = version + 1, updated_at = NOW()
        WHERE id = $2 AND version = $3`,
        newBalance, account.ID, account.Version,
    )
    if err != nil {
        return fmt.Errorf("update failed: %w", err)
    }

    // Check if the update actually modified a row
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return fmt.Errorf("checking rows affected: %w", err)
    }

    if rowsAffected == 0 {
        return ErrConflict
    }

    // Update local version to reflect the change
    account.Version++
    account.Balance = newBalance
    return nil
}
```

## Retry Logic for Conflicts

When a conflict occurs, you typically want to retry the operation. Fetch fresh data and try again. But don't retry forever - set a reasonable limit to avoid infinite loops.

```go
// RetryConfig controls retry behavior for optimistic locking conflicts
type RetryConfig struct {
    MaxAttempts int
    // Optional: add backoff delay between retries
}

// WithOptimisticRetry executes an operation with automatic retry on conflicts
// The operation function receives fresh data on each attempt
func WithOptimisticRetry(
    db *sql.DB,
    accountID int64,
    config RetryConfig,
    operation func(account *Account) (float64, error),
) error {
    for attempt := 1; attempt <= config.MaxAttempts; attempt++ {
        // Fetch fresh data for each attempt
        account, err := GetAccount(db, accountID)
        if err != nil {
            return fmt.Errorf("fetching account: %w", err)
        }

        // Calculate the new balance
        newBalance, err := operation(account)
        if err != nil {
            return fmt.Errorf("operation failed: %w", err)
        }

        // Attempt the update
        err = UpdateBalance(db, account, newBalance)
        if err == nil {
            return nil // Success
        }

        if !errors.Is(err, ErrConflict) {
            return err // Non-conflict error, don't retry
        }

        fmt.Printf("Conflict on attempt %d/%d, retrying...\n",
            attempt, config.MaxAttempts)
    }

    return fmt.Errorf("max retries exceeded after %d attempts", config.MaxAttempts)
}

// GetAccount fetches an account by ID
func GetAccount(db *sql.DB, id int64) (*Account, error) {
    account := &Account{}
    err := db.QueryRow(`
        SELECT id, user_id, balance, version
        FROM accounts WHERE id = $1`,
        id,
    ).Scan(&account.ID, &account.UserID, &account.Balance, &account.Version)

    if err != nil {
        return nil, err
    }
    return account, nil
}
```

## Using the Retry Logic

Here's how to use the retry wrapper for a typical balance transfer scenario.

```go
func main() {
    db, err := sql.Open("postgres", "postgres://localhost/mydb?sslmode=disable")
    if err != nil {
        panic(err)
    }
    defer db.Close()

    // Withdraw 100 from account 1
    err = WithOptimisticRetry(db, 1, RetryConfig{MaxAttempts: 3},
        func(account *Account) (float64, error) {
            if account.Balance < 100 {
                return 0, errors.New("insufficient funds")
            }
            return account.Balance - 100, nil
        },
    )

    if err != nil {
        fmt.Printf("Withdrawal failed: %v\n", err)
    }
}
```

## Handling Multiple Records

Transferring money between accounts requires updating two records atomically. Wrap everything in a transaction, but remember that optimistic locking still applies to each record.

```go
// Transfer moves money between two accounts with optimistic locking
func Transfer(db *sql.DB, fromID, toID int64, amount float64) error {
    return WithTransaction(db, func(tx *sql.Tx) error {
        // Fetch both accounts
        from, err := GetAccountTx(tx, fromID)
        if err != nil {
            return fmt.Errorf("fetching source account: %w", err)
        }

        to, err := GetAccountTx(tx, toID)
        if err != nil {
            return fmt.Errorf("fetching destination account: %w", err)
        }

        // Validate the transfer
        if from.Balance < amount {
            return errors.New("insufficient funds")
        }

        // Update source account with version check
        result, err := tx.Exec(`
            UPDATE accounts
            SET balance = balance - $1, version = version + 1
            WHERE id = $2 AND version = $3`,
            amount, from.ID, from.Version,
        )
        if err != nil {
            return err
        }

        if rows, _ := result.RowsAffected(); rows == 0 {
            return ErrConflict
        }

        // Update destination account with version check
        result, err = tx.Exec(`
            UPDATE accounts
            SET balance = balance + $1, version = version + 1
            WHERE id = $2 AND version = $3`,
            amount, to.ID, to.Version,
        )
        if err != nil {
            return err
        }

        if rows, _ := result.RowsAffected(); rows == 0 {
            return ErrConflict
        }

        return nil
    })
}

// WithTransaction wraps operations in a database transaction
func WithTransaction(db *sql.DB, fn func(tx *sql.Tx) error) error {
    tx, err := db.Begin()
    if err != nil {
        return err
    }

    err = fn(tx)
    if err != nil {
        tx.Rollback()
        return err
    }

    return tx.Commit()
}

// GetAccountTx fetches an account within a transaction
func GetAccountTx(tx *sql.Tx, id int64) (*Account, error) {
    account := &Account{}
    err := tx.QueryRow(`
        SELECT id, user_id, balance, version
        FROM accounts WHERE id = $1`,
        id,
    ).Scan(&account.ID, &account.UserID, &account.Balance, &account.Version)

    if err != nil {
        return nil, err
    }
    return account, nil
}
```

## Using GORM for Cleaner Code

If you're using GORM, optimistic locking becomes even simpler. GORM has built-in support via the `gorm:"version"` tag.

```go
import (
    "errors"
    "gorm.io/gorm"
    "gorm.io/gorm/clause"
)

// AccountGorm uses GORM's built-in optimistic locking
type AccountGorm struct {
    ID      int64   `gorm:"primaryKey"`
    UserID  int64   `gorm:"not null"`
    Balance float64 `gorm:"not null;default:0"`
    Version int     `gorm:"not null;default:1"` // GORM auto-increments this
}

func (AccountGorm) TableName() string {
    return "accounts"
}

// UpdateBalanceGorm uses GORM's optimistic locking
func UpdateBalanceGorm(db *gorm.DB, accountID int64, newBalance float64) error {
    account := &AccountGorm{}

    // Fetch current state
    if err := db.First(account, accountID).Error; err != nil {
        return err
    }

    // Update with optimistic locking - GORM checks version automatically
    account.Balance = newBalance
    result := db.Model(account).
        Where("version = ?", account.Version).
        Updates(map[string]interface{}{
            "balance": newBalance,
            "version": gorm.Expr("version + 1"),
        })

    if result.Error != nil {
        return result.Error
    }

    if result.RowsAffected == 0 {
        return errors.New("optimistic lock conflict")
    }

    return nil
}
```

## Common Pitfalls

**Reading outside transactions**: If you read data, do unrelated work, then update, the window for conflicts grows. Keep the read-modify-write cycle tight.

**Forgetting to check RowsAffected**: The UPDATE succeeds even when no rows match. Always verify that exactly one row was affected.

**Retrying without fresh data**: Retrying with stale data guarantees another conflict. Always re-fetch before retrying.

**Version overflow**: An int32 version column overflows after 2 billion updates. Use int64 or bigint for high-volume tables.

**Mixing locking strategies**: Don't combine optimistic and pessimistic locking on the same table without careful thought - it leads to confusing behavior.

## When to Use Optimistic vs Pessimistic Locking

| Scenario | Recommended Approach |
|----------|---------------------|
| High read, low write | Optimistic |
| Low conflict probability | Optimistic |
| Short-lived transactions | Optimistic |
| High conflict probability | Pessimistic |
| Long-running transactions | Pessimistic |
| Must never fail on conflict | Pessimistic |

## Summary

Optimistic locking gives you concurrency control without the performance hit of exclusive locks. The pattern is simple: track versions, include them in your WHERE clause, and handle conflicts with retries. For most web applications where conflicts are rare but reads are frequent, optimistic locking is the right choice.

Start with the basic version check pattern, add retry logic for robustness, and consider using an ORM like GORM if you want cleaner code. Your future self debugging a mysterious data corruption issue will thank you.

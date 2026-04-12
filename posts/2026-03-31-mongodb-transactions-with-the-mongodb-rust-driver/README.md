# How to Use Transactions with the MongoDB Rust Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Rust, Transaction, Session, ACID

Description: Learn how to implement multi-document ACID transactions in Rust with the MongoDB driver using client sessions for atomic operations.

---

## Introduction

MongoDB supports multi-document ACID transactions on replica sets and sharded clusters. In Rust, transactions are managed through a `ClientSession`. You start a transaction, perform operations passing the session reference, then commit or abort. The driver handles retrying transient errors when you use the `with_transaction` helper.

## Starting a Session

```rust
use mongodb::{Client, bson::doc};
use mongodb::error::Result;

async fn transfer_funds(
    client: &Client,
    from_id: &str,
    to_id:   &str,
    amount:  f64,
) -> Result<()> {
    let mut session = client.start_session().await?;

    let accounts = client.database("bank").collection::<mongodb::bson::Document>("accounts");

    session.start_transaction().await?;

    // Debit
    accounts.update_one(
        doc! { "_id": from_id, "balance": { "$gte": amount } },
        doc! { "$inc": { "balance": -amount } },
    ).session(&mut session).await?;

    // Credit
    accounts.update_one(
        doc! { "_id": to_id },
        doc! { "$inc": { "balance": amount } },
    ).session(&mut session).await?;

    session.commit_transaction().await?;
    Ok(())
}
```

## Using and_run for Automatic Retry

The `and_run` helper on `start_transaction` automatically retries on transient transaction errors:

```rust
use mongodb::ClientSession;
use std::sync::Arc;

async fn place_order(client: Arc<Client>) -> Result<()> {
    let mut session = client.start_session().await?;

    session.start_transaction()
        .and_run(client.clone(), |session, client| {
            Box::pin(async move {
                let orders = client.database("shop").collection::<mongodb::bson::Document>("orders");
                let inventory = client.database("shop").collection::<mongodb::bson::Document>("inventory");

                orders.insert_one(
                    doc! { "product": "Laptop", "qty": 1, "status": "pending" }
                ).session(session).await?;

                inventory.update_one(
                    doc! { "product": "Laptop" },
                    doc! { "$inc": { "stock": -1 } },
                ).session(session).await?;

                Ok(())
            })
        })
        .await?;

    Ok(())
}
```

## Aborting a Transaction

```rust
async fn risky_operation(client: &Client) -> Result<()> {
    let mut session = client.start_session().await?;
    session.start_transaction().await?;

    let col = client.database("app").collection::<mongodb::bson::Document>("data");

    match col.insert_one(doc! { "key": "value" }).session(&mut session).await {
        Ok(_)  => session.commit_transaction().await?,
        Err(e) => {
            session.abort_transaction().await?;
            return Err(e);
        }
    }

    Ok(())
}
```

## Transaction Options

```rust
use mongodb::options::{TransactionOptions, WriteConcern, ReadConcern};
use std::time::Duration;

let options = TransactionOptions::builder()
    .write_concern(WriteConcern::majority())
    .read_concern(ReadConcern::snapshot())
    .max_commit_time(Duration::from_secs(5))
    .build();

session.start_transaction().with_options(options).await?;
```

## Summary

MongoDB transactions in Rust require a `ClientSession` obtained from `client.start_session()`. Pass the session to each operation using `.session(&mut session)`. Use `start_transaction().and_run()` for production code as it handles transient error retries automatically. Always abort on error to release locks, and set appropriate write concern and timeout for your workload.

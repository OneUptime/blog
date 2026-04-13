# How to Implement Event Sourcing with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Event Sourcing, Architecture, Node.js, Design Pattern

Description: Learn how to implement the event sourcing pattern with MongoDB as the event store, using immutable event documents and aggregate state reconstruction.

---

## What Is Event Sourcing

Event sourcing stores every state change as an immutable event document instead of overwriting current state. The current state of any object is derived by replaying all events in sequence. MongoDB is a natural fit because:

- Flexible document schema accommodates varied event payloads
- Ordered inserts with sequence numbers ensure replay integrity
- Change streams enable real-time read model projections
- BSON supports rich nested event payloads

## Event Store Collection Design

```javascript
// Event document structure
{
  _id: ObjectId(),
  aggregateId: "account-123",       // ID of the domain object
  aggregateType: "BankAccount",     // domain type name
  eventType: "MoneyDeposited",      // what happened
  sequenceNumber: 5,                // monotonically increasing per aggregate
  occurredAt: ISODate(),
  version: 1,                       // event schema version
  payload: {                        // event-specific data
    amount: 500.00,
    currency: "USD",
    reference: "direct-deposit"
  },
  metadata: {
    correlationId: "txn-abc",
    userId: "user-456",
    ipAddress: "192.168.1.1"
  }
}
```

## Setting Up the Event Store

```javascript
// eventStore.js

class EventStore {
  constructor(db) {
    this.collection = db.collection('events');
  }

  async initialize() {
    // Enforce unique sequence per aggregate (optimistic concurrency)
    await this.collection.createIndex(
      { aggregateId: 1, sequenceNumber: 1 },
      { unique: true, name: 'aggregate_sequence_unique' }
    );
    await this.collection.createIndex({ aggregateType: 1, occurredAt: -1 });
    await this.collection.createIndex({ eventType: 1, occurredAt: -1 });
  }

  async append(aggregateId, aggregateType, eventType, payload, metadata = {}, expectedVersion = null) {
    // Get current version
    const lastEvent = await this.collection.findOne(
      { aggregateId },
      { sort: { sequenceNumber: -1 }, projection: { sequenceNumber: 1 } }
    );

    const currentVersion = lastEvent ? lastEvent.sequenceNumber : 0;

    // Optimistic concurrency check
    if (expectedVersion !== null && currentVersion !== expectedVersion) {
      throw new Error(
        `Concurrency conflict: expected version ${expectedVersion}, got ${currentVersion}`
      );
    }

    const event = {
      aggregateId,
      aggregateType,
      eventType,
      sequenceNumber: currentVersion + 1,
      occurredAt: new Date(),
      version: 1,
      payload,
      metadata: {
        ...metadata,
        recordedAt: new Date()
      }
    };

    try {
      const result = await this.collection.insertOne(event);
      return { ...event, _id: result.insertedId };
    } catch (err) {
      if (err.code === 11000) {
        throw new Error(`Optimistic concurrency conflict for aggregate ${aggregateId}`);
      }
      throw err;
    }
  }

  async getEventsForAggregate(aggregateId, fromVersion = 1) {
    return this.collection
      .find({ aggregateId, sequenceNumber: { $gte: fromVersion } })
      .sort({ sequenceNumber: 1 })
      .toArray();
  }

  async getAllEventsSince(timestamp) {
    return this.collection
      .find({ occurredAt: { $gte: timestamp } })
      .sort({ occurredAt: 1 })
      .toArray();
  }
}

module.exports = EventStore;
```

## Bank Account Aggregate

```javascript
// BankAccount.js
class BankAccount {
  constructor() {
    this.id = null;
    this.owner = null;
    this.balance = 0;
    this.status = null;
    this._version = 0;
    this._uncommittedEvents = [];
  }

  // Reconstitute from event history
  static reconstitute(events) {
    const account = new BankAccount();
    for (const event of events) {
      account._apply(event);
      account._version = event.sequenceNumber;
    }
    return account;
  }

  // Commands (intent -> validation -> event)
  open(id, owner, initialDeposit) {
    if (this.status) throw new Error('Account already open');
    if (initialDeposit < 0) throw new Error('Initial deposit must be positive');
    this._raise('AccountOpened', { id, owner, initialDeposit });
  }

  deposit(amount) {
    if (this.status !== 'active') throw new Error('Account is not active');
    if (amount <= 0) throw new Error('Deposit amount must be positive');
    this._raise('MoneyDeposited', { amount });
  }

  withdraw(amount) {
    if (this.status !== 'active') throw new Error('Account is not active');
    if (amount <= 0) throw new Error('Withdrawal amount must be positive');
    if (amount > this.balance) throw new Error('Insufficient funds');
    this._raise('MoneyWithdrawn', { amount });
  }

  close() {
    if (this.status === 'closed') throw new Error('Account already closed');
    this._raise('AccountClosed', { finalBalance: this.balance });
  }

  // Internal event application (pure state mutation)
  _apply(event) {
    switch (event.eventType) {
      case 'AccountOpened':
        this.id = event.payload.id;
        this.owner = event.payload.owner;
        this.balance = event.payload.initialDeposit;
        this.status = 'active';
        break;
      case 'MoneyDeposited':
        this.balance += event.payload.amount;
        break;
      case 'MoneyWithdrawn':
        this.balance -= event.payload.amount;
        break;
      case 'AccountClosed':
        this.status = 'closed';
        break;
    }
  }

  _raise(eventType, payload) {
    const event = { eventType, payload, occurredAt: new Date() };
    this._apply(event);
    this._uncommittedEvents.push(event);
  }

  flushUncommittedEvents() {
    const events = [...this._uncommittedEvents];
    this._uncommittedEvents = [];
    return events;
  }
}

module.exports = BankAccount;
```

## Account Service

```javascript
// accountService.js
const BankAccount = require('./BankAccount');

class AccountService {
  constructor(eventStore) {
    this.store = eventStore;
  }

  async openAccount(accountId, owner, initialDeposit, userId) {
    const account = new BankAccount();
    account.open(accountId, owner, initialDeposit);

    for (const event of account.flushUncommittedEvents()) {
      await this.store.append(
        accountId, 'BankAccount', event.eventType, event.payload,
        { userId }, 0  // expectedVersion = 0 (new aggregate)
      );
    }
    return account;
  }

  async deposit(accountId, amount, userId) {
    const events = await this.store.getEventsForAggregate(accountId);
    if (!events.length) throw new Error('Account not found');

    const account = BankAccount.reconstitute(events);
    account.deposit(amount);

    for (const event of account.flushUncommittedEvents()) {
      await this.store.append(
        accountId, 'BankAccount', event.eventType, event.payload,
        { userId }, account._version
      );
    }
    return account;
  }

  async getAccount(accountId) {
    const events = await this.store.getEventsForAggregate(accountId);
    if (!events.length) return null;
    return BankAccount.reconstitute(events);
  }

  // Time-travel: state at a specific point in time
  async getAccountAtTime(accountId, pointInTime) {
    const events = await this.store.collection
      .find({ aggregateId: accountId, occurredAt: { $lte: pointInTime } })
      .sort({ sequenceNumber: 1 })
      .toArray();
    if (!events.length) return null;
    return BankAccount.reconstitute(events);
  }
}

module.exports = AccountService;
```

## Read Model Projection with Change Streams

```javascript
// accountProjection.js
class AccountReadModelProjection {
  constructor(db, eventStore) {
    this.readModel = db.collection('accounts_read_model');
    this.eventStore = eventStore;
  }

  async project(event) {
    const { aggregateId, eventType, payload } = event;

    switch (eventType) {
      case 'AccountOpened':
        await this.readModel.insertOne({
          _id: aggregateId,
          owner: payload.owner,
          balance: payload.initialDeposit,
          status: 'active',
          openedAt: event.occurredAt,
          lastTransactionAt: event.occurredAt
        });
        break;

      case 'MoneyDeposited':
        await this.readModel.updateOne(
          { _id: aggregateId },
          {
            $inc: { balance: payload.amount },
            $set: { lastTransactionAt: event.occurredAt }
          }
        );
        break;

      case 'MoneyWithdrawn':
        await this.readModel.updateOne(
          { _id: aggregateId },
          {
            $inc: { balance: -payload.amount },
            $set: { lastTransactionAt: event.occurredAt }
          }
        );
        break;

      case 'AccountClosed':
        await this.readModel.updateOne(
          { _id: aggregateId },
          { $set: { status: 'closed', closedAt: event.occurredAt } }
        );
        break;
    }
  }

  async startListening() {
    const stream = this.eventStore.collection.watch(
      [{ $match: { 'fullDocument.aggregateType': 'BankAccount' } }],
      { fullDocument: 'updateLookup' }
    );
    stream.on('change', ({ operationType, fullDocument }) => {
      if (operationType === 'insert') this.project(fullDocument);
    });
    return stream;
  }
}
```

## Summary

Implementing event sourcing with MongoDB uses the `events` collection as an append-only log where each document records a domain event with a monotonically increasing `sequenceNumber` per aggregate. Aggregate state is reconstructed by replaying events through `_apply()` handlers, and optimistic concurrency is enforced via unique index on `(aggregateId, sequenceNumber)`. Change streams enable real-time read model projections that transform the normalized event log into denormalized query-optimized views, completing the CQRS pattern alongside event sourcing.

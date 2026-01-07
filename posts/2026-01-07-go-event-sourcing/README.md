# How to Implement Event Sourcing in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Event Sourcing, CQRS, Distributed Systems, Design Patterns

Description: Implement event sourcing in Go with event stores, projections, and CQRS patterns for building audit-friendly and scalable applications.

---

Event sourcing is a powerful architectural pattern that stores the state of your application as a sequence of events rather than just the current state. This approach provides a complete audit trail, enables temporal queries, and supports complex business requirements that traditional CRUD operations cannot handle efficiently.

In this comprehensive guide, we will implement event sourcing in Go from scratch, covering event stores, aggregate roots, projections, CQRS patterns, snapshots, and event versioning strategies.

## What is Event Sourcing?

Event sourcing is an architectural pattern where state changes are captured as a sequence of immutable events. Instead of storing just the current state of an entity, you store every change that has ever happened to it. The current state is derived by replaying these events.

### Key Benefits of Event Sourcing

1. **Complete Audit Trail**: Every change is recorded, providing full traceability
2. **Temporal Queries**: Query the state of your system at any point in time
3. **Event Replay**: Rebuild state or fix bugs by replaying events
4. **Debugging**: Understand exactly how the system reached its current state
5. **Scalability**: Naturally fits with CQRS for read/write optimization
6. **Domain-Driven Design**: Events capture business intent, not just data changes

## Core Concepts

Before diving into the implementation, let's understand the key components of an event-sourced system:

- **Event**: An immutable record of something that happened in the past
- **Event Store**: A persistence mechanism optimized for storing and retrieving events
- **Aggregate**: A cluster of domain objects treated as a single unit
- **Aggregate Root**: The entry point to an aggregate that ensures consistency
- **Projection**: A read-optimized view built by processing events
- **Command**: An intent to change the system state
- **CQRS**: Command Query Responsibility Segregation - separating reads from writes

## Defining Events

Let's start by defining the base event interface and some concrete events for a simple banking domain.

```go
package eventsourcing

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Event represents the base interface for all domain events.
// Every event must have an ID, aggregate ID, type, timestamp, and version.
type Event interface {
	EventID() string
	AggregateID() string
	EventType() string
	Timestamp() time.Time
	Version() int
	SetVersion(version int)
	Data() []byte
}

// BaseEvent provides common fields for all events.
// Embed this struct in your concrete event types.
type BaseEvent struct {
	ID          string    `json:"id"`
	AggrID      string    `json:"aggregate_id"`
	Type        string    `json:"type"`
	OccurredAt  time.Time `json:"occurred_at"`
	EventVer    int       `json:"version"`
	PayloadData []byte    `json:"data"`
}

func (e *BaseEvent) EventID() string       { return e.ID }
func (e *BaseEvent) AggregateID() string   { return e.AggrID }
func (e *BaseEvent) EventType() string     { return e.Type }
func (e *BaseEvent) Timestamp() time.Time  { return e.OccurredAt }
func (e *BaseEvent) Version() int          { return e.EventVer }
func (e *BaseEvent) SetVersion(v int)      { e.EventVer = v }
func (e *BaseEvent) Data() []byte          { return e.PayloadData }

// NewBaseEvent creates a new base event with generated ID and current timestamp.
func NewBaseEvent(aggregateID, eventType string, data interface{}) (*BaseEvent, error) {
	payload, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	return &BaseEvent{
		ID:          uuid.New().String(),
		AggrID:      aggregateID,
		Type:        eventType,
		OccurredAt:  time.Now().UTC(),
		PayloadData: payload,
	}, nil
}
```

Now let's define concrete events for our banking domain.

```go
package eventsourcing

// AccountCreatedData contains the payload for account creation events.
type AccountCreatedData struct {
	AccountID   string `json:"account_id"`
	OwnerName   string `json:"owner_name"`
	Email       string `json:"email"`
	AccountType string `json:"account_type"`
}

// MoneyDepositedData contains the payload for deposit events.
type MoneyDepositedData struct {
	AccountID     string  `json:"account_id"`
	Amount        float64 `json:"amount"`
	Currency      string  `json:"currency"`
	TransactionID string  `json:"transaction_id"`
	Description   string  `json:"description"`
}

// MoneyWithdrawnData contains the payload for withdrawal events.
type MoneyWithdrawnData struct {
	AccountID     string  `json:"account_id"`
	Amount        float64 `json:"amount"`
	Currency      string  `json:"currency"`
	TransactionID string  `json:"transaction_id"`
	Description   string  `json:"description"`
}

// AccountClosedData contains the payload for account closure events.
type AccountClosedData struct {
	AccountID string `json:"account_id"`
	Reason    string `json:"reason"`
	ClosedBy  string `json:"closed_by"`
}

// Event type constants for type-safe event handling.
const (
	EventTypeAccountCreated = "AccountCreated"
	EventTypeMoneyDeposited = "MoneyDeposited"
	EventTypeMoneyWithdrawn = "MoneyWithdrawn"
	EventTypeAccountClosed  = "AccountClosed"
)
```

## Implementing the Event Store

The event store is the heart of an event-sourced system. It must support appending events, loading events for an aggregate, and ensuring optimistic concurrency.

```go
package eventsourcing

import (
	"context"
	"errors"
	"sync"
)

// Common errors returned by the event store.
var (
	ErrConcurrencyConflict = errors.New("concurrency conflict: expected version mismatch")
	ErrAggregateNotFound   = errors.New("aggregate not found")
	ErrEventNotFound       = errors.New("event not found")
)

// EventStore defines the interface for event persistence.
// Implementations can use different storage backends like PostgreSQL, MongoDB, or EventStoreDB.
type EventStore interface {
	// AppendEvents stores new events for an aggregate with optimistic concurrency control.
	// expectedVersion should match the current version of the aggregate.
	AppendEvents(ctx context.Context, aggregateID string, events []Event, expectedVersion int) error

	// LoadEvents retrieves all events for a specific aggregate.
	LoadEvents(ctx context.Context, aggregateID string) ([]Event, error)

	// LoadEventsFromVersion retrieves events starting from a specific version.
	LoadEventsFromVersion(ctx context.Context, aggregateID string, fromVersion int) ([]Event, error)

	// LoadAllEvents retrieves all events across all aggregates (for projections).
	LoadAllEvents(ctx context.Context, fromPosition int64) ([]Event, error)
}

// InMemoryEventStore provides a simple in-memory implementation for testing and development.
// In production, use a durable store like PostgreSQL or EventStoreDB.
type InMemoryEventStore struct {
	mu       sync.RWMutex
	events   map[string][]Event // aggregateID -> events
	allEvents []Event           // global event stream for projections
}

// NewInMemoryEventStore creates a new in-memory event store.
func NewInMemoryEventStore() *InMemoryEventStore {
	return &InMemoryEventStore{
		events:    make(map[string][]Event),
		allEvents: make([]Event, 0),
	}
}

// AppendEvents appends events to the store with optimistic concurrency control.
// If the expected version doesn't match, a concurrency conflict error is returned.
func (s *InMemoryEventStore) AppendEvents(ctx context.Context, aggregateID string, events []Event, expectedVersion int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	existingEvents := s.events[aggregateID]
	currentVersion := len(existingEvents)

	// Optimistic concurrency check
	if currentVersion != expectedVersion {
		return ErrConcurrencyConflict
	}

	// Assign version numbers to new events
	for i, event := range events {
		event.SetVersion(currentVersion + i + 1)
		s.events[aggregateID] = append(s.events[aggregateID], event)
		s.allEvents = append(s.allEvents, event)
	}

	return nil
}

// LoadEvents returns all events for a given aggregate.
func (s *InMemoryEventStore) LoadEvents(ctx context.Context, aggregateID string) ([]Event, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	events, exists := s.events[aggregateID]
	if !exists {
		return nil, ErrAggregateNotFound
	}

	// Return a copy to prevent external modification
	result := make([]Event, len(events))
	copy(result, events)
	return result, nil
}

// LoadEventsFromVersion returns events starting from a specific version.
func (s *InMemoryEventStore) LoadEventsFromVersion(ctx context.Context, aggregateID string, fromVersion int) ([]Event, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	events, exists := s.events[aggregateID]
	if !exists {
		return nil, ErrAggregateNotFound
	}

	if fromVersion > len(events) {
		return []Event{}, nil
	}

	result := make([]Event, len(events)-fromVersion)
	copy(result, events[fromVersion:])
	return result, nil
}

// LoadAllEvents returns all events for building projections.
func (s *InMemoryEventStore) LoadAllEvents(ctx context.Context, fromPosition int64) ([]Event, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if fromPosition >= int64(len(s.allEvents)) {
		return []Event{}, nil
	}

	result := make([]Event, len(s.allEvents)-int(fromPosition))
	copy(result, s.allEvents[fromPosition:])
	return result, nil
}
```

## Aggregate Root Pattern

The aggregate root is responsible for enforcing business rules and emitting events. It maintains the current state by applying events.

```go
package eventsourcing

import (
	"encoding/json"
	"errors"
)

// Common aggregate errors.
var (
	ErrAccountClosed       = errors.New("account is closed")
	ErrInsufficientFunds   = errors.New("insufficient funds")
	ErrInvalidAmount       = errors.New("amount must be positive")
	ErrAccountAlreadyExists = errors.New("account already exists")
)

// AggregateRoot provides the base functionality for all aggregates.
// Embed this in your concrete aggregate types.
type AggregateRoot struct {
	id             string
	version        int
	uncommittedEvents []Event
}

// ID returns the aggregate identifier.
func (a *AggregateRoot) ID() string { return a.id }

// Version returns the current version of the aggregate.
func (a *AggregateRoot) Version() int { return a.version }

// UncommittedEvents returns events that haven't been persisted yet.
func (a *AggregateRoot) UncommittedEvents() []Event { return a.uncommittedEvents }

// ClearUncommittedEvents clears the list of uncommitted events after persistence.
func (a *AggregateRoot) ClearUncommittedEvents() { a.uncommittedEvents = nil }

// IncrementVersion increments the aggregate version.
func (a *AggregateRoot) IncrementVersion() { a.version++ }

// BankAccount represents a bank account aggregate.
// It encapsulates all business logic related to bank accounts.
type BankAccount struct {
	AggregateRoot
	ownerName   string
	email       string
	accountType string
	balance     float64
	currency    string
	isClosed    bool
}

// NewBankAccount creates a new bank account aggregate.
func NewBankAccount(id string) *BankAccount {
	return &BankAccount{
		AggregateRoot: AggregateRoot{id: id},
		currency:      "USD",
	}
}

// Create initializes a new bank account by emitting an AccountCreated event.
func (a *BankAccount) Create(ownerName, email, accountType string) error {
	if a.version > 0 {
		return ErrAccountAlreadyExists
	}

	data := AccountCreatedData{
		AccountID:   a.id,
		OwnerName:   ownerName,
		Email:       email,
		AccountType: accountType,
	}

	event, err := NewBaseEvent(a.id, EventTypeAccountCreated, data)
	if err != nil {
		return err
	}

	a.apply(event)
	a.uncommittedEvents = append(a.uncommittedEvents, event)
	return nil
}

// Deposit adds money to the account.
func (a *BankAccount) Deposit(amount float64, currency, transactionID, description string) error {
	if a.isClosed {
		return ErrAccountClosed
	}
	if amount <= 0 {
		return ErrInvalidAmount
	}

	data := MoneyDepositedData{
		AccountID:     a.id,
		Amount:        amount,
		Currency:      currency,
		TransactionID: transactionID,
		Description:   description,
	}

	event, err := NewBaseEvent(a.id, EventTypeMoneyDeposited, data)
	if err != nil {
		return err
	}

	a.apply(event)
	a.uncommittedEvents = append(a.uncommittedEvents, event)
	return nil
}

// Withdraw removes money from the account.
func (a *BankAccount) Withdraw(amount float64, currency, transactionID, description string) error {
	if a.isClosed {
		return ErrAccountClosed
	}
	if amount <= 0 {
		return ErrInvalidAmount
	}
	if a.balance < amount {
		return ErrInsufficientFunds
	}

	data := MoneyWithdrawnData{
		AccountID:     a.id,
		Amount:        amount,
		Currency:      currency,
		TransactionID: transactionID,
		Description:   description,
	}

	event, err := NewBaseEvent(a.id, EventTypeMoneyWithdrawn, data)
	if err != nil {
		return err
	}

	a.apply(event)
	a.uncommittedEvents = append(a.uncommittedEvents, event)
	return nil
}

// Close closes the bank account.
func (a *BankAccount) Close(reason, closedBy string) error {
	if a.isClosed {
		return ErrAccountClosed
	}

	data := AccountClosedData{
		AccountID: a.id,
		Reason:    reason,
		ClosedBy:  closedBy,
	}

	event, err := NewBaseEvent(a.id, EventTypeAccountClosed, data)
	if err != nil {
		return err
	}

	a.apply(event)
	a.uncommittedEvents = append(a.uncommittedEvents, event)
	return nil
}

// apply updates the aggregate state based on an event.
// This method is called both when handling commands and when rehydrating from events.
func (a *BankAccount) apply(event Event) {
	switch event.EventType() {
	case EventTypeAccountCreated:
		var data AccountCreatedData
		json.Unmarshal(event.Data(), &data)
		a.ownerName = data.OwnerName
		a.email = data.Email
		a.accountType = data.AccountType

	case EventTypeMoneyDeposited:
		var data MoneyDepositedData
		json.Unmarshal(event.Data(), &data)
		a.balance += data.Amount
		a.currency = data.Currency

	case EventTypeMoneyWithdrawn:
		var data MoneyWithdrawnData
		json.Unmarshal(event.Data(), &data)
		a.balance -= data.Amount

	case EventTypeAccountClosed:
		a.isClosed = true
	}

	a.version++
}

// LoadFromHistory reconstructs the aggregate state by replaying events.
func (a *BankAccount) LoadFromHistory(events []Event) {
	for _, event := range events {
		a.apply(event)
	}
}

// Balance returns the current account balance.
func (a *BankAccount) Balance() float64 { return a.balance }

// IsClosed returns whether the account is closed.
func (a *BankAccount) IsClosed() bool { return a.isClosed }
```

## Repository Pattern

The repository abstracts the event store and provides a clean interface for working with aggregates.

```go
package eventsourcing

import (
	"context"
)

// Repository provides methods for loading and saving aggregates.
type Repository interface {
	Load(ctx context.Context, aggregateID string) (*BankAccount, error)
	Save(ctx context.Context, aggregate *BankAccount) error
}

// BankAccountRepository handles persistence for bank account aggregates.
type BankAccountRepository struct {
	store         EventStore
	snapshotStore SnapshotStore
	snapshotFreq  int // Take snapshot every N events
}

// NewBankAccountRepository creates a new repository with optional snapshot support.
func NewBankAccountRepository(store EventStore, snapshotStore SnapshotStore, snapshotFreq int) *BankAccountRepository {
	return &BankAccountRepository{
		store:         store,
		snapshotStore: snapshotStore,
		snapshotFreq:  snapshotFreq,
	}
}

// Load retrieves an aggregate by replaying its events.
// If snapshots are enabled, it loads from the latest snapshot and replays only subsequent events.
func (r *BankAccountRepository) Load(ctx context.Context, aggregateID string) (*BankAccount, error) {
	account := NewBankAccount(aggregateID)
	fromVersion := 0

	// Try to load from snapshot first
	if r.snapshotStore != nil {
		snapshot, err := r.snapshotStore.Load(ctx, aggregateID)
		if err == nil && snapshot != nil {
			account.LoadFromSnapshot(snapshot)
			fromVersion = snapshot.Version
		}
	}

	// Load events from the snapshot version onwards
	var events []Event
	var err error

	if fromVersion > 0 {
		events, err = r.store.LoadEventsFromVersion(ctx, aggregateID, fromVersion)
	} else {
		events, err = r.store.LoadEvents(ctx, aggregateID)
	}

	if err != nil {
		return nil, err
	}

	account.LoadFromHistory(events)
	return account, nil
}

// Save persists new events from an aggregate to the event store.
// Optionally creates a snapshot if the snapshot frequency threshold is reached.
func (r *BankAccountRepository) Save(ctx context.Context, aggregate *BankAccount) error {
	events := aggregate.UncommittedEvents()
	if len(events) == 0 {
		return nil
	}

	expectedVersion := aggregate.Version() - len(events)

	err := r.store.AppendEvents(ctx, aggregate.ID(), events, expectedVersion)
	if err != nil {
		return err
	}

	aggregate.ClearUncommittedEvents()

	// Check if we should take a snapshot
	if r.snapshotStore != nil && r.snapshotFreq > 0 {
		if aggregate.Version()%r.snapshotFreq == 0 {
			snapshot := aggregate.CreateSnapshot()
			r.snapshotStore.Save(ctx, snapshot)
		}
	}

	return nil
}
```

## Snapshots for Performance

As aggregates accumulate many events, loading them becomes slow. Snapshots capture the aggregate state at a point in time, allowing faster loading.

```go
package eventsourcing

import (
	"context"
	"encoding/json"
	"sync"
	"time"
)

// Snapshot represents a point-in-time capture of aggregate state.
type Snapshot struct {
	AggregateID string    `json:"aggregate_id"`
	Version     int       `json:"version"`
	Data        []byte    `json:"data"`
	CreatedAt   time.Time `json:"created_at"`
}

// SnapshotStore defines the interface for snapshot persistence.
type SnapshotStore interface {
	Save(ctx context.Context, snapshot *Snapshot) error
	Load(ctx context.Context, aggregateID string) (*Snapshot, error)
}

// InMemorySnapshotStore provides in-memory snapshot storage.
type InMemorySnapshotStore struct {
	mu        sync.RWMutex
	snapshots map[string]*Snapshot
}

// NewInMemorySnapshotStore creates a new in-memory snapshot store.
func NewInMemorySnapshotStore() *InMemorySnapshotStore {
	return &InMemorySnapshotStore{
		snapshots: make(map[string]*Snapshot),
	}
}

// Save stores a snapshot for an aggregate.
func (s *InMemorySnapshotStore) Save(ctx context.Context, snapshot *Snapshot) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.snapshots[snapshot.AggregateID] = snapshot
	return nil
}

// Load retrieves the latest snapshot for an aggregate.
func (s *InMemorySnapshotStore) Load(ctx context.Context, aggregateID string) (*Snapshot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	snapshot, exists := s.snapshots[aggregateID]
	if !exists {
		return nil, nil
	}
	return snapshot, nil
}

// BankAccountSnapshotData represents the serialized state of a bank account.
type BankAccountSnapshotData struct {
	OwnerName   string  `json:"owner_name"`
	Email       string  `json:"email"`
	AccountType string  `json:"account_type"`
	Balance     float64 `json:"balance"`
	Currency    string  `json:"currency"`
	IsClosed    bool    `json:"is_closed"`
}

// CreateSnapshot creates a snapshot of the current aggregate state.
func (a *BankAccount) CreateSnapshot() *Snapshot {
	data := BankAccountSnapshotData{
		OwnerName:   a.ownerName,
		Email:       a.email,
		AccountType: a.accountType,
		Balance:     a.balance,
		Currency:    a.currency,
		IsClosed:    a.isClosed,
	}

	payload, _ := json.Marshal(data)

	return &Snapshot{
		AggregateID: a.id,
		Version:     a.version,
		Data:        payload,
		CreatedAt:   time.Now().UTC(),
	}
}

// LoadFromSnapshot restores aggregate state from a snapshot.
func (a *BankAccount) LoadFromSnapshot(snapshot *Snapshot) {
	var data BankAccountSnapshotData
	json.Unmarshal(snapshot.Data, &data)

	a.ownerName = data.OwnerName
	a.email = data.Email
	a.accountType = data.AccountType
	a.balance = data.Balance
	a.currency = data.Currency
	a.isClosed = data.IsClosed
	a.version = snapshot.Version
}
```

## Projections and Read Models

Projections build read-optimized views from events. They subscribe to the event stream and update their state accordingly.

```go
package eventsourcing

import (
	"context"
	"encoding/json"
	"sync"
)

// Projection defines the interface for event projections.
type Projection interface {
	Handle(event Event) error
	Reset() error
}

// AccountSummary represents a read model for account information.
type AccountSummary struct {
	AccountID   string  `json:"account_id"`
	OwnerName   string  `json:"owner_name"`
	Email       string  `json:"email"`
	AccountType string  `json:"account_type"`
	Balance     float64 `json:"balance"`
	Currency    string  `json:"currency"`
	IsClosed    bool    `json:"is_closed"`
	TxCount     int     `json:"transaction_count"`
}

// AccountSummaryProjection builds a denormalized view of accounts.
type AccountSummaryProjection struct {
	mu       sync.RWMutex
	accounts map[string]*AccountSummary
	position int64 // Last processed event position
}

// NewAccountSummaryProjection creates a new account summary projection.
func NewAccountSummaryProjection() *AccountSummaryProjection {
	return &AccountSummaryProjection{
		accounts: make(map[string]*AccountSummary),
	}
}

// Handle processes an event and updates the projection.
func (p *AccountSummaryProjection) Handle(event Event) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	aggregateID := event.AggregateID()

	switch event.EventType() {
	case EventTypeAccountCreated:
		var data AccountCreatedData
		if err := json.Unmarshal(event.Data(), &data); err != nil {
			return err
		}
		p.accounts[aggregateID] = &AccountSummary{
			AccountID:   aggregateID,
			OwnerName:   data.OwnerName,
			Email:       data.Email,
			AccountType: data.AccountType,
			Currency:    "USD",
		}

	case EventTypeMoneyDeposited:
		var data MoneyDepositedData
		if err := json.Unmarshal(event.Data(), &data); err != nil {
			return err
		}
		if account, exists := p.accounts[aggregateID]; exists {
			account.Balance += data.Amount
			account.Currency = data.Currency
			account.TxCount++
		}

	case EventTypeMoneyWithdrawn:
		var data MoneyWithdrawnData
		if err := json.Unmarshal(event.Data(), &data); err != nil {
			return err
		}
		if account, exists := p.accounts[aggregateID]; exists {
			account.Balance -= data.Amount
			account.TxCount++
		}

	case EventTypeAccountClosed:
		if account, exists := p.accounts[aggregateID]; exists {
			account.IsClosed = true
		}
	}

	return nil
}

// Reset clears the projection state for rebuilding.
func (p *AccountSummaryProjection) Reset() error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.accounts = make(map[string]*AccountSummary)
	p.position = 0
	return nil
}

// GetAccount retrieves an account summary by ID.
func (p *AccountSummaryProjection) GetAccount(accountID string) (*AccountSummary, bool) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	account, exists := p.accounts[accountID]
	return account, exists
}

// GetAllAccounts returns all account summaries.
func (p *AccountSummaryProjection) GetAllAccounts() []*AccountSummary {
	p.mu.RLock()
	defer p.mu.RUnlock()
	result := make([]*AccountSummary, 0, len(p.accounts))
	for _, account := range p.accounts {
		result = append(result, account)
	}
	return result
}

// ProjectionRunner manages projection lifecycle and event subscription.
type ProjectionRunner struct {
	store       EventStore
	projections []Projection
	position    int64
}

// NewProjectionRunner creates a new projection runner.
func NewProjectionRunner(store EventStore, projections ...Projection) *ProjectionRunner {
	return &ProjectionRunner{
		store:       store,
		projections: projections,
	}
}

// CatchUp processes all events from the beginning to build projections.
func (r *ProjectionRunner) CatchUp(ctx context.Context) error {
	events, err := r.store.LoadAllEvents(ctx, r.position)
	if err != nil {
		return err
	}

	for _, event := range events {
		for _, projection := range r.projections {
			if err := projection.Handle(event); err != nil {
				return err
			}
		}
		r.position++
	}

	return nil
}

// RebuildProjections resets and rebuilds all projections from scratch.
func (r *ProjectionRunner) RebuildProjections(ctx context.Context) error {
	for _, projection := range r.projections {
		if err := projection.Reset(); err != nil {
			return err
		}
	}
	r.position = 0
	return r.CatchUp(ctx)
}
```

## CQRS: Command Query Responsibility Segregation

CQRS separates the read and write sides of your application. Commands modify state through aggregates, while queries use projections.

```go
package eventsourcing

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

// Command represents an intent to change the system state.
type Command interface {
	Validate() error
}

// CreateAccountCommand represents the intent to create a new account.
type CreateAccountCommand struct {
	AccountID   string
	OwnerName   string
	Email       string
	AccountType string
}

// Validate ensures the command has all required fields.
func (c *CreateAccountCommand) Validate() error {
	if c.OwnerName == "" {
		return errors.New("owner name is required")
	}
	if c.Email == "" {
		return errors.New("email is required")
	}
	if c.AccountType == "" {
		return errors.New("account type is required")
	}
	return nil
}

// DepositMoneyCommand represents the intent to deposit money.
type DepositMoneyCommand struct {
	AccountID   string
	Amount      float64
	Currency    string
	Description string
}

// Validate ensures the command has valid values.
func (c *DepositMoneyCommand) Validate() error {
	if c.AccountID == "" {
		return errors.New("account ID is required")
	}
	if c.Amount <= 0 {
		return errors.New("amount must be positive")
	}
	return nil
}

// WithdrawMoneyCommand represents the intent to withdraw money.
type WithdrawMoneyCommand struct {
	AccountID   string
	Amount      float64
	Currency    string
	Description string
}

// Validate ensures the command has valid values.
func (c *WithdrawMoneyCommand) Validate() error {
	if c.AccountID == "" {
		return errors.New("account ID is required")
	}
	if c.Amount <= 0 {
		return errors.New("amount must be positive")
	}
	return nil
}

// CommandHandler processes commands and coordinates with the repository.
type CommandHandler struct {
	repo *BankAccountRepository
}

// NewCommandHandler creates a new command handler.
func NewCommandHandler(repo *BankAccountRepository) *CommandHandler {
	return &CommandHandler{repo: repo}
}

// HandleCreateAccount processes an account creation command.
func (h *CommandHandler) HandleCreateAccount(ctx context.Context, cmd *CreateAccountCommand) (string, error) {
	if err := cmd.Validate(); err != nil {
		return "", err
	}

	// Generate ID if not provided
	if cmd.AccountID == "" {
		cmd.AccountID = uuid.New().String()
	}

	account := NewBankAccount(cmd.AccountID)

	if err := account.Create(cmd.OwnerName, cmd.Email, cmd.AccountType); err != nil {
		return "", err
	}

	if err := h.repo.Save(ctx, account); err != nil {
		return "", err
	}

	return cmd.AccountID, nil
}

// HandleDeposit processes a deposit command.
func (h *CommandHandler) HandleDeposit(ctx context.Context, cmd *DepositMoneyCommand) error {
	if err := cmd.Validate(); err != nil {
		return err
	}

	account, err := h.repo.Load(ctx, cmd.AccountID)
	if err != nil {
		return err
	}

	transactionID := uuid.New().String()
	if err := account.Deposit(cmd.Amount, cmd.Currency, transactionID, cmd.Description); err != nil {
		return err
	}

	return h.repo.Save(ctx, account)
}

// HandleWithdraw processes a withdrawal command.
func (h *CommandHandler) HandleWithdraw(ctx context.Context, cmd *WithdrawMoneyCommand) error {
	if err := cmd.Validate(); err != nil {
		return err
	}

	account, err := h.repo.Load(ctx, cmd.AccountID)
	if err != nil {
		return err
	}

	transactionID := uuid.New().String()
	if err := account.Withdraw(cmd.Amount, cmd.Currency, transactionID, cmd.Description); err != nil {
		return err
	}

	return h.repo.Save(ctx, account)
}

// QueryHandler provides read operations using projections.
type QueryHandler struct {
	accountProjection *AccountSummaryProjection
}

// NewQueryHandler creates a new query handler.
func NewQueryHandler(projection *AccountSummaryProjection) *QueryHandler {
	return &QueryHandler{accountProjection: projection}
}

// GetAccountSummary retrieves account information from the projection.
func (h *QueryHandler) GetAccountSummary(accountID string) (*AccountSummary, error) {
	account, exists := h.accountProjection.GetAccount(accountID)
	if !exists {
		return nil, ErrAggregateNotFound
	}
	return account, nil
}

// ListAllAccounts returns all accounts from the projection.
func (h *QueryHandler) ListAllAccounts() []*AccountSummary {
	return h.accountProjection.GetAllAccounts()
}
```

## Event Versioning and Migration

As your system evolves, event schemas change. Here's how to handle event versioning and migration.

```go
package eventsourcing

import (
	"encoding/json"
	"errors"
)

// EventUpgrader defines the interface for upgrading events to newer versions.
type EventUpgrader interface {
	CanUpgrade(eventType string, version int) bool
	Upgrade(event Event) (Event, error)
}

// MoneyDepositedV1Data represents the original deposit event schema.
type MoneyDepositedV1Data struct {
	AccountID string  `json:"account_id"`
	Amount    float64 `json:"amount"`
	// Note: Currency was not in V1
}

// MoneyDepositedV2Data represents the updated deposit event with currency.
type MoneyDepositedV2Data struct {
	AccountID     string  `json:"account_id"`
	Amount        float64 `json:"amount"`
	Currency      string  `json:"currency"`
	TransactionID string  `json:"transaction_id"`
	Description   string  `json:"description"`
}

// EventMigrator handles migration of events between versions.
type EventMigrator struct {
	upgraders map[string][]EventUpgraderFunc
}

// EventUpgraderFunc is a function that upgrades an event payload.
type EventUpgraderFunc func(data []byte) ([]byte, error)

// NewEventMigrator creates a new event migrator.
func NewEventMigrator() *EventMigrator {
	m := &EventMigrator{
		upgraders: make(map[string][]EventUpgraderFunc),
	}
	m.registerUpgraders()
	return m
}

// registerUpgraders sets up all known event upgraders.
func (m *EventMigrator) registerUpgraders() {
	// Upgrade MoneyDeposited from V1 to V2
	m.upgraders[EventTypeMoneyDeposited] = []EventUpgraderFunc{
		func(data []byte) ([]byte, error) {
			var v1 MoneyDepositedV1Data
			if err := json.Unmarshal(data, &v1); err != nil {
				return nil, err
			}

			// Check if already V2 by looking for currency field
			var check map[string]interface{}
			json.Unmarshal(data, &check)
			if _, hasCurrency := check["currency"]; hasCurrency {
				return data, nil // Already V2
			}

			// Upgrade to V2 with default currency
			v2 := MoneyDepositedV2Data{
				AccountID:     v1.AccountID,
				Amount:        v1.Amount,
				Currency:      "USD", // Default for legacy events
				TransactionID: "",    // Not available in V1
				Description:   "",    // Not available in V1
			}

			return json.Marshal(v2)
		},
	}
}

// Migrate applies all necessary migrations to an event.
func (m *EventMigrator) Migrate(event Event) (Event, error) {
	upgraders, exists := m.upgraders[event.EventType()]
	if !exists {
		return event, nil
	}

	data := event.Data()
	for _, upgrader := range upgraders {
		newData, err := upgrader(data)
		if err != nil {
			return nil, err
		}
		data = newData
	}

	// Create a new event with migrated data
	baseEvent := event.(*BaseEvent)
	return &BaseEvent{
		ID:          baseEvent.ID,
		AggrID:      baseEvent.AggrID,
		Type:        baseEvent.Type,
		OccurredAt:  baseEvent.OccurredAt,
		EventVer:    baseEvent.EventVer,
		PayloadData: data,
	}, nil
}

// EventRegistry provides a central place for event type registration.
type EventRegistry struct {
	types    map[string]func() interface{}
	migrator *EventMigrator
}

// NewEventRegistry creates a new event registry.
func NewEventRegistry() *EventRegistry {
	return &EventRegistry{
		types:    make(map[string]func() interface{}),
		migrator: NewEventMigrator(),
	}
}

// Register adds an event type to the registry.
func (r *EventRegistry) Register(eventType string, factory func() interface{}) {
	r.types[eventType] = factory
}

// Deserialize converts raw event data to the appropriate typed struct.
func (r *EventRegistry) Deserialize(eventType string, data []byte) (interface{}, error) {
	factory, exists := r.types[eventType]
	if !exists {
		return nil, errors.New("unknown event type: " + eventType)
	}

	instance := factory()
	if err := json.Unmarshal(data, instance); err != nil {
		return nil, err
	}

	return instance, nil
}
```

## Putting It All Together

Here's how to use all the components together in an application.

```go
package main

import (
	"context"
	"fmt"
	"log"

	es "yourproject/eventsourcing"
)

func main() {
	ctx := context.Background()

	// Initialize stores
	eventStore := es.NewInMemoryEventStore()
	snapshotStore := es.NewInMemorySnapshotStore()

	// Create repository with snapshot support (snapshot every 10 events)
	repo := es.NewBankAccountRepository(eventStore, snapshotStore, 10)

	// Initialize projections
	accountProjection := es.NewAccountSummaryProjection()
	projectionRunner := es.NewProjectionRunner(eventStore, accountProjection)

	// Create command and query handlers
	commandHandler := es.NewCommandHandler(repo)
	queryHandler := es.NewQueryHandler(accountProjection)

	// Create a new account
	accountID, err := commandHandler.HandleCreateAccount(ctx, &es.CreateAccountCommand{
		OwnerName:   "John Doe",
		Email:       "john@example.com",
		AccountType: "checking",
	})
	if err != nil {
		log.Fatalf("Failed to create account: %v", err)
	}
	fmt.Printf("Created account: %s\n", accountID)

	// Deposit money
	err = commandHandler.HandleDeposit(ctx, &es.DepositMoneyCommand{
		AccountID:   accountID,
		Amount:      1000.00,
		Currency:    "USD",
		Description: "Initial deposit",
	})
	if err != nil {
		log.Fatalf("Failed to deposit: %v", err)
	}

	// Withdraw money
	err = commandHandler.HandleWithdraw(ctx, &es.WithdrawMoneyCommand{
		AccountID:   accountID,
		Amount:      250.00,
		Currency:    "USD",
		Description: "ATM withdrawal",
	})
	if err != nil {
		log.Fatalf("Failed to withdraw: %v", err)
	}

	// Update projections
	if err := projectionRunner.CatchUp(ctx); err != nil {
		log.Fatalf("Failed to update projections: %v", err)
	}

	// Query account summary
	summary, err := queryHandler.GetAccountSummary(accountID)
	if err != nil {
		log.Fatalf("Failed to get summary: %v", err)
	}

	fmt.Printf("Account Summary:\n")
	fmt.Printf("  Owner: %s\n", summary.OwnerName)
	fmt.Printf("  Balance: %.2f %s\n", summary.Balance, summary.Currency)
	fmt.Printf("  Transactions: %d\n", summary.TxCount)
}
```

## Best Practices

When implementing event sourcing in production, keep these best practices in mind:

### 1. Event Design
- Events should be immutable and represent past tense actions
- Include all necessary context in the event payload
- Use meaningful event names that reflect business actions
- Keep events small and focused

### 2. Aggregate Design
- Aggregates should be small and focused on a single consistency boundary
- Never expose internal state directly; use methods that emit events
- Validate commands before emitting events
- Apply events to update state, not business logic

### 3. Event Store Considerations
- Use a dedicated event store like EventStoreDB for production
- Implement proper indexing for efficient aggregate loading
- Consider event archival strategies for old events
- Implement event store backups and disaster recovery

### 4. Projection Management
- Design projections for specific query needs
- Implement idempotent event handlers
- Plan for projection rebuilds from scratch
- Monitor projection lag in real-time systems

### 5. Performance Optimization
- Use snapshots for aggregates with many events
- Implement event caching where appropriate
- Consider async projection updates for high-throughput systems
- Batch event storage operations when possible

## Conclusion

Event sourcing provides a robust foundation for building applications that require complete audit trails, temporal queries, and complex domain logic. When combined with CQRS, it enables independent scaling of read and write operations while maintaining a clean separation of concerns.

The implementation we've built covers the essential components: events, event stores, aggregates, projections, snapshots, and CQRS patterns. While we used in-memory stores for simplicity, the interfaces are designed to be easily adapted to production-grade storage solutions like PostgreSQL, MongoDB, or EventStoreDB.

Remember that event sourcing adds complexity to your system. Evaluate whether the benefits of full audit trails, event replay, and temporal queries justify the additional architectural overhead for your specific use case. For many applications dealing with financial transactions, compliance requirements, or complex business workflows, event sourcing proves invaluable.

Start with the patterns shown here, adapt them to your domain, and gradually add sophistication as your needs grow. The key is to keep events immutable, aggregates focused, and projections optimized for their specific query patterns.

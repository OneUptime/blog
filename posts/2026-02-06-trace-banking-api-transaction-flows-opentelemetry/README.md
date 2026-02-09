# How to Trace Banking API Transaction Flows (Account Lookup, Balance Check, Transfer, Confirmation) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Banking API, Distributed Tracing, Transaction Flows

Description: A practical guide to tracing the full lifecycle of banking API transactions using OpenTelemetry spans and context propagation.

Banking transactions are inherently multi-step processes. A simple fund transfer involves looking up accounts, verifying balances, executing the transfer, and sending confirmations. When any of these steps fail or slow down, you need to understand exactly where the problem is. OpenTelemetry distributed tracing gives you that visibility across every service in the chain.

## The Transaction Flow

A typical banking transfer API processes requests through four distinct phases:

1. **Account Lookup** - Validate sender and receiver accounts
2. **Balance Check** - Verify sufficient funds and holds
3. **Transfer Execution** - Debit sender, credit receiver
4. **Confirmation** - Generate receipt and send notifications

Each phase may involve different microservices, databases, and external systems. Let's trace them all.

## Setting Up the Tracer

We will use Python with the OpenTelemetry SDK. Start by configuring the tracer provider.

```python
# tracing_config.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

def configure_tracing():
    resource = Resource.create({
        "service.name": "banking-transfer-service",
        "service.version": "2.4.1",
        "deployment.environment": "production",
        "financial.institution.id": "BANK001"
    })

    provider = TracerProvider(resource=resource)

    # Export to your OpenTelemetry collector
    exporter = OTLPSpanExporter(endpoint="otel-collector:4317")
    provider.add_span_processor(BatchSpanProcessor(exporter))

    trace.set_tracer_provider(provider)
    return trace.get_tracer("banking.transfer")
```

## Tracing the Account Lookup

The account lookup step validates both the sender and receiver accounts. We create child spans for each lookup so we can measure them independently.

```python
# account_service.py
from opentelemetry import trace

tracer = trace.get_tracer("banking.transfer")

def lookup_accounts(sender_id: str, receiver_id: str):
    with tracer.start_as_current_span("account.lookup.batch") as span:
        span.set_attribute("transfer.sender_id", sender_id)
        span.set_attribute("transfer.receiver_id", receiver_id)

        # Look up sender account
        with tracer.start_as_current_span("account.lookup.sender") as sender_span:
            sender = account_repo.find_by_id(sender_id)
            if sender is None:
                sender_span.set_status(trace.StatusCode.ERROR, "Sender account not found")
                sender_span.set_attribute("account.found", False)
                raise AccountNotFoundError(sender_id)
            sender_span.set_attribute("account.found", True)
            sender_span.set_attribute("account.type", sender.account_type)
            sender_span.set_attribute("account.currency", sender.currency)

        # Look up receiver account
        with tracer.start_as_current_span("account.lookup.receiver") as recv_span:
            receiver = account_repo.find_by_id(receiver_id)
            if receiver is None:
                recv_span.set_status(trace.StatusCode.ERROR, "Receiver account not found")
                recv_span.set_attribute("account.found", False)
                raise AccountNotFoundError(receiver_id)
            recv_span.set_attribute("account.found", True)
            recv_span.set_attribute("account.type", receiver.account_type)

        return sender, receiver
```

## Tracing the Balance Check

Balance checks need to account for pending holds and available balance. This is a critical step where race conditions can occur, so tracing it helps identify contention issues.

```python
# balance_service.py
def check_balance(account, amount: Decimal, currency: str):
    with tracer.start_as_current_span("balance.check") as span:
        span.set_attribute("balance.requested_amount", float(amount))
        span.set_attribute("balance.currency", currency)

        # Get current balance with any pending holds
        with tracer.start_as_current_span("balance.fetch_available"):
            available = balance_repo.get_available_balance(account.id)
            span.set_attribute("balance.available", float(available))

        # Check for pending holds that reduce available balance
        with tracer.start_as_current_span("balance.fetch_holds") as hold_span:
            holds = hold_repo.get_active_holds(account.id)
            total_holds = sum(h.amount for h in holds)
            hold_span.set_attribute("balance.hold_count", len(holds))
            hold_span.set_attribute("balance.total_holds", float(total_holds))

        effective_balance = available - total_holds
        span.set_attribute("balance.effective", float(effective_balance))

        if effective_balance < amount:
            span.set_status(trace.StatusCode.ERROR, "Insufficient funds")
            span.set_attribute("balance.sufficient", False)
            raise InsufficientFundsError(account.id, amount, effective_balance)

        span.set_attribute("balance.sufficient", True)
        return effective_balance
```

## Tracing the Transfer Execution

The actual transfer is a two-phase operation. We debit the sender and credit the receiver within a database transaction. This is where things can go wrong, and having detailed traces is essential for debugging production issues.

```python
# transfer_service.py
def execute_transfer(sender, receiver, amount: Decimal, reference: str):
    with tracer.start_as_current_span("transfer.execute") as span:
        span.set_attribute("transfer.reference", reference)
        span.set_attribute("transfer.amount", float(amount))

        # Create a hold first to prevent double-spending
        with tracer.start_as_current_span("transfer.create_hold") as hold_span:
            hold = hold_repo.create(sender.id, amount, reference)
            hold_span.set_attribute("transfer.hold_id", hold.id)

        try:
            # Debit sender within a DB transaction
            with tracer.start_as_current_span("transfer.debit") as debit_span:
                debit_result = ledger.debit(sender.id, amount, reference)
                debit_span.set_attribute("ledger.entry_id", debit_result.entry_id)
                debit_span.set_attribute("ledger.new_balance", float(debit_result.new_balance))

            # Credit receiver
            with tracer.start_as_current_span("transfer.credit") as credit_span:
                credit_result = ledger.credit(receiver.id, amount, reference)
                credit_span.set_attribute("ledger.entry_id", credit_result.entry_id)
                credit_span.set_attribute("ledger.new_balance", float(credit_result.new_balance))

            # Release the hold
            with tracer.start_as_current_span("transfer.release_hold"):
                hold_repo.release(hold.id)

            span.set_attribute("transfer.status", "completed")

        except Exception as e:
            span.set_status(trace.StatusCode.ERROR, str(e))
            span.record_exception(e)
            # Rollback: reverse the debit if credit failed
            with tracer.start_as_current_span("transfer.rollback"):
                ledger.reverse(sender.id, amount, reference)
                hold_repo.release(hold.id)
            raise
```

## Tracing the Confirmation Step

After the transfer completes, we generate a receipt and send notifications. These are typically asynchronous, so we propagate the trace context into the message queue.

```python
# confirmation_service.py
from opentelemetry.propagate import inject

def send_confirmation(transfer_result, sender, receiver):
    with tracer.start_as_current_span("confirmation.process") as span:
        span.set_attribute("confirmation.reference", transfer_result.reference)

        # Generate the transaction receipt
        with tracer.start_as_current_span("confirmation.generate_receipt"):
            receipt = receipt_generator.create(transfer_result)
            span.set_attribute("confirmation.receipt_id", receipt.id)

        # Send notification to sender - propagate trace context
        with tracer.start_as_current_span("confirmation.notify_sender"):
            headers = {}
            inject(headers)  # Inject trace context into message headers
            message_queue.publish("notifications", {
                "type": "transfer_sent",
                "account_id": sender.id,
                "receipt_id": receipt.id,
                "headers": headers  # Trace context travels with the message
            })

        # Send notification to receiver
        with tracer.start_as_current_span("confirmation.notify_receiver"):
            headers = {}
            inject(headers)
            message_queue.publish("notifications", {
                "type": "transfer_received",
                "account_id": receiver.id,
                "receipt_id": receipt.id,
                "headers": headers
            })
```

## Tying It All Together

The main transfer endpoint orchestrates all four phases under a single root span.

```python
# transfer_api.py
@app.post("/api/v1/transfers")
def create_transfer(request: TransferRequest):
    with tracer.start_as_current_span("transfer.full_flow") as root_span:
        root_span.set_attribute("transfer.type", "domestic")
        root_span.set_attribute("transfer.channel", "api")

        sender, receiver = lookup_accounts(request.sender_id, request.receiver_id)
        check_balance(sender, request.amount, request.currency)
        result = execute_transfer(sender, receiver, request.amount, generate_reference())
        send_confirmation(result, sender, receiver)

        root_span.set_attribute("transfer.completed", True)
        return {"status": "completed", "reference": result.reference}
```

## What You Get From This

With all four phases traced, you can now see in your trace viewer exactly how long each step takes for every transaction. You can filter by failed transfers to see which step caused the failure. You can spot slow account lookups that point to database indexing problems, or slow balance checks that indicate lock contention during peak hours. The trace context propagation into your message queue means you can follow the confirmation all the way to the notification delivery, giving you end-to-end visibility across the entire transaction lifecycle.

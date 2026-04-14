# How to Use Dapr for Financial Services Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Financial Services, Microservice, Security, Compliance

Description: Build financial services microservices with Dapr for payment processing, fraud detection, and account management with the reliability and security required in banking.

---

Financial services demand the highest standards of reliability, security, and auditability. Dapr's building blocks address these requirements directly: mTLS for encrypted communication, state store transactions for atomic fund transfers, workflow for multi-step payment orchestration, and distributed tracing for audit trails. This guide shows how Dapr maps to financial services requirements.

## Financial Services Architecture with Dapr

A typical fintech microservices platform includes:

```text
API Gateway -> Payment Service (Dapr) -> Account Service (Dapr)
                                      -> Fraud Detection (Dapr)
                                      -> Notification Service (Dapr)
                                      -> Audit Log Service (Dapr)
```

Each service runs with a Dapr sidecar that handles mTLS, retries, and observability.

## Payment Processing Workflow

Use Dapr Workflow for multi-step payment orchestration with compensation:

```python
# payment_service/workflows/payment_workflow.py
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext, WorkflowActivityContext
from dapr.clients import DaprClient
from decimal import Decimal
import json

wfr = WorkflowRuntime()

@wfr.activity(name='validate_account')
def validate_account(ctx: WorkflowActivityContext, payment: dict) -> dict:
    """Verify source account has sufficient funds"""
    with DaprClient() as client:
        account = json.loads(
            client.get_state("account-statestore",
                             f"account:{payment['from_account']}").data
        )
        if Decimal(str(account['balance'])) < Decimal(str(payment['amount'])):
            return {"valid": False, "reason": "insufficient_funds"}
        return {"valid": True, "balance": account['balance']}

@wfr.activity(name='fraud_check')
def fraud_check(ctx: WorkflowActivityContext, payment: dict) -> dict:
    """Call fraud detection service"""
    with DaprClient() as client:
        result = client.invoke_method(
            app_id="fraud-detection-service",
            method_name="check",
            http_verb="POST",
            data=json.dumps(payment).encode()
        )
        return json.loads(result.data)

@wfr.activity(name='debit_account')
def debit_account(ctx: WorkflowActivityContext, payment: dict) -> dict:
    """Atomically debit source account"""
    with DaprClient() as client:
        # Use state transaction for atomicity
        account_state = client.get_state(
            "account-statestore", f"account:{payment['from_account']}")
        account = json.loads(account_state.data)
        account['balance'] = str(
            Decimal(account['balance']) - Decimal(str(payment['amount'])))
        account['version'] = account.get('version', 0) + 1

        client.save_state(
            "account-statestore",
            f"account:{payment['from_account']}",
            json.dumps(account),
            etag=account_state.etag
        )
        return {"debited": True, "new_balance": account['balance']}

@wfr.activity(name='credit_account')
def credit_account(ctx: WorkflowActivityContext, payment: dict) -> dict:
    """Credit destination account"""
    with DaprClient() as client:
        account_state = client.get_state(
            "account-statestore", f"account:{payment['to_account']}")
        account = json.loads(account_state.data or '{"balance": "0"}')
        account['balance'] = str(
            Decimal(account.get('balance', '0')) + Decimal(str(payment['amount'])))

        client.save_state("account-statestore",
                          f"account:{payment['to_account']}", json.dumps(account))
        return {"credited": True}

@wfr.workflow(name='payment_workflow')
def payment_workflow(ctx: DaprWorkflowContext, payment: dict):
    # Step 1: Validate
    validation = yield ctx.call_activity(validate_account, input=payment)
    if not validation['valid']:
        return {"status": "failed", "reason": validation['reason']}

    # Step 2: Fraud check
    fraud = yield ctx.call_activity(fraud_check, input=payment)
    if fraud.get('suspicious'):
        return {"status": "blocked", "reason": "fraud_detected"}

    # Step 3: Debit (with compensation on failure)
    debit = yield ctx.call_activity(debit_account, input=payment)

    # Step 4: Credit (compensate debit if credit fails)
    try:
        credit = yield ctx.call_activity(credit_account, input=payment)
    except Exception:
        # Reverse the debit
        yield ctx.call_activity(reverse_debit, input=payment)
        return {"status": "failed", "reason": "credit_failed"}

    # Publish audit event
    yield ctx.call_activity(publish_audit_event, input={
        "type": "payment_completed",
        "payment": payment
    })

    return {"status": "completed", "transaction_id": payment.get("id")}
```

## Immutable Audit Trail via Pub/Sub

All financial events flow to an append-only audit log:

```python
# audit_service/audit.py
@app.route('/events/financial-event', methods=['POST'])
def handle_financial_event():
    event = request.json.get('data', {})

    audit_record = {
        'id': str(uuid.uuid4()),
        'event_type': event.get('type'),
        'timestamp': datetime.utcnow().isoformat(),
        'actor': event.get('actor'),
        'data': event,
        'correlation_id': request.headers.get('X-Correlation-ID')
    }

    with DaprClient() as client:
        # Append to audit log (use append-only store in production)
        client.save_state("audit-statestore",
                          f"audit:{audit_record['id']}", json.dumps(audit_record))

        # Write to append-only binding (e.g., AWS Kinesis or Azure Event Hub)
        client.invoke_binding(
            binding_name="audit-stream",
            operation="create",
            data=json.dumps(audit_record).encode()
        )

    return jsonify({'status': 'SUCCESS'})
```

## Compliance Configuration

Configure strict mTLS and access control for PCI-DSS compliance:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: payment-service-config
spec:
  mtls:
    enabled: true
    workloadCertTTL: 4h
  accessControl:
    defaultAction: deny
    policies:
      - appId: api-gateway
        defaultAction: allow
      - appId: audit-service
        operations:
          - name: /events/*
            httpVerb: [POST]
            action: allow
```

## Summary

Dapr enables financial services microservices to meet reliability and compliance requirements through mTLS for encrypted communication, Workflow for atomic payment orchestration with compensation, ETag-based optimistic locking for balance updates, and pub/sub audit trails. These building blocks map directly to financial regulations requiring data integrity and auditability.

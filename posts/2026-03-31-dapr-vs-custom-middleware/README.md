# How to Decide Between Dapr and Custom Middleware

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Middleware, Architecture, Decision, Microservice

Description: A practical framework for deciding between Dapr's building blocks and custom middleware for distributed systems concerns in microservice architectures.

---

One of the most common architectural questions when evaluating Dapr is: "Should I use Dapr for this, or build it myself?" The answer depends on what you are building, your team's capabilities, and your long-term portability goals.

## What Dapr Offers vs Custom Middleware

Dapr provides ready-made building blocks:
- State management (CRUD, transactions, ETags)
- Pub/sub (at-least-once delivery, dead letters)
- Service invocation (retry, tracing, mTLS)
- Bindings (input/output to external systems)
- Actors, workflows, secrets, configuration

Custom middleware is code you write and maintain:
- Tailored exactly to your requirements
- No external dependency on the Dapr ecosystem
- Can be optimized for your specific performance profile
- Full control over behavior and evolution

## Decision Framework

### Use Dapr When:

**1. The pattern is generic** - If you need pub/sub and your requirements are standard (send messages, at-least-once delivery, retry on failure), Dapr handles this across 10+ brokers with one YAML file change.

**2. Infrastructure portability matters** - Dapr lets you swap Redis for PostgreSQL for CosmosDB without changing application code:

```yaml
# Development
spec:
  type: state.redis

# Production
spec:
  type: state.postgresql
```

**3. Polyglot teams** - Your Python, Go, and Java services all need the same pattern. Dapr provides a consistent API across all languages.

**4. You want to avoid NIH syndrome** - Distributed systems primitives (retries, circuit breakers, distributed tracing) are hard to implement correctly. Dapr gets this right.

### Build Custom Middleware When:

**1. Highly specific requirements** - If your state management needs complex query patterns that go beyond key-value, you might need a custom layer around a database.

**2. Performance is critical** - Dapr adds network hops (localhost HTTP/gRPC). If you need microsecond-latency state access, a direct database driver may be faster.

**3. Vendor lock-in is acceptable** - If you are deeply invested in AWS and happy with DynamoDB, writing directly against the AWS SDK may be simpler than configuring Dapr's DynamoDB component.

**4. Simple use cases** - If you only need to call one service from another and have no plan to change, adding Dapr for just that is over-engineering.

## A Practical Example

Suppose you need to cache session data. Options:

**Custom middleware:**
```python
import redis
r = redis.Redis(host='redis', port=6379)
r.setex(f"session:{user_id}", 3600, json.dumps(session))
```

**Dapr state store:**
```python
with DaprClient() as d:
    d.save_state('statestore', f'session-{user_id}', json.dumps(session),
                 state_metadata={"ttlInSeconds": "3600"})
```

If you might swap Redis for Memcached or a managed cache service, Dapr wins. If Redis is permanent, custom may be simpler.

## Hybrid Approach

Many teams use Dapr for some concerns and custom code for others:

- Use Dapr for pub/sub (portable, complex to implement correctly)
- Use direct database drivers for analytics queries (Dapr's state API is too limited)
- Use Dapr for secrets (Kubernetes, Vault, AWS all in one API)
- Use custom HTTP middleware for request validation (Dapr middleware exists but is limited)

## Summary

Choose Dapr when you need portable, production-ready implementations of common distributed systems patterns across a polyglot team. Choose custom middleware when your requirements are highly specific, performance is critical, or the pattern is simple enough that Dapr adds more complexity than it removes. Most teams end up using a hybrid: Dapr for infrastructure abstractions and custom code for domain-specific concerns.

# How to Use Dapr State Management for AI Agent Memory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, AI, Agent, Memory

Description: Learn how to use Dapr's state management API to give AI agents persistent, queryable memory across sessions and service restarts.

---

## Overview

AI agents need memory - the ability to recall past interactions, decisions, and context. Dapr's state management API provides a simple key-value store abstraction backed by Redis, Cosmos DB, or any supported state store, making it ideal for agent memory.

## Configuring a State Store

Deploy a Redis-backed state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: agentmemory
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master.default.svc.cluster.local:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
```

Apply it to the cluster:

```bash
kubectl apply -f agentmemory-state.yaml
```

## Storing Agent Memory

Save conversation context after each agent turn:

```python
from dapr.clients import DaprClient
import json

def save_agent_memory(session_id: str, memory: dict):
    with DaprClient() as client:
        client.save_state(
            store_name="agentmemory",
            key=f"session:{session_id}",
            value=json.dumps(memory),
            state_metadata={"ttlInSeconds": "3600"}
        )
```

## Reading Agent Memory

Retrieve prior context before generating a response:

```python
def load_agent_memory(session_id: str) -> dict:
    with DaprClient() as client:
        result = client.get_state(
            store_name="agentmemory",
            key=f"session:{session_id}"
        )
        if result.data:
            return json.loads(result.data)
        return {"history": [], "preferences": {}}
```

## Using Bulk State for Multi-Agent Coordination

When multiple agents share context, use bulk state operations:

```python
def load_team_context(agent_ids: list) -> list:
    with DaprClient() as client:
        keys = [f"agent:{aid}:context" for aid in agent_ids]
        results = client.get_bulk_state(
            store_name="agentmemory",
            keys=keys
        )
        return [json.loads(r.data) for r in results.items if r.data]
```

## Querying Agent Memory with State Query API

For state stores that support queries (like MongoDB), find sessions by attribute:

```python
query = {
    "filter": {"EQ": {"user_id": "user-456"}},
    "sort": [{"key": "last_updated", "order": "DESC"}],
    "page": {"limit": 10}
}
with DaprClient() as client:
    result = client.query_state(
        store_name="agentmemory",
        query=json.dumps(query)
    )
    sessions = [json.loads(item.value) for item in result.results]
```

## Handling Concurrency with ETags

Use ETags to prevent race conditions when multiple agent instances update the same memory:

```python
from dapr.clients.grpc._state import StateOptions, Concurrency

def update_memory_safe(session_id: str, new_data: dict):
    with DaprClient() as client:
        current = client.get_state(
            store_name="agentmemory",
            key=f"session:{session_id}"
        )
        client.save_state(
            store_name="agentmemory",
            key=f"session:{session_id}",
            value=json.dumps(new_data),
            etag=current.etag,
            options=StateOptions(concurrency=Concurrency.first_write)
        )
```

## Summary

Dapr's state management API provides AI agents with a reliable, pluggable memory layer. By using key-value storage with TTL support, bulk reads for multi-agent coordination, and query APIs for semantic recall, you can build agents that maintain rich context without tight coupling to a specific database technology.

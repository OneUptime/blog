# How to Read and Navigate the Official Dapr Documentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Documentation, Learning, Developer Experience

Description: A practical guide to navigating the official Dapr documentation site to quickly find concepts, API references, component specs, and how-to guides.

---

The official Dapr documentation at [docs.dapr.io](https://docs.dapr.io) is comprehensive but can feel overwhelming at first. Understanding how it is structured will save you hours of searching.

## Documentation Structure

The Dapr docs are organized into seven main sections:

- **Concepts** - Architecture explanations and design decisions
- **Getting started** - Installation, quickstarts, and tutorials for new users
- **Developing applications** - Building blocks, SDKs, and how-to guides
- **Developing AI** - AI agent integrations, Dapr Agents, and MCP
- **Operations** - Deployment, observability, and cluster management
- **Reference** - API specs, CLI reference, and component schemas
- **Contributing** - Documentation contributions, SDKs, and roadmap

## Finding Building Block Docs

Each Dapr building block (service invocation, pub/sub, state management, etc.) has its own section under "Developing applications". Navigate to the building block, then look for the how-to guides on the left sidebar.

For example, to find pub/sub subscription configuration:

```text
Developing applications
  > Building blocks
    > Publish & subscribe
      > How to: Publish a message and subscribe to a topic
      > Declarative, streaming, and programmatic subscription types
```

## Using the API Reference

The API reference section documents every HTTP and gRPC endpoint. When you need to know exact request/response shapes, go to **Reference > Dapr API**.

Example endpoint lookup - to find state store API endpoints:

```text
Reference
  > Dapr API
    > State management
```

The reference shows curl examples like:

```bash
# Save state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "order", "value": {"orderId": "100"}}]'

# Get state
curl http://localhost:3500/v1.0/state/statestore/order
```

## Searching Effectively

Use the search bar (keyboard shortcut `/`) to search across all docs. Be specific - search for "pub/sub subscription" rather than just "subscription" to avoid noise.

For component-specific docs, search the component name directly, for example "redis state store" or "Azure Service Bus pub/sub".

## Finding Component Specs

Component YAML schemas live under **Reference > Component specs**. Each component lists its required and optional `metadata` fields:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "localhost:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
```

## Version Switcher

Dapr docs support multiple versions. Use the version dropdown in the top navigation to switch between stable and edge (pre-release) docs. Always confirm you are reading docs for your installed Dapr runtime version.

```bash
# Check your installed Dapr version
dapr --version
```

## Quickstart Samples

The "Quickstarts" section under "Getting started" contains runnable examples for each building block. Clone the quickstarts repository to run them locally:

```bash
git clone https://github.com/dapr/quickstarts.git
cd quickstarts/tutorials/hello-world
```

## Summary

The Dapr documentation is organized into concepts, getting started, developing applications, developing AI, operations, reference, and contributing sections. Use the version switcher to match your runtime version, and search with specific terms to find component specs, API references, and how-to guides efficiently.

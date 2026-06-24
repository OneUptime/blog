# How to Build Event-Driven Apps with Redis Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Event-Driven, Message Queue, Consumer Group, Microservice

Description: Learn how to build event-driven applications using Redis Streams for reliable message delivery, consumer groups, and event sourcing. This guide covers producers, consumers, and handling failures.

---

Redis Streams give you an append-only log data structure that is well suited to event-driven architectures, where producers publish events and one or more consumers process them independently. With consumer groups, multiple workers can share the load of a single stream while Redis tracks which messages each consumer has acknowledged, making it possible to build reliable message delivery, event sourcing, and work queues. This guide walks through producing and consuming events, coordinating workers with consumer groups, and handling failures so that no event is lost.

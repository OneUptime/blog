# How to Implement Actor Pipelines in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Pipeline, Workflow, Processing

Description: Learn how to implement actor pipelines in Dapr where each stage actor processes data and passes it to the next stage, enabling composable, observable processing chains.

---

## What Is an Actor Pipeline?

An actor pipeline is a processing chain where each stage is an actor. Data flows from stage to stage: stage 1 enriches the payload, stage 2 validates it, stage 3 transforms it, stage 4 persists it. Each stage is independently scalable, testable, and observable.

## Pipeline Design

```text
raw-event -> [EnrichmentActor] -> [ValidationActor] -> [TransformActor] -> [StorageActor]
```

Each stage actor:
1. Receives a payload from the previous stage.
2. Processes it.
3. Invokes the next stage actor.

## Stage 1: Enrichment Actor

```javascript
const { AbstractActor, ActorProxyBuilder, ActorId, DaprClient, HttpMethod } = require('@dapr/dapr');

class EnrichmentActor extends AbstractActor {
  async process(payload) {
    const client = new DaprClient();

    // Enrich with user details
    const user = await client.invoker.invoke(
      'user-service', 'users/' + payload.userId, HttpMethod.GET
    );

    const enriched = {
      ...payload,
      userEmail: user.email,
      userPlan: user.plan,
      enrichedAt: Date.now()
    };

    // Pass to validation stage
    const builder = new ActorProxyBuilder('ValidationActor', client);
    const proxy = builder.build(new ActorId(`validate:${payload.eventId}`));
    await proxy.process(enriched);
    return { success: true };
  }
}
```

## Stage 2: Validation Actor

```javascript
const { AbstractActor, ActorProxyBuilder, ActorId, DaprClient } = require('@dapr/dapr');

class ValidationActor extends AbstractActor {
  async process(payload) {
    const client = new DaprClient();
    const errors = [];

    if (!payload.userId) errors.push('Missing userId');
    if (!payload.eventType) errors.push('Missing eventType');
    if (!payload.userEmail) errors.push('Enrichment failed - no email');

    if (errors.length > 0) {
      await client.pubsub.publish('events-pubsub', 'pipeline.validation-failed', {
        eventId: payload.eventId,
        errors
      });
      return { success: false, errors };
    }

    // Pass to transform stage
    const builder = new ActorProxyBuilder('TransformActor', client);
    const proxy = builder.build(new ActorId(`transform:${payload.eventId}`));
    await proxy.process(payload);
    return { success: true };
  }
}
```

## Stage 3: Transform Actor

```javascript
const { AbstractActor, ActorProxyBuilder, ActorId, DaprClient } = require('@dapr/dapr');

class TransformActor extends AbstractActor {
  async process(payload) {
    const transformed = {
      event_id: payload.eventId,
      event_type: payload.eventType,
      user_id: payload.userId,
      user_email: payload.userEmail,
      user_plan: payload.userPlan,
      occurred_at: new Date(payload.timestamp).toISOString(),
      processed_at: new Date().toISOString()
    };

    // Pass to storage stage
    const client = new DaprClient();
    const builder = new ActorProxyBuilder('StorageActor', client);
    const proxy = builder.build(new ActorId(`store:${payload.eventId}`));
    await proxy.process(transformed);
    return { success: true };
  }
}
```

## Stage 4: Storage Actor

```javascript
const { AbstractActor } = require('@dapr/dapr');

class StorageActor extends AbstractActor {
  async process(payload) {
    await db.query(
      `INSERT INTO events (event_id, event_type, user_id, user_email, user_plan, occurred_at, processed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [payload.event_id, payload.event_type, payload.user_id,
       payload.user_email, payload.user_plan, payload.occurred_at, payload.processed_at]
    );
    return { success: true, stored: true };
  }
}
```

## Starting the Pipeline

```javascript
const { DaprClient, ActorProxyBuilder, ActorId } = require('@dapr/dapr');
const client = new DaprClient();

async function submitToPipeline(event) {
  const builder = new ActorProxyBuilder('EnrichmentActor', client);
  const proxy = builder.build(new ActorId(`enrich:${event.eventId}`));
  await proxy.process(event);
}
```

## Summary

Actor pipelines in Dapr create composable, sequential processing chains where each stage is independently deployable and testable. Because each pipeline run uses unique actor IDs per event, stages process in parallel across different events while maintaining strict sequential ordering within a single event's pipeline execution.

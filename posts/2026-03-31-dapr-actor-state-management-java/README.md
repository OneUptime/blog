# How to Implement Actor State Management in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Java, State Management, Microservice

Description: Learn how to manage Dapr actor state in Java using the Java SDK, including reactive state operations with Project Reactor and type-safe state access patterns.

---

## Actor State in Java

The Dapr Java SDK manages actor state through the `ActorStateManager` accessible via `this.getActorStateManager()`. All state operations return Project Reactor `Mono` types, making them composable with reactive pipelines. State is scoped to the actor instance and backed by the Dapr state store configured for actors.

## Maven Setup

```xml
<dependency>
  <groupId>io.dapr</groupId>
  <artifactId>dapr-sdk-actors</artifactId>
  <version>1.12.0</version>
</dependency>
<dependency>
  <groupId>io.dapr</groupId>
  <artifactId>dapr-sdk-springboot</artifactId>
  <version>1.12.0</version>
</dependency>
```

## Defining the Actor Interface

```java
import io.dapr.actors.ActorMethod;
import io.dapr.actors.ActorType;
import reactor.core.publisher.Mono;

@ActorType(name = "SubscriptionActor")
public interface SubscriptionActor {

    @ActorMethod(name = "subscribe")
    Mono<Void> subscribe(String plan);

    @ActorMethod(name = "cancelSubscription", returns = Boolean.class)
    Mono<Boolean> cancelSubscription();

    @ActorMethod(name = "getStatus", returns = SubscriptionStatus.class)
    Mono<SubscriptionStatus> getStatus();

    @ActorMethod(name = "renewSubscription", returns = String.class)
    Mono<String> renewSubscription(int months);
}
```

## Implementing State Operations

```java
import io.dapr.actors.ActorId;
import io.dapr.actors.runtime.AbstractActor;
import io.dapr.actors.runtime.ActorRuntimeContext;
import reactor.core.publisher.Mono;
import java.time.LocalDate;

public class SubscriptionActorImpl extends AbstractActor implements SubscriptionActor {

    private static final String STATUS_KEY = "status";
    private static final String PLAN_KEY = "plan";
    private static final String EXPIRY_KEY = "expiry";

    public SubscriptionActorImpl(ActorRuntimeContext ctx, ActorId id) {
        super(ctx, id);
    }

    @Override
    public Mono<Void> subscribe(String plan) {
        String expiry = LocalDate.now().plusMonths(1).toString();
        return this.getActorStateManager().set(PLAN_KEY, plan)
            .then(this.getActorStateManager().set(STATUS_KEY, "active"))
            .then(this.getActorStateManager().set(EXPIRY_KEY, expiry))
            .then(this.getActorStateManager().save());
    }

    @Override
    public Mono<Boolean> cancelSubscription() {
        return this.getActorStateManager().contains(STATUS_KEY)
            .flatMap(exists -> exists
                ? this.getActorStateManager().get(STATUS_KEY, String.class)
                : Mono.just("inactive"))
            .flatMap(status -> {
                if ("cancelled".equals(status)) {
                    return Mono.just(false);
                }
                return this.getActorStateManager().set(STATUS_KEY, "cancelled")
                    .then(this.getActorStateManager().save())
                    .thenReturn(true);
            });
    }

    @Override
    public Mono<SubscriptionStatus> getStatus() {
        Mono<String> statusMono = this.getActorStateManager().contains(STATUS_KEY)
            .flatMap(exists -> exists
                ? this.getActorStateManager().get(STATUS_KEY, String.class)
                : Mono.just("inactive"));
        Mono<String> planMono = this.getActorStateManager().contains(PLAN_KEY)
            .flatMap(exists -> exists
                ? this.getActorStateManager().get(PLAN_KEY, String.class)
                : Mono.just("none"));
        Mono<String> expiryMono = this.getActorStateManager().contains(EXPIRY_KEY)
            .flatMap(exists -> exists
                ? this.getActorStateManager().get(EXPIRY_KEY, String.class)
                : Mono.just("N/A"));
        return Mono.zip(statusMono, planMono, expiryMono)
            .map(tuple -> new SubscriptionStatus(tuple.getT1(), tuple.getT2(), tuple.getT3()));
    }

    @Override
    public Mono<String> renewSubscription(int months) {
        return this.getActorStateManager().contains(EXPIRY_KEY)
            .flatMap(exists -> exists
                ? this.getActorStateManager().get(EXPIRY_KEY, String.class)
                : Mono.just(LocalDate.now().toString()))
            .flatMap(currentExpiry -> {
                LocalDate base = LocalDate.now().isAfter(LocalDate.parse(currentExpiry))
                    ? LocalDate.now()
                    : LocalDate.parse(currentExpiry);
                String newExpiry = base.plusMonths(months).toString();
                return this.getActorStateManager().set(EXPIRY_KEY, newExpiry)
                    .then(this.getActorStateManager().set(STATUS_KEY, "active"))
                    .then(this.getActorStateManager().save())
                    .thenReturn(newExpiry);
            });
    }
}
```

## Safe State Reading with contains

Use `contains` to check whether state exists before reading, to avoid exceptions:

```java
public Mono<Integer> getUsageCount() {
    return this.getActorStateManager().contains("usageCount")
        .flatMap(exists -> exists
            ? this.getActorStateManager().get("usageCount", Integer.class)
            : Mono.just(0));
}
```

## Removing State

```java
public Mono<Void> clearHistory() {
    return this.getActorStateManager().remove("history")
        .then(this.getActorStateManager().remove("lastActivity"))
        .then(this.getActorStateManager().save());
}
```

## Client Invocation

```java
ActorProxyBuilder<SubscriptionActor> builder =
    new ActorProxyBuilder<>(SubscriptionActor.class, actorClient);

SubscriptionActor sub = builder.build(new ActorId("user-999"));
sub.subscribe("premium").block();
SubscriptionStatus status = sub.getStatus().block();
System.out.println("Status: " + status.getStatus() + ", expires: " + status.getExpiry());
```

## Summary

Dapr actor state management in Java uses reactive `Mono`-based operations on the `ActorStateManager`. Use `set` and `save` for mutations, `contains` with `get` for safe reads with fallbacks, and `remove` to delete state keys. Chain operations with Project Reactor to keep state changes atomic and readable.

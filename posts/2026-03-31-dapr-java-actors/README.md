# How to Use Dapr Actors with Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Java, Actor, Spring Boot, Distributed System, Concurrency

Description: Implement the virtual actor pattern in Java using the Dapr actor building block for stateful, single-threaded distributed objects with timers, reminders, and state persistence.

---

## Overview

Dapr's actor building block brings the virtual actor pattern to Java. Actors are single-threaded, stateful objects that are automatically created when first called and collected when idle. The Java SDK provides interfaces for defining actor types and integrating them with Spring Boot.

## Adding Actor Dependencies

```xml
<dependency>
    <groupId>io.dapr</groupId>
    <artifactId>dapr-sdk-actors</artifactId>
</dependency>
<dependency>
    <groupId>io.dapr</groupId>
    <artifactId>dapr-sdk-springboot</artifactId>
</dependency>
```

## Defining the Actor Interface

```java
import io.dapr.actors.ActorMethod;
import reactor.core.publisher.Mono;

public interface CounterActor {

    @ActorMethod(name = "Increment")
    Mono<Void> increment();

    @ActorMethod(name = "GetCount")
    Mono<Integer> getCount();

    @ActorMethod(name = "Reset")
    Mono<Void> reset();
}
```

## Implementing the Actor

```java
import io.dapr.actors.ActorId;
import io.dapr.actors.runtime.AbstractActor;
import io.dapr.actors.runtime.ActorRuntimeContext;
import reactor.core.publisher.Mono;

public class CounterActorImpl extends AbstractActor implements CounterActor {

    private static final String COUNT_KEY = "count";

    public CounterActorImpl(ActorRuntimeContext<CounterActorImpl> ctx, ActorId id) {
        super(ctx, id);
    }

    @Override
    public Mono<Void> increment() {
        return this.getActorStateManager().contains(COUNT_KEY)
            .flatMap(exists -> exists
                ? this.getActorStateManager().get(COUNT_KEY, Integer.class)
                : Mono.just(0))
            .flatMap(count ->
                this.getActorStateManager().set(COUNT_KEY, count + 1));
    }

    @Override
    public Mono<Integer> getCount() {
        return this.getActorStateManager().contains(COUNT_KEY)
            .flatMap(exists -> exists
                ? this.getActorStateManager().get(COUNT_KEY, Integer.class)
                : Mono.just(0));
    }

    @Override
    public Mono<Void> reset() {
        return this.getActorStateManager().set(COUNT_KEY, 0);
    }
}
```

## Registering Actors with Spring Boot

```java
import io.dapr.actors.runtime.ActorRuntime;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import javax.annotation.PostConstruct;

@SpringBootApplication
public class ActorApplication {

    public static void main(String[] args) {
        SpringApplication.run(ActorApplication.class, args);
    }

    @PostConstruct
    public void registerActors() {
        ActorRuntime.getInstance().registerActor(CounterActorImpl.class);
    }
}
```

## Calling an Actor from a Client

```java
import io.dapr.actors.ActorId;
import io.dapr.actors.client.ActorClient;
import io.dapr.actors.client.ActorProxyBuilder;

try (ActorClient actorClient = new ActorClient()) {
    ActorProxyBuilder<CounterActor> builder =
        new ActorProxyBuilder<>(CounterActor.class, actorClient);

    CounterActor actor = builder.build(new ActorId("counter-alice"));

    actor.increment().block();
    actor.increment().block();

    int count = actor.getCount().block();
    System.out.println("Count: " + count); // 2

    actor.reset().block();
}
```

## Adding a Timer

```java
@Override
protected Mono<Void> onActivate() {
    return this.registerActorTimer(
        "report-timer",
        "reportCallback",
        null,
        Duration.ofSeconds(10),
        Duration.ofMinutes(1))
        .then();
}

public Mono<Void> reportCallback(byte[] state) {
    System.out.println("Timer fired for actor: " + this.getId());
    return Mono.empty();
}
```

## Summary

Dapr actors in Java follow a three-part pattern: a Reactor-based interface, an `AbstractActor` implementation with state manager calls, and registration via `ActorRuntime`. The Dapr placement service distributes actors across the cluster automatically. Timers and reminders allow actors to self-schedule work without external cron systems.

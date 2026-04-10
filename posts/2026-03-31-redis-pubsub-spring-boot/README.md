# How to Use Redis Pub/Sub with Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Spring Boot, Pub/Sub, Messaging, Java

Description: Implement Redis Pub/Sub messaging in Spring Boot using RedisMessageListenerContainer and MessageListenerAdapter for decoupled event communication.

---

Redis Pub/Sub lets services broadcast messages to subscribers without tight coupling. Spring Boot provides `RedisMessageListenerContainer` to wire up listeners declaratively without manually managing subscriptions.

## Add Dependency

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

## Create a Message Listener

```java
@Component
public class OrderEventListener {

    private static final Logger log = LoggerFactory.getLogger(OrderEventListener.class);

    public void handleMessage(String message, String channel) {
        log.info("Received on {}: {}", channel, message);
        // Process the event
    }
}
```

## Register the Listener Container

```java
@Configuration
public class PubSubConfig {

    @Bean
    public MessageListenerAdapter listenerAdapter(OrderEventListener listener) {
        return new MessageListenerAdapter(listener, "handleMessage");
    }

    @Bean
    public RedisMessageListenerContainer container(
            RedisConnectionFactory factory,
            MessageListenerAdapter listenerAdapter) {

        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(factory);
        container.addMessageListener(listenerAdapter,
            new PatternTopic("orders:*"));
        return container;
    }
}
```

`PatternTopic("orders:*")` subscribes to all channels matching the pattern.

## Publish Messages

```java
@Service
public class OrderPublisher {

    private final StringRedisTemplate template;

    public OrderPublisher(StringRedisTemplate template) {
        this.template = template;
    }

    public void publish(String orderId, String status) {
        String channel = "orders:" + orderId;
        String message = """
            {"orderId":"%s","status":"%s","timestamp":%d}
            """.formatted(orderId, status, System.currentTimeMillis());
        template.convertAndSend(channel, message.trim());
    }
}
```

## Wire It Together in a Controller

```java
@RestController
public class OrderController {

    private final OrderPublisher publisher;

    public OrderController(OrderPublisher publisher) {
        this.publisher = publisher;
    }

    @PostMapping("/orders/{id}/status")
    public ResponseEntity<String> updateStatus(
            @PathVariable String id, @RequestParam String status) {
        publisher.publish(id, status);
        return ResponseEntity.ok("Published");
    }
}
```

## Unsubscribe Dynamically

```java
@Autowired
private RedisMessageListenerContainer container;

public void unsubscribe(MessageListenerAdapter adapter) {
    container.removeMessageListener(adapter);
}
```

## Inspect Active Subscriptions

```bash
redis-cli pubsub channels "orders:*"
redis-cli pubsub numsub orders:123
redis-cli pubsub numpat
```

`channels` and `numsub` only count exact (`SUBSCRIBE`) subscribers. Since `PatternTopic` uses `PSUBSCRIBE`, use `numpat` to see the total number of active pattern subscriptions.

## Summary

Spring Boot's `RedisMessageListenerContainer` handles subscription lifecycle, reconnection, and deserialization automatically. Publishers use `StringRedisTemplate.convertAndSend` to broadcast events, and `PatternTopic` allows flexible channel matching without hardcoding individual channel names. This pattern decouples producers and consumers within a monolith or across microservices sharing a Redis instance.

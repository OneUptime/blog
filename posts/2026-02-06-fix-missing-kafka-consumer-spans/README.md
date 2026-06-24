# How to Fix Missing Kafka Consumer Spans When OpenTelemetry Agent Cannot Hook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Kafka, Consumer Instrumentation

Description: Fix the issue where the OpenTelemetry Java agent does not produce spans for Kafka consumer operations despite active instrumentation.

The OpenTelemetry Java agent instruments Apache Kafka producers and consumers to create spans for message publishing and consumption. However, consumer-side spans can appear to be missing or disconnected when the Kafka client version is unsupported, an instrumentation is disabled, processing happens outside an instrumented callback, or trace context is not propagated in headers.

## How Kafka Instrumentation Works

The agent instruments:
- **Producer**: Creates a PRODUCER span when `KafkaProducer.send()` is called. Injects trace context into Kafka headers.
- **Consumer**: Creates messaging spans when records are received from `KafkaConsumer.poll()`. Spring Kafka instrumentation can also create processing spans for listener callbacks. Extracts trace context from Kafka headers to correlate consumer spans with producer spans.

The expected trace:

```text
order-service: publish_order     [====] 10ms  (PRODUCER span)
payment-service: poll orders     [========] 50ms  (messaging span, linked to producer)
```

## Cause 1: Kafka Client Version Mismatch

The agent supports specific Kafka client versions. Check compatibility:

```bash
# Check your Kafka client version

mvn dependency:tree -Dincludes=org.apache.kafka

# Agent support: Apache Kafka Producer/Consumer API 0.11+
```

If your version is outside the supported range, the agent will not apply the Kafka instrumentation. Enable agent debug logging with `-Dotel.javaagent.debug=true` when you need to confirm whether the Kafka instrumentation matched your application.

## Cause 2: Manual Record Processing Without Context Extraction

If you process records manually after `poll()`, the agent can instrument the receive operation but may not create a span covering your `processRecord()` method:

```java
// The agent instruments poll(), but your application work happens after poll() returns
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    for (ConsumerRecord<String, String> record : records) {
        // Add manual instrumentation here if you need a process span for this work
        processRecord(record);
    }
}
```

**Fix:** Make sure the agent is loaded and the Kafka instrumentation is enabled. If you disabled default instrumentations, enable Kafka explicitly:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.instrumentation.kafka.enabled=true \
     -jar consumer-app.jar
```

## Cause 3: Spring Kafka Listener Not Instrumented

Spring Kafka's `@KafkaListener` requires the Spring Kafka instrumentation. The OpenTelemetry Java agent supports Spring Kafka 2.7+:

```java
@KafkaListener(topics = "orders")
public void listen(ConsumerRecord<String, String> record) {
    // Agent instruments this if spring-kafka instrumentation is enabled
    processOrder(record.value());
}
```

```bash
# Make sure both Kafka and Spring Kafka instrumentations are enabled
-Dotel.instrumentation.kafka.enabled=true
-Dotel.instrumentation.spring-kafka.enabled=true
```

## Cause 4: Consumer Group Rebalancing

During rebalancing, the consumer's partition assignment changes. Rebalancing does not remove trace context that is already present in Kafka record headers, but it can create apparent gaps when processing is interrupted, retried, or moved to another consumer instance.

**Mitigation:** Use static group membership to reduce rebalancing:

```java
Properties props = new Properties();
props.put(ConsumerConfig.GROUP_INSTANCE_ID_CONFIG, "consumer-instance-1");
// Use a unique group.instance.id for each consumer instance
```

## Cause 5: Trace Context Not Propagated in Headers

The producer must inject trace context into Kafka headers for the consumer to connect its spans to the producer. If the producer does not have OpenTelemetry instrumentation, the consumer can still create receive spans, but there is no producer context to extract.

Check the producer side:

```bash
# Producer also needs the agent
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.instrumentation.kafka.enabled=true \
     -jar producer-app.jar
```

## Verifying Context Propagation

Add a debug consumer to check if headers contain trace context:

```java
for (ConsumerRecord<String, String> record : records) {
    for (Header header : record.headers()) {
        if (header.key().equals("traceparent")) {
            System.out.println("Trace context found: " + new String(header.value()));
        }
    }
}
```

If `traceparent` headers are present, W3C trace context propagation from the producer is working. If they are absent, the consumer spans may be created as root or unlinked spans and the producer side needs fixing.

## Manual Context Propagation

If auto-instrumentation does not work for your setup, propagate context manually. Avoid creating duplicate producer or consumer spans if the Java agent is already instrumenting the same Kafka calls.

```java
// Producer side - inject context
Span span = tracer.spanBuilder("send_order")
    .setSpanKind(SpanKind.PRODUCER)
    .startSpan();

try (Scope scope = span.makeCurrent()) {
    ProducerRecord<String, String> record = new ProducerRecord<>("orders", order.toJson());

    // Inject trace context into Kafka headers
    GlobalOpenTelemetry.getPropagators().getTextMapPropagator()
        .inject(Context.current(), record.headers(), (headers, key, value) ->
            headers.add(key, value.getBytes(StandardCharsets.UTF_8)));

    producer.send(record);
} finally {
    span.end();
}
```

```java
// Consumer side - extract context
for (ConsumerRecord<String, String> record : records) {
    Context extractedContext = GlobalOpenTelemetry.getPropagators().getTextMapPropagator()
        .extract(Context.current(), record.headers(), new TextMapGetter<Headers>() {
            @Override
            public Iterable<String> keys(Headers carrier) {
                List<String> keys = new ArrayList<>();
                carrier.forEach(header -> keys.add(header.key()));
                return keys;
            }

            @Override
            public String get(Headers carrier, String key) {
                Header header = carrier.lastHeader(key);
                return header != null ? new String(header.value(), StandardCharsets.UTF_8) : null;
            }
        });

    try (Scope scope = extractedContext.makeCurrent()) {
        Span span = tracer.spanBuilder("process_order")
            .setSpanKind(SpanKind.CONSUMER)
            .startSpan();
        try (Scope s = span.makeCurrent()) {
            processOrder(record.value());
        } finally {
            span.end();
        }
    }
}
```

## Summary

Missing or disconnected Kafka consumer spans are caused by version mismatches, disabled instrumentations, missing trace context in headers, processing outside an instrumented callback, or the producer not having OpenTelemetry enabled. Verify both producer and consumer have the agent, check Kafka headers for `traceparent`, and ensure the correct instrumentations are enabled.

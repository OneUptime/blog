# How to Join Streams and Tables in Kafka Streams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, Kafka Streams, Stream Joins, Table Joins, Real-time Processing, Data Enrichment

Description: Learn how to implement joins in Kafka Streams, including KStream-KStream, KStream-KTable, KTable-KTable, and global table joins for data enrichment and correlation in real-time stream processing.

---

Joins in Kafka Streams allow you to correlate and enrich data from multiple streams and tables. Understanding the different join types and their characteristics is essential for building effective stream processing applications.

## Join Types Overview

```
KStream-KStream Join:
- Windowed join
- Both sides are streams of events
- Used for correlating events in time

KStream-KTable Join:
- Stream events enriched with table lookups
- Non-windowed
- Used for data enrichment

KTable-KTable Join:
- Both sides are changelog streams
- Non-windowed
- Used for combining reference data

KStream-GlobalKTable Join:
- Stream enriched with global data
- No co-partitioning required
- Used for global lookups
```

## KStream-KStream Join (Windowed)

Join two event streams within a time window:

```java
import org.apache.kafka.streams.*;
import org.apache.kafka.streams.kstream.*;
import java.time.Duration;

public class StreamStreamJoin {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        // Order stream
        KStream<String, Order> orders = builder.stream("orders",
            Consumed.with(Serdes.String(), orderSerde));

        // Payment stream
        KStream<String, Payment> payments = builder.stream("payments",
            Consumed.with(Serdes.String(), paymentSerde));

        // Join orders with payments within 1 hour
        // Both streams must be keyed by order ID
        KStream<String, OrderWithPayment> joined = orders.join(
            payments,
            // Value joiner
            (order, payment) -> new OrderWithPayment(order, payment),
            // Join window - 1 hour before and after
            JoinWindows.ofTimeDifferenceWithNoGrace(Duration.ofHours(1)),
            // Stream joined configuration
            StreamJoined.with(
                Serdes.String(),      // Key serde
                orderSerde,           // Left value serde
                paymentSerde          // Right value serde
            )
        );

        joined.to("orders-with-payments",
            Produced.with(Serdes.String(), orderWithPaymentSerde));

        KafkaStreams streams = new KafkaStreams(builder.build(), getConfig());
        streams.start();
    }
}

record Order(String orderId, String customerId, double amount, long timestamp) {}
record Payment(String orderId, String paymentId, double amount, String method) {}
record OrderWithPayment(Order order, Payment payment) {}
```

### Left Join and Outer Join

```java
// Left join - emit even if no matching payment
KStream<String, OrderWithPayment> leftJoined = orders.leftJoin(
    payments,
    (order, payment) -> new OrderWithPayment(order, payment),
    JoinWindows.ofTimeDifferenceWithNoGrace(Duration.ofHours(1)),
    StreamJoined.with(Serdes.String(), orderSerde, paymentSerde)
);

// Outer join - emit from both sides even without match
KStream<String, OrderWithPayment> outerJoined = orders.outerJoin(
    payments,
    (order, payment) -> new OrderWithPayment(order, payment),
    JoinWindows.ofTimeDifferenceWithNoGrace(Duration.ofHours(1)),
    StreamJoined.with(Serdes.String(), orderSerde, paymentSerde)
);
```

### Asymmetric Join Windows

```java
// Different time windows for before and after
JoinWindows asymmetricWindow = JoinWindows
    .ofTimeDifferenceWithNoGrace(Duration.ofHours(1))
    .before(Duration.ofMinutes(30))  // Look 30 min before
    .after(Duration.ofHours(2));      // Look 2 hours after
```

## KStream-KTable Join

Enrich stream events with table data:

```java
public class StreamTableJoin {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        // Transaction stream
        KStream<String, Transaction> transactions = builder.stream("transactions",
            Consumed.with(Serdes.String(), transactionSerde));

        // Customer table (compacted topic)
        KTable<String, Customer> customers = builder.table("customers",
            Consumed.with(Serdes.String(), customerSerde));

        // Enrich transactions with customer data
        // Transaction key must be customer ID
        KStream<String, EnrichedTransaction> enriched = transactions
            .selectKey((key, txn) -> txn.getCustomerId())  // Re-key by customer ID
            .join(
                customers,
                (transaction, customer) -> new EnrichedTransaction(
                    transaction,
                    customer.getName(),
                    customer.getSegment(),
                    customer.getRegion()
                )
            );

        enriched.to("enriched-transactions",
            Produced.with(Serdes.String(), enrichedTransactionSerde));

        KafkaStreams streams = new KafkaStreams(builder.build(), getConfig());
        streams.start();
    }
}

record Transaction(String txnId, String customerId, double amount, String type) {}
record Customer(String customerId, String name, String segment, String region) {}
record EnrichedTransaction(Transaction transaction, String customerName,
                          String segment, String region) {}
```

### Left Join with KTable

```java
// Left join - keep transaction even if customer not found
KStream<String, EnrichedTransaction> enriched = transactions
    .selectKey((key, txn) -> txn.getCustomerId())
    .leftJoin(
        customers,
        (transaction, customer) -> {
            if (customer != null) {
                return new EnrichedTransaction(transaction, customer);
            } else {
                return new EnrichedTransaction(transaction, null);
            }
        }
    );
```

## KTable-KTable Join

Join two tables for combined reference data:

```java
public class TableTableJoin {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        // User profile table
        KTable<String, UserProfile> profiles = builder.table("user-profiles",
            Consumed.with(Serdes.String(), userProfileSerde));

        // User preferences table
        KTable<String, UserPreferences> preferences = builder.table("user-preferences",
            Consumed.with(Serdes.String(), userPreferencesSerde));

        // Join tables - both keyed by user ID
        KTable<String, CompleteUser> users = profiles.join(
            preferences,
            (profile, prefs) -> new CompleteUser(
                profile.getUserId(),
                profile.getName(),
                profile.getEmail(),
                prefs.getLanguage(),
                prefs.getTimezone(),
                prefs.getNotificationSettings()
            )
        );

        // Output changes to topic
        users.toStream().to("complete-users",
            Produced.with(Serdes.String(), completeUserSerde));

        KafkaStreams streams = new KafkaStreams(builder.build(), getConfig());
        streams.start();
    }
}
```

### Table Left and Outer Joins

```java
// Left join - keep profile even without preferences
KTable<String, CompleteUser> leftJoined = profiles.leftJoin(
    preferences,
    (profile, prefs) -> {
        if (prefs != null) {
            return new CompleteUser(profile, prefs);
        }
        return new CompleteUser(profile, defaultPreferences);
    }
);

// Outer join - emit for either table update
KTable<String, CompleteUser> outerJoined = profiles.outerJoin(
    preferences,
    (profile, prefs) -> new CompleteUser(profile, prefs)
);
```

## GlobalKTable Join

Join with global data without co-partitioning:

```java
public class GlobalTableJoin {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        // Transaction stream (any partitioning)
        KStream<String, Transaction> transactions = builder.stream("transactions");

        // Global table - replicated to all instances
        GlobalKTable<String, ExchangeRate> exchangeRates = builder.globalTable(
            "exchange-rates",
            Consumed.with(Serdes.String(), exchangeRateSerde)
        );

        // Join using custom key mapper
        KStream<String, TransactionInUSD> converted = transactions.join(
            exchangeRates,
            // Key mapper - extract currency from transaction
            (txnKey, transaction) -> transaction.getCurrency(),
            // Value joiner
            (transaction, rate) -> new TransactionInUSD(
                transaction,
                transaction.getAmount() * rate.getRateToUSD()
            )
        );

        converted.to("transactions-usd");

        KafkaStreams streams = new KafkaStreams(builder.build(), getConfig());
        streams.start();
    }
}

record ExchangeRate(String currency, double rateToUSD) {}
record TransactionInUSD(Transaction original, double amountInUSD) {}
```

### Multiple GlobalKTable Joins

```java
// Multiple lookups
GlobalKTable<String, Country> countries = builder.globalTable("countries");
GlobalKTable<String, Currency> currencies = builder.globalTable("currencies");

KStream<String, EnrichedOrder> enriched = orders
    // First join - lookup country
    .join(
        countries,
        (key, order) -> order.getCountryCode(),
        (order, country) -> new OrderWithCountry(order, country)
    )
    // Second join - lookup currency
    .join(
        currencies,
        (key, orderWithCountry) -> orderWithCountry.getCountry().getCurrencyCode(),
        (orderWithCountry, currency) -> new EnrichedOrder(
            orderWithCountry.getOrder(),
            orderWithCountry.getCountry(),
            currency
        )
    );
```

## Foreign Key Joins (KTable-KTable)

Join tables on non-primary key fields:

```java
public class ForeignKeyJoin {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        // Orders table keyed by order ID
        KTable<String, Order> orders = builder.table("orders",
            Consumed.with(Serdes.String(), orderSerde));

        // Customers table keyed by customer ID
        KTable<String, Customer> customers = builder.table("customers",
            Consumed.with(Serdes.String(), customerSerde));

        // Foreign key join - order.customerId -> customer.customerId
        KTable<String, OrderWithCustomer> joined = orders.join(
            customers,
            // Foreign key extractor
            order -> order.getCustomerId(),
            // Value joiner
            (order, customer) -> new OrderWithCustomer(order, customer),
            // Materialized config
            Materialized.as("orders-with-customers")
        );

        joined.toStream().to("orders-enriched");

        KafkaStreams streams = new KafkaStreams(builder.build(), getConfig());
        streams.start();
    }
}
```

## Co-partitioning Requirements

For non-global joins, streams and tables must be co-partitioned:

```java
public class CoPartitioningExample {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        // Ensure same key type and partitioning
        KStream<String, Order> orders = builder.stream("orders",
            Consumed.with(Serdes.String(), orderSerde));

        KTable<String, Customer> customers = builder.table("customers",
            Consumed.with(Serdes.String(), customerSerde));

        // If orders are keyed by orderId, re-key before join
        KStream<String, Order> rekeyedOrders = orders
            .selectKey((orderId, order) -> order.getCustomerId());

        // Now join works - both keyed by customerId
        KStream<String, OrderWithCustomer> joined = rekeyedOrders.join(
            customers,
            OrderWithCustomer::new
        );
    }
}
```

### Through Topic for Repartitioning

```java
// Explicit repartition through topic
KStream<String, Order> repartitioned = orders
    .selectKey((key, order) -> order.getCustomerId())
    .repartition(Repartitioned.with(Serdes.String(), orderSerde)
        .withName("orders-by-customer")
        .withNumberOfPartitions(12));

// Now join
KStream<String, OrderWithCustomer> joined = repartitioned.join(customers, ...);
```

## Complex Join Patterns

### Multi-way Join

```java
public class MultiWayJoin {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        KStream<String, Order> orders = builder.stream("orders");
        KTable<String, Customer> customers = builder.table("customers");
        KTable<String, Product> products = builder.table("products");
        GlobalKTable<String, Promotion> promotions = builder.globalTable("promotions");

        // Chain joins
        KStream<String, EnrichedOrder> enriched = orders
            // Rekey by customer
            .selectKey((k, v) -> v.getCustomerId())
            // Join with customer
            .join(customers, EnrichedOrder::withCustomer)
            // Rekey by product
            .selectKey((k, v) -> v.getOrder().getProductId())
            // Join with product
            .join(products, EnrichedOrder::withProduct)
            // Join with global promotion table
            .join(
                promotions,
                (key, enriched) -> enriched.getProduct().getCategory(),
                EnrichedOrder::withPromotion
            );

        enriched.to("fully-enriched-orders");
    }
}
```

### Time-correlated Joins

```java
// Join events that occur close together
KStream<String, ClickEvent> clicks = builder.stream("clicks");
KStream<String, PurchaseEvent> purchases = builder.stream("purchases");

// Join clicks with purchases within 30 minutes
KStream<String, Attribution> attributions = clicks.join(
    purchases,
    (click, purchase) -> new Attribution(
        click.getSessionId(),
        click.getCampaignId(),
        purchase.getOrderId(),
        purchase.getAmount()
    ),
    JoinWindows.ofTimeDifferenceWithNoGrace(Duration.ofMinutes(30))
        .before(Duration.ofMinutes(30))  // Click must be before purchase
        .after(Duration.ZERO),            // No clicks after purchase
    StreamJoined.with(Serdes.String(), clickSerde, purchaseSerde)
);
```

## Best Practices

### 1. Understand Co-partitioning

```java
// Verify co-partitioning at runtime
TopologyDescription description = builder.build().describe();
System.out.println(description);

// Check for repartition nodes
```

### 2. Handle Null Values

```java
KStream<String, Enriched> joined = stream.leftJoin(
    table,
    (streamValue, tableValue) -> {
        if (tableValue == null) {
            log.warn("No matching table entry for key");
            return new Enriched(streamValue, DEFAULT_VALUE);
        }
        return new Enriched(streamValue, tableValue);
    }
);
```

### 3. Use Appropriate Join Type

```java
// Use GlobalKTable for small, frequently accessed data
GlobalKTable<String, Config> configs = builder.globalTable("configs");

// Use KTable for larger data that can be partitioned
KTable<String, Customer> customers = builder.table("customers");

// Use windowed joins for correlating events in time
JoinWindows.ofTimeDifferenceWithNoGrace(Duration.ofMinutes(5))
```

## Summary

| Join Type | Left | Right | Windowed | Co-partitioned |
|-----------|------|-------|----------|----------------|
| KStream-KStream | Stream | Stream | Yes | Yes |
| KStream-KTable | Stream | Table | No | Yes |
| KTable-KTable | Table | Table | No | Yes |
| KStream-GlobalKTable | Stream | GlobalKTable | No | No |
| KTable Foreign Key | Table | Table | No | No |

Choose the appropriate join type based on your data characteristics and processing requirements. Remember co-partitioning requirements and use GlobalKTables for small reference data that needs to be accessible from any partition.

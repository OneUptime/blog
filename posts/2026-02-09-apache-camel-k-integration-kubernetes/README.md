# How to Set Up Apache Camel K for Integration Patterns on Kubernetes Serverless

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Apache-Camel, Integration, Serverless, Knative

Description: Deploy Apache Camel K on Kubernetes to implement enterprise integration patterns with serverless capabilities for connecting systems and transforming data.

---

Apache Camel K brings the power of Apache Camel's integration patterns to Kubernetes with a serverless, cloud-native approach. It allows you to write integration routes in multiple languages and deploy them as lightweight containers that scale automatically. This guide walks through setting up Camel K and implementing common integration patterns.

## Understanding Apache Camel K

Apache Camel K extends the traditional Camel framework with Kubernetes-native capabilities. Instead of deploying monolithic integration servers, you deploy integrations as independent workloads. Each integration is built into a container that can scale independently based on load.

Camel K supports multiple DSLs including Java, XML, YAML, and Groovy. You can write simple routes in a single file and deploy them directly to Kubernetes without building container images manually. The Camel K operator handles compilation, containerization, and deployment automatically.

Integration with Knative provides serverless scaling for HTTP-based routes deployed as Knative Services. Event-driven or queue-based workloads can also use serverless-style scaling, but they need Knative Eventing or KEDA configuration that matches the event source. This can reduce resource consumption compared to always-running integration servers.

## Installing Camel K

Install the Camel K CLI and operator:

```bash
# Download and install Camel K CLI (kamel)

curl -L https://downloads.apache.org/camel/camel-k/2.10.1/camel-k-client-2.10.1-linux-amd64.tar.gz | tar xz
sudo mv kamel /usr/local/bin/

# Verify installation
kamel version

# Install the Camel K operator
kubectl create ns camel-k
kubectl apply -k github.com/apache/camel-k/install/overlays/kubernetes/descoped?ref=v2.10.1 --server-side

# Check operator status
kubectl get pods -n camel-k
```

Create an `IntegrationPlatform` with your container registry settings. Replace the registry values with the registry your cluster can push to and pull from:

```bash
kubectl apply -n camel-k -f - <<'EOF'
apiVersion: camel.apache.org/v1
kind: IntegrationPlatform
metadata:
  name: camel-k
  namespace: camel-k
spec:
  build:
    registry:
      address: registry.example.com
      organization: camel-k
EOF

kubectl wait --for jsonpath='{.status.phase}'=Ready integrationplatform/camel-k -n camel-k --timeout=60s
kubectl get integrationplatform -A
```

For Knative integration:

```bash
# Install Knative Serving first
kubectl apply -f https://github.com/knative/serving/releases/latest/download/serving-crds.yaml
kubectl apply -f https://github.com/knative/serving/releases/latest/download/serving-core.yaml
kubectl apply -f https://github.com/knative-extensions/net-kourier/releases/latest/download/kourier.yaml
kubectl patch configmap/config-network \
  --namespace knative-serving \
  --type merge \
  --patch '{"data":{"ingress-class":"kourier.ingress.networking.knative.dev"}}'

# Install Knative Eventing for channels and event routing
kubectl apply -f https://github.com/knative/eventing/releases/latest/download/eventing.yaml

# If Camel K was already installed before Knative, restart the operator
kubectl rollout restart deployment/camel-k-operator -n camel-k

# Verify Knative integration
kubectl get integrationplatform -A -o yaml | grep knative
```

## Creating Your First Integration

Create a simple file-based integration that reads files and sends them to a REST API:

```yaml
# file-to-api.yaml
# This is a Camel K Integration written in YAML DSL
- from:
    uri: "file:/data/inbox"
    parameters:
      delete: true
      include: "*.json"
    steps:
      # Log the file being processed
      - log:
          message: "Processing file: ${header.CamelFileName}"

      # Transform the data
      - setHeader:
          name: Content-Type
          constant: application/json

      # Send to REST API
      - to:
          uri: "https://api.example.com/orders"
          parameters:
            httpMethod: POST

      # Log completion
      - log:
          message: "Completed: ${header.CamelFileName}"
```

Deploy the integration:

```bash
# Deploy with an EmptyDir mounted as the data directory

kamel run file-to-api.yaml \
  --trait mount.empty-dirs=inbox-volume:/data

# Check integration status
kamel get

# View logs
kamel logs file-to-api
```

## Building a Kafka to Database Integration

Consume messages from Kafka and insert into a database:

```java
// kafka-to-database.java
import org.apache.camel.builder.RouteBuilder;
import java.util.Map;

public class KafkaToDatabase extends RouteBuilder {
    @Override
    public void configure() throws Exception {
        // Handle errors
        onException(Exception.class)
            .log("Error processing order: ${exception.message}")
            .handled(true)
            .to("kafka:orders-dlq?brokers=kafka:9092");

        // Consume from Kafka
        from("kafka:orders?brokers=kafka:9092&groupId=order-consumer")
            .routeId("kafka-to-postgres")

            // Parse JSON message
            .unmarshal().json()

            // Transform to SQL format
            .process(exchange -> {
                Map<String, Object> order = exchange.getIn().getBody(Map.class);

                String sql = String.format(
                    "INSERT INTO orders (order_id, customer_id, total, status) " +
                    "VALUES ('%s', '%s', %s, 'processing')",
                    order.get("id"),
                    order.get("customerId"),
                    order.get("total")
                );

                exchange.getIn().setBody(sql);
            })

            // Execute SQL
            .to("jdbc:camel")

            // Log success
            .log("Inserted order, rows affected: ${header.CamelJdbcUpdateCount}");
    }
}
```

Deploy with database credentials:

```bash
# Create secret for database connection
kubectl create secret generic db-credentials \
  --from-literal=quarkus.datasource.camel.username=dbuser \
  --from-literal=quarkus.datasource.camel.password=dbpass

# Deploy integration
kamel run kafka-to-database.java \
  --property quarkus.datasource.camel.db-kind=postgresql \
  --property quarkus.datasource.camel.jdbc.url=jdbc:postgresql://postgres:5432/mydb \
  --config secret:db-credentials \
  --dependency camel:jdbc \
  --dependency camel:kafka \
  --dependency mvn:org.postgresql:postgresql:42.7.11

# Monitor the integration
kamel logs kafka-to-database
```

## Implementing the Content-Based Router Pattern

Route messages to different destinations based on content:

```yaml
# content-router.yaml
- from:
    uri: "knative:channel/orders"
    steps:
      - choice:
          when:
            # High-value orders
            - simple: "${body[total]} > 1000"
              steps:
                - log: "High value order: ${body[id]}"
                - to: "knative:endpoint/priority-processor"

            # Domestic orders
            - simple: "${body[country]} == 'US'"
              steps:
                - log: "Domestic order: ${body[id]}"
                - to: "knative:endpoint/domestic-processor"

            # International orders
            - simple: "${body[country]} != 'US'"
              steps:
                - log: "International order: ${body[id]}"
                - to: "knative:endpoint/international-processor"

          # Default route
          otherwise:
            steps:
              - log: "Standard order: ${body[id]}"
              - to: "knative:endpoint/standard-processor"
```

Deploy the content-based router:

```bash
kamel run content-router.yaml \
  --profile knative \
  --trait knative-service.enabled=true \
  --trait knative-service.min-scale=0 \
  --trait knative-service.max-scale=10
```

## Building API Aggregation Patterns

Aggregate data from multiple APIs:

```groovy
// api-aggregator.groovy
import org.apache.camel.Exchange
import org.apache.camel.AggregationStrategy

from('timer:trigger?period=60000')
    .routeId('api-aggregator')

    // Call multiple APIs in parallel and aggregate results
    .multicast(new AggregationStrategy() {
        Exchange aggregate(Exchange oldExchange, Exchange newExchange) {
            if (oldExchange == null) {
                return newExchange
            }

            Map<String, Object> aggregated = oldExchange.getMessage().getBody(Map)
            Map<String, Object> newData = newExchange.getMessage().getBody(Map)
            aggregated.putAll(newData)

            oldExchange.getMessage().setBody(aggregated)
            return oldExchange
        }
    })
        .parallelProcessing()
        .to('direct:fetch-users', 'direct:fetch-orders', 'direct:fetch-inventory')
    .end()

    // Process aggregated data
    .to('direct:process-aggregated')

// Individual API routes
from('direct:fetch-users')
    .to('https://api.example.com/users?bridgeEndpoint=true')
    .unmarshal().json()
    .process { exchange ->
        exchange.in.body = [users: exchange.in.body]
    }

from('direct:fetch-orders')
    .to('https://api.example.com/orders?bridgeEndpoint=true')
    .unmarshal().json()
    .process { exchange ->
        exchange.in.body = [orders: exchange.in.body]
    }

from('direct:fetch-inventory')
    .to('https://api.example.com/inventory?bridgeEndpoint=true')
    .unmarshal().json()
    .process { exchange ->
        exchange.in.body = [inventory: exchange.in.body]
    }

from('direct:process-aggregated')
    .marshal().json()
    .to('kafka:aggregated-data?brokers=kafka:9092')
    .log('Published aggregated data')
```

Deploy the aggregator:

```bash
kamel run api-aggregator.groovy \
  --dependency camel:http \
  --dependency camel:jackson \
  --trait cron.enabled=true \
  --trait cron.schedule="*/5 * * * *"
```

## Implementing Message Transformation

Transform messages between different formats:

```java
// message-transformer.java
import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.model.dataformat.JsonLibrary;
import java.util.Map;

public class MessageTransformer extends RouteBuilder {
    @Override
    public void configure() throws Exception {
        // XML to JSON transformation
        from("direct:xml-to-json")
            .unmarshal().jacksonXml()
            .marshal().json(JsonLibrary.Jackson)
            .to("kafka:transformed-messages?brokers=kafka:9092");

        // CSV to JSON transformation
        from("file:/data/csv?include=*.csv")
            .unmarshal().csv()
            .split(body())
                .marshal().json()
                .to("kafka:csv-data?brokers=kafka:9092");

        // Data enrichment
        from("kafka:raw-events?brokers=kafka:9092")
            .unmarshal().json()
            .enrich("http://enrichment-service/enrich", (original, resource) -> {
                Map<String, Object> originalData = original.getIn().getBody(Map.class);
                Map<String, Object> enrichedData = resource.getIn().getBody(Map.class);

                originalData.put("enriched", enrichedData);
                original.getIn().setBody(originalData);

                return original;
            })
            .marshal().json()
            .to("kafka:enriched-events?brokers=kafka:9092");

        // Protocol conversion
        from("paho-mqtt5:sensor-data?serverURIs=tcp://mqtt-broker:1883")
            .convertBodyTo(String.class)
            .to("amqp:queue:sensor-data");
    }
}
```

## Error Handling and Dead Letter Channels

Implement robust error handling:

```yaml
# error-handling.yaml
- onException:
    exception:
      - "java.lang.Exception"
    # Mark as handled so message is acknowledged
    handled:
      constant:
        expression: "true"
    # Use exponential backoff for retries
    redeliveryPolicy:
      maximumRedeliveries: 3
      redeliveryDelay: 1000
      backOffMultiplier: 2
      useExponentialBackOff: true
    steps:
      - log: "Error processing message: ${exception.message}"
      - setHeader:
          name: error-message
          simple: "${exception.message}"
      - setHeader:
          name: error-stacktrace
          simple: "${exception.stacktrace}"
      # Send to dead letter queue
      - to: "kafka:orders-dlq?brokers=kafka:9092"

- from:
    uri: "kafka:orders?brokers=kafka:9092"
    steps:
      # Main processing logic
      - log: "Processing order: ${body}"
      - to: "http://order-service/process"
      - log: "Order processed successfully"
```

## Monitoring Camel K Integrations

Monitor integration health and performance:

```bash
# Check integration status
kamel get

# View integration details
kubectl describe integration kafka-to-database

# View logs
kamel logs kafka-to-database

# Check metrics
kubectl port-forward service/kafka-to-database 8080:8080
curl http://localhost:8080/q/metrics

# View health checks
curl http://localhost:8080/q/health
```

Add custom metrics:

```java
// custom-metrics.java
import org.apache.camel.builder.RouteBuilder;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.concurrent.TimeUnit;

public class CustomMetrics extends RouteBuilder {
    @Override
    public void configure() throws Exception {
        MeterRegistry registry = getContext()
            .getRegistry()
            .lookupByType(MeterRegistry.class)
            .iterator()
            .next();

        from("kafka:orders?brokers=kafka:9092")
            .routeId("order-processor")

            // Capture processing start time
            .process(exchange -> {
                exchange.setProperty("start_time", System.currentTimeMillis());
            })

            // Increment counter
            .process(exchange -> {
                registry.counter("orders_processed_total",
                    "status", "received").increment();
            })

            // Process order
            .to("direct:process-order")

            // Record processing time
            .process(exchange -> {
                Long startTime = exchange.getProperty("start_time", Long.class);
                double duration = (System.currentTimeMillis() - startTime) / 1000.0;

                registry.timer("order_processing_duration_seconds")
                    .record(duration, TimeUnit.SECONDS);
            });
    }
}
```

## Best Practices

Keep integrations focused. Each integration should handle a specific flow. Avoid creating monolithic integrations that do everything.

Use appropriate data formats. Choose JSON for flexibility, Avro for schema evolution, or binary formats for performance. Match the format to your use case.

Implement proper error handling. Always configure error handlers and dead letter channels. Log errors with enough context to debug issues.

Optimize for serverless. Design integrations to start quickly and handle single messages efficiently. Avoid long-running initialization code.

Monitor integration performance. Track message throughput, processing latency, and error rates. Set up alerts for anomalies.

Version your integrations. Use Git to track changes and implement proper CI/CD pipelines for deploying integrations.

Test thoroughly. Write unit tests for transformation logic and integration tests for complete flows. Use Camel's testing framework.

## Conclusion

Apache Camel K brings enterprise integration patterns to Kubernetes with serverless capabilities. By combining Camel's rich library of connectors and patterns with Kubernetes-native deployment and Knative's auto-scaling, you can build sophisticated integration solutions that are both powerful and efficient. The ability to write integrations in multiple languages and deploy them without building containers manually accelerates development while maintaining production-grade reliability and scalability.

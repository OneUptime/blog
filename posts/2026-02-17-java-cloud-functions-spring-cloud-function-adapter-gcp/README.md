# How to Write Java Cloud Functions Using the Spring Cloud Function Adapter for GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Java, Spring Cloud Function, Spring Boot, Serverless, Google Cloud

Description: Write Java Cloud Functions using the Spring Cloud Function adapter for GCP to leverage Spring Boot dependency injection and configuration in serverless functions.

---

Cloud Functions is Google's serverless compute platform for event-driven workloads. While most Cloud Functions examples use Node.js or Python, Java is a first-class runtime. The Spring Cloud Function adapter for GCP lets you write Cloud Functions using the Spring programming model - with dependency injection, configuration management, and all the Spring Boot features you are used to.

This means you can share code, configuration patterns, and dependencies between your Spring Boot microservices and your Cloud Functions. In this post, I will show you how to set up Spring Cloud Function for GCP, write HTTP and event-driven functions, handle dependency injection, and deploy to Cloud Functions Gen2.

## Project Setup

Start with a Spring Boot project and add the Cloud Function adapter.

```xml
<!-- pom.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
  https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
  </parent>

  <groupId>com.example</groupId>
  <artifactId>spring-cloud-function-gcp</artifactId>
  <version>1.0.0</version>

  <properties>
    <java.version>21</java.version>
    <spring-cloud.version>2023.0.0</spring-cloud.version>
  </properties>

  <dependencies>
    <!-- Spring Cloud Function adapter for GCP -->
    <dependency>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-function-adapter-gcp</artifactId>
    </dependency>

    <!-- Spring Boot Web is not needed for functions -->
    <!-- But you can include any Spring Boot starters you need -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter</artifactId>
    </dependency>

    <!-- JSON processing -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-json</artifactId>
    </dependency>

    <!-- Cloud Functions framework -->
    <dependency>
      <groupId>com.google.cloud.functions</groupId>
      <artifactId>functions-framework-api</artifactId>
      <version>1.1.0</version>
      <scope>provided</scope>
    </dependency>
  </dependencies>

  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-dependencies</artifactId>
        <version>${spring-cloud.version}</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
    </dependencies>
  </dependencyManagement>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
        <configuration>
          <!-- Required for Cloud Functions deployment -->
          <outputDirectory>target/deploy</outputDirectory>
        </configuration>
        <executions>
          <execution>
            <id>generate-classpath</id>
            <goals>
              <goal>repackage</goal>
            </goals>
          </execution>
        </executions>
      </plugin>
      <!-- Copy dependencies for Cloud Functions -->
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-shade-plugin</artifactId>
        <executions>
          <execution>
            <phase>package</phase>
            <goals>
              <goal>shade</goal>
            </goals>
            <configuration>
              <createDependencyReducedPom>false</createDependencyReducedPom>
            </configuration>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
```

## Writing Your First Function

With Spring Cloud Function, you define functions as Spring beans that implement `Function`, `Consumer`, or `Supplier`.

```java
// src/main/java/com/example/functions/Application.java
package com.example.functions;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.util.function.Function;

@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    // A simple function that transforms input to output
    // This becomes available as an HTTP Cloud Function
    @Bean
    public Function<OrderRequest, OrderResponse> processOrder() {
        return request -> {
            // Process the order
            String orderId = "ORD-" + System.currentTimeMillis();

            return new OrderResponse(
                orderId,
                request.getCustomerName(),
                request.getTotal(),
                "CONFIRMED"
            );
        };
    }
}
```

## Defining Request and Response Types

```java
// src/main/java/com/example/functions/OrderRequest.java
package com.example.functions;

public class OrderRequest {
    private String customerName;
    private String customerEmail;
    private double total;
    private String[] items;

    // Default constructor required for deserialization
    public OrderRequest() {}

    public OrderRequest(String customerName, String customerEmail,
                        double total, String[] items) {
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.total = total;
        this.items = items;
    }

    // Getters and setters
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }
    public double getTotal() { return total; }
    public void setTotal(double total) { this.total = total; }
    public String[] getItems() { return items; }
    public void setItems(String[] items) { this.items = items; }
}
```

```java
// src/main/java/com/example/functions/OrderResponse.java
package com.example.functions;

public class OrderResponse {
    private String orderId;
    private String customerName;
    private double total;
    private String status;

    public OrderResponse() {}

    public OrderResponse(String orderId, String customerName,
                         double total, String status) {
        this.orderId = orderId;
        this.customerName = customerName;
        this.total = total;
        this.status = status;
    }

    // Getters and setters
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public double getTotal() { return total; }
    public void setTotal(double total) { this.total = total; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
```

## Using Dependency Injection in Functions

The real power of Spring Cloud Function is that your functions are full Spring beans with access to dependency injection.

```java
// src/main/java/com/example/functions/services/NotificationService.java
package com.example.functions.services;

import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class NotificationService {
    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    public void sendOrderConfirmation(String email, String orderId) {
        logger.info("Sending confirmation email to {} for order {}", email, orderId);
        // Actual email sending logic here
    }

    public void sendShippingNotification(String email, String trackingNumber) {
        logger.info("Sending shipping notification to {} with tracking {}", email, trackingNumber);
    }
}
```

```java
// src/main/java/com/example/functions/services/OrderService.java
package com.example.functions.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class OrderService {
    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);

    @Value("${order.tax-rate:0.08}")
    private double taxRate;

    public double calculateTotal(double subtotal) {
        double total = subtotal * (1 + taxRate);
        logger.info("Calculated total: {} (subtotal: {}, tax rate: {})", total, subtotal, taxRate);
        return total;
    }

    public String generateOrderId() {
        return "ORD-" + System.currentTimeMillis();
    }
}
```

```java
// Function with dependency injection
// src/main/java/com/example/functions/OrderFunctions.java
package com.example.functions;

import com.example.functions.services.NotificationService;
import com.example.functions.services.OrderService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.function.Function;
import java.util.function.Consumer;

@Configuration
public class OrderFunctions {

    private final OrderService orderService;
    private final NotificationService notificationService;

    // Constructor injection - Spring wires the dependencies automatically
    public OrderFunctions(OrderService orderService,
                          NotificationService notificationService) {
        this.orderService = orderService;
        this.notificationService = notificationService;
    }

    // HTTP function that processes orders with injected services
    @Bean
    public Function<OrderRequest, OrderResponse> processOrder() {
        return request -> {
            String orderId = orderService.generateOrderId();
            double total = orderService.calculateTotal(request.getTotal());

            // Send notification using the injected service
            notificationService.sendOrderConfirmation(
                request.getCustomerEmail(), orderId
            );

            return new OrderResponse(orderId, request.getCustomerName(), total, "CONFIRMED");
        };
    }

    // Consumer function for event-driven processing (no return value)
    @Bean
    public Consumer<ShippingEvent> handleShipping() {
        return event -> {
            notificationService.sendShippingNotification(
                event.getCustomerEmail(),
                event.getTrackingNumber()
            );
        };
    }
}
```

## Configuration

```yaml
# src/main/resources/application.yml
spring:
  cloud:
    function:
      # Specify which function to activate
      # This can be overridden by the SPRING_CLOUD_FUNCTION_DEFINITION env var
      definition: processOrder

# Custom configuration
order:
  tax-rate: 0.08

logging:
  level:
    com.example: DEBUG
```

## Multiple Functions in One Deployment

You can deploy multiple functions from the same codebase. Specify which function to activate using an environment variable.

```bash
# Deploy the processOrder function
gcloud functions deploy process-order \
  --gen2 \
  --runtime java21 \
  --trigger-http \
  --region us-central1 \
  --memory 512MB \
  --timeout 60 \
  --entry-point org.springframework.cloud.function.adapter.gcp.GcfJarLauncher \
  --source target/deploy \
  --set-env-vars "SPRING_CLOUD_FUNCTION_DEFINITION=processOrder"

# Deploy the handleShipping function (Pub/Sub triggered)
gcloud functions deploy handle-shipping \
  --gen2 \
  --runtime java21 \
  --trigger-topic shipping-events \
  --region us-central1 \
  --memory 512MB \
  --timeout 120 \
  --entry-point org.springframework.cloud.function.adapter.gcp.GcfJarLauncher \
  --source target/deploy \
  --set-env-vars "SPRING_CLOUD_FUNCTION_DEFINITION=handleShipping"
```

## Event-Driven Functions with Pub/Sub

Spring Cloud Function handles Pub/Sub messages transparently. The message data is deserialized into your function's input type.

```java
// Pub/Sub triggered function
@Bean
public Consumer<PubSubMessage> processEvent() {
    return message -> {
        String data = new String(
            java.util.Base64.getDecoder().decode(message.getData()),
            java.nio.charset.StandardCharsets.UTF_8
        );
        logger.info("Received Pub/Sub message: {}", data);
        // Process the message
    };
}
```

## Function Composition

Spring Cloud Function supports composing functions together.

```java
// Compose functions using the pipe operator
// validate | enrich | process

@Bean
public Function<OrderRequest, OrderRequest> validate() {
    return request -> {
        if (request.getCustomerName() == null) {
            throw new IllegalArgumentException("Customer name is required");
        }
        return request;
    };
}

@Bean
public Function<OrderRequest, OrderRequest> enrich() {
    return request -> {
        // Add computed fields
        request.setTotal(orderService.calculateTotal(request.getTotal()));
        return request;
    };
}

@Bean
public Function<OrderRequest, OrderResponse> confirm() {
    return request -> {
        String orderId = orderService.generateOrderId();
        return new OrderResponse(orderId, request.getCustomerName(),
            request.getTotal(), "CONFIRMED");
    };
}
```

```yaml
# Compose functions with the pipe operator
spring:
  cloud:
    function:
      definition: validate|enrich|confirm
```

## Building for Deployment

```bash
# Build the project
mvn clean package

# The deployable JAR is in target/deploy/
ls target/deploy/
```

## Testing Locally

Run the function locally using the Spring Boot embedded server.

```bash
# Run locally for testing
mvn spring-boot:run

# Test with curl
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"customerName": "Jane", "customerEmail": "jane@example.com", "total": 99.99, "items": ["item1", "item2"]}'
```

## Reducing Cold Start Time

Java Cloud Functions can have significant cold starts. Here are strategies to reduce them:

```yaml
# application.yml - Optimize for function startup
spring:
  main:
    lazy-initialization: true
    banner-mode: off
  jmx:
    enabled: false
  autoconfigure:
    exclude:
      - org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
      - org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration
```

You can also set a minimum instance count to keep functions warm.

```bash
# Keep at least one instance warm
gcloud functions deploy process-order \
  --gen2 \
  --min-instances 1 \
  --runtime java21 \
  --entry-point org.springframework.cloud.function.adapter.gcp.GcfJarLauncher \
  --source target/deploy
```

Spring Cloud Function for GCP gives you the best of both worlds - the productivity and ecosystem of Spring Boot with the operational simplicity of Cloud Functions. You can share code and patterns between your microservices and your serverless functions, use dependency injection for clean architecture, and leverage the full Spring configuration system. The cold start trade-off is real for Java, but keeping minimum instances warm handles that for latency-sensitive functions.

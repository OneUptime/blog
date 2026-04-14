# How to Use Dapr with SLF4J in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SLF4J, Java, Logging, Observability

Description: Use SLF4J with Dapr Java applications to emit structured logs with MDC context from distributed trace headers, compatible with Logback and Log4j backends.

---

## SLF4J as a Logging Facade for Dapr

SLF4J (Simple Logging Facade for Java) is the standard logging API used by most Java frameworks including the Dapr Java SDK itself. By using SLF4J with MDC (Mapped Diagnostic Context), you can correlate Dapr logs with your application logs regardless of the backend (Logback, Log4j 2, JUL).

```xml
<!-- pom.xml - SLF4J with Logback backend -->
<dependencies>
    <dependency>
        <groupId>io.dapr</groupId>
        <artifactId>dapr-sdk-springboot</artifactId>
        <version>1.12.0</version>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <!-- Logback is default in Spring Boot, or use Log4j2 -->
    <dependency>
        <groupId>net.logstash.logback</groupId>
        <artifactId>logstash-logback-encoder</artifactId>
        <version>7.4</version>
    </dependency>
</dependencies>
```

## Logback Configuration with JSON Output

```xml
<!-- src/main/resources/logback-spring.xml -->
<configuration>
    <springProfile name="production">
        <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LogstashEncoder">
                <includeMdcKeyName>traceId</includeMdcKeyName>
                <includeMdcKeyName>spanId</includeMdcKeyName>
                <includeMdcKeyName>daprAppId</includeMdcKeyName>
                <customFields>{"service":"order-service","env":"production"}</customFields>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="JSON"/>
        </root>
    </springProfile>

    <springProfile name="development">
        <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{HH:mm:ss} %-5level %logger{36} [%X{traceId}] - %msg%n</pattern>
            </encoder>
        </appender>
        <root level="DEBUG">
            <appender-ref ref="STDOUT"/>
        </root>
    </springProfile>
</configuration>
```

## Using SLF4J in Dapr Controllers

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import io.dapr.client.DaprClient;

@RestController
@RequestMapping("/api")
public class ProductController {

    private static final Logger log = LoggerFactory.getLogger(ProductController.class);
    private final DaprClient daprClient;

    @GetMapping("/products/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable String id,
                                               @RequestHeader Map<String, String> headers) {
        // Populate MDC from Dapr headers
        populateMdcFromDaprHeaders(headers);

        try {
            log.info("Fetching product productId={}", id);

            var state = daprClient.getState("statestore", "product-" + id, Product.class).block();

            if (state == null || state.getValue() == null) {
                log.warn("Product not found in state store productId={}", id);
                return ResponseEntity.notFound().build();
            }

            log.info("Product retrieved successfully productId={} name={}",
                id, state.getValue().getName());

            return ResponseEntity.ok(state.getValue());
        } catch (Exception e) {
            log.error("Error fetching product productId={}", id, e);
            return ResponseEntity.status(500).build();
        } finally {
            MDC.clear();
        }
    }

    private void populateMdcFromDaprHeaders(Map<String, String> headers) {
        String traceParent = headers.getOrDefault("traceparent", "");
        if (!traceParent.isEmpty()) {
            String[] parts = traceParent.split("-");
            if (parts.length >= 3) {
                MDC.put("traceId", parts[1]);
                MDC.put("spanId", parts[2]);
            }
        }
        MDC.put("daprAppId", headers.getOrDefault("dapr-app-id", "external"));
    }
}
```

## SLF4J Filter for Dapr Servlet

```java
// Servlet filter to auto-populate MDC for all Dapr requests
@Component
@Order(1)
public class DaprMdcFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                         FilterChain chain) throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;

        String traceParent = httpRequest.getHeader("traceparent");
        String daprAppId = httpRequest.getHeader("dapr-app-id");
        String daprCallerId = httpRequest.getHeader("dapr-caller-app-id");

        if (traceParent != null && !traceParent.isEmpty()) {
            String[] parts = traceParent.split("-");
            if (parts.length >= 3) {
                MDC.put("traceId", parts[1]);
                MDC.put("spanId", parts[2]);
            }
        }
        MDC.put("daprAppId", daprAppId != null ? daprAppId : "");
        MDC.put("callerAppId", daprCallerId != null ? daprCallerId : "");

        try {
            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
```

## Summary

SLF4J's MDC provides the ideal mechanism for correlating Dapr-specific trace headers with your Java application logs. By implementing a servlet filter that populates MDC at the request boundary, every log statement in your Dapr service automatically includes trace identifiers. This approach works with any SLF4J backend (Logback, Log4j 2) and makes logs searchable in centralized platforms like ELK or Grafana Loki.

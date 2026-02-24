# How to Propagate Trace Headers in Java Applications with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Java, Distributed Tracing, Spring Boot, Observability

Description: Detailed guide on propagating Istio trace headers in Java applications using Spring Boot, RestTemplate, WebClient, and manual HTTP clients.

---

Distributed tracing is one of the most valuable features Istio provides. But there is a catch - Istio can only create trace spans at the sidecar level. For those spans to connect into a full trace across multiple services, your application code needs to propagate the trace headers from incoming requests to outgoing requests. The sidecar cannot do this for you because it has no way to know which outgoing request was triggered by which incoming request.

In Java, there are several ways to handle this depending on your framework and HTTP client.

## Which Headers to Propagate

Istio supports both Zipkin B3 and W3C Trace Context formats. Propagate all of them to ensure compatibility:

```java
public static final List<String> TRACE_HEADERS = List.of(
    "x-request-id",
    "x-b3-traceid",
    "x-b3-spanid",
    "x-b3-parentspanid",
    "x-b3-sampled",
    "x-b3-flags",
    "b3",
    "traceparent",
    "tracestate"
);
```

## Method 1: Spring Boot with RestTemplate

### Create a Request Interceptor

```java
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.List;

public class TraceHeaderInterceptor implements ClientHttpRequestInterceptor {

    private static final List<String> TRACE_HEADERS = List.of(
        "x-request-id", "x-b3-traceid", "x-b3-spanid",
        "x-b3-parentspanid", "x-b3-sampled", "x-b3-flags",
        "b3", "traceparent", "tracestate"
    );

    @Override
    public ClientHttpResponse intercept(
            HttpRequest request,
            byte[] body,
            ClientHttpRequestExecution execution) throws IOException {

        ServletRequestAttributes attrs =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

        if (attrs != null) {
            HttpServletRequest servletRequest = attrs.getRequest();
            for (String header : TRACE_HEADERS) {
                String value = servletRequest.getHeader(header);
                if (value != null) {
                    request.getHeaders().set(header, value);
                }
            }
        }

        return execution.execute(request, body);
    }
}
```

### Register the Interceptor

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getInterceptors().add(new TraceHeaderInterceptor());
        return restTemplate;
    }
}
```

### Use It in Your Controller

```java
@RestController
public class OrderController {

    @Autowired
    private RestTemplate restTemplate;

    @GetMapping("/api/orders/{id}")
    public ResponseEntity<?> getOrder(@PathVariable Long id) {
        // Trace headers are automatically propagated
        String products = restTemplate.getForObject(
            "http://product-service:8080/api/products", String.class);

        String inventory = restTemplate.getForObject(
            "http://inventory-service:8080/api/stock", String.class);

        return ResponseEntity.ok(Map.of(
            "orderId", id,
            "products", products,
            "inventory", inventory
        ));
    }
}
```

## Method 2: Spring Boot with WebClient (Reactive)

For reactive applications using WebClient:

```java
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

@Configuration
public class WebClientConfig {

    private static final List<String> TRACE_HEADERS = List.of(
        "x-request-id", "x-b3-traceid", "x-b3-spanid",
        "x-b3-parentspanid", "x-b3-sampled", "x-b3-flags",
        "b3", "traceparent", "tracestate"
    );

    @Bean
    public WebClient webClient() {
        return WebClient.builder()
            .filter(traceHeaderFilter())
            .build();
    }

    private ExchangeFilterFunction traceHeaderFilter() {
        return ExchangeFilterFunction.ofRequestProcessor(clientRequest ->
            Mono.deferContextual(contextView -> {
                ClientRequest.Builder builder = ClientRequest.from(clientRequest);

                for (String header : TRACE_HEADERS) {
                    contextView.<String>getOrEmpty(header)
                        .ifPresent(value -> builder.header(header, value));
                }

                return Mono.just(builder.build());
            })
        );
    }
}
```

Capture headers in a WebFilter:

```java
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;
import reactor.util.context.Context;

@Component
public class TraceContextWebFilter implements WebFilter {

    private static final List<String> TRACE_HEADERS = List.of(
        "x-request-id", "x-b3-traceid", "x-b3-spanid",
        "x-b3-parentspanid", "x-b3-sampled", "x-b3-flags",
        "b3", "traceparent", "tracestate"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        return chain.filter(exchange)
            .contextWrite(ctx -> {
                Context context = ctx;
                for (String header : TRACE_HEADERS) {
                    String value = exchange.getRequest().getHeaders().getFirst(header);
                    if (value != null) {
                        context = context.put(header, value);
                    }
                }
                return context;
            });
    }
}
```

## Method 3: Using a Servlet Filter (Framework-Agnostic)

For non-Spring Java applications, use a servlet filter with ThreadLocal storage:

```java
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class TraceHeaderFilter implements Filter {

    private static final List<String> TRACE_HEADERS = List.of(
        "x-request-id", "x-b3-traceid", "x-b3-spanid",
        "x-b3-parentspanid", "x-b3-sampled", "x-b3-flags",
        "b3", "traceparent", "tracestate"
    );

    private static final ThreadLocal<Map<String, String>> traceContext =
        ThreadLocal.withInitial(HashMap::new);

    public static Map<String, String> getTraceHeaders() {
        return traceContext.get();
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                         FilterChain chain) throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;

        Map<String, String> headers = new HashMap<>();
        for (String header : TRACE_HEADERS) {
            String value = httpRequest.getHeader(header);
            if (value != null) {
                headers.put(header, value);
            }
        }

        traceContext.set(headers);
        try {
            chain.doFilter(request, response);
        } finally {
            traceContext.remove();
        }
    }
}
```

Use it with any HTTP client:

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;

public class ServiceClient {

    private final HttpClient client = HttpClient.newHttpClient();

    public String callService(String url) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .GET();

        // Add trace headers from the current request context
        Map<String, String> traceHeaders = TraceHeaderFilter.getTraceHeaders();
        for (Map.Entry<String, String> entry : traceHeaders.entrySet()) {
            builder.header(entry.getKey(), entry.getValue());
        }

        HttpResponse<String> response = client.send(
            builder.build(), HttpResponse.BodyHandlers.ofString());

        return response.body();
    }
}
```

## Method 4: Using OpenTelemetry Auto-Instrumentation

The easiest approach is to use OpenTelemetry's Java agent, which automatically handles trace header propagation for supported libraries:

```yaml
containers:
- name: order-service
  image: myregistry/order-service:1.0.0
  env:
  - name: JAVA_TOOL_OPTIONS
    value: "-javaagent:/opt/opentelemetry-javaagent.jar"
  - name: OTEL_SERVICE_NAME
    value: "order-service"
  - name: OTEL_PROPAGATORS
    value: "tracecontext,baggage,b3multi"
  - name: OTEL_TRACES_EXPORTER
    value: "none"
```

Setting `OTEL_TRACES_EXPORTER=none` is important because Istio handles trace export. You just need the agent for header propagation.

The Java agent automatically instruments:
- Spring RestTemplate and WebClient
- Apache HttpClient
- OkHttp
- java.net.HttpURLConnection
- gRPC
- JDBC
- Kafka clients

This means you do not need to write any propagation code yourself. The agent intercepts HTTP calls and adds trace headers automatically.

## Method 5: gRPC Services

For gRPC services, use interceptors:

```java
import io.grpc.*;

public class TraceHeaderClientInterceptor implements ClientInterceptor {

    private static final List<String> TRACE_HEADERS = List.of(
        "x-request-id", "x-b3-traceid", "x-b3-spanid",
        "x-b3-parentspanid", "x-b3-sampled", "x-b3-flags",
        "b3", "traceparent", "tracestate"
    );

    @Override
    public <ReqT, RespT> ClientCall<ReqT, RespT> interceptCall(
            MethodDescriptor<ReqT, RespT> method,
            CallOptions callOptions,
            Channel next) {

        return new ForwardingClientCall.SimpleForwardingClientCall<>(
                next.newCall(method, callOptions)) {
            @Override
            public void start(Listener<RespT> responseListener, Metadata headers) {
                Map<String, String> traceHeaders = TraceHeaderFilter.getTraceHeaders();
                for (Map.Entry<String, String> entry : traceHeaders.entrySet()) {
                    Metadata.Key<String> key = Metadata.Key.of(
                        entry.getKey(), Metadata.ASCII_STRING_MARSHALLER);
                    headers.put(key, entry.getValue());
                }
                super.start(responseListener, headers);
            }
        };
    }
}
```

Register it with your gRPC channel:

```java
ManagedChannel channel = ManagedChannelBuilder
    .forAddress("payment-service", 9090)
    .usePlaintext()
    .intercept(new TraceHeaderClientInterceptor())
    .build();
```

## Verifying Propagation

After implementing header propagation, verify it works:

```bash
# Send a request with trace headers
curl -H "x-b3-traceid: 463ac35c9f6413ad48485a3953bb6124" \
     -H "x-b3-spanid: 0020000000000001" \
     -H "x-b3-sampled: 1" \
     http://order-service:8080/api/orders/1

# Check the sidecar logs for the downstream call
kubectl logs order-service-xxx -c istio-proxy | grep "463ac35c9f6413ad48485a3953bb6124"
```

If you see the same trace ID in the downstream service's sidecar logs, propagation is working correctly.

## Common Mistakes

**Not propagating in async handlers**: If you use `@Async` in Spring, the ThreadLocal context is lost. Use the reactive approach or explicitly pass headers.

**Creating new threads**: Thread pools do not inherit ThreadLocal values. Wrap your executors to propagate the trace context.

**Forgetting some headers**: Propagating only `x-b3-traceid` but not `x-b3-spanid` or `x-b3-sampled` breaks the trace chain. Always propagate the full set.

**Not handling the `b3` single header**: The `b3` header is a compact format that combines all B3 fields into one header. Make sure you propagate it alongside the individual headers.

Getting trace header propagation right in Java takes some initial setup, but once it is in place, you get full end-to-end visibility across your services. The OpenTelemetry agent approach requires the least code changes, while the manual approaches give you more control.

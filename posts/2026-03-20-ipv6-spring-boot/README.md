# How to Configure IPv6 in Spring Boot Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, IPv6, Spring Boot, HTTP, REST API, Web

Description: Configure IPv6 support in Spring Boot applications including server binding, client IP extraction, request logging, and RestTemplate/WebClient usage.

## Binding Spring Boot to IPv6

```properties
# application.properties

server.address=::
server.port=8080
```

Or bind to a specific IPv6 address:

```properties
server.address=2001:db8::1
server.port=8080
```

If you prefer Java configuration on Spring Boot 3.x, configure the embedded Tomcat:

```java
import java.net.InetAddress;
import java.net.UnknownHostException;

import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ServerConfig {

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> ipv6Customizer()
            throws UnknownHostException {
        InetAddress ipv6AnyLocal = InetAddress.getByName("::");

        return factory -> factory.setAddress(ipv6AnyLocal);
    }
}
```

## Extracting Client IPv6 Address

Use `request.getRemoteAddr()` for the address reported by the servlet container. If your app is behind a trusted proxy, either configure forwarded-header support or only trust headers that proxy sets.

```java
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ClientIPController {

    @GetMapping("/my-ip")
    public String getClientIP(HttpServletRequest request) {
        String ip = getRemoteIP(request);
        return "Your IP: " + ip;
    }

    private String getRemoteIP(HttpServletRequest request) {
        // Only trust these headers if they are added by a proxy you control.
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }

        String realIP = request.getHeader("X-Real-IP");
        if (realIP != null && !realIP.isBlank()) {
            return realIP;
        }

        return request.getRemoteAddr();
    }
}
```

## IPv6 in Spring Security Allowed Addresses

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth
            // Allow health checks from an IPv6 monitoring subnet
            .requestMatchers("/health").access(
                new WebExpressionAuthorizationManager("hasIpAddress('2001:db8::/64')"))
            // Restrict admin to loopback (IPv4 or IPv6)
            .requestMatchers("/admin/**").access(
                new WebExpressionAuthorizationManager(
                    "hasIpAddress('127.0.0.1') or hasIpAddress('::1')"))
            .anyRequest().authenticated()
        );
        return http.build();
    }
}
```

## WebClient for IPv6 REST Calls

Spring WebClient (reactive) connects to IPv6 backends using bracket notation in URLs:

```java
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
public class IPv6BackendClient {

    private final WebClient webClient;

    public IPv6BackendClient() {
        this.webClient = WebClient.builder()
            .baseUrl("http://[2001:db8::10]:8080")
            .defaultHeader("Content-Type", "application/json")
            .build();
    }

    public Mono<String> getHealth() {
        return webClient.get()
            .uri("/health")
            .retrieve()
            .bodyToMono(String.class);
    }

    public Mono<String> postData(String body) {
        return webClient.post()
            .uri("/data")
            .bodyValue(body)
            .retrieve()
            .bodyToMono(String.class);
    }
}
```

## RestTemplate for IPv6 (Synchronous)

```java
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Service
public class IPv6RestClient {

    private final RestTemplate restTemplate;

    public IPv6RestClient(RestTemplateBuilder builder) {
        this.restTemplate = builder
            .connectTimeout(Duration.ofSeconds(5))
            .readTimeout(Duration.ofSeconds(10))
            .build();
    }

    public String getFromIPv6Service(String ipv6Addr, int port, String path) {
        // IPv6 URL requires brackets around the address
        String url = String.format("http://[%s]:%d%s", ipv6Addr, port, path);
        return restTemplate.getForObject(url, String.class);
    }
}
```

## Logging IPv6 Requests with Filter

```java
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import java.io.IOException;

@Component
public class IPv6LoggingFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                         FilterChain chain) throws IOException, ServletException {
        HttpServletRequest httpReq = (HttpServletRequest) request;
        String addr = httpReq.getRemoteAddr();
        String method = httpReq.getMethod();
        String uri = httpReq.getRequestURI();

        System.out.printf("[%s] %s %s%n", addr, method, uri);
        chain.doFilter(request, response);
    }
}
```

## Conclusion

Spring Boot accepts IPv6 bind addresses through the `server.address` property, including the any-local address `::`. On dual-stack JVM/OS setups, binding to `::` can accept both IPv6 and IPv4 traffic. `request.getRemoteAddr()` returns the remote address reported by the servlet container, and proxy headers should be trusted only when they come from a known proxy. For outbound connections, WebClient and RestTemplate both accept IPv6 URLs with brackets. Spring Security IP checks support both IPv4 and IPv6 addresses or ranges for IP-based access control.

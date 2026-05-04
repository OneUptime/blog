# How to Configure Spring Boot for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Spring Boot, Java, IPv6, Tomcat, Netty, Web Framework, Dual-Stack

Description: Configure Spring Boot embedded servers (Tomcat, Netty) to listen on IPv6 addresses, handle IPv6 client addresses, and deploy in dual-stack environments.

## Introduction

Spring Boot embeds Tomcat, Jetty, or Netty as the web server. All three support IPv6. The configuration varies slightly by server, but the core approach is the same: bind to `0.0.0.0` and `::` or a specific IPv6 address.

## Step 1: application.properties for IPv6

```properties
# application.properties

# Bind to all IPv4 interfaces (IPv4 wildcard only)

server.address=0.0.0.0

# Leave server.address unset to use the underlying server default (typically 0.0.0.0)

# To bind to IPv6 only
# server.address=::

# To bind to a specific IPv6 address
# server.address=2001:db8::1

server.port=8080
```

## Step 2: Programmatic Tomcat IPv6 Configuration

```java
// TomcatConfig.java
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TomcatConfig {

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatIPv6() {
        return factory -> {
            // Bind to all IPv6 and IPv4 addresses
            factory.setAddress(java.net.InetAddress.getByName("::"));

            // Or specific IPv6 address
            // factory.setAddress(java.net.InetAddress.getByName("2001:db8::1"));

            factory.setPort(8080);
        };
    }
}
```

## Step 3: Reactive Server (Netty) for IPv6

```java
// NettyConfig.java
import org.springframework.boot.web.embedded.netty.NettyReactiveWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.netty.http.server.HttpServer;

@Configuration
public class NettyConfig {

    @Bean
    public WebServerFactoryCustomizer<NettyReactiveWebServerFactory> nettyIPv6() {
        return factory -> factory.addServerCustomizers(
            httpServer -> httpServer
                .host("::")          // All IPv6 interfaces
                .port(8080)
        );
    }
}
```

## Step 4: Get Client IPv6 Address in Controller

```java
// IpController.java
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;

@RestController
public class IpController {

    @GetMapping("/client-ip")
    public String getClientIP(HttpServletRequest request) {
        // Check X-Forwarded-For first (when behind proxy)
        String xff = request.getHeader("X-Forwarded-For");
        String ip;
        if (xff != null && !xff.isEmpty()) {
            ip = xff.split(",")[0].trim();
        } else {
            ip = request.getRemoteAddr();
        }

        // Normalize IPv4-mapped IPv6 addresses
        if (ip.startsWith("::ffff:")) {
            ip = ip.substring(7);
        }

        return ip;
    }

    @GetMapping("/ip-info")
    public java.util.Map<String, Object> ipInfo(HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        try {
            InetAddress addr = InetAddress.getByName(ip);
            return java.util.Map.of(
                "address", ip,
                "isIPv6", addr instanceof java.net.Inet6Address,
                "isLoopback", addr.isLoopbackAddress(),
                "isSiteLocal", addr.isSiteLocalAddress()
            );
        } catch (Exception e) {
            return java.util.Map.of("address", ip);
        }
    }
}
```

## Step 5: WebMVC Config with IPv6 CORS

```java
// WebConfig.java
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins(
                "https://example.com",
                "https://[2001:db8::1]"  // IPv6 origin
            )
            .allowedMethods("GET", "POST");
    }
}
```

## Step 6: Test

```bash
# Start Spring Boot
./mvnw spring-boot:run

# Test via IPv6
curl -6 http://[::1]:8080/client-ip
curl -6 http://[2001:db8::1]:8080/ip-info

# Verify listening on IPv6
ss -lntp | grep :8080
# tcp  LISTEN  0  100  [::]:8080  [::]:*  users:(("java",...))
```

## Conclusion

When `server.address` is unset, Spring Boot delegates to the embedded server's default, which is typically the IPv4 wildcard (`0.0.0.0`). To accept IPv6 (and, on a dual-stack JVM, IPv4 via IPv4-mapped addresses), set `server.address=::` in `application.properties` or programmatically via `TomcatServletWebServerFactory`. Normalize IPv4-mapped IPv6 addresses in client IP extraction code. Monitor Spring Boot with OneUptime's HTTP checks targeting IPv6 addresses.

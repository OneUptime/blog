# How to Configure Spring Boot to Bind to a Specific IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Spring Boot, Java, IPv4, Networking, Configuration, REST API

Description: Learn how to configure a Spring Boot application to bind its embedded server to a specific IPv4 address using application properties, environment variables, and programmatic configuration.

## application.properties

```properties
# Bind to all IPv4 interfaces

server.address=0.0.0.0
server.port=8080

# Bind to localhost only (for services behind a local reverse proxy)
# server.address=127.0.0.1

# Bind to specific network interface
# server.address=192.168.1.10
```

## application.yml

```yaml
server:
  address: 0.0.0.0   # Change to 127.0.0.1 or specific IP as needed
  port: 8080
```

## Environment Variable Override

```bash
# Spring Boot reads SERVER_ADDRESS and SERVER_PORT env vars automatically
SERVER_ADDRESS=192.168.1.10 SERVER_PORT=8080 java -jar app.jar

# Or as JVM system properties
java -Dserver.address=192.168.1.10 -Dserver.port=8080 -jar app.jar
```

## Programmatic Configuration

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.util.HashMap;
import java.util.Map;

@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(Application.class);

        Map<String, Object> defaults = new HashMap<>();
        defaults.put("server.address", System.getenv().getOrDefault("BIND_ADDRESS", "0.0.0.0"));
        defaults.put("server.port",    System.getenv().getOrDefault("PORT", "8080"));

        app.setDefaultProperties(defaults);
        app.run(args);
    }
}
```

## Profile-Based Bind Addresses

```yaml
# application-dev.yml
server:
  address: 127.0.0.1
  port: 8080

# application-prod.yml
server:
  address: 0.0.0.0
  port: 8080
```

```bash
# Activate profile
java -Dspring.profiles.active=prod -jar app.jar
```

## Getting Client IP in a Controller

```java
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class IpController {

    @GetMapping("/whoami")
    public Map<String, String> whoami(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        String ip = (xff != null && !xff.isEmpty())
            ? xff.split(",")[0].trim()
            : request.getRemoteAddr();
        return Map.of("client_ip", ip);
    }
}
```

## Forcing IPv4 Stack

Spring Boot does not provide an `application.properties` setting to force the JVM IPv4 stack. Use a JVM system property instead:

```bash
# JVM flag to prefer IPv4-only sockets
java -Djava.net.preferIPv4Stack=true -jar app.jar
```

## Conclusion

`server.address` in `application.properties` or `application.yml` is the canonical way to set the bind address. Externalize it via environment variables (`SERVER_ADDRESS`) or JVM properties (`-Dserver.address=...`) for deployment flexibility without rebuilding. In production, bind to `127.0.0.1` only when the reverse proxy runs on the same host; for a cloud load balancer or another host/container, bind to an address the load balancer can reach and restrict access with network controls. Use Spring profiles to automatically apply the correct address per environment.

# How to Configure Eureka for Service Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Eureka, Service Registry, Netflix OSS, Spring Cloud, Microservices

Description: Learn how to set up Netflix Eureka for service registration and discovery in Java/Spring microservices, including server configuration, client registration, and high availability setup.

---

Netflix Eureka is a REST-based service registry designed for cloud-native applications. It enables microservices to register themselves and discover other services without hardcoded locations. Eureka is particularly well-suited for Java and Spring Boot applications through Spring Cloud Netflix integration.

## Eureka Architecture

Eureka uses a client-server architecture where services register with Eureka servers and query for other services. The server maintains a registry of available service instances, while clients cache this information locally.

```mermaid
graph TB
    subgraph "Eureka Cluster"
        ES1[Eureka Server 1]
        ES2[Eureka Server 2]
        ES1 <-->|Peer Replication| ES2
    end

    subgraph "Microservices"
        API[API Service]
        USER[User Service]
        ORDER[Order Service]
    end

    API -->|Register + Heartbeat| ES1
    USER -->|Register + Heartbeat| ES2
    ORDER -->|Register + Heartbeat| ES1

    API -->|Discover| ES1
    USER -->|Discover| ES2
```

## 1. Set Up Eureka Server

Create a Spring Boot application for the Eureka server.

**pom.xml:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>eureka-server</artifactId>
    <version>1.0.0</version>

    <properties>
        <java.version>17</java.version>
        <spring-cloud.version>2023.0.0</spring-cloud.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-netflix-eureka-server</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
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
</project>
```

**EurekaServerApplication.java:**

```java
package com.example.eurekaserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

@SpringBootApplication
@EnableEurekaServer
public class EurekaServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(EurekaServerApplication.class, args);
    }
}
```

**application.yml (standalone server):**

```yaml
server:
  port: 8761

spring:
  application:
    name: eureka-server
  security:
    user:
      name: admin
      password: ${EUREKA_PASSWORD:admin123}

eureka:
  instance:
    hostname: localhost
  client:
    # Don't register itself with eureka (standalone mode)
    register-with-eureka: false
    fetch-registry: false
    service-url:
      defaultZone: http://${spring.security.user.name}:${spring.security.user.password}@localhost:8761/eureka/
  server:
    # Disable self-preservation in development
    enable-self-preservation: false
    # Eviction interval (how often to check for expired instances)
    eviction-interval-timer-in-ms: 5000

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```

**SecurityConfig.java:**

```java
package com.example.eurekaserver;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/**").permitAll()
                .anyRequest().authenticated()
            )
            .httpBasic(httpBasic -> {});

        return http.build();
    }
}
```

## 2. Configure High Availability

For production, deploy multiple Eureka servers that replicate with each other.

**application-peer1.yml:**

```yaml
server:
  port: 8761

spring:
  application:
    name: eureka-server

eureka:
  instance:
    hostname: eureka-peer1.example.com
  client:
    register-with-eureka: true
    fetch-registry: true
    service-url:
      # Register with peer servers
      defaultZone: http://admin:password@eureka-peer2.example.com:8762/eureka/,http://admin:password@eureka-peer3.example.com:8763/eureka/
  server:
    enable-self-preservation: true
    renewal-percent-threshold: 0.85
```

**application-peer2.yml:**

```yaml
server:
  port: 8762

spring:
  application:
    name: eureka-server

eureka:
  instance:
    hostname: eureka-peer2.example.com
  client:
    register-with-eureka: true
    fetch-registry: true
    service-url:
      defaultZone: http://admin:password@eureka-peer1.example.com:8761/eureka/,http://admin:password@eureka-peer3.example.com:8763/eureka/
```

## 3. Create Eureka Client Service

Configure a microservice to register with Eureka.

**pom.xml (client):**

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
</dependencies>
```

**UserServiceApplication.java:**

```java
package com.example.userservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class UserServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }
}
```

**application.yml (client):**

```yaml
server:
  port: 8081

spring:
  application:
    name: user-service

eureka:
  client:
    service-url:
      defaultZone: http://admin:admin123@localhost:8761/eureka/
    # How often to fetch registry from server
    registry-fetch-interval-seconds: 5
  instance:
    # Use IP address instead of hostname
    prefer-ip-address: true
    # Unique instance ID
    instance-id: ${spring.application.name}:${spring.application.instance_id:${random.value}}
    # Lease renewal interval (heartbeat)
    lease-renewal-interval-in-seconds: 10
    # Lease expiration duration
    lease-expiration-duration-in-seconds: 30
    # Health check URL
    health-check-url-path: /actuator/health
    metadata-map:
      version: "1.0.0"
      environment: "production"

management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: always
```

## 4. Implement Service Discovery

Use the DiscoveryClient or load-balanced RestTemplate to discover and call services.

**ServiceDiscoveryExample.java:**

```java
package com.example.apiservice;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Random;

@Service
public class ServiceDiscoveryExample {

    @Autowired
    private DiscoveryClient discoveryClient;

    /**
     * Get all instances of a service
     */
    public List<ServiceInstance> getServiceInstances(String serviceName) {
        return discoveryClient.getInstances(serviceName);
    }

    /**
     * Get a random service instance (simple load balancing)
     */
    public ServiceInstance getRandomInstance(String serviceName) {
        List<ServiceInstance> instances = discoveryClient.getInstances(serviceName);
        if (instances.isEmpty()) {
            throw new RuntimeException("No instances available for " + serviceName);
        }
        return instances.get(new Random().nextInt(instances.size()));
    }

    /**
     * Call a service using discovered address
     */
    public String callUserService(Long userId) {
        ServiceInstance instance = getRandomInstance("user-service");
        String url = instance.getUri().toString() + "/users/" + userId;

        RestTemplate restTemplate = new RestTemplate();
        return restTemplate.getForObject(url, String.class);
    }

    /**
     * List all registered services
     */
    public List<String> getAllServices() {
        return discoveryClient.getServices();
    }
}
```

## 5. Use Load-Balanced RestTemplate

Configure a load-balanced RestTemplate that automatically resolves service names.

**Config.java:**

```java
package com.example.apiservice;

import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class Config {

    @Bean
    @LoadBalanced
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
```

**ApiService.java:**

```java
package com.example.apiservice;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class ApiService {

    @Autowired
    private RestTemplate restTemplate;

    /**
     * Call user-service using service name (Eureka resolves the address)
     */
    public User getUser(Long userId) {
        // Use service name instead of hostname - Eureka handles resolution
        String url = "http://user-service/users/" + userId;
        return restTemplate.getForObject(url, User.class);
    }

    /**
     * Call order-service using service name
     */
    public List<Order> getUserOrders(Long userId) {
        String url = "http://order-service/orders?userId=" + userId;
        return restTemplate.getForObject(url,
            new ParameterizedTypeReference<List<Order>>() {});
    }
}
```

## 6. Use OpenFeign for Declarative Clients

OpenFeign provides a cleaner way to define service clients.

**pom.xml (add dependency):**

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>
```

**Application.java:**

```java
@SpringBootApplication
@EnableFeignClients
public class ApiServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiServiceApplication.class, args);
    }
}
```

**UserServiceClient.java:**

```java
package com.example.apiservice.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service", fallback = UserServiceFallback.class)
public interface UserServiceClient {

    @GetMapping("/users/{id}")
    User getUser(@PathVariable("id") Long id);

    @GetMapping("/users")
    List<User> getAllUsers();

    @PostMapping("/users")
    User createUser(@RequestBody User user);
}
```

**UserServiceFallback.java:**

```java
package com.example.apiservice.clients;

import org.springframework.stereotype.Component;
import java.util.Collections;
import java.util.List;

@Component
public class UserServiceFallback implements UserServiceClient {

    @Override
    public User getUser(Long id) {
        // Return a default user when service is unavailable
        return new User(id, "Unknown", "unknown@example.com");
    }

    @Override
    public List<User> getAllUsers() {
        return Collections.emptyList();
    }

    @Override
    public User createUser(User user) {
        throw new RuntimeException("User service unavailable");
    }
}
```

## 7. Monitor Eureka

Access the Eureka dashboard and API endpoints.

```bash
# Eureka dashboard
open http://localhost:8761

# Get all applications (JSON)
curl -u admin:admin123 http://localhost:8761/eureka/apps

# Get specific service
curl -u admin:admin123 http://localhost:8761/eureka/apps/user-service

# Check instance status
curl -u admin:admin123 http://localhost:8761/eureka/apps/user-service/instance-id
```

## 8. Configure Instance Metadata

Add custom metadata to service instances for routing decisions.

```yaml
eureka:
  instance:
    metadata-map:
      zone: us-east-1a
      version: "2.0.0"
      weight: "100"
      canary: "false"
```

Use metadata in routing:

```java
@Service
public class ZoneAwareLoadBalancer {

    @Autowired
    private DiscoveryClient discoveryClient;

    public ServiceInstance getInstanceByZone(String serviceName, String zone) {
        return discoveryClient.getInstances(serviceName).stream()
            .filter(instance ->
                zone.equals(instance.getMetadata().get("zone")))
            .findFirst()
            .orElseThrow(() ->
                new RuntimeException("No instance in zone: " + zone));
    }
}
```

## Best Practices

1. **Enable self-preservation in production** - Prevents mass deregistration during network issues
2. **Use health checks** - Configure proper actuator health endpoints
3. **Deploy multiple servers** - Run at least 2-3 Eureka servers for HA
4. **Secure the dashboard** - Enable authentication for the Eureka UI
5. **Monitor registration** - Alert on sudden drops in registered instances
6. **Use prefer-ip-address** - Especially in containerized environments

---

Eureka provides robust service discovery for Java and Spring ecosystems. With proper configuration of servers, clients, and load balancing, your microservices can discover and communicate with each other dynamically without hardcoded addresses.

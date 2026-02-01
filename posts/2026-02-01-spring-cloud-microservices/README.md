# How to Implement Microservices with Spring Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Spring Cloud, Microservices, Service Discovery, Config Server

Description: A practical guide to building microservices with Spring Cloud including service discovery, configuration, and load balancing.

---

Building microservices is straightforward until you need them to actually talk to each other. Then you hit the wall of service discovery, configuration management, load balancing, and a dozen other concerns that monoliths never forced you to think about. Spring Cloud exists to solve exactly these problems.

I've been building microservices with Spring Cloud for years now, and I still remember the pain of my first attempt - hardcoded URLs everywhere, configuration files duplicated across services, and a load balancer that was more duct tape than infrastructure. Spring Cloud changed that.

## What Spring Cloud Actually Does

Spring Cloud is a collection of tools that handle the boring but critical parts of distributed systems. It sits on top of Spring Boot and provides:

- **Service Discovery** - Services find each other without hardcoded URLs
- **Configuration Management** - Centralized configuration for all services
- **Load Balancing** - Client-side load balancing across service instances
- **API Gateway** - Single entry point for all client requests
- **Circuit Breakers** - Fault tolerance when services fail

Let's build something real. We'll create a simple e-commerce backend with three services: a product service, an order service, and an API gateway. Along the way, we'll wire up service discovery, centralized configuration, and load balancing.

## Setting Up Eureka for Service Discovery

Service discovery is the foundation. Without it, your services need to know the exact location of every other service - a maintenance nightmare when services scale up, scale down, or move around.

Eureka is Netflix's service registry that Spring Cloud integrates beautifully. Services register themselves with Eureka on startup and query it to find other services.

First, create the Eureka server. This is a standalone Spring Boot application that acts as the registry.

The pom.xml needs the Eureka server dependency:

```xml
<!-- Eureka server dependency - this turns your Spring Boot app into a service registry -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-server</artifactId>
</dependency>
```

The main application class enables the Eureka server with a single annotation:

```java
// EnableEurekaServer annotation transforms this into a service registry
// Other services will register here and discover each other through this server
@SpringBootApplication
@EnableEurekaServer
public class EurekaServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(EurekaServerApplication.class, args);
    }
}
```

Configure the server in application.yml:

```yaml
# Eureka server configuration
server:
  port: 8761

eureka:
  client:
    # Disable self-registration - this IS the registry, it doesn't need to register with itself
    register-with-eureka: false
    # Don't fetch registry - again, this is the source of truth
    fetch-registry: false
  server:
    # Disable self-preservation in development - in production, keep this enabled
    # Self-preservation prevents Eureka from removing instances during network partitions
    enable-self-preservation: false
```

Run this application and hit http://localhost:8761. You'll see the Eureka dashboard showing registered services (none yet).

## Creating Services That Register with Eureka

Now let's create the product service. Every microservice that wants to participate in service discovery needs the Eureka client dependency.

```xml
<!-- Eureka client - allows this service to register and discover other services -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
```

The product service itself is a standard Spring Boot REST application:

```java
// Simple product service - registers automatically with Eureka on startup
@SpringBootApplication
@RestController
public class ProductServiceApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(ProductServiceApplication.class, args);
    }
    
    // Sample endpoint - in production, this would connect to a database
    @GetMapping("/products/{id}")
    public Product getProduct(@PathVariable Long id) {
        return new Product(id, "Sample Product", 29.99);
    }
    
    @GetMapping("/products")
    public List<Product> getAllProducts() {
        return List.of(
            new Product(1L, "Laptop", 999.99),
            new Product(2L, "Mouse", 29.99),
            new Product(3L, "Keyboard", 79.99)
        );
    }
}
```

Configure it to register with Eureka:

```yaml
# Product service configuration
spring:
  application:
    # This name is how other services will find us in the registry
    name: product-service

server:
  port: 8081

eureka:
  client:
    # URL of the Eureka server - services register here
    service-url:
      defaultZone: http://localhost:8761/eureka/
  instance:
    # Use IP address instead of hostname - more reliable in containerized environments
    prefer-ip-address: true
```

Start the product service and refresh the Eureka dashboard. You'll see PRODUCT-SERVICE registered. Start multiple instances on different ports and watch them all appear - Eureka tracks them automatically.

## Spring Cloud Config for Centralized Configuration

Duplicating configuration across services is a recipe for inconsistency. Spring Cloud Config provides a central server that all services pull their configuration from.

Create a config server application:

```xml
<!-- Config server dependency - serves configuration to all services -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-config-server</artifactId>
</dependency>
```

Enable the config server:

```java
// EnableConfigServer annotation turns this into a configuration server
// It can serve config from git repos, local files, or other backends
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}
```

Configure the server to read from a git repository (or local files for testing):

```yaml
# Config server configuration
server:
  port: 8888

spring:
  cloud:
    config:
      server:
        git:
          # Git repo containing configuration files
          # Each service has a file named {service-name}.yml
          uri: https://github.com/your-org/config-repo
          # Branch to read from
          default-label: main
          # For local testing, use native profile with local files instead
        # native:
        #   search-locations: file:///path/to/config
```

In your config repository, create files named after your services. For product-service.yml:

```yaml
# Configuration for product service - stored in central config repo
# Changes here apply to all product-service instances on refresh
product:
  discount:
    enabled: true
    percentage: 10
    
logging:
  level:
    com.example: DEBUG
```

Now configure your services to pull from the config server. Add the config client dependency:

```xml
<!-- Config client - pulls configuration from the central config server -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-config</artifactId>
</dependency>
```

Point the service to the config server in bootstrap.yml (loaded before application.yml):

```yaml
# Bootstrap configuration - loaded first, used to find the config server
spring:
  application:
    name: product-service
  cloud:
    config:
      # Config server URL - service fetches its configuration from here on startup
      uri: http://localhost:8888
      # Fail fast if config server is unavailable
      fail-fast: true
```

The product service now loads its configuration from the central server on startup. Change the config in git, and services can refresh without restarting using the /actuator/refresh endpoint.

## Load Balancing with Spring Cloud LoadBalancer

When you have multiple instances of a service, you need load balancing. Spring Cloud LoadBalancer provides client-side load balancing - the calling service distributes requests across available instances.

Add the LoadBalancer dependency to any service that calls other services:

```xml
<!-- LoadBalancer - provides client-side load balancing -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-loadbalancer</artifactId>
</dependency>
```

Configure a WebClient (or RestClient) that uses load balancing:

```java
@Configuration
public class WebClientConfig {
    
    // LoadBalanced annotation enables service discovery in URLs
    // Instead of http://localhost:8081, use http://product-service
    @Bean
    @LoadBalanced
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }
}
```

Now your order service can call the product service by name:

```java
@Service
public class OrderService {
    
    private final WebClient.Builder webClientBuilder;
    
    public OrderService(WebClient.Builder webClientBuilder) {
        this.webClientBuilder = webClientBuilder;
    }
    
    public Product getProduct(Long productId) {
        // Use service name instead of hardcoded URL
        // LoadBalancer resolves product-service to an actual instance from Eureka
        // If multiple instances exist, requests are distributed round-robin by default
        return webClientBuilder.build()
            .get()
            .uri("http://product-service/products/{id}", productId)
            .retrieve()
            .bodyToMono(Product.class)
            .block();
    }
}
```

You can customize the load balancing strategy if round-robin doesn't fit your needs:

```java
// Custom load balancer configuration - use random selection instead of round-robin
@Configuration
@LoadBalancerClient(name = "product-service", configuration = CustomLoadBalancerConfig.class)
public class CustomLoadBalancerConfig {
    
    @Bean
    public ReactorLoadBalancer<ServiceInstance> randomLoadBalancer(
            Environment environment,
            LoadBalancerClientFactory clientFactory) {
        String name = environment.getProperty(LoadBalancerClientFactory.PROPERTY_NAME);
        // RandomLoadBalancer picks a random instance instead of cycling through them
        return new RandomLoadBalancer(
            clientFactory.getLazyProvider(name, ServiceInstanceListSupplier.class), 
            name
        );
    }
}
```

## API Gateway with Spring Cloud Gateway

Every microservices architecture needs a gateway. It's the single entry point for clients, handling routing, authentication, rate limiting, and more. Spring Cloud Gateway is the modern solution (replacing the older Zuul).

Create a gateway application:

```xml
<!-- Spring Cloud Gateway - reactive API gateway -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>

<!-- Eureka client - gateway needs to discover services -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
```

Configure routes to your services:

```yaml
# API Gateway configuration
server:
  port: 8080

spring:
  application:
    name: api-gateway
  cloud:
    gateway:
      # Route definitions - map external paths to internal services
      routes:
        # Product service route
        - id: product-service
          # lb:// prefix enables load-balanced routing via Eureka
          uri: lb://product-service
          predicates:
            # Match all requests starting with /api/products
            - Path=/api/products/**
          filters:
            # Strip /api prefix before forwarding
            - StripPrefix=1
            
        # Order service route
        - id: order-service
          uri: lb://order-service
          predicates:
            - Path=/api/orders/**
          filters:
            - StripPrefix=1
            
      # Enable service discovery for routes
      discovery:
        locator:
          enabled: true
          # Lowercase service names in URLs
          lower-case-service-id: true

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
```

Add cross-cutting concerns with filters. Here's a simple request logging filter:

```java
// Global filter that logs all requests passing through the gateway
@Component
public class LoggingFilter implements GlobalFilter, Ordered {
    
    private static final Logger log = LoggerFactory.getLogger(LoggingFilter.class);
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        // Log request details before forwarding
        log.info("Request path: {}, Method: {}", 
            exchange.getRequest().getPath(),
            exchange.getRequest().getMethod());
            
        // Continue the filter chain
        return chain.filter(exchange).then(Mono.fromRunnable(() -> {
            // Log response status after completion
            log.info("Response status: {}", 
                exchange.getResponse().getStatusCode());
        }));
    }
    
    @Override
    public int getOrder() {
        // Lower numbers execute first - this runs early in the chain
        return -1;
    }
}
```

Now clients hit http://localhost:8080/api/products and the gateway routes to the appropriate service, load balancing across instances automatically.

## Putting It All Together

Here's the complete architecture we've built:

1. **Eureka Server** (port 8761) - Service registry
2. **Config Server** (port 8888) - Centralized configuration
3. **Product Service** (port 8081) - Registers with Eureka, pulls config from Config Server
4. **Order Service** (port 8082) - Same as above, calls Product Service via LoadBalancer
5. **API Gateway** (port 8080) - Routes external requests to services

Start them in order: Eureka first, then Config Server, then the services, and finally the gateway. The services wait for their dependencies - Spring Cloud handles the coordination.

A few things I've learned the hard way:

**Health checks matter.** Configure proper health endpoints and make sure Eureka uses them. A service that's registered but unhealthy is worse than one that's not registered at all.

**Timeouts need tuning.** The defaults are often too aggressive for real networks. Set connection and read timeouts based on your actual service response times.

**Circuit breakers are not optional.** When a downstream service fails, you don't want cascading failures. Add Resilience4j to handle failures gracefully.

Spring Cloud takes the pain out of microservices infrastructure. It's not magic - you still need to understand distributed systems - but it handles the repetitive plumbing so you can focus on business logic.

---

*Monitor Spring Cloud microservices with [OneUptime](https://oneuptime.com) - distributed tracing across services.*

# How to Implement Multi-tenancy in Spring Boot Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Multi-tenancy, SaaS, Database, Architecture

Description: A practical guide to implementing multi-tenancy in Spring Boot using schema-based and database-based approaches.

---

Building a SaaS product? You will inevitably face the multi-tenancy question. How do you isolate customer data while keeping your infrastructure manageable? This is not just an architectural curiosity - it directly impacts your operational costs, security posture, and ability to scale.

I have implemented multi-tenancy in several Spring Boot applications over the years, and each approach comes with real trade-offs. Let me walk you through the three main strategies and show you how to implement them properly.

## Understanding Multi-tenancy Strategies

Before diving into code, you need to understand what you are choosing between. Each strategy sits on a spectrum between resource efficiency and tenant isolation.

### Strategy 1: Shared Database with Discriminator Column

All tenants share the same database and tables. A `tenant_id` column distinguishes which rows belong to which tenant.

**Pros:**
- Lowest infrastructure cost
- Simple to deploy and maintain
- Easy cross-tenant reporting (if you need it)

**Cons:**
- Highest risk of data leakage from bugs
- Noisy neighbor problems - one tenant can slow everyone down
- Hard to comply with strict data residency requirements

### Strategy 2: Schema-per-Tenant

Each tenant gets their own database schema within a shared database instance. Tables are identical across schemas, but physically separated.

**Pros:**
- Better isolation than shared tables
- Moderate infrastructure cost
- Can backup and restore individual tenants

**Cons:**
- Schema management becomes complex at scale
- Database connection pooling gets tricky
- Most databases have limits on schema count

### Strategy 3: Database-per-Tenant

Complete isolation. Each tenant has their own database, potentially on different servers.

**Pros:**
- Maximum isolation and security
- Easy compliance with data residency laws
- Can scale individual tenants independently

**Cons:**
- Highest cost
- Connection management overhead
- Deployment complexity increases significantly

For this guide, I will focus on schema-per-tenant and database-per-tenant approaches since they are the most common for production SaaS applications. The discriminator column approach is straightforward JPA filtering - you just add `@Where(clause = "tenant_id = :tenantId")` to your entities and call it a day.

## Setting Up Tenant Context

The first thing you need is a way to identify which tenant is making a request. This typically comes from a subdomain, header, JWT claim, or URL path.

Here is the foundation - a simple holder for the current tenant context:

```java
// TenantContext stores the current tenant identifier using ThreadLocal
// This ensures each request thread has its own isolated tenant value
public class TenantContext {
    
    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();
    
    public static String getCurrentTenant() {
        return CURRENT_TENANT.get();
    }
    
    public static void setCurrentTenant(String tenantId) {
        CURRENT_TENANT.set(tenantId);
    }
    
    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
```

Now you need to populate this context. A servlet filter works well for HTTP requests:

```java
// TenantFilter extracts tenant ID from incoming requests
// It runs before any controller code and sets up the tenant context
@Component
@Order(1)
public class TenantFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) 
            throws ServletException, IOException {
        
        // Extract tenant from X-Tenant-ID header
        // You could also use subdomain, JWT claim, or URL path
        String tenantId = request.getHeader("X-Tenant-ID");
        
        if (tenantId == null || tenantId.isBlank()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, 
                              "Missing tenant identifier");
            return;
        }
        
        try {
            TenantContext.setCurrentTenant(tenantId);
            filterChain.doFilter(request, response);
        } finally {
            // Always clear context to prevent leakage between requests
            TenantContext.clear();
        }
    }
}
```

## Implementing Schema-per-Tenant with Hibernate

Hibernate has built-in support for multi-tenancy through its `MultiTenantConnectionProvider` and `CurrentTenantIdentifierResolver` interfaces. Let me show you how to wire these up.

First, configure Hibernate to use schema-based multi-tenancy:

```java
// HibernateConfig sets up Hibernate for multi-tenant schema resolution
// The key properties tell Hibernate to switch schemas based on tenant
@Configuration
public class HibernateConfig {
    
    @Bean
    public JpaVendorAdapter jpaVendorAdapter() {
        return new HibernateJpaVendorAdapter();
    }
    
    @Bean
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(
            DataSource dataSource,
            MultiTenantConnectionProvider connectionProvider,
            CurrentTenantIdentifierResolver tenantResolver) {
        
        LocalContainerEntityManagerFactoryBean em = 
            new LocalContainerEntityManagerFactoryBean();
        
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.yourapp.entities");
        em.setJpaVendorAdapter(jpaVendorAdapter());
        
        Map<String, Object> properties = new HashMap<>();
        properties.put(Environment.MULTI_TENANT, MultiTenancyStrategy.SCHEMA);
        properties.put(Environment.MULTI_TENANT_CONNECTION_PROVIDER, connectionProvider);
        properties.put(Environment.MULTI_TENANT_IDENTIFIER_RESOLVER, tenantResolver);
        properties.put(Environment.SHOW_SQL, true);
        properties.put(Environment.FORMAT_SQL, true);
        properties.put(Environment.HBM2DDL_AUTO, "none");
        
        em.setJpaPropertyMap(properties);
        return em;
    }
}
```

Next, implement the tenant identifier resolver:

```java
// SchemaBasedTenantResolver tells Hibernate which tenant is active
// It reads from our TenantContext that was set by the filter
@Component
public class SchemaBasedTenantResolver implements CurrentTenantIdentifierResolver {
    
    private static final String DEFAULT_TENANT = "public";
    
    @Override
    public String resolveCurrentTenantIdentifier() {
        String tenant = TenantContext.getCurrentTenant();
        // Fall back to default schema for startup and background tasks
        return tenant != null ? tenant : DEFAULT_TENANT;
    }
    
    @Override
    public boolean validateExistingCurrentSessions() {
        return true;
    }
}
```

The connection provider handles the actual schema switching:

```java
// SchemaMultiTenantConnectionProvider switches the database schema
// based on the current tenant identifier
@Component
public class SchemaMultiTenantConnectionProvider 
        implements MultiTenantConnectionProvider {
    
    private final DataSource dataSource;
    
    public SchemaMultiTenantConnectionProvider(DataSource dataSource) {
        this.dataSource = dataSource;
    }
    
    @Override
    public Connection getAnyConnection() throws SQLException {
        return dataSource.getConnection();
    }
    
    @Override
    public void releaseAnyConnection(Connection connection) throws SQLException {
        connection.close();
    }
    
    @Override
    public Connection getConnection(String tenantIdentifier) throws SQLException {
        Connection connection = getAnyConnection();
        // PostgreSQL uses SET search_path for schema switching
        // For MySQL, use "USE schema_name" instead
        connection.createStatement()
                  .execute("SET search_path TO " + tenantIdentifier);
        return connection;
    }
    
    @Override
    public void releaseConnection(String tenantIdentifier, Connection connection) 
            throws SQLException {
        // Reset to default schema before returning to pool
        connection.createStatement().execute("SET search_path TO public");
        connection.close();
    }
    
    @Override
    public boolean supportsAggressiveRelease() {
        return false;
    }
    
    @Override
    public boolean isUnwrappableAs(Class unwrapType) {
        return false;
    }
    
    @Override
    public <T> T unwrap(Class<T> unwrapType) {
        return null;
    }
}
```

## Implementing Database-per-Tenant

For complete isolation, each tenant gets their own database. This requires a different approach - you need to manage multiple data sources dynamically.

Here is a routing data source that selects the right database based on tenant:

```java
// TenantRoutingDataSource extends Spring's AbstractRoutingDataSource
// It dynamically routes queries to the correct tenant database
public class TenantRoutingDataSource extends AbstractRoutingDataSource {
    
    @Override
    protected Object determineCurrentLookupKey() {
        return TenantContext.getCurrentTenant();
    }
}
```

You will need a service to manage tenant data sources:

```java
// TenantDataSourceService manages the pool of tenant database connections
// It creates and caches data sources as tenants are accessed
@Service
public class TenantDataSourceService {
    
    private final Map<String, DataSource> tenantDataSources = 
        new ConcurrentHashMap<>();
    
    private final TenantRepository tenantRepository;
    
    public TenantDataSourceService(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }
    
    public DataSource getDataSource(String tenantId) {
        return tenantDataSources.computeIfAbsent(tenantId, this::createDataSource);
    }
    
    private DataSource createDataSource(String tenantId) {
        // Fetch tenant database config from master database
        TenantConfig config = tenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new TenantNotFoundException(tenantId));
        
        HikariConfig hikariConfig = new HikariConfig();
        hikariConfig.setJdbcUrl(config.getJdbcUrl());
        hikariConfig.setUsername(config.getUsername());
        hikariConfig.setPassword(config.getPassword());
        hikariConfig.setMaximumPoolSize(10);
        hikariConfig.setMinimumIdle(2);
        hikariConfig.setPoolName("tenant-" + tenantId);
        
        return new HikariDataSource(hikariConfig);
    }
    
    // Call this when a tenant is deleted or connection info changes
    public void evictDataSource(String tenantId) {
        DataSource removed = tenantDataSources.remove(tenantId);
        if (removed instanceof HikariDataSource) {
            ((HikariDataSource) removed).close();
        }
    }
}
```

Configure the routing data source:

```java
// DataSourceConfig sets up the routing data source with lazy resolution
// Tenant data sources are created on-demand when first accessed
@Configuration
public class DataSourceConfig {
    
    @Bean
    public DataSource dataSource(TenantDataSourceService tenantService) {
        TenantRoutingDataSource routingDataSource = new TenantRoutingDataSource();
        
        // Configure with a custom target data source lookup
        routingDataSource.setTargetDataSources(new HashMap<>());
        routingDataSource.setDefaultTargetDataSource(masterDataSource());
        
        // Use lazy lookup for tenant data sources
        routingDataSource.setLenientFallback(false);
        
        return new LazyConnectionDataSourceProxy(routingDataSource);
    }
    
    @Bean
    public DataSource masterDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://localhost:5432/master");
        config.setUsername("app");
        config.setPassword("secret");
        return new HikariDataSource(config);
    }
}
```

## Propagating Tenant Context to Async Operations

Here is where things get interesting. ThreadLocal works great for synchronous requests, but what about `@Async` methods, scheduled tasks, or message consumers?

You need to propagate the tenant context explicitly:

```java
// TenantAwareTaskDecorator wraps async tasks with tenant context
// Without this, async methods would lose the tenant information
public class TenantAwareTaskDecorator implements TaskDecorator {
    
    @Override
    public Runnable decorate(Runnable runnable) {
        // Capture tenant from the calling thread
        String tenantId = TenantContext.getCurrentTenant();
        
        return () -> {
            try {
                // Set tenant in the worker thread
                TenantContext.setCurrentTenant(tenantId);
                runnable.run();
            } finally {
                TenantContext.clear();
            }
        };
    }
}
```

Register it with your async configuration:

```java
// AsyncConfig configures thread pools to be tenant-aware
// All @Async methods will automatically preserve tenant context
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-tenant-");
        executor.setTaskDecorator(new TenantAwareTaskDecorator());
        executor.initialize();
        return executor;
    }
}
```

For message consumers (Kafka, RabbitMQ), include the tenant ID in message headers and extract it before processing:

```java
// KafkaConsumerConfig shows how to handle tenant context in message consumers
// The tenant ID travels with the message and gets restored on consumption
@KafkaListener(topics = "orders")
public void handleOrderEvent(ConsumerRecord<String, OrderEvent> record) {
    // Extract tenant from Kafka header
    String tenantId = new String(
        record.headers().lastHeader("X-Tenant-ID").value()
    );
    
    try {
        TenantContext.setCurrentTenant(tenantId);
        orderService.processOrder(record.value());
    } finally {
        TenantContext.clear();
    }
}
```

## Schema Management and Migrations

With schema-per-tenant, you need to run migrations across all tenant schemas. Flyway can handle this with some configuration:

```java
// TenantMigrationService runs Flyway migrations for all tenants
// Call this during deployment to update all tenant schemas
@Service
public class TenantMigrationService {
    
    private final DataSource dataSource;
    private final TenantRepository tenantRepository;
    
    public TenantMigrationService(DataSource dataSource, 
                                   TenantRepository tenantRepository) {
        this.dataSource = dataSource;
        this.tenantRepository = tenantRepository;
    }
    
    public void migrateAllTenants() {
        List<String> tenantIds = tenantRepository.findAllTenantIds();
        
        for (String tenantId : tenantIds) {
            migrateSchema(tenantId);
        }
    }
    
    private void migrateSchema(String schemaName) {
        Flyway flyway = Flyway.configure()
            .dataSource(dataSource)
            .schemas(schemaName)
            .locations("classpath:db/migration/tenant")
            .load();
        
        flyway.migrate();
    }
    
    // Call this when onboarding a new tenant
    public void createAndMigrateTenant(String tenantId) {
        // Create schema first
        try (Connection conn = dataSource.getConnection()) {
            conn.createStatement()
                .execute("CREATE SCHEMA IF NOT EXISTS " + tenantId);
        } catch (SQLException e) {
            throw new RuntimeException("Failed to create schema", e);
        }
        
        migrateSchema(tenantId);
    }
}
```

## Testing Multi-tenant Code

Testing multi-tenant applications requires some setup. Here is a pattern that works well:

```java
// MultiTenantTest provides a base class for tenant-aware tests
// Use @WithTenant annotation to set tenant context per test method
@SpringBootTest
public abstract class MultiTenantTest {
    
    @BeforeEach
    void setUpTenant(TestInfo testInfo) {
        testInfo.getTestMethod()
            .flatMap(m -> Optional.ofNullable(m.getAnnotation(WithTenant.class)))
            .ifPresent(annotation -> TenantContext.setCurrentTenant(annotation.value()));
    }
    
    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }
}

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface WithTenant {
    String value();
}
```

Usage in tests:

```java
// OrderServiceTest demonstrates tenant-isolated testing
// Each test runs in its own tenant context
class OrderServiceTest extends MultiTenantTest {
    
    @Autowired
    private OrderService orderService;
    
    @Test
    @WithTenant("tenant-a")
    void shouldCreateOrderForTenantA() {
        Order order = orderService.createOrder(new OrderRequest());
        assertThat(order.getTenantId()).isEqualTo("tenant-a");
    }
    
    @Test
    @WithTenant("tenant-b")
    void shouldIsolateTenantBData() {
        // This test cannot see tenant-a data
        List<Order> orders = orderService.findAll();
        assertThat(orders).allMatch(o -> o.getTenantId().equals("tenant-b"));
    }
}
```

## Production Considerations

A few things I have learned the hard way:

**Connection pool sizing matters.** With database-per-tenant, each tenant gets its own connection pool. If you have 100 tenants with 10 connections each, that is 1000 connections. Plan accordingly.

**Tenant onboarding should be idempotent.** Schema creation can fail halfway through. Make sure you can retry safely.

**Monitor per-tenant.** You need visibility into which tenants are consuming resources. Add tenant ID to your metrics and logs.

**Have a "master" context.** Some operations - like listing all tenants or running cross-tenant reports - need to bypass tenant isolation. Design for this from the start.

**Test tenant isolation explicitly.** Write tests that try to access another tenant's data and verify they fail.

Multi-tenancy is one of those things that is much harder to retrofit than to build from the start. If you know you are building a SaaS product, invest the time upfront to get the architecture right. Your future self will thank you.

---

*Monitor multi-tenant apps with [OneUptime](https://oneuptime.com) - per-tenant performance tracking.*

# How to Build Multi-Tenant SaaS Apps in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Multi-Tenant, SaaS, Architecture

Description: A practical guide to building multi-tenant SaaS applications in Spring Boot, covering database isolation strategies, tenant resolution, and production-ready patterns with working code examples.

---

Building a SaaS product means serving multiple customers from the same codebase. Each customer expects their data to be isolated, their configurations to be independent, and their experience to feel like they own the entire system. This is multi-tenancy, and getting it right in Spring Boot requires deliberate architectural choices from day one.

I've shipped multi-tenant systems that scaled from a handful of beta users to thousands of paying customers. The patterns I'll share here are battle-tested and address the real problems you'll face: tenant identification, data isolation, and keeping your codebase maintainable as you grow.

## Choosing Your Isolation Strategy

Before writing any code, you need to decide how tenants will be isolated at the database level. There are three common approaches, each with trade-offs.

**Separate databases per tenant** offer the strongest isolation. Each tenant gets their own database instance. This simplifies compliance requirements and makes it easy to restore a single tenant's data. The downside is operational complexity - you'll need to manage connection pools and migrations across potentially hundreds of databases.

**Shared database with separate schemas** is a middle ground. All tenants share one database server, but each has their own schema. This reduces operational overhead while maintaining reasonable isolation. Schema-level backups and migrations are straightforward.

**Shared database with a tenant discriminator column** is the simplest to implement. All tenants share the same tables, and every row includes a `tenant_id` column. This is efficient for small-to-medium scale but requires discipline - one missing WHERE clause can leak data between tenants.

For most teams starting out, I recommend the discriminator column approach. You can always migrate to schema or database isolation later if compliance or scale demands it.

## Resolving the Current Tenant

Every request needs to know which tenant it belongs to. The most common approach is extracting the tenant from the request - either from a subdomain, a header, or a JWT claim.

Here's a simple filter that extracts the tenant from the `X-Tenant-ID` header:

```java
@Component
@Order(1)
public class TenantFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String tenantId = request.getHeader("X-Tenant-ID");

        if (tenantId == null || tenantId.isBlank()) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write("Missing tenant identifier");
            return;
        }

        // Store tenant in thread-local context
        TenantContext.setTenantId(tenantId);

        try {
            chain.doFilter(request, response);
        } finally {
            // Always clear to prevent leaks between requests
            TenantContext.clear();
        }
    }
}
```

The `TenantContext` class uses a `ThreadLocal` to hold the tenant for the duration of the request:

```java
public class TenantContext {

    private static final ThreadLocal<String> currentTenant = new ThreadLocal<>();

    public static void setTenantId(String tenantId) {
        currentTenant.set(tenantId);
    }

    public static String getTenantId() {
        return currentTenant.get();
    }

    public static void clear() {
        currentTenant.remove();
    }
}
```

This pattern works well for synchronous request handling. If you're using reactive programming or async processing, you'll need to propagate the tenant context explicitly - `ThreadLocal` won't survive thread hops.

## Adding Tenant Filtering to JPA Entities

With the discriminator approach, every entity needs a `tenantId` field, and every query needs to filter by it. Doing this manually is error-prone. Hibernate's `@Filter` annotation lets you define a filter once and apply it globally.

First, define a base entity that all tenant-scoped entities will extend:

```java
@MappedSuperclass
@FilterDef(name = "tenantFilter",
           parameters = @ParamDef(name = "tenantId", type = String.class))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public abstract class TenantAwareEntity {

    @Column(name = "tenant_id", nullable = false)
    private String tenantId;

    @PrePersist
    public void prePersist() {
        // Automatically set tenant ID on new entities
        if (this.tenantId == null) {
            this.tenantId = TenantContext.getTenantId();
        }
    }

    // Getters and setters
    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }
}
```

Now create a component that enables the filter for every request:

```java
@Component
@Aspect
public class TenantFilterAspect {

    @PersistenceContext
    private EntityManager entityManager;

    @Before("execution(* com.example.service.*.*(..))")
    public void enableTenantFilter() {
        String tenantId = TenantContext.getTenantId();

        if (tenantId != null) {
            Session session = entityManager.unwrap(Session.class);
            session.enableFilter("tenantFilter")
                   .setParameter("tenantId", tenantId);
        }
    }
}
```

With this setup, any entity that extends `TenantAwareEntity` will automatically have tenant filtering applied. Queries will only return rows matching the current tenant, and new entities will have the tenant ID set automatically.

## Handling Multi-Tenant DataSources

If you outgrow the discriminator approach and need database-per-tenant isolation, Spring's `AbstractRoutingDataSource` makes dynamic datasource selection straightforward:

```java
public class TenantRoutingDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        return TenantContext.getTenantId();
    }
}
```

Configure it with a map of tenant IDs to datasources:

```java
@Configuration
public class DataSourceConfig {

    @Bean
    public DataSource dataSource() {
        TenantRoutingDataSource routingDataSource = new TenantRoutingDataSource();

        Map<Object, Object> dataSources = new HashMap<>();
        dataSources.put("tenant-a", createDataSource("jdbc:postgresql://db/tenant_a"));
        dataSources.put("tenant-b", createDataSource("jdbc:postgresql://db/tenant_b"));

        routingDataSource.setTargetDataSources(dataSources);
        routingDataSource.setDefaultTargetDataSource(dataSources.get("tenant-a"));

        return routingDataSource;
    }

    private DataSource createDataSource(String url) {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(url);
        ds.setUsername("app_user");
        ds.setPassword("secure_password");
        ds.setMaximumPoolSize(10);
        return ds;
    }
}
```

In production, you'd load tenant configurations from a database or configuration service rather than hardcoding them. You'll also want connection pool management per tenant to prevent one noisy tenant from exhausting shared resources.

## Testing Multi-Tenant Code

Testing multi-tenant applications requires explicit tenant setup in every test. Create a helper that sets up the tenant context:

```java
@SpringBootTest
public class OrderServiceTest {

    @Autowired
    private OrderService orderService;

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId("test-tenant");
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void shouldOnlyReturnOrdersForCurrentTenant() {
        // Create orders for test-tenant
        orderService.createOrder(new OrderRequest("item-1", 100));

        // Switch to different tenant
        TenantContext.setTenantId("other-tenant");

        // Verify isolation - should return empty
        List<Order> orders = orderService.findAllOrders();
        assertThat(orders).isEmpty();
    }
}
```

Write tests that explicitly verify tenant isolation. It's the easiest bug to introduce and the most damaging if it reaches production.

## Gotchas to Watch For

A few things that have bitten me in production:

**Async operations lose tenant context.** If you're using `@Async` methods or `CompletableFuture`, the tenant context won't propagate. You'll need to pass the tenant ID explicitly and restore it in the async thread.

**Caching needs tenant awareness.** If you're using Spring Cache, include the tenant ID in your cache keys. Otherwise, one tenant's cached data will leak to others.

**Background jobs need tenant context.** Scheduled tasks or message consumers don't have an HTTP request to extract the tenant from. Store the tenant ID with the job payload and restore context before processing.

**Connection pool exhaustion.** With database-per-tenant, each tenant gets their own pool. Monitor pool utilization and set reasonable maximums - you can't give every tenant 50 connections if you have 1000 tenants.

## Wrapping Up

Multi-tenancy isn't complicated, but it does require consistency. Pick an isolation strategy that matches your compliance and scale requirements. Make tenant context available everywhere through a clean abstraction. Use framework features like Hibernate filters to reduce boilerplate. And test tenant isolation explicitly - it's the one bug you absolutely cannot ship.

Start simple with the discriminator approach, instrument everything, and evolve your architecture as you learn what your tenants actually need. The patterns here will get you to production. After that, your observability data will tell you where to optimize.

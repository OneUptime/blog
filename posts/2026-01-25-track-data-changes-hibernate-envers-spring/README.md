# How to Track Data Changes with Hibernate Envers in Spring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring, Hibernate Envers, Audit, Data History

Description: Learn how to automatically track and audit entity changes in your Spring application using Hibernate Envers. This guide covers setup, configuration, and querying historical data with practical examples.

---

Tracking who changed what and when is a common requirement in enterprise applications. Whether you need it for compliance, debugging, or building an undo feature, maintaining a complete audit trail of your data changes is valuable. Hibernate Envers makes this surprisingly simple by automatically versioning your JPA entities.

In this guide, we will walk through setting up Hibernate Envers in a Spring Boot application, configuring audited entities, and querying historical data.

## What is Hibernate Envers?

Hibernate Envers is an extension to Hibernate ORM that provides automatic auditing and versioning of entity data. When you mark an entity as audited, Envers creates a separate audit table that stores every version of that entity. Each change gets a revision number, and you can query the state of any entity at any point in its history.

The name "Envers" comes from "Entity Versioning" - a fitting description of what it does.

## Setting Up Hibernate Envers

First, add the dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>org.hibernate.orm</groupId>
    <artifactId>hibernate-envers</artifactId>
</dependency>
```

If you are using Spring Boot with spring-boot-starter-data-jpa, Hibernate is already included. You just need to add the envers module.

For Gradle users:

```groovy
implementation 'org.hibernate.orm:hibernate-envers'
```

## Marking Entities for Auditing

The simplest way to enable auditing is to add the `@Audited` annotation to your entity:

```java
import jakarta.persistence.*;
import org.hibernate.envers.Audited;
import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Audited  // This single annotation enables full auditing
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(length = 1000)
    private String description;

    // Constructors, getters, and setters
    public Product() {}

    public Product(String name, BigDecimal price, String description) {
        this.name = name;
        this.price = price;
        this.description = description;
    }

    // Getters and setters omitted for brevity
}
```

When you run your application, Envers automatically creates an audit table named `products_aud` with columns for all your entity fields plus revision metadata.

## Understanding the Audit Tables

Envers creates two types of tables:

1. **Revision table (REVINFO)** - Stores metadata about each revision, including a timestamp and revision number.
2. **Entity audit tables (*_AUD)** - One for each audited entity, containing historical snapshots.

The audit table includes a `REVTYPE` column indicating the operation type:
- 0 = INSERT (entity created)
- 1 = UPDATE (entity modified)
- 2 = DELETE (entity removed)

## Adding Custom Revision Information

The default revision table only stores a timestamp. In real applications, you usually want to track who made the change. Here is how to extend the revision entity:

```java
import jakarta.persistence.*;
import org.hibernate.envers.DefaultRevisionEntity;
import org.hibernate.envers.RevisionEntity;

@Entity
@Table(name = "revision_info")
@RevisionEntity(CustomRevisionListener.class)
public class CustomRevisionEntity extends DefaultRevisionEntity {

    @Column(name = "username")
    private String username;

    @Column(name = "ip_address")
    private String ipAddress;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }
}
```

Now create the listener that populates these fields:

```java
import org.hibernate.envers.RevisionListener;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public class CustomRevisionListener implements RevisionListener {

    @Override
    public void newRevision(Object revisionEntity) {
        CustomRevisionEntity revision = (CustomRevisionEntity) revisionEntity;

        // Get username from Spring Security context
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            revision.setUsername(auth.getName());
        } else {
            revision.setUsername("system");
        }

        // Get IP address from the current request
        ServletRequestAttributes attrs =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            revision.setIpAddress(attrs.getRequest().getRemoteAddr());
        }
    }
}
```

## Excluding Fields from Auditing

Sometimes you have fields that change frequently but are not worth tracking, like a "lastAccessTime" field. Use `@NotAudited` to exclude them:

```java
@Entity
@Audited
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;

    private String fullName;

    @NotAudited  // This field will not be tracked
    private LocalDateTime lastLoginTime;

    // Rest of the entity
}
```

## Querying Historical Data

The real power of Envers comes from querying historical data. Inject `AuditReader` through the `AuditReaderFactory`:

```java
import org.hibernate.envers.AuditReader;
import org.hibernate.envers.AuditReaderFactory;
import org.hibernate.envers.query.AuditEntity;
import org.springframework.stereotype.Service;
import jakarta.persistence.EntityManager;
import java.util.List;

@Service
public class ProductAuditService {

    private final EntityManager entityManager;

    public ProductAuditService(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    // Get all revision numbers for an entity
    public List<Number> getRevisions(Long productId) {
        AuditReader reader = AuditReaderFactory.get(entityManager);
        return reader.getRevisions(Product.class, productId);
    }

    // Get entity state at a specific revision
    public Product getProductAtRevision(Long productId, Number revision) {
        AuditReader reader = AuditReaderFactory.get(entityManager);
        return reader.find(Product.class, productId, revision);
    }

    // Get all historical versions of an entity
    @SuppressWarnings("unchecked")
    public List<Product> getProductHistory(Long productId) {
        AuditReader reader = AuditReaderFactory.get(entityManager);

        return reader.createQuery()
            .forRevisionsOfEntity(Product.class, true, true)
            .add(AuditEntity.id().eq(productId))
            .addOrder(AuditEntity.revisionNumber().asc())
            .getResultList();
    }

    // Find entities modified between two dates
    @SuppressWarnings("unchecked")
    public List<Product> getProductsModifiedBetween(Date start, Date end) {
        AuditReader reader = AuditReaderFactory.get(entityManager);

        Number startRev = reader.getRevisionNumberForDate(start);
        Number endRev = reader.getRevisionNumberForDate(end);

        return reader.createQuery()
            .forRevisionsOfEntity(Product.class, true, false)
            .add(AuditEntity.revisionNumber().ge(startRev))
            .add(AuditEntity.revisionNumber().le(endRev))
            .getResultList();
    }
}
```

## Building a Comparison View

A common use case is showing users what changed between two versions. Here is how to build that:

```java
public record FieldChange(String fieldName, Object oldValue, Object newValue) {}

public List<FieldChange> compareRevisions(Long productId, Number rev1, Number rev2) {
    AuditReader reader = AuditReaderFactory.get(entityManager);

    Product older = reader.find(Product.class, productId, rev1);
    Product newer = reader.find(Product.class, productId, rev2);

    List<FieldChange> changes = new ArrayList<>();

    if (!Objects.equals(older.getName(), newer.getName())) {
        changes.add(new FieldChange("name", older.getName(), newer.getName()));
    }
    if (!Objects.equals(older.getPrice(), newer.getPrice())) {
        changes.add(new FieldChange("price", older.getPrice(), newer.getPrice()));
    }
    if (!Objects.equals(older.getDescription(), newer.getDescription())) {
        changes.add(new FieldChange("description",
            older.getDescription(), newer.getDescription()));
    }

    return changes;
}
```

## Configuration Options

Add these properties to your `application.properties` for fine-tuned control:

```properties
# Store entity data on delete (keeps the last state before deletion)
spring.jpa.properties.org.hibernate.envers.store_data_at_delete=true

# Custom suffix for audit tables (default is _AUD)
spring.jpa.properties.org.hibernate.envers.audit_table_suffix=_history

# Custom prefix for audit tables
spring.jpa.properties.org.hibernate.envers.audit_table_prefix=audit_

# Store revision type column name
spring.jpa.properties.org.hibernate.envers.revision_type_field_name=operation_type
```

## Performance Considerations

Envers adds overhead to every write operation since it needs to insert records into audit tables. Keep these tips in mind:

1. **Index your audit tables** - Queries on audit tables can be slow without proper indexes on the revision and entity ID columns.

2. **Consider table partitioning** - For high-volume tables, partition the audit tables by revision date to improve query performance and simplify archival.

3. **Batch operations** - When doing bulk updates, Envers creates individual audit records. For massive data migrations, you might want to temporarily disable auditing.

4. **Archive old revisions** - Implement a retention policy to move old audit data to cold storage.

## Wrapping Up

Hibernate Envers gives you a production-ready audit trail with minimal code. The key steps are:

1. Add the hibernate-envers dependency
2. Annotate entities with `@Audited`
3. Optionally customize the revision entity to track users and metadata
4. Use `AuditReader` to query historical data

For compliance-heavy domains like healthcare or finance, this kind of automatic versioning is not just convenient but often a regulatory requirement. Even if you do not have compliance needs today, having a complete change history makes debugging production issues much easier.

The audit data also opens up possibilities for features like version comparison, undo functionality, and change notifications. Once the infrastructure is in place, these become straightforward to implement.

# How to Use Spring Data MongoDB Auditing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Spring, Java, Auditing, Spring Data

Description: Learn how to enable Spring Data MongoDB auditing to automatically populate createdDate, lastModifiedDate, createdBy, and lastModifiedBy fields on document save.

---

Spring Data MongoDB auditing automatically tracks when documents are created and modified, and optionally by whom. Instead of manually setting timestamp fields in every service method, you enable auditing once and annotate your document fields - Spring handles the rest.

## Enabling Auditing

Add `@EnableMongoAuditing` to your configuration class:

```java
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@Configuration
@EnableMongoAuditing
public class MongoConfig {
}
```

In Spring Boot, you can place this annotation directly on `@SpringBootApplication`:

```java
@SpringBootApplication
@EnableMongoAuditing
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

## Annotating Document Fields

Use Spring Data's auditing annotations on your document fields:

```java
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

@Document(collection = "articles")
public class Article {

    @Id
    private String id;

    private String title;
    private String content;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @CreatedBy
    private String createdBy;

    @LastModifiedBy
    private String updatedBy;
}
```

The `@CreatedDate` and `@LastModifiedDate` fields are set automatically. `@CreatedDate` is only set on first insert; `@LastModifiedDate` is updated on every save.

## Using an Auditable Base Class

To avoid repeating audit fields across all documents, create a base class:

```java
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import java.time.Instant;

public abstract class Auditable {

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    // getters
}

@Document(collection = "products")
public class Product extends Auditable {

    @Id
    private String id;
    private String name;
    private double price;
}
```

## Populating the Current User (AuditorAware)

To populate `@CreatedBy` and `@LastModifiedBy`, provide an `AuditorAware` bean that returns the current user:

```java
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import java.util.Optional;

@Component
public class SpringSecurityAuditorAware implements AuditorAware<String> {

    @Override
    public Optional<String> getCurrentAuditor() {
        return Optional.ofNullable(
            SecurityContextHolder.getContext().getAuthentication()
        )
        .map(auth -> auth.getName());
    }
}
```

Reference this bean in the annotation:

```java
@EnableMongoAuditing(auditorAwareRef = "springSecurityAuditorAware")
```

## Supported Field Types

Spring Data MongoDB auditing supports these types for date fields:

```java
@CreatedDate
private Instant createdAt;     // recommended

@CreatedDate
private LocalDateTime created; // also supported

@CreatedDate
private long createdTimestamp;  // epoch millis

@CreatedDate
private Date createdDate;       // java.util.Date
```

## Verifying Audit Behavior

A quick test to confirm auditing works:

```java
@SpringBootTest
public class AuditingTest {

    @Autowired
    private ArticleRepository repository;

    @Test
    void auditing_populatesTimestamps() {
        Article article = new Article();
        article.setTitle("Test");
        article.setContent("Content");
        Article saved = repository.save(article);

        assertNotNull(saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());
    }
}
```

## Summary

Spring Data MongoDB auditing eliminates boilerplate timestamp and author tracking code by automatically populating `@CreatedDate`, `@LastModifiedDate`, `@CreatedBy`, and `@LastModifiedBy` fields. Enable it with `@EnableMongoAuditing`, annotate your document fields, and provide an `AuditorAware` bean for user tracking. A shared `Auditable` base class avoids duplicating these fields across every document class in your application.

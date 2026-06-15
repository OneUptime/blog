# Validation Summary: How to Track Data Changes with Hibernate Envers in Spring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring Data JPA
- Hibernate ORM
- Hibernate Envers
- Jakarta Persistence
- Maven
- Gradle

## Sources Consulted
- Hibernate ORM 7.1 User Guide, Envers chapter: https://docs.hibernate.org/orm/7.1/userguide/html_single/#envers
- Hibernate ORM 7.1 User Guide, Envers schema and revision metadata examples: https://docs.hibernate.org/orm/7.1/userguide/html_single/
- Hibernate ORM 7.1 User Guide, Envers queries and `forRevisionsOfEntity`: https://docs.hibernate.org/orm/7.1/userguide/html_single/
- Hibernate ORM 7.4 Javadocs, `AuditReader`: https://docs.hibernate.org/orm/7.4/javadocs/org/hibernate/envers/AuditReader.html
- Hibernate ORM project page for Envers: https://hibernate.org/orm/envers/
- Spring Boot reference documentation for application properties and JPA/Hibernate configuration: https://docs.spring.io/spring-boot/

## Issues Found
- The post stated that Envers automatically creates the `products_aud` table when the application runs. Hibernate documentation ties automatic audit-table creation to Hibernate schema generation, so this was changed to mention schema generation and the default `_AUD` suffix.
- The post said the default revision table only stores a timestamp. The default revision table also stores the revision number, so this was corrected.
- The `@NotAudited` example omitted imports for `@Audited`, `@NotAudited`, Jakarta Persistence annotations, and `LocalDateTime`. These imports were added so the snippet is self-contained.
- The audit service example used `Date` without importing `java.util.Date`. The missing import was added.
- The query section said to inject `AuditReader` through `AuditReaderFactory`. The code actually injects `EntityManager` and obtains an `AuditReader` from the factory, so the wording was corrected.
- The comparison example used `ArrayList`, `List`, and `Objects` without imports. The missing imports were added.
- The performance section said bulk updates create individual Envers audit records. Hibernate Envers audits normal Hibernate entity operations through events, while JPQL/HQL/native bulk updates bypass entity events, so this was corrected.

## Review Notes
The post is technically sound after the fixes. In a future revision, it could mention that `AuditReader#getRevisionNumberForDate` can throw if the date is before the first revision, and that production projects often manage audit-table DDL through migrations instead of Hibernate schema generation.

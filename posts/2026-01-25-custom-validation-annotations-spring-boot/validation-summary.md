# Validation Summary: How to Create Custom Validation Annotations in Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring Framework validation
- Jakarta Validation / Bean Validation
- Hibernate Validator
- JUnit 5
- AssertJ

## Sources Consulted
- Jakarta Bean Validation 3.0 specification: https://jakarta.ee/specifications/bean-validation/3.0/jakarta-bean-validation-spec-3.0.html
- Jakarta Validation constraints API documentation: https://jakarta.ee/specifications/bean-validation/3.0/apidocs/jakarta/validation/constraints/package-summary
- Spring Framework Java Bean Validation reference: https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html
- Spring Framework MVC validation reference: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html
- Spring Framework BeanWrapper API documentation: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/beans/BeanWrapper.html
- Hibernate Validator reference documentation, custom constraints: https://docs.jboss.org/hibernate/stable/validator/reference/en-US/html_single/

## Issues Found
- The post referred to Spring Boot "shipping" validation annotations and called the current `jakarta.validation` API "JSR-380". Updated this to describe Spring Boot's integration with Jakarta Validation and removed the outdated JSR-380 label, because JSR-380 corresponds to Bean Validation 2.0 under `javax.validation`, while the examples use `jakarta.validation`.
- The date-range prose and default annotation message said the end date must be after the start date, but the validator permits equality with `isAfter(startDate) || isEqual(startDate)`. Updated the wording to "on or after" so the explanation matches the code.
- The database-aware validation section said validators are Spring beans. Updated the wording to the more precise Spring behavior: Spring can create `ConstraintValidator` instances through its validator factory, allowing dependency injection.
- The test snippet used `ContactRequest` from another package without importing it. Added the missing `com.example.dto.ContactRequest` import.
- The invalid phone-number test expected a message containing "Invalid phone number", but the DTO overrides the annotation message with "Please enter a valid US phone number". Updated the assertion to match the configured message.

## Review Notes
- The examples assume Spring Boot 3 or newer because they use `jakarta.validation` imports. Spring Boot 2 projects would use `javax.validation` imports instead.
- `DateRangeValidator` uses `BeanWrapper` and unchecked casts to `LocalDate`; this is acceptable for a concise tutorial but production code could add clearer error handling for missing or wrongly typed field names.

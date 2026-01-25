# How to Create Custom Validation Annotations in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Validation, Annotations, Bean Validation

Description: Learn how to build custom validation annotations in Spring Boot using the Bean Validation API, from simple field validators to cross-field constraints with practical examples.

---

Spring Boot ships with a solid set of built-in validation annotations like `@NotNull`, `@Size`, and `@Email`. But real-world applications often need domain-specific rules that go beyond these basics. Maybe you need to validate that a phone number matches a specific format, check that an end date comes after a start date, or verify that a value exists in your database. Custom validation annotations let you encapsulate these rules in reusable, declarative components.

This guide walks through building custom validators from scratch, covering both simple field-level validations and more complex cross-field constraints.

## The Anatomy of a Custom Validator

Every custom validation annotation in Spring Boot requires two parts:

1. The annotation itself - defines the constraint metadata
2. A validator class - implements the validation logic

The Bean Validation API (JSR-380) ties these together through the `@Constraint` annotation.

## Building a Simple Field Validator

Let's start with a practical example: validating phone numbers. We want a `@PhoneNumber` annotation that ensures a string matches a valid format.

### Step 1: Create the Annotation

```java
package com.example.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

// Define where this annotation can be applied
@Target({ElementType.FIELD, ElementType.PARAMETER})
// Make the annotation available at runtime for reflection
@Retention(RetentionPolicy.RUNTIME)
// Link to the validator class that contains the logic
@Constraint(validatedBy = PhoneNumberValidator.class)
@Documented
public @interface PhoneNumber {

    // Default error message - can reference message bundles
    String message() default "Invalid phone number format";

    // Required by Bean Validation spec for grouping constraints
    Class<?>[] groups() default {};

    // Required by Bean Validation spec for payload metadata
    Class<? extends Payload>[] payload() default {};

    // Custom attribute: which region's format to validate against
    String region() default "US";
}
```

The `groups()` and `payload()` attributes are required by the Bean Validation specification. Groups allow you to apply different validation rules in different contexts (like create vs update operations), while payload can carry metadata about the constraint.

### Step 2: Implement the Validator

```java
package com.example.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.regex.Pattern;

public class PhoneNumberValidator implements ConstraintValidator<PhoneNumber, String> {

    // Pattern for US phone numbers: (XXX) XXX-XXXX or XXX-XXX-XXXX
    private static final Pattern US_PATTERN =
        Pattern.compile("^(\\(\\d{3}\\)\\s?|\\d{3}-)\\d{3}-\\d{4}$");

    // Pattern for UK phone numbers
    private static final Pattern UK_PATTERN =
        Pattern.compile("^\\+44\\s?\\d{4}\\s?\\d{6}$");

    private String region;

    @Override
    public void initialize(PhoneNumber annotation) {
        // Grab the region attribute from the annotation
        this.region = annotation.region();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // Null values are typically handled by @NotNull
        // Return true here to allow optional phone numbers
        if (value == null || value.isEmpty()) {
            return true;
        }

        return switch (region) {
            case "US" -> US_PATTERN.matcher(value).matches();
            case "UK" -> UK_PATTERN.matcher(value).matches();
            default -> false;
        };
    }
}
```

### Step 3: Use the Annotation

```java
package com.example.dto;

import com.example.validation.PhoneNumber;
import jakarta.validation.constraints.NotBlank;

public class ContactRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @PhoneNumber(region = "US", message = "Please enter a valid US phone number")
    private String phoneNumber;

    @PhoneNumber(region = "UK")
    private String ukPhoneNumber;

    // Getters and setters omitted for brevity
}
```

## Cross-Field Validation

Field-level validators work great for isolated constraints, but sometimes you need to validate relationships between multiple fields. For example, ensuring that an end date comes after a start date.

### Create a Class-Level Annotation

```java
package com.example.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

// Target TYPE allows this annotation on classes
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = DateRangeValidator.class)
@Documented
public @interface ValidDateRange {

    String message() default "End date must be after start date";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    // Field names to compare
    String startDate();
    String endDate();
}
```

### Implement the Cross-Field Validator

```java
package com.example.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;
import java.time.LocalDate;

public class DateRangeValidator implements ConstraintValidator<ValidDateRange, Object> {

    private String startDateField;
    private String endDateField;

    @Override
    public void initialize(ValidDateRange annotation) {
        this.startDateField = annotation.startDate();
        this.endDateField = annotation.endDate();
    }

    @Override
    public boolean isValid(Object value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }

        // Use Spring's BeanWrapper to access properties by name
        BeanWrapper wrapper = new BeanWrapperImpl(value);

        LocalDate startDate = (LocalDate) wrapper.getPropertyValue(startDateField);
        LocalDate endDate = (LocalDate) wrapper.getPropertyValue(endDateField);

        // Allow null values - use @NotNull if you need them required
        if (startDate == null || endDate == null) {
            return true;
        }

        boolean isValid = endDate.isAfter(startDate) || endDate.isEqual(startDate);

        if (!isValid) {
            // Customize the error to point to the specific field
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                   .addPropertyNode(endDateField)
                   .addConstraintViolation();
        }

        return isValid;
    }
}
```

### Apply to Your DTO

```java
package com.example.dto;

import com.example.validation.ValidDateRange;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@ValidDateRange(
    startDate = "startDate",
    endDate = "endDate",
    message = "Event end date must be on or after the start date"
)
public class EventRequest {

    @NotNull
    private String eventName;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    // Getters and setters
}
```

## Database-Aware Validation

Sometimes validation requires checking against existing data. For instance, verifying that a username is not already taken. Since validators are Spring beans, you can inject dependencies.

```java
package com.example.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = UniqueUsernameValidator.class)
@Documented
public @interface UniqueUsername {
    String message() default "Username is already taken";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
```

```java
package com.example.validation;

import com.example.repository.UserRepository;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.stereotype.Component;

@Component
public class UniqueUsernameValidator implements ConstraintValidator<UniqueUsername, String> {

    private final UserRepository userRepository;

    // Constructor injection - Spring handles this automatically
    public UniqueUsernameValidator(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public boolean isValid(String username, ConstraintValidatorContext context) {
        if (username == null || username.isEmpty()) {
            return true;
        }

        return !userRepository.existsByUsername(username);
    }
}
```

## Composing Validators

You can build complex validations by combining existing annotations. This keeps your validators focused and reusable.

```java
package com.example.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.lang.annotation.*;

@NotBlank(message = "Password is required")
@Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
@Pattern(
    regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+$",
    message = "Password must contain uppercase, lowercase, number, and special character"
)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = {}) // Empty - validation delegated to composed annotations
@Documented
public @interface StrongPassword {
    String message() default "Invalid password";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
```

Now you can simply use `@StrongPassword` instead of repeating three annotations everywhere.

## Triggering Validation in Controllers

With your custom validators in place, enable validation in your controllers using `@Valid` or `@Validated`:

```java
package com.example.controller;

import com.example.dto.ContactRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/contacts")
public class ContactController {

    @PostMapping
    public ResponseEntity<String> createContact(@Valid @RequestBody ContactRequest request) {
        // If validation fails, Spring throws MethodArgumentNotValidException
        // Your exception handler can convert this to a proper error response
        return ResponseEntity.ok("Contact created successfully");
    }
}
```

## Handling Validation Errors

A clean error response makes debugging easier for API consumers:

```java
package com.example.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class ValidationExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(
            MethodArgumentNotValidException ex) {

        Map<String, String> fieldErrors = new HashMap<>();

        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", "error");
        response.put("message", "Validation failed");
        response.put("errors", fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }
}
```

## Testing Custom Validators

Always test your validators in isolation before integrating them:

```java
package com.example.validation;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class PhoneNumberValidatorTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    void validUSPhoneNumber_shouldPass() {
        var contact = new ContactRequest();
        contact.setName("John Doe");
        contact.setPhoneNumber("(555) 123-4567");

        var violations = validator.validate(contact);

        assertThat(violations).isEmpty();
    }

    @Test
    void invalidPhoneNumber_shouldFail() {
        var contact = new ContactRequest();
        contact.setName("John Doe");
        contact.setPhoneNumber("not-a-phone");

        var violations = validator.validate(contact);

        assertThat(violations).hasSize(1);
        assertThat(violations.iterator().next().getMessage())
            .contains("Invalid phone number");
    }
}
```

## Summary

Custom validation annotations let you encode business rules directly into your domain model. The pattern is straightforward: define an annotation, implement a validator, and Spring handles the rest. A few tips to keep in mind:

- Keep validators focused on a single responsibility
- Return `true` for null values unless the validator specifically handles nullability
- Use composed annotations to combine common validation patterns
- Inject Spring beans when you need database or service access
- Write unit tests for validators in isolation

With these techniques, you can build validation logic that is declarative, reusable, and easy to maintain across your Spring Boot applications.

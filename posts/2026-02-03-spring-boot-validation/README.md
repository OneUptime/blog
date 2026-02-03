# How to Use Spring Boot Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Validation, Bean Validation, REST API

Description: Learn how to implement validation in Spring Boot applications. This guide covers Bean Validation, custom validators, and error handling.

---

> Validation is the first line of defense against bad data entering your system. Spring Boot's validation framework, built on the Jakarta Bean Validation specification, provides a declarative way to ensure data integrity. This guide covers everything from basic annotations to advanced custom validators.

Input validation prevents security vulnerabilities, data corruption, and cryptic error messages. By catching invalid data at the API layer, you provide clear feedback to clients and protect your business logic from garbage input.

---

## Setting Up Validation in Spring Boot

### Dependencies

For Spring Boot 3.x, add the validation starter to your `pom.xml`:

```xml
<!-- pom.xml -->
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
</dependencies>
```

Or for Gradle:

```groovy
// build.gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
}
```

The validation starter includes Hibernate Validator, the reference implementation of Jakarta Bean Validation 3.0.

---

## Built-in Validation Annotations

### Common Annotations Reference

| Annotation | Description | Example |
|------------|-------------|---------|
| `@NotNull` | Value must not be null | `@NotNull String name` |
| `@NotEmpty` | String/Collection must not be null or empty | `@NotEmpty List<Item> items` |
| `@NotBlank` | String must not be null and must contain at least one non-whitespace character | `@NotBlank String email` |
| `@Size` | String/Collection size must be within bounds | `@Size(min=2, max=100) String name` |
| `@Min` / `@Max` | Numeric value must be within bounds | `@Min(0) @Max(150) int age` |
| `@Email` | String must be a valid email format | `@Email String email` |
| `@Pattern` | String must match the regex pattern | `@Pattern(regexp="^[A-Z]{2}\\d{4}$") String code` |
| `@Past` / `@Future` | Date must be in the past or future | `@Past LocalDate birthDate` |
| `@Positive` / `@Negative` | Number must be positive or negative | `@Positive BigDecimal price` |
| `@DecimalMin` / `@DecimalMax` | Decimal value bounds | `@DecimalMin("0.01") BigDecimal amount` |
| `@Digits` | Number of integer and fraction digits | `@Digits(integer=10, fraction=2) BigDecimal price` |

---

## Basic Validation Example

### Request DTO with Validation

Create a data transfer object with validation constraints:

```java
// UserCreateRequest.java
// Request DTO for creating a new user with validation constraints
package com.example.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public class UserCreateRequest {

    // Name must not be blank and must be between 2 and 100 characters
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    // Email must be valid format and not blank
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    private String email;

    // Password must meet complexity requirements
    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+$",
        message = "Password must contain at least one uppercase, one lowercase, one digit, and one special character"
    )
    private String password;

    // Age must be between 0 and 150
    @NotNull(message = "Age is required")
    @Min(value = 0, message = "Age must be at least 0")
    @Max(value = 150, message = "Age must be at most 150")
    private Integer age;

    // Birth date must be in the past
    @NotNull(message = "Birth date is required")
    @Past(message = "Birth date must be in the past")
    private LocalDate birthDate;

    // Phone number must match pattern (optional field)
    @Pattern(
        regexp = "^\\+?[1-9]\\d{1,14}$",
        message = "Phone number must be in E.164 format"
    )
    private String phoneNumber;

    // Getters and setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
}
```

### Controller with @Valid Annotation

Use the `@Valid` annotation to trigger validation on incoming request bodies:

```java
// UserController.java
// REST controller demonstrating validation with @Valid annotation
package com.example.controller;

import com.example.dto.UserCreateRequest;
import com.example.dto.UserResponse;
import com.example.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // @Valid triggers validation on the request body
    // If validation fails, Spring throws MethodArgumentNotValidException
    @PostMapping
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody UserCreateRequest request) {

        UserResponse user = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    // @Valid also works with @RequestParam and path variables
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(
            @PathVariable @Min(1) Long id) {

        UserResponse user = userService.getUser(id);
        return ResponseEntity.ok(user);
    }

    // Validation on query parameters
    @GetMapping
    public ResponseEntity<List<UserResponse>> searchUsers(
            @RequestParam @Size(min = 1, max = 100) String query,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {

        List<UserResponse> users = userService.searchUsers(query, page, size);
        return ResponseEntity.ok(users);
    }
}
```

---

## Global Exception Handling for Validation Errors

### Custom Error Response Structure

Define a consistent error response format for your API:

```java
// ValidationErrorResponse.java
// Structured error response for validation failures
package com.example.dto;

import java.time.Instant;
import java.util.List;

public class ValidationErrorResponse {

    private Instant timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
    private List<FieldError> fieldErrors;

    // Constructor for building error responses
    public ValidationErrorResponse(
            int status,
            String error,
            String message,
            String path,
            List<FieldError> fieldErrors) {

        this.timestamp = Instant.now();
        this.status = status;
        this.error = error;
        this.message = message;
        this.path = path;
        this.fieldErrors = fieldErrors;
    }

    // Nested class for individual field errors
    public static class FieldError {
        private String field;
        private String message;
        private Object rejectedValue;

        public FieldError(String field, String message, Object rejectedValue) {
            this.field = field;
            this.message = message;
            this.rejectedValue = rejectedValue;
        }

        // Getters
        public String getField() { return field; }
        public String getMessage() { return message; }
        public Object getRejectedValue() { return rejectedValue; }
    }

    // Getters
    public Instant getTimestamp() { return timestamp; }
    public int getStatus() { return status; }
    public String getError() { return error; }
    public String getMessage() { return message; }
    public String getPath() { return path; }
    public List<FieldError> getFieldErrors() { return fieldErrors; }
}
```

### Global Exception Handler

Create a centralized exception handler using `@ControllerAdvice`:

```java
// GlobalExceptionHandler.java
// Centralized exception handling for validation and other errors
package com.example.exception;

import com.example.dto.ValidationErrorResponse;
import com.example.dto.ValidationErrorResponse.FieldError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.List;
import java.util.stream.Collectors;

@ControllerAdvice
public class GlobalExceptionHandler {

    // Handle @Valid validation failures on @RequestBody
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {

        // Extract field errors from the binding result
        List<FieldError> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> new FieldError(
                        error.getField(),
                        error.getDefaultMessage(),
                        error.getRejectedValue()
                ))
                .collect(Collectors.toList());

        ValidationErrorResponse response = new ValidationErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Validation Failed",
                "One or more fields have validation errors",
                request.getRequestURI(),
                fieldErrors
        );

        return ResponseEntity.badRequest().body(response);
    }

    // Handle @Validated validation failures on method parameters
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ValidationErrorResponse> handleConstraintViolation(
            ConstraintViolationException ex,
            HttpServletRequest request) {

        // Extract constraint violations
        List<FieldError> fieldErrors = ex.getConstraintViolations()
                .stream()
                .map(violation -> new FieldError(
                        getFieldName(violation),
                        violation.getMessage(),
                        violation.getInvalidValue()
                ))
                .collect(Collectors.toList());

        ValidationErrorResponse response = new ValidationErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Constraint Violation",
                "One or more parameters have validation errors",
                request.getRequestURI(),
                fieldErrors
        );

        return ResponseEntity.badRequest().body(response);
    }

    // Extract field name from property path
    private String getFieldName(ConstraintViolation<?> violation) {
        String propertyPath = violation.getPropertyPath().toString();
        // Extract just the field name from paths like "methodName.paramName"
        int lastDot = propertyPath.lastIndexOf('.');
        return lastDot >= 0 ? propertyPath.substring(lastDot + 1) : propertyPath;
    }
}
```

### Example Error Response

When validation fails, clients receive a structured JSON response:

```json
{
    "timestamp": "2026-02-03T10:15:30Z",
    "status": 400,
    "error": "Validation Failed",
    "message": "One or more fields have validation errors",
    "path": "/api/users",
    "fieldErrors": [
        {
            "field": "email",
            "message": "Email must be a valid email address",
            "rejectedValue": "invalid-email"
        },
        {
            "field": "password",
            "message": "Password must be between 8 and 128 characters",
            "rejectedValue": "short"
        },
        {
            "field": "age",
            "message": "Age must be at least 0",
            "rejectedValue": -5
        }
    ]
}
```

---

## Custom Validators

### Creating a Custom Annotation

When built-in annotations are not enough, create custom validators. Here is an example for validating unique email addresses:

```java
// UniqueEmail.java
// Custom validation annotation for checking email uniqueness
package com.example.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = UniqueEmailValidator.class) // Link to validator class
@Target({ElementType.FIELD, ElementType.PARAMETER})    // Can be used on fields and parameters
@Retention(RetentionPolicy.RUNTIME)                    // Available at runtime
public @interface UniqueEmail {

    // Default error message
    String message() default "Email address is already registered";

    // Required for Bean Validation specification
    Class<?>[] groups() default {};

    // Payload for carrying metadata (rarely used)
    Class<? extends Payload>[] payload() default {};
}
```

### Implementing the Validator

Create the validator class that performs the actual validation logic:

```java
// UniqueEmailValidator.java
// Validator implementation that checks email uniqueness against the database
package com.example.validation;

import com.example.repository.UserRepository;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.stereotype.Component;

@Component
public class UniqueEmailValidator implements ConstraintValidator<UniqueEmail, String> {

    private final UserRepository userRepository;

    // Spring injects the repository for database access
    public UniqueEmailValidator(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void initialize(UniqueEmail constraintAnnotation) {
        // Optional initialization logic
    }

    @Override
    public boolean isValid(String email, ConstraintValidatorContext context) {
        // Null values are valid (use @NotNull for null checking)
        if (email == null || email.isBlank()) {
            return true;
        }

        // Check if email already exists in database
        boolean exists = userRepository.existsByEmail(email.toLowerCase());

        return !exists;
    }
}
```

### Using the Custom Validator

Apply the custom annotation to your DTO:

```java
// UserCreateRequest.java with custom validator
@NotBlank(message = "Email is required")
@Email(message = "Email must be a valid email address")
@UniqueEmail // Custom validator to check uniqueness
private String email;
```

---

## Cross-Field Validation

### Class-Level Validator for Password Confirmation

Sometimes you need to validate multiple fields together:

```java
// PasswordsMatch.java
// Class-level annotation for cross-field validation
package com.example.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = PasswordsMatchValidator.class)
@Target(ElementType.TYPE) // Applied at class level
@Retention(RetentionPolicy.RUNTIME)
public @interface PasswordsMatch {

    String message() default "Passwords do not match";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    // Allow specifying field names
    String passwordField() default "password";
    String confirmPasswordField() default "confirmPassword";
}
```

### Cross-Field Validator Implementation

```java
// PasswordsMatchValidator.java
// Validator that compares two password fields
package com.example.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.beans.BeanWrapperImpl;

public class PasswordsMatchValidator implements ConstraintValidator<PasswordsMatch, Object> {

    private String passwordField;
    private String confirmPasswordField;
    private String message;

    @Override
    public void initialize(PasswordsMatch constraintAnnotation) {
        this.passwordField = constraintAnnotation.passwordField();
        this.confirmPasswordField = constraintAnnotation.confirmPasswordField();
        this.message = constraintAnnotation.message();
    }

    @Override
    public boolean isValid(Object value, ConstraintValidatorContext context) {
        // Use BeanWrapper to access field values dynamically
        BeanWrapperImpl beanWrapper = new BeanWrapperImpl(value);

        Object password = beanWrapper.getPropertyValue(passwordField);
        Object confirmPassword = beanWrapper.getPropertyValue(confirmPasswordField);

        boolean isValid;

        if (password == null) {
            isValid = confirmPassword == null;
        } else {
            isValid = password.equals(confirmPassword);
        }

        if (!isValid) {
            // Customize error message to point to specific field
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(message)
                    .addPropertyNode(confirmPasswordField)
                    .addConstraintViolation();
        }

        return isValid;
    }
}
```

### Using Class-Level Validation

```java
// RegistrationRequest.java
// DTO with class-level password matching validation
package com.example.dto;

import com.example.validation.PasswordsMatch;
import jakarta.validation.constraints.*;

@PasswordsMatch(
    passwordField = "password",
    confirmPasswordField = "confirmPassword",
    message = "Password confirmation does not match"
)
public class RegistrationRequest {

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotBlank(message = "Password confirmation is required")
    private String confirmPassword;

    // Getters and setters
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getConfirmPassword() { return confirmPassword; }
    public void setConfirmPassword(String confirmPassword) { this.confirmPassword = confirmPassword; }
}
```

---

## Validation Groups

### Defining Validation Groups

Validation groups allow you to apply different validation rules based on the operation:

```java
// ValidationGroups.java
// Marker interfaces for validation groups
package com.example.validation;

public class ValidationGroups {

    // Marker interface for creation operations
    public interface Create {}

    // Marker interface for update operations
    public interface Update {}

    // Marker interface for admin operations
    public interface Admin {}

    // Marker interface for patch operations
    public interface Patch {}
}
```

### DTO with Validation Groups

Apply different constraints to different groups:

```java
// ProductRequest.java
// DTO with validation groups for different operations
package com.example.dto;

import com.example.validation.ValidationGroups.Create;
import com.example.validation.ValidationGroups.Update;
import com.example.validation.ValidationGroups.Patch;
import jakarta.validation.constraints.*;

public class ProductRequest {

    // ID is required only for updates, not for creation
    @Null(groups = Create.class, message = "ID must not be provided for creation")
    @NotNull(groups = Update.class, message = "ID is required for update")
    private Long id;

    // Name is always required for create and update
    @NotBlank(groups = {Create.class, Update.class}, message = "Name is required")
    @Size(max = 200, message = "Name must not exceed 200 characters")
    private String name;

    // Description is optional for patch but required for create
    @NotBlank(groups = Create.class, message = "Description is required")
    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    // Price must be positive
    @NotNull(groups = {Create.class, Update.class}, message = "Price is required")
    @Positive(message = "Price must be positive")
    @Digits(integer = 10, fraction = 2, message = "Price must have at most 10 integer and 2 fraction digits")
    private BigDecimal price;

    // Quantity cannot be negative
    @NotNull(groups = Create.class, message = "Quantity is required")
    @PositiveOrZero(message = "Quantity cannot be negative")
    private Integer quantity;

    // SKU must match pattern
    @NotBlank(groups = Create.class, message = "SKU is required")
    @Pattern(
        regexp = "^[A-Z]{3}-\\d{6}$",
        message = "SKU must be in format AAA-123456"
    )
    private String sku;

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
}
```

### Controller Using Validation Groups

Use `@Validated` instead of `@Valid` to specify groups:

```java
// ProductController.java
// Controller demonstrating validation groups
package com.example.controller;

import com.example.dto.ProductRequest;
import com.example.dto.ProductResponse;
import com.example.service.ProductService;
import com.example.validation.ValidationGroups.Create;
import com.example.validation.ValidationGroups.Update;
import com.example.validation.ValidationGroups.Patch;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
@Validated // Required at class level for method parameter validation
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    // Use Create group for POST requests
    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(
            @Validated(Create.class) @RequestBody ProductRequest request) {

        ProductResponse product = productService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(product);
    }

    // Use Update group for PUT requests
    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable Long id,
            @Validated(Update.class) @RequestBody ProductRequest request) {

        ProductResponse product = productService.update(id, request);
        return ResponseEntity.ok(product);
    }

    // Use Patch group for partial updates
    @PatchMapping("/{id}")
    public ResponseEntity<ProductResponse> patchProduct(
            @PathVariable Long id,
            @Validated(Patch.class) @RequestBody ProductRequest request) {

        ProductResponse product = productService.patch(id, request);
        return ResponseEntity.ok(product);
    }
}
```

---

## Nested Object Validation

### Validating Nested Objects

Use `@Valid` on nested objects to cascade validation:

```java
// OrderRequest.java
// DTO with nested objects requiring validation
package com.example.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public class OrderRequest {

    @NotBlank(message = "Customer ID is required")
    private String customerId;

    // @Valid cascades validation to nested objects
    @Valid
    @NotNull(message = "Shipping address is required")
    private AddressRequest shippingAddress;

    // @Valid cascades validation to each item in the list
    @Valid
    @NotEmpty(message = "Order must contain at least one item")
    @Size(max = 100, message = "Order cannot contain more than 100 items")
    private List<OrderItemRequest> items;

    // Optional billing address with validation if provided
    @Valid
    private AddressRequest billingAddress;

    // Getters and setters
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public AddressRequest getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(AddressRequest shippingAddress) { this.shippingAddress = shippingAddress; }

    public List<OrderItemRequest> getItems() { return items; }
    public void setItems(List<OrderItemRequest> items) { this.items = items; }

    public AddressRequest getBillingAddress() { return billingAddress; }
    public void setBillingAddress(AddressRequest billingAddress) { this.billingAddress = billingAddress; }
}

// AddressRequest.java
// Nested DTO for address validation
class AddressRequest {

    @NotBlank(message = "Street is required")
    @Size(max = 200, message = "Street must not exceed 200 characters")
    private String street;

    @NotBlank(message = "City is required")
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String city;

    @NotBlank(message = "State is required")
    @Size(min = 2, max = 2, message = "State must be 2-letter code")
    private String state;

    @NotBlank(message = "ZIP code is required")
    @Pattern(regexp = "^\\d{5}(-\\d{4})?$", message = "ZIP code must be valid format")
    private String zipCode;

    @NotBlank(message = "Country is required")
    @Size(min = 2, max = 2, message = "Country must be 2-letter ISO code")
    private String country;

    // Getters and setters omitted for brevity
}

// OrderItemRequest.java
// Nested DTO for order item validation
class OrderItemRequest {

    @NotBlank(message = "Product ID is required")
    private String productId;

    @NotNull(message = "Quantity is required")
    @Positive(message = "Quantity must be positive")
    private Integer quantity;

    @Positive(message = "Unit price must be positive")
    private BigDecimal unitPrice;

    // Getters and setters omitted for brevity
}
```

---

## Service Layer Validation

### Validating Method Parameters

Enable validation on service methods using `@Validated`:

```java
// UserService.java
// Service with method-level validation
package com.example.service;

import com.example.dto.UserCreateRequest;
import com.example.dto.UserResponse;
import com.example.entity.User;
import com.example.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

@Service
@Validated // Enable method parameter validation
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Validate request object
    public UserResponse createUser(@Valid UserCreateRequest request) {
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail().toLowerCase());
        // ... map other fields

        User savedUser = userRepository.save(user);
        return mapToResponse(savedUser);
    }

    // Validate individual parameters
    public UserResponse getUser(
            @NotNull(message = "User ID is required")
            @Positive(message = "User ID must be positive")
            Long id) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(id));

        return mapToResponse(user);
    }

    // Validate return value (less common but possible)
    @Valid
    public UserResponse updateEmail(
            @NotNull @Positive Long userId,
            @NotBlank @Email String newEmail) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        user.setEmail(newEmail.toLowerCase());
        User savedUser = userRepository.save(user);

        return mapToResponse(savedUser);
    }

    public List<UserResponse> searchUsers(
            @NotBlank(message = "Search query is required")
            @Size(min = 2, max = 100, message = "Query must be between 2 and 100 characters")
            String query,

            @PositiveOrZero(message = "Page must be zero or positive")
            int page,

            @Positive(message = "Size must be positive")
            @Max(value = 100, message = "Size must not exceed 100")
            int size) {

        // Search implementation
        return userRepository.searchByName(query, PageRequest.of(page, size))
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private UserResponse mapToResponse(User user) {
        // Mapping logic
        return new UserResponse(user.getId(), user.getName(), user.getEmail());
    }
}
```

---

## Programmatic Validation

### Manual Validation Using Validator

Sometimes you need to validate objects outside the Spring MVC flow:

```java
// ValidationService.java
// Service for programmatic validation
package com.example.service;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ValidationService {

    private final Validator validator;

    // Spring auto-configures a Validator bean
    public ValidationService(Validator validator) {
        this.validator = validator;
    }

    // Validate an object and throw exception if invalid
    public <T> void validate(T object) {
        Set<ConstraintViolation<T>> violations = validator.validate(object);

        if (!violations.isEmpty()) {
            String errorMessage = violations.stream()
                    .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                    .collect(Collectors.joining(", "));

            throw new ValidationException("Validation failed: " + errorMessage);
        }
    }

    // Validate with specific groups
    public <T> void validate(T object, Class<?>... groups) {
        Set<ConstraintViolation<T>> violations = validator.validate(object, groups);

        if (!violations.isEmpty()) {
            throw new ValidationException(formatViolations(violations));
        }
    }

    // Get validation errors without throwing
    public <T> List<String> getValidationErrors(T object) {
        Set<ConstraintViolation<T>> violations = validator.validate(object);

        return violations.stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.toList());
    }

    // Validate specific property
    public <T> boolean isPropertyValid(T object, String propertyName) {
        Set<ConstraintViolation<T>> violations =
                validator.validateProperty(object, propertyName);

        return violations.isEmpty();
    }

    private <T> String formatViolations(Set<ConstraintViolation<T>> violations) {
        return violations.stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining(", "));
    }
}
```

### Using Programmatic Validation

```java
// MessageProcessor.java
// Example of programmatic validation in a message consumer
package com.example.messaging;

import com.example.dto.OrderMessage;
import com.example.service.ValidationService;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class MessageProcessor {

    private final ValidationService validationService;
    private final OrderService orderService;

    public MessageProcessor(
            ValidationService validationService,
            OrderService orderService) {

        this.validationService = validationService;
        this.orderService = orderService;
    }

    @KafkaListener(topics = "orders")
    public void processOrder(OrderMessage message) {
        // Validate the incoming message
        List<String> errors = validationService.getValidationErrors(message);

        if (!errors.isEmpty()) {
            // Log invalid message and send to dead letter queue
            log.error("Invalid order message: {}", errors);
            sendToDeadLetter(message, errors);
            return;
        }

        // Process valid message
        orderService.processOrder(message);
    }
}
```

---

## Configuration Options

### Customizing Validation Behavior

Configure validation settings in your application properties:

```yaml
# application.yml
spring:
  mvc:
    # Throw exception when path variable validation fails
    throw-exception-if-no-handler-found: true

  # Hibernate Validator settings
  validation:
    enabled: true
```

### Custom Validator Configuration

Create a configuration class for advanced customization:

```java
// ValidationConfig.java
// Custom validation configuration
package com.example.config;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.hibernate.validator.HibernateValidator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.validation.beanvalidation.MethodValidationPostProcessor;

@Configuration
public class ValidationConfig {

    // Configure custom validator factory
    @Bean
    public LocalValidatorFactoryBean validator() {
        LocalValidatorFactoryBean bean = new LocalValidatorFactoryBean();

        // Enable fail-fast mode (stop on first error)
        bean.setValidationPropertyMap(Map.of(
            HibernateValidator.FAIL_FAST, "true"
        ));

        return bean;
    }

    // Enable method-level validation
    @Bean
    public MethodValidationPostProcessor methodValidationPostProcessor() {
        MethodValidationPostProcessor processor = new MethodValidationPostProcessor();
        processor.setValidator(validator().getValidator());
        return processor;
    }
}
```

---

## Custom Error Messages with i18n

### Message Properties File

Create localized validation messages:

```properties
# src/main/resources/ValidationMessages.properties
# Default English validation messages

user.name.required=Name is required
user.name.size=Name must be between {min} and {max} characters
user.email.required=Email address is required
user.email.invalid=Please enter a valid email address
user.email.unique=This email address is already registered
user.password.required=Password is required
user.password.weak=Password must contain uppercase, lowercase, digit, and special character
user.age.min=Age must be at least {value}
user.age.max=Age must not exceed {value}

order.items.empty=Order must contain at least one item
order.items.max=Order cannot contain more than {max} items

# Parameterized messages
field.size=The {0} must be between {min} and {max} characters
```

### Using Message Keys in Annotations

```java
// UserCreateRequest.java with i18n messages
package com.example.dto;

import jakarta.validation.constraints.*;

public class UserCreateRequest {

    @NotBlank(message = "{user.name.required}")
    @Size(min = 2, max = 100, message = "{user.name.size}")
    private String name;

    @NotBlank(message = "{user.email.required}")
    @Email(message = "{user.email.invalid}")
    private String email;

    @NotBlank(message = "{user.password.required}")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).+$",
        message = "{user.password.weak}"
    )
    private String password;

    @Min(value = 0, message = "{user.age.min}")
    @Max(value = 150, message = "{user.age.max}")
    private Integer age;

    // Getters and setters
}
```

---

## Complete Working Example

### Full Application Structure

Here is a complete example bringing together all the concepts:

```java
// Application.java
package com.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

```java
// BookRequest.java
// Comprehensive DTO with various validation constraints
package com.example.dto;

import com.example.validation.ISBN;
import com.example.validation.ValidationGroups.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class BookRequest {

    @Null(groups = Create.class, message = "ID must not be provided for creation")
    @NotNull(groups = Update.class, message = "ID is required for update")
    private Long id;

    @NotBlank(message = "Title is required")
    @Size(max = 500, message = "Title must not exceed 500 characters")
    private String title;

    @NotBlank(groups = Create.class, message = "ISBN is required")
    @ISBN(message = "ISBN must be valid ISBN-10 or ISBN-13 format")
    private String isbn;

    @Valid
    @NotEmpty(groups = Create.class, message = "At least one author is required")
    private List<AuthorRequest> authors;

    @NotNull(groups = Create.class, message = "Price is required")
    @Positive(message = "Price must be positive")
    @Digits(integer = 6, fraction = 2, message = "Price format is invalid")
    private BigDecimal price;

    @PastOrPresent(message = "Publication date cannot be in the future")
    private LocalDate publicationDate;

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    @Min(value = 1, message = "Page count must be at least 1")
    @Max(value = 10000, message = "Page count must not exceed 10000")
    private Integer pageCount;

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getIsbn() { return isbn; }
    public void setIsbn(String isbn) { this.isbn = isbn; }

    public List<AuthorRequest> getAuthors() { return authors; }
    public void setAuthors(List<AuthorRequest> authors) { this.authors = authors; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public LocalDate getPublicationDate() { return publicationDate; }
    public void setPublicationDate(LocalDate publicationDate) { this.publicationDate = publicationDate; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getPageCount() { return pageCount; }
    public void setPageCount(Integer pageCount) { this.pageCount = pageCount; }
}
```

```java
// ISBN.java
// Custom validator for ISBN format
package com.example.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = ISBNValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ISBN {
    String message() default "Invalid ISBN format";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
```

```java
// ISBNValidator.java
// Validates ISBN-10 and ISBN-13 formats
package com.example.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ISBNValidator implements ConstraintValidator<ISBN, String> {

    @Override
    public boolean isValid(String isbn, ConstraintValidatorContext context) {
        if (isbn == null || isbn.isBlank()) {
            return true; // Let @NotBlank handle null/empty
        }

        // Remove hyphens and spaces
        String normalized = isbn.replaceAll("[\\s-]", "");

        if (normalized.length() == 10) {
            return isValidISBN10(normalized);
        } else if (normalized.length() == 13) {
            return isValidISBN13(normalized);
        }

        return false;
    }

    private boolean isValidISBN10(String isbn) {
        int sum = 0;
        for (int i = 0; i < 10; i++) {
            char c = isbn.charAt(i);
            int digit;

            if (i == 9 && c == 'X') {
                digit = 10;
            } else if (Character.isDigit(c)) {
                digit = Character.getNumericValue(c);
            } else {
                return false;
            }

            sum += digit * (10 - i);
        }

        return sum % 11 == 0;
    }

    private boolean isValidISBN13(String isbn) {
        if (!isbn.matches("\\d{13}")) {
            return false;
        }

        int sum = 0;
        for (int i = 0; i < 13; i++) {
            int digit = Character.getNumericValue(isbn.charAt(i));
            sum += (i % 2 == 0) ? digit : digit * 3;
        }

        return sum % 10 == 0;
    }
}
```

```java
// BookController.java
// Controller with comprehensive validation
package com.example.controller;

import com.example.dto.BookRequest;
import com.example.dto.BookResponse;
import com.example.service.BookService;
import com.example.validation.ValidationGroups.*;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/books")
@Validated
public class BookController {

    private final BookService bookService;

    public BookController(BookService bookService) {
        this.bookService = bookService;
    }

    @PostMapping
    public ResponseEntity<BookResponse> createBook(
            @Validated(Create.class) @RequestBody BookRequest request) {

        BookResponse book = bookService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(book);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BookResponse> updateBook(
            @PathVariable @Positive Long id,
            @Validated(Update.class) @RequestBody BookRequest request) {

        BookResponse book = bookService.update(id, request);
        return ResponseEntity.ok(book);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookResponse> getBook(
            @PathVariable @Positive(message = "Book ID must be positive") Long id) {

        BookResponse book = bookService.getById(id);
        return ResponseEntity.ok(book);
    }

    @GetMapping
    public ResponseEntity<List<BookResponse>> searchBooks(
            @RequestParam(required = false) @Size(max = 200) String title,
            @RequestParam(required = false) @Size(max = 100) String author,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {

        List<BookResponse> books = bookService.search(title, author, page, size);
        return ResponseEntity.ok(books);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(
            @PathVariable @Positive Long id) {

        bookService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

---

## Best Practices Summary

1. **Use appropriate annotations** - Choose the right constraint for each field type
2. **Provide clear error messages** - Help users understand what went wrong
3. **Validate at the boundary** - Catch invalid data at the API layer
4. **Use validation groups** - Apply different rules for different operations
5. **Cascade validation** - Use @Valid on nested objects and collections
6. **Create custom validators** - For business-specific rules
7. **Handle errors consistently** - Return structured error responses
8. **Validate in services too** - Add @Validated to service classes for defense in depth
9. **Externalize messages** - Use message properties for i18n support
10. **Test validation logic** - Write unit tests for custom validators

---

## Conclusion

Spring Boot validation provides a powerful, declarative way to ensure data integrity in your applications. By combining built-in annotations with custom validators and validation groups, you can handle complex validation requirements while keeping your code clean and maintainable.

Key takeaways:

- Use `@Valid` for request body validation and `@Validated` for groups
- Create custom validators for business-specific rules
- Handle validation errors globally with `@ControllerAdvice`
- Use validation groups for different operation contexts
- Cascade validation to nested objects with `@Valid`

Proper validation not only protects your application from bad data but also provides clear feedback to API consumers, making your APIs more robust and developer-friendly.

---

*Want to monitor your Spring Boot application in production? [OneUptime](https://oneuptime.com) provides comprehensive observability for Java applications with distributed tracing, log management, and real-time alerting. Identify validation failures, track error rates, and ensure your APIs are performing optimally.*

**Related Reading:**
- [Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [How to Structure Logs Properly in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
- [SRE Best Practices](https://oneuptime.com/blog/post/2025-11-28-sre-best-practices/view)

# How to Validate Requests with Bean Validation in Spring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring, Bean Validation, Validation, Request Validation

Description: Learn how to validate incoming HTTP requests in Spring applications using Bean Validation annotations, custom validators, and proper error handling.

---

Every Spring application that accepts user input needs validation. Without it, you end up with garbage data in your database, cryptic error messages for users, and security vulnerabilities waiting to be exploited. Bean Validation (JSR 380) provides a declarative way to define validation rules directly on your model classes, and Spring integrates it seamlessly into request handling.

## Setting Up Bean Validation

If you are using Spring Boot, the validation starter is included with `spring-boot-starter-web`. For standalone Spring projects, add the Hibernate Validator dependency:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

Or with Gradle:

```groovy
implementation 'org.springframework.boot:spring-boot-starter-validation'
```

## Basic Request Validation

The most common use case is validating request bodies in REST controllers. Start by annotating your DTO fields with validation constraints.

```java
public class CreateUserRequest {

    // Cannot be null or empty
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    // Email format validation
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    private String email;

    // Must be at least 8 characters
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    // Must be a positive number
    @NotNull(message = "Age is required")
    @Min(value = 18, message = "Must be at least 18 years old")
    @Max(value = 120, message = "Age seems unrealistic")
    private Integer age;

    // Getters and setters omitted for brevity
}
```

In your controller, add the `@Valid` annotation to trigger validation:

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody CreateUserRequest request) {
        // If we reach this point, the request is valid
        User user = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }
}
```

When validation fails, Spring throws a `MethodArgumentNotValidException` before your controller method executes. By default, this results in a 400 Bad Request response with a generic error message.

## Handling Validation Errors

You want to return meaningful error messages to API clients. Create a global exception handler to format validation errors consistently.

```java
@RestControllerAdvice
public class ValidationExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(
            MethodArgumentNotValidException ex) {

        Map<String, String> fieldErrors = new HashMap<>();

        // Extract field-level errors
        ex.getBindingResult().getFieldErrors().forEach(error -> {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        });

        Map<String, Object> response = new HashMap<>();
        response.put("status", "error");
        response.put("message", "Validation failed");
        response.put("errors", fieldErrors);

        return ResponseEntity.badRequest().body(response);
    }
}
```

This produces a clean JSON response when validation fails:

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "username": "Username is required",
    "email": "Email must be a valid email address",
    "password": "Password must be at least 8 characters"
  }
}
```

## Validating Path Variables and Query Parameters

Bean Validation works with path variables and query parameters too. Add `@Validated` to your controller class, then use constraints directly on method parameters.

```java
@RestController
@RequestMapping("/api/products")
@Validated  // Required for method parameter validation
public class ProductController {

    @GetMapping("/{id}")
    public Product getProduct(
            @PathVariable @Min(value = 1, message = "ID must be positive") Long id) {
        return productService.findById(id);
    }

    @GetMapping
    public List<Product> searchProducts(
            @RequestParam @NotBlank(message = "Search query required") String query,
            @RequestParam(defaultValue = "10") @Max(value = 100, message = "Max limit is 100") int limit) {
        return productService.search(query, limit);
    }
}
```

Note that path and query parameter validation throws `ConstraintViolationException` instead of `MethodArgumentNotValidException`. Handle it separately in your exception handler:

```java
@ExceptionHandler(ConstraintViolationException.class)
public ResponseEntity<Map<String, Object>> handleConstraintViolation(
        ConstraintViolationException ex) {

    Map<String, String> errors = new HashMap<>();

    ex.getConstraintViolations().forEach(violation -> {
        String path = violation.getPropertyPath().toString();
        // Extract just the parameter name from the path
        String paramName = path.substring(path.lastIndexOf('.') + 1);
        errors.put(paramName, violation.getMessage());
    });

    Map<String, Object> response = new HashMap<>();
    response.put("status", "error");
    response.put("message", "Validation failed");
    response.put("errors", errors);

    return ResponseEntity.badRequest().body(response);
}
```

## Nested Object Validation

When your request contains nested objects, use `@Valid` on the nested field to cascade validation:

```java
public class CreateOrderRequest {

    @NotBlank(message = "Customer ID is required")
    private String customerId;

    @Valid  // Validates the nested address object
    @NotNull(message = "Shipping address is required")
    private Address shippingAddress;

    @Valid  // Validates each item in the list
    @NotEmpty(message = "Order must contain at least one item")
    private List<OrderItem> items;
}

public class Address {

    @NotBlank(message = "Street is required")
    private String street;

    @NotBlank(message = "City is required")
    private String city;

    @Pattern(regexp = "\\d{5}", message = "Zip code must be 5 digits")
    private String zipCode;
}

public class OrderItem {

    @NotBlank(message = "Product ID is required")
    private String productId;

    @Min(value = 1, message = "Quantity must be at least 1")
    private int quantity;
}
```

## Custom Validators

Built-in constraints cover common cases, but real applications need custom validation logic. Say you need to validate that a username is not already taken or that a date is in the future.

First, define the annotation:

```java
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = UniqueUsernameValidator.class)
public @interface UniqueUsername {

    String message() default "Username is already taken";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
```

Then implement the validator:

```java
@Component
public class UniqueUsernameValidator implements ConstraintValidator<UniqueUsername, String> {

    private final UserRepository userRepository;

    public UniqueUsernameValidator(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public boolean isValid(String username, ConstraintValidatorContext context) {
        if (username == null || username.isBlank()) {
            // Let @NotBlank handle null/empty check
            return true;
        }
        return !userRepository.existsByUsername(username);
    }
}
```

Use it on your DTO:

```java
public class CreateUserRequest {

    @NotBlank(message = "Username is required")
    @UniqueUsername
    private String username;
}
```

## Cross-Field Validation

Sometimes validation depends on multiple fields. For example, confirming that a password confirmation matches the password. Create a class-level constraint:

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PasswordMatchValidator.class)
public @interface PasswordMatch {

    String message() default "Passwords do not match";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
```

The validator accesses the entire object:

```java
public class PasswordMatchValidator implements ConstraintValidator<PasswordMatch, Object> {

    @Override
    public boolean isValid(Object obj, ConstraintValidatorContext context) {
        if (obj instanceof RegistrationRequest request) {
            return request.getPassword() != null &&
                   request.getPassword().equals(request.getConfirmPassword());
        }
        return true;
    }
}
```

Apply it to the class:

```java
@PasswordMatch
public class RegistrationRequest {

    @NotBlank
    private String username;

    @NotBlank
    @Size(min = 8)
    private String password;

    @NotBlank
    private String confirmPassword;
}
```

## Validation Groups

Validation requirements often differ between create and update operations. Use validation groups to apply different rules based on context.

```java
public interface OnCreate {}
public interface OnUpdate {}

public class UserRequest {

    @Null(groups = OnCreate.class, message = "ID must not be set for new users")
    @NotNull(groups = OnUpdate.class, message = "ID is required for updates")
    private Long id;

    @NotBlank(groups = {OnCreate.class, OnUpdate.class})
    private String username;

    // Password required on create, optional on update
    @NotBlank(groups = OnCreate.class, message = "Password is required")
    private String password;
}
```

Use `@Validated` with group specification in your controller:

```java
@PostMapping
public User createUser(@Validated(OnCreate.class) @RequestBody UserRequest request) {
    return userService.create(request);
}

@PutMapping("/{id}")
public User updateUser(
        @PathVariable Long id,
        @Validated(OnUpdate.class) @RequestBody UserRequest request) {
    return userService.update(id, request);
}
```

## Common Validation Annotations

Here is a quick reference of the most useful built-in constraints:

| Annotation | Description |
|------------|-------------|
| `@NotNull` | Value must not be null |
| `@NotBlank` | String must not be null and must contain non-whitespace |
| `@NotEmpty` | Collection, map, or array must not be null or empty |
| `@Size(min, max)` | String length or collection size must be within range |
| `@Min(value)` | Number must be greater than or equal to value |
| `@Max(value)` | Number must be less than or equal to value |
| `@Email` | Must be a valid email format |
| `@Pattern(regexp)` | Must match the regular expression |
| `@Past` | Date must be in the past |
| `@Future` | Date must be in the future |
| `@Positive` | Number must be positive |
| `@PositiveOrZero` | Number must be zero or positive |

## Summary

Bean Validation in Spring provides a clean, declarative approach to request validation. Instead of scattering if-statements throughout your code, you define rules once on your model classes. The framework handles triggering validation, collecting errors, and making them available for you to format however your API requires.

Start with built-in constraints for common rules, create custom validators for domain-specific logic, and use validation groups when create and update operations have different requirements. This keeps your controllers focused on business logic while ensuring bad data never makes it past the front door.

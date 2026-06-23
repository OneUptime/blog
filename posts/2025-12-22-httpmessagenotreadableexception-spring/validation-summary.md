# Validation Summary: How to Fix 'HttpMessageNotReadableException' Errors

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Java (Java 8+ date/time API, records, pattern matching `instanceof`)
- Spring Boot (Spring MVC, `@RestControllerAdvice`, `@RequestBody`, `OncePerRequestFilter`, `ContentCachingRequestWrapper`)
- Jackson (`ObjectMapper`, `JavaTimeModule`, `JsonDeserializer`, `@JsonFormat`, `@JsonDeserialize`, exception types)
- JSON
- REST API error handling
- YAML configuration (`application.yml`)

## Sources Consulted
- Jackson Databind Javadoc — `InvalidFormatException` (class hierarchy): https://fasterxml.github.io/jackson-databind/javadoc/2.13/com/fasterxml/jackson/databind/exc/InvalidFormatException.html
- Jackson Databind Javadoc — `MismatchedInputException`: https://fasterxml.github.io/jackson-databind/javadoc/2.13/com/fasterxml/jackson/databind/exc/MismatchedInputException.html
- Spring Framework reference — `HttpMessageNotReadableException` / message converters
- Spring Boot reference — Jackson configuration properties (`spring.jackson.*`)

## Issues Found
- **Unreachable `instanceof` branches in the exception handler (fixed).** In the `GlobalExceptionHandler`, the cause was tested in the order `JsonParseException` → `JsonMappingException` → `InvalidFormatException` → `MismatchedInputException`. Per the Jackson class hierarchy, `InvalidFormatException extends MismatchedInputException extends JsonMappingException`, so the generic `instanceof JsonMappingException` branch matched first and the two more-specific branches below it were dead, unreachable code. Reordered the chain most-specific-first (`JsonParseException` → `InvalidFormatException` → `MismatchedInputException` → `JsonMappingException`) so each cause is handled by its correct branch, and added short comments explaining the ordering requirement.

## Review Notes
- **Scalar string coercion (`"age": "25"`):** In the "Type Mismatch" section, `"age": "25"` is labeled a type mismatch. With Spring Boot's default Jackson configuration, `MapperFeature.ALLOW_COERCION_OF_SCALARS` is enabled, so a numeric string like `"25"` is actually coerced to `int` without error. The other examples in that block (`"id": "abc"` → `Long`, `"active": "yes"` → `boolean`) do genuinely throw. The broader teaching point (send properly typed JSON) is sound, so the illustrative example was left intact, but readers should know default Jackson is lenient about numeric-string coercion.
- All Jackson feature flags used (`SerializationFeature.WRITE_DATES_AS_TIMESTAMPS`, `MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS`, `DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES`, `DeserializationFeature.ACCEPT_EMPTY_STRING_AS_NULL_OBJECT`, `SerializationFeature.FAIL_ON_EMPTY_BEANS`) and the corresponding `spring.jackson.*` YAML property names are valid and current.
- Date/time examples are correct: ISO formats for `LocalDate` (`2024-01-15`), `LocalDateTime` (`2024-01-15T10:30:00`), and `Instant` (`2024-01-15T10:30:00Z`), plus matching `@JsonFormat` patterns.
- The `ContentCachingRequestWrapper` logging filter pattern is valid; `getContentAsByteArray()` returns the cached body after the downstream chain reads the request, which is the documented usage.
- `@RequestBody(required = false)` correctly makes the body optional and avoids the "Required request body is missing" failure.
- Defining the `ErrorResponse` record at file scope alongside the handler class compiles, though placing it in its own file or as a nested type is more conventional — stylistic, not an error.

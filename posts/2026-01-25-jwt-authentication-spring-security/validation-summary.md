# Validation Summary: How to Implement JWT Authentication with Spring Security

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring Security 6
- JSON Web Tokens
- JJWT
- Maven
- YAML
- curl

## Sources Consulted
- Spring Security reference: Authorize HttpServletRequests: https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html
- Spring Security reference: CSRF: https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html
- Spring Security API: DaoAuthenticationProvider 6.5.1: https://docs.spring.io/spring-security/site/docs/6.5.1/api/org/springframework/security/authentication/dao/DaoAuthenticationProvider.html
- Spring Security reference: DaoAuthenticationProvider: https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/dao-authentication-provider.html
- JJWT official README: https://github.com/jwtk/jjwt
- Maven Central: JJWT artifacts: https://central.sonatype.com/artifact/io.jsonwebtoken/jjwt
- RFC 7519: JSON Web Token: https://datatracker.ietf.org/doc/html/rfc7519

## Issues Found
- The JJWT dependencies used version 0.12.3, while the current release on Maven Central is 0.13.0. Updated `jjwt-api`, `jjwt-impl`, and `jjwt-jackson` to 0.13.0.
- The JWT secret example treated the configuration string as raw HMAC key bytes. Updated the example to use a Base64-encoded 256-bit key and decode it with JJWT's `Decoders.BASE64` before calling `Keys.hmacShaKeyFor`.
- The JWT filter parsed the token before any exception handling. Expired, malformed, or otherwise invalid tokens can throw JJWT parsing exceptions, so the example could fail instead of continuing unauthenticated. Wrapped token extraction and validation in a `try`/`catch` for `JwtException` and `IllegalArgumentException`, clearing the security context on invalid input.
- The Spring Security configuration used the deprecated `DaoAuthenticationProvider()` constructor and deprecated `setUserDetailsService` setter in Spring Security 6.5. Updated the example to pass `UserDetailsService` to the constructor and keep `setPasswordEncoder`.
- The best-practices section stated that JWTs are not encrypted. JWTs can be encrypted as JWEs, but this tutorial creates signed JWTs. Updated the wording to say these signed JWTs are not encrypted.

## Review Notes
The tutorial is technically valid as a simplified JWT authentication implementation. For a production implementation, it would still be worth adding request validation, duplicate-user handling during registration, refresh-token rotation, issuer/audience enforcement in the `JwtParser`, and centralized authentication error responses.

# Validation Summary: How to Handle 'Invalid CSRF token' Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Java
- Spring Boot 3.x / Spring Security 6.x
- Spring Security CSRF protection (lambda DSL)
- Thymeleaf and JSP form integration
- JavaScript (fetch, Axios, jQuery AJAX)
- Single Page Application (cookie-based) CSRF
- MockMvc security testing

## Sources Consulted
- Spring Security Reference — CSRF Protection: https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html
- Spring Security Reference — Single Page Applications (CookieCsrfTokenRepository): https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html#csrf-integration-javascript-spa
- Spring Security API — `CookieCsrfTokenRepository`, `CsrfTokenRequestHandler`, `CsrfTokenRequestAttributeHandler`, `MissingCsrfTokenException`, `InvalidCsrfTokenException`: https://docs.spring.io/spring-security/site/docs/current/api/
- Spring Security Test — `SecurityMockMvcRequestPostProcessors.csrf()`: https://docs.spring.io/spring-security/reference/servlet/test/mockmvc/csrf.html
- Thymeleaf + Spring Security integration docs: https://www.thymeleaf.org/doc/articles/springsecurity.html

## Issues Found
No technical issues found.

All code samples are correct for Spring Security 6.x (Spring Boot 3.x):
- The lambda DSL (`csrf(...)`, `authorizeHttpRequests(...)`, `sessionManagement(...)`) is the current, non-deprecated configuration style.
- `CookieCsrfTokenRepository.withHttpOnlyFalse()` and its default `XSRF-TOKEN` cookie / `X-XSRF-TOKEN` header are consistent with the JavaScript cookie-reading code.
- `csrf.disable()` and `ignoringRequestMatchers(...)` are the correct 6.x method names (`ignoringRequestMatchers` replaced `ignoringAntMatchers`).
- `MissingCsrfTokenException` and `InvalidCsrfTokenException` are valid classes under `org.springframework.security.web.csrf`.
- The custom `CsrfTokenRequestHandler` implementation matches the 6.x interface (`handle` + `resolveCsrfTokenValue`).
- MockMvc tests using `csrf()` and `csrf().useInvalidToken()` are valid `SecurityMockMvcRequestPostProcessors` usage.
- The default error message format and the "When CSRF Protection is Needed" guidance are accurate.

## Review Notes
- The SPA configuration in Solution 3 uses `CsrfTokenRequestAttributeHandler` directly. This is a common, functional simplification of the official `SpaCsrfTokenRequestHandler` pattern documented by Spring. It works correctly for SPAs that read the raw token from the cookie, with the caveat that it forgoes the XOR/BREACH protection that the default `XorCsrfTokenRequestAttributeHandler` provides. For production SPAs, the official docs additionally recommend a small filter (`CsrfCookieFilter`) to ensure the deferred token is rendered into the cookie on every response. This is a refinement, not a correctness error.
- `jwtAuthFilter` in Solution 4 is referenced illustratively without a definition, which is appropriate for the scope of the example.
- Version-specific caveat: the configuration shown is for Spring Security 6.x. Users on Spring Security 5.x would need the older `WebSecurityConfigurerAdapter` style and `ignoringAntMatchers`, but the post is correctly aligned with current versions.

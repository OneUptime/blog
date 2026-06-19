# Validation Summary: How to Fix 'HTTP Response Splitting' Vulnerabilities

## Status
validated

## Post Type
Technical security guide

## Technologies Covered
- HTTP/1.1 response headers and CRLF handling
- HTTP response splitting / CRLF injection
- Node.js HTTP APIs
- Express.js
- Python Flask / Werkzeug
- Jakarta Servlet API
- Content-Disposition response headers
- Browser security headers
- Jest and Supertest

## Sources Consulted
- RFC 9110: HTTP Semantics, field value rules: https://datatracker.ietf.org/doc/html/rfc9110
- Node.js HTTP documentation for `response.setHeader()` and header validation: https://nodejs.org/api/http.html
- Express response API for `res.location()` and `res.redirect()`: https://expressjs.com/en/5x/api/response/
- Werkzeug changelog noting newline rejection in header values: https://werkzeug.palletsprojects.com/en/stable/changes/
- Jakarta Servlet `HttpServletResponse#setHeader` API documentation: https://tomcat.apache.org/tomcat-11.0-doc/servletapi/jakarta/servlet/http/HttpServletResponse.html
- RFC 6266: Content-Disposition header field in HTTP: https://httpwg.org/specs/rfc6266.html
- MDN documentation for deprecated `X-XSS-Protection`: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- OWASP HTTP Response Splitting overview: https://owasp.org/www-community/attacks/HTTP_Response_Splitting
- OWASP WSTG testing guidance for HTTP response splitting: https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/15-Testing_for_HTTP_Response_Splitting

## Issues Found
- The sample injected response used `Content-Length: 47`, but the HTML payload is 42 bytes. Updated the value to `42`.
- The Node.js / Express examples implied that current `res.setHeader()` calls silently allow CRLF injection. Node.js official documentation says invalid header characters throw `TypeError`, so the comments now clarify that this risk applies to older runtimes or lower-level header construction and that validation is still needed.
- The Flask example implied current Werkzeug would accept newline characters in response header values. Werkzeug rejects newlines in header values to prevent header injection, so the comment now describes the built-in protection while keeping the validation recommendation.
- The Java servlet examples used the older `javax.servlet` namespace or omitted imports. Updated examples to use current Jakarta Servlet imports and added the missing `WebServlet` import.
- The Java `Content-Disposition` example claimed to use RFC 5987 encoding for non-ASCII filenames, but the code only allows a simple ASCII filename. Updated the comment to match the actual implementation.
- The redirect URL example claimed the URL constructor automatically encodes special characters as the complete CRLF defense. Updated the comment to clarify that serializing the parsed URL avoids raw control characters and that the domain allowlist is part of the protection.
- The security headers example recommended `X-XSS-Protection: 1; mode=block`. MDN marks this header deprecated and recommends CSP instead, so the deprecated header was removed from the example.

## Review Notes
The main mitigation advice is correct: validate data before using it in HTTP response headers, reject or neutralize CR/LF/NUL characters, and rely on current framework protections as defense in depth. Future improvements could mention framework-specific helpers for cookies and downloads, such as Express `res.cookie()` and attachment helpers, to avoid hand-building complex header values.

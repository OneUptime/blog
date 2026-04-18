# Validation Summary: How to Validate IPv4 Addresses Using Regex in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java (`java.util.regex.Pattern` / `Matcher`)
- Regular expressions (Java flavor)
- IPv4 addressing (RFC 791)
- Jakarta Bean Validation (formerly JSR 380, now Jakarta Validation 3.0+)

## Sources Consulted
- Java SE API — `java.util.regex.Pattern`: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/regex/Pattern.html
- Java SE API — `java.util.regex.Matcher`: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/regex/Matcher.html
- Jakarta Validation Specification 3.0: https://jakarta.ee/specifications/bean-validation/3.0/
- Jakarta Validation API — `ConstraintValidator`: https://jakarta.ee/specifications/bean-validation/3.0/apidocs/jakarta/validation/constraintvalidator
- RFC 791 (Internet Protocol): https://www.rfc-editor.org/rfc/rfc791

## Issues Found
No technical issues found.

- The strict octet alternation `(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)` correctly captures 0-255 and, because `\d` only matches a single digit and `[1-9]\d` requires a non-zero leading digit, it correctly rejects leading-zero octets like `01`.
- All listed test cases produce the stated expected outcomes when traced through the pattern.
- `Pattern` is indeed thread-safe per the Javadoc; `Matcher` is not (not claimed in the post, which is correct).
- `jakarta.validation.*` imports are correct for Jakarta Bean Validation 3.0+ (the post uses the modern namespace, not the legacy `javax.validation.*`).
- Word boundaries `\b` work correctly at digit/non-digit transitions, so the extractor example produces `[192.168.1.50, 10.0.0.1]` as shown.

## Review Notes
- In the "Using Pattern as a Compiled Constant" snippet, `java.util.regex.Matcher` is imported but not directly referenced; this is a harmless unused import, not a technical error.
- The regex intentionally rejects IPs with leading zeros (e.g., `192.168.01.1`). Note that some historical tools (e.g., traditional `inet_aton`) would interpret leading-zero octets as octal — rejecting them is the safer, more portable choice and matches modern validation practice.
- The custom `@ValidIPv4` annotation targets only `FIELD` and `PARAMETER`. This is valid; authors who need method-level or type-use validation can extend `@Target` accordingly.
- For very high-throughput extraction from large text, the anchored `matches()` approach is fine, but note that `Matcher` instances should not be shared across threads — only the `Pattern` is thread-safe.

# Validation Summary: How to Parse IPv4 Addresses from Strings in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Java networking APIs (`java.net.InetAddress`, `java.net.Inet4Address`, `java.net.URI`, `java.net.URL`)
- IPv4 addressing
- CIDR notation
- Java regular expressions

## Sources Consulted
- Oracle Java SE 24 `InetAddress` API: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/InetAddress.html
- Oracle Java SE 25 `Inet4Address` API: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/Inet4Address.html
- Oracle Java SE 24 `URI` API: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/URI.html
- Oracle Java SE 24 `URL` API: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/URL.html
- RFC 3021, Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://www.rfc-editor.org/rfc/rfc3021.html
- RFC 4632, Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan: https://www.rfc-editor.org/rfc/rfc4632

## Issues Found
1. **Standard IPv4 parser relied on hostname-resolution behavior**: The original `parseIPv4` example used `InetAddress.getByName()` and then compared `getHostAddress()` back to the input string. Oracle's docs note that `getByName()` accepts hostnames and multiple IPv4 literal forms, so the example was tightened to validate strict four-octet dotted-decimal input before parsing.

2. **Integer conversion snippet was not self-contained**: The original section showed top-level methods and usage statements that would not compile as a normal Java source file. It was rewritten as a complete `IPv4Converter` class while preserving the same behavior.

3. **`longToIPv4` did not validate its input range**: Values outside the unsigned 32-bit IPv4 range would have been silently truncated by bit masking. A range check was added so invalid numeric inputs fail explicitly.

4. **CIDR example depended on undefined helper methods and miscounted `/31` and `/32`**: The original `CIDRParser` referenced `ipv4ToLong()` and `longToIPv4()` without defining them in the snippet, and its `usable hosts = total - 2` logic incorrectly returned `0` for `/31` and `/32`. The helper methods were added to the snippet, `/31` was corrected per RFC 3021, and `/32` was corrected to a single-address host route.

5. **URL parsing example used deprecated construction and overly broad exceptions**: Oracle's current `URL` docs deprecate the `URL` constructors in favor of `URI`. The example now uses `URI.parseServerAuthority()` and throws `URISyntaxException` instead of `Exception`.

6. **Conclusion made an inaccurate security claim**: The original text said octet validation helps prevent injection attacks. That overstates what these parsing checks do, so the wording was corrected to focus on malformed input and unexpected parsing behavior.

## Review Notes
- Java 22+ adds `InetAddress.ofLiteral()` and `Inet4Address.ofLiteral()`. The corrected examples keep broader Java-version compatibility by validating dotted-quad input before calling `InetAddress.getByName()`.
- The `/31` usable-host logic is correct in the RFC 3021 point-to-point sense; readers applying `/31` outside that context should understand the networking assumptions involved.
- The review environment did not have `java` or `javac` installed, so verification was done against Oracle API documentation and relevant RFCs rather than local execution.

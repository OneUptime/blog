# Validation Summary: How to Validate IPv4 Addresses in Java Using InetAddress

## Status
validated

## Post Type
Guide

## Technologies Covered
- Java
- `java.net.InetAddress`
- `java.net.Inet4Address`
- Java regex (`java.util.regex.Pattern`)
- Apache Commons Validator
- Maven

## Sources Consulted
- Oracle Java SE 25 `InetAddress` API docs: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/InetAddress.html
- Oracle Java SE 25 `Inet4Address` API docs: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/Inet4Address.html
- Apache Commons Validator `InetAddressValidator` Javadoc: https://commons.apache.org/proper/commons-validator/apidocs/org/apache/commons/validator/routines/InetAddressValidator.html
- Apache Commons Validator release notes: https://commons.apache.org/proper/commons-validator/changes.html
- Apache Commons Validator downloads page: https://downloads.apache.org/commons/validator/

## Issues Found
- The description referenced Apache Commons Net, but the post actually uses Apache Commons Validator. I corrected the library name to match the dependency coordinates and API used in the code sample.
- The `InetAddress` example claimed it avoided DNS lookups and accepted any dotted-decimal IPv4 address. Oracle's `InetAddress.getByName(String)` documentation says it can resolve hostnames, and `Inet4Address` documentation shows Java accepts multiple IPv4 literal forms while `getHostAddress()` normalizes output. I updated the Javadoc and inline comments to describe the actual behavior: the sample accepts canonical dotted-quad IPv4 literals by comparing the normalized text back to the input.
- The address-type example included a link-local sample address (`169.254.1.1`) but did not print the link-local flag in `inspectIP`. I updated the output so the sample now reports link-local status.
- The reachability example described the method as checking an IPv4 host and said it used "ICMP ping". The JDK docs describe `isReachable` more generally for a host/address and refer to ICMP echo requests with required privileges on some systems. I corrected the comment to match the API behavior.
- The Maven dependency used `commons-validator` version `1.8.0`, which is outdated as of 2026-04-29. Apache Commons Validator's official release history and downloads page show `1.10.1` as the latest released version, so I updated the snippet.
- The conclusion claimed regex validation was the "fastest" option. That absolute performance claim was not substantiated by the official sources, so I changed it to the more accurate "fast".

## Review Notes
- Runtime execution was not performed in this workspace because `java` and `jshell` are not installed. Validation was completed against the official JDK and Apache Commons Validator documentation instead.

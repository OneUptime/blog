# Validation Summary: How to Validate IPv4 Addresses Using Regex in C#

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C# (.NET)
- System.Text.RegularExpressions (Regex, RegexOptions.Compiled)
- System.Net.IPAddress.TryParse
- System.Net.Sockets.AddressFamily
- System.ComponentModel.DataAnnotations (ValidationAttribute for ASP.NET)

## Sources Consulted
- Microsoft Docs: Regular Expressions in .NET — https://learn.microsoft.com/en-us/dotnet/standard/base-types/regular-expressions
- Microsoft Docs: Regex class — https://learn.microsoft.com/en-us/dotnet/api/system.text.regularexpressions.regex
- Microsoft Docs: RegexOptions.Compiled — https://learn.microsoft.com/en-us/dotnet/api/system.text.regularexpressions.regexoptions
- Microsoft Docs: IPAddress.TryParse — https://learn.microsoft.com/en-us/dotnet/api/system.net.ipaddress.tryparse
- Microsoft Docs: AddressFamily enum — https://learn.microsoft.com/en-us/dotnet/api/system.net.sockets.addressfamily
- Microsoft Docs: ValidationAttribute — https://learn.microsoft.com/en-us/dotnet/api/system.componentmodel.dataannotations.validationattribute
- .NET 5 breaking change: IPAddress.Parse rejects IPv4 with leading zeros — https://learn.microsoft.com/en-us/dotnet/core/compatibility/networking/5.0/ipaddress-parse-rejects-ipv4-strings-with-leading-zeros
- RFC 791 (IPv4) — https://www.rfc-editor.org/rfc/rfc791

## Issues Found
No technical issues found.

The strict regex `(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)` correctly enforces the 0-255 octet range:
- `25[0-5]` matches 250-255
- `2[0-4]\d` matches 200-249
- `1\d{2}` matches 100-199
- `[1-9]\d` matches 10-99
- `\d` matches 0-9

It correctly rejects leading zeros (e.g., "01"), extra/missing octets (anchored with `^...$`), and non-IPv4 strings. All ten test cases in the sample have correct `expected` values. The `IPAddress.TryParse` + `AddressFamily.InterNetwork` pattern is idiomatic for IPv4 validation in .NET. The `ValidationAttribute` subclass correctly overrides `IsValid(object?, ValidationContext)`. Compiled `Regex` instances are documented as thread-safe.

## Review Notes
- The note "IPAddress.TryParse accepts some leading-zero forms - use regex when strict" is accurate for .NET Framework and .NET Core < 5.0. In .NET 5+, `IPAddress.Parse`/`TryParse` was changed to reject IPv4 strings with leading zeros (see linked breaking change doc). The caveat is still useful because many codebases target the older behavior, but readers on .NET 5+ may find `IPAddress.TryParse` stricter than implied.
- The `ValidIPv4Attribute` usage targets `Property | Parameter`. Built-in `ValidationAttribute` subclasses (e.g., `RequiredAttribute`) typically also allow `Field`. Not incorrect, just narrower than the BCL convention.
- The extractor regex uses `\b` word boundaries. It will also match IP-like substrings within longer dotted-number sequences (e.g., `1.2.3.4.5` yields `1.2.3.4`), which is standard behavior for this kind of pattern.

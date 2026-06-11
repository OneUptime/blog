# Validation Summary: How to Implement Custom EF Core Value Converters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Entity Framework Core value converters
- Entity Framework Core value comparers
- C# and .NET
- System.Text.Json
- System.Security.Cryptography AES
- SQL Server and PostgreSQL column storage concepts

## Sources Consulted
- Microsoft Learn: EF Core value conversions, https://learn.microsoft.com/en-us/ef/core/modeling/value-conversions
- Microsoft Learn: EF Core value comparers, https://learn.microsoft.com/en-us/ef/core/modeling/value-comparers
- Microsoft Learn: PropertyBuilder.HasConversion overloads, https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.metadata.builders.propertybuilder.hasconversion
- Microsoft Learn: PropertyBuilder<TProperty>.HasConversion overloads, https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.metadata.builders.propertybuilder-1.hasconversion
- Microsoft Learn: Aes class, https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.aes
- Microsoft Learn: Encrypting data in .NET, https://learn.microsoft.com/en-us/dotnet/standard/security/encrypting-data
- Microsoft Learn: Generating keys for encryption and decryption, https://learn.microsoft.com/en-us/dotnet/standard/security/generating-keys-for-encryption-and-decryption
- Microsoft Learn: Timing vulnerabilities with CBC-mode symmetric decryption using padding, https://learn.microsoft.com/en-us/dotnet/standard/security/vulnerabilities-cbc-mode

## Issues Found
- The enum converter used a named argument inside a value converter expression. Value converters are built from expression trees, so this can fail compilation. Changed `Enum.Parse<TEnum>(v, ignoreCase: true)` to `Enum.Parse<TEnum>(v, true)`.
- The encrypted string converter derived a fixed IV from the key. .NET cryptography guidance requires a new IV for symmetric encryption operations. Changed the example to generate an IV per value and store it with the ciphertext.
- The money converter formatted and parsed decimals using the current culture, which can break round trips on cultures that do not use `.` as the decimal separator. Changed it to use `CultureInfo.InvariantCulture`.
- The string list converter mapped a mutable `List<string>` without a value comparer, so EF Core might not detect in-place list changes. Added a `ValueComparer<List<string>>` and used the `HasConversion` overload that accepts a comparer.
- The nullable converter section stated that nullable properties need explicit null handling in converters. EF Core documentation states null values are not passed to value converters. Replaced that section with the documented behavior.
- The JSON value comparer used `JsonSerializer` calls with omitted optional arguments inside expression-tree lambdas. Changed the calls to pass `JsonSerializerOptions` explicitly.
- The complete example used JSON conversion for a mutable dictionary without a comparer and list conversion without the list comparer. Updated those mappings to use the comparer-aware helpers.
- The limitations section overstated LINQ translation behavior. Updated it to match EF Core's documented limitation: queries cannot access members inside value-converted .NET types.
- The performance table incorrectly said to always handle nulls explicitly. Updated it to reflect EF Core's documented null-converter behavior.

## Review Notes
The AES example now avoids IV reuse, but production systems should still prefer a vetted encryption design such as database-native encryption or authenticated encryption. The local environment did not have the `dotnet` CLI installed, so code snippets were reviewed against official documentation rather than compiled locally.

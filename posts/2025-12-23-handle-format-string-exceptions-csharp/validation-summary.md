# Validation Summary: How to Handle 'Format string' Exceptions in C#

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- C# / .NET (string formatting and parsing APIs)
- `string.Format`, string interpolation
- `int.Parse` / `TryParse`, `decimal.Parse`, `double.Parse`, `NumberStyles`, `CultureInfo`
- `DateTime.Parse` / `TryParseExact`, `DateTimeStyles`
- `Guid.Parse` / `TryParse` / `TryParseExact`
- `Enum.Parse` / `TryParse` / `IsDefined` / `GetNames<T>`
- Standard and custom numeric and date/time format strings
- ASP.NET Core controllers, model binding, and data annotations

## Sources Consulted
- [Custom numeric format strings - .NET | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-numeric-format-strings)
- [Standard numeric format strings - .NET | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-numeric-format-strings)
- [Custom date and time format strings - .NET | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings)
- [Standard date and time format strings - .NET | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-date-and-time-format-strings)
- [FormatException Class (System) | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/api/system.formatexception)
- [System.String.Format method - .NET | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/system-string-format)

## Issues Found
Two incorrect claims in **Section 6 (Custom Format String Errors)**, both asserting a
`FormatException` is thrown when it is not:

1. **`number.ToString("X2Z")` does not throw.** Because the format string does not parse
   as a standard numeric format specifier (the trailing `Z` follows a precision digit), it
   is treated as a *custom* numeric format string, where every non-reserved character is a
   literal — so the result is the literal string `"X2Z"`, not an exception. To genuinely
   demonstrate a thrown `FormatException`, I changed the example to `number.ToString("Z")`,
   a single invalid *standard* specifier, which does throw ("Format specifier was invalid").
   Updated the comment accordingly.

2. **`date.ToString("Today is dddd")` does not throw.** In a custom date/time format string,
   unrecognized characters (`T`, `o`, `a`, spaces, `i`) are emitted as literals, while the
   recognized specifiers `d` (day), `y` (year), and `s` (seconds) are interpreted — producing
   garbled output, not an exception. The original comment also misidentified which characters
   are specifiers (`'T', 'o', 'a', 'y'`). I corrected the comment to state that `d`, `y`, and
   `s` are interpreted as format specifiers, yielding garbled output rather than literals (and
   no exception). This still motivates the escaping solution that follows.

## Review Notes
- All other code is accurate and uses current, non-deprecated APIs: `int.Parse("not a number")`,
  `decimal.Parse("$19.99")`, and `DateTime.Parse("2024-13-45")` do throw `FormatException` as
  described; the `TryParse`/`TryParseExact` patterns, `NumberStyles.Currency`/`Number` with
  explicit cultures, `Guid.TryParseExact(..., "B", ...)`, and the `Enum.TryParse` +
  `Enum.IsDefined` validation pattern are all correct.
- `Enum.GetNames<Status>()` (used in the API section) is the generic overload available in
  .NET 5+; fine for current target frameworks.
- The illustrative output comments (e.g. `"$12,345.00"`, short/long date examples) assume an
  `en-US` current culture; this is reasonable for examples but output will vary by culture —
  worth keeping in mind but not a correctness error.
- Examples rely on `using System.Globalization;` (for `NumberStyles`/`CultureInfo`/
  `DateTimeStyles`); standard for this kind of snippet and not a defect.

# Validation Summary: How to Handle 'Index out of range' Errors in C#

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- C# (language features through C# 11/12)
- .NET (BCL: arrays, `List<T>`, `string`, `Span<T>`, LINQ)
- C# 8+ Index (`^`) and Range (`..`) operators
- C# 11 list patterns
- `Math.Clamp`, `ArgumentNullException.ThrowIfNull` (.NET 6+)

## Sources Consulted
- IndexOutOfRangeException — https://learn.microsoft.com/en-us/dotnet/api/system.indexoutofrangeexception
- ArgumentOutOfRangeException — https://learn.microsoft.com/en-us/dotnet/api/system.argumentoutofrangeexception
- Indices and ranges (C#) — https://learn.microsoft.com/en-us/dotnet/csharp/tutorials/ranges-indexes
- Pattern matching / list patterns — https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/patterns
- Enumerable.ElementAtOrDefault — https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.elementatordefault
- Math.Clamp — https://learn.microsoft.com/en-us/dotnet/api/system.math.clamp
- ArgumentNullException.ThrowIfNull — https://learn.microsoft.com/en-us/dotnet/api/system.argumentnullexception.throwifnull
- Span<T> — https://learn.microsoft.com/en-us/dotnet/api/system.span-1

## Issues Found
- **Incorrect "null" comment on `SafeGet` for a value-type array** (Extension Methods section). The example used `var numbers = new[] { 1, 2, 3 };` (an `int[]`) and commented that `numbers.SafeGet(10)` returns `// null instead of exception`. Because `SafeGet<T>` returns `default` for an out-of-range index, an `int[]` would return `default(int)` = `0`, not `null` — for an unconstrained generic `T`, `T?` is the same value type at runtime. Changed the example to a reference-type array (`var names = new[] { "a", "b", "c" };`) so the documented `null` result is accurate, preserving the intent of demonstrating a safe default return.

## Review Notes
- **Exception type nuance (not an error in the post, but worth noting):** Out-of-range indexing throws different exceptions by type. Arrays (`T[]`) and `string` throw `IndexOutOfRangeException`; `List<T>`, `Span<T>.Slice`, and most BCL collections throw `ArgumentOutOfRangeException`. The post's intro groups List/string/Span under the `IndexOutOfRangeException` heading, but its inline code comments only say "Throws!" without misattributing the exception type, so no factual claim is incorrect. A future revision could clarify that `List<T>` indexing actually raises `ArgumentOutOfRangeException`.
- The custom `ElementAtOrDefault(this IList<T>, int)` extension shadows the built-in `Enumerable.ElementAtOrDefault`. The more specific `IList<T>` receiver wins overload resolution, so there is no ambiguity error; both produce a safe default. This is intentional/illustrative and correct.
- C# 8+ Index/Range examples (`numbers[^1]`, `numbers[..3]`, `numbers[^3..]`, `numbers[1..^1]`) were verified and produce the stated results.
- The list pattern `data is [var first, ..]` is valid C# 11 and works on `List<T>` (countable + indexable). Correct.
- `CircularBuffer<T>` index translation `(_head - _count + index + _buffer.Length) % _buffer.Length` is correct because `_count <= _buffer.Length`, keeping the intermediate value non-negative after one addition of `_buffer.Length`.
- Manually throwing `IndexOutOfRangeException` in `BoundedList.ValidateIndex` is legal; idiomatically `ArgumentOutOfRangeException` is preferred for an indexer parameter, but this is a style choice, not a correctness issue.

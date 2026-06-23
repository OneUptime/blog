# Validation Summary: How to Fix 'The name does not exist in current context' in C#

## Status
validated

## Post Type
Guide / Troubleshooting reference (compiler error)

## Technologies Covered
- C# (language scoping, case sensitivity, generics, lambdas, preprocessor directives)
- .NET / Roslyn compiler errors (CS0103 and related)
- MSBuild `.csproj` (`ProjectReference`, `Using` / implicit & global usings)
- Visual Studio and JetBrains Rider quick-fix features

## Sources Consulted
- Microsoft Learn — Compiler Error CS0103 ("The name 'identifier' does not exist in the current context"): https://learn.microsoft.com/en-us/dotnet/csharp/misc/cs0103
- Microsoft Learn — Compiler Error CS0246 ("The type or namespace name could not be found"): https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/cs0246
- Microsoft Learn — Compiler Error CS1061 ("does not contain a definition for"): https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/cs1061
- Microsoft Learn — Compiler Error CS0120 (object reference required for non-static member): https://learn.microsoft.com/en-us/dotnet/csharp/misc/cs0120
- Microsoft Learn — Global using directives (C# 10): https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/using-directive#global-modifier
- Microsoft Learn — Implicit usings (`<Using>` MSBuild item): https://learn.microsoft.com/en-us/dotnet/core/project-sdk/overview#implicit-using-directives
- Microsoft Learn — `default` literal (C# 7.1+): https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/default

## Issues Found
No technical issues found. All code examples are syntactically valid illustrations and every proposed solution is correct. No edits were required.

## Review Notes
- **Error-code conflation (imprecision, not an error):** The post is titled and framed around CS0103, but several examples actually produce *related* compiler errors rather than CS0103 itself:
  - §1 (missing using for `List`/`Task`) → **CS0246** ("The type or namespace name could not be found — are you missing a using directive or an assembly reference?").
  - §5 (`order.Subtotal` on a known type) → **CS1061** ("'Order' does not contain a definition for 'Subtotal'").
  - §6 (instance field in a static method) → **CS0120** ("An object reference is required for the non-static field…").
  - §9 (`UserDto` from an unreferenced project) and §10 (undeclared type parameter `T`) → **CS0246**.

  The sections that genuinely yield CS0103 are §2 (scope), §3 (declaration order), §4 (typos/case for a simple name), §7 (lambda/closure scope), §8 (conditional compilation), and the opening `userName` example. The inline comments mostly use loose wording ("does not exist") rather than asserting the wrong code number, and every diagnosis and fix is correct, so the guidance is sound. A future revision could tighten precision by noting that missing *types/namespaces* surface as CS0246 and missing *members* as CS1061, while CS0103 specifically covers unresolved simple names in expression context.
- **Illustrative pseudocode caveat:** Some snippets intentionally show "wrong" and "correct" lines (and multiple alternative solutions) within a single block — e.g. §4 declares `var order` three times, and §6's `Calculator` shows three solutions that would collide (`CS0102`/`CS0128`) if pasted verbatim. These are standard teaching illustrations and read clearly in context; no change needed.
- **Version notes (correct):** Global usings require C# 10 / .NET 6+, and the `<Using Include="…" />` MSBuild item likewise; the post correctly labels these as "C# 10+". `return default;` is valid from C# 7.1 onward.
- IDE shortcuts (Ctrl+. in Visual Studio, Alt+Enter in Rider) and the Mermaid scope diagram are accurate.

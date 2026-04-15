# Validation Summary: How to Use multiMatchAny() and multiMatchAllIndices() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (multiMatch family of string search functions)
- Intel Hyperscan / Vectorscan (regex engine)
- SQL

## Sources Consulted
- ClickHouse official documentation: string search functions (https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions)
- ClickHouse source code: `src/Functions/MultiMatchAnyImpl.h`, `MultiMatchAllIndicesImpl.h`, `FunctionsMultiStringSearch.h`, `Regexps.h`
- ClickHouse source code: `contrib/vectorscan-cmake/CMakeLists.txt` (platform support)
- Intel Hyperscan documentation (pattern syntax and compilation behavior)
- Vectorscan project documentation (ARM/aarch64 support)

## Issues Found

### 1. Incorrect claim: "Hyperscan RE2-compatible syntax"
**What was wrong:** The post stated that the multiMatch functions use "Hyperscan RE2-compatible syntax." Hyperscan actually uses a subset of PCRE syntax, not RE2 syntax. While PCRE and RE2 have significant overlap, they are distinct regex dialects.
**What was changed:** Corrected to "Hyperscan, which supports a subset of PCRE syntax" in the Function Overview section, and "a subset of PCRE syntax" in the Limitations section.

### 2. Incorrect claim: ARM builds fall back to RE2
**What was wrong:** The post stated "On ARM or in builds without Hyperscan, ClickHouse falls back to evaluating each pattern independently with RE2, which is slower but produces identical results." This was doubly incorrect: (a) ARM (aarch64) builds DO include Hyperscan via the Vectorscan fork, which provides full ARM NEON/ASIMD support; (b) builds without Vectorscan do NOT fall back to RE2 — they throw a `NOT_IMPLEMENTED` error.
**What was changed:** Corrected to explain that Vectorscan is available on both x86-64 and ARM, and that builds without Vectorscan will return a NOT_IMPLEMENTED error rather than falling back to RE2.

### 3. Outdated claim: patterns must be constant / cannot reference a column
**What was wrong:** The post stated the pattern list "must be an array literal or a constant expression - it cannot reference a column." The ClickHouse source code (`FunctionsMultiStringSearch.h`) now includes a `vectorVector` method that handles non-constant pattern arrays from columns.
**What was changed:** Softened the language to recommend constant arrays for best performance (Hyperscan optimization) rather than claiming it is a hard requirement. Removed the suggestion to use `match()` or `replaceRegexpAll()` as alternatives since column-based patterns are now supported.

## Review Notes
- The claim that multiMatchAnyIndex returns "the first matching pattern" is consistent with ClickHouse's own documentation phrasing, but technically Hyperscan returns whichever pattern its automaton encounters first during scanning, which may not correspond to the first index in the array. This is a very minor nuance and the current phrasing matches official docs.
- The blog's characterization that Hyperscan "compiles all patterns into a single automaton" is a slight simplification — Hyperscan internally uses a combination of automata (NFAs, DFAs, and specialized engines). However, the key point (single compiled database, single-pass scan) is accurate and appropriate for a blog post audience.
- All SQL examples are syntactically correct and demonstrate valid usage patterns.

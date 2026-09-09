# Validation Summary: Convert Kuzu LIST Results into C++ std::vector Values

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kuzu 0.11.3 public C++ API
- C++20, `std::vector`, and `std::optional`
- Cypher LIST types, casts, and null semantics
- Query result ownership and tuple lifetimes

## Sources Consulted
- [Official C++ documentation: result handling and copying](https://kuzudb.github.io/docs/client-apis/cpp/)
- [Official logical data types documentation](https://kuzudb.github.io/docs/cypher/data-types/)
- [Kuzu 0.11.3 NestedVal header](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/common/types/value/nested.h)
- [Kuzu 0.11.3 NestedVal implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/common/types/value/nested.cpp)
- [Kuzu 0.11.3 Value header](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/common/types/value/value.h)
- [Kuzu 0.11.3 Database and SystemConfig declarations](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/main/database.h)
- [Official Kuzu 0.11.3 release and binary distributions](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Official repository metadata](https://api.github.com/repos/kuzudb/kuzu)
- [Official latest-release metadata](https://api.github.com/repos/kuzudb/kuzu/releases/latest)

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged.
- Downloaded the official 0.11.3 macOS universal library distribution. Compiled the exact complete C++ example with `clang++ -std=c++20`, using its bundled `kuzu.hpp` and `libkuzu.dylib`; execution completed successfully with assertions enabled.
- Compiled and ran a separate verification harness using the published converter. The exact introductory Cypher query successfully produced a typed null list, an empty typed list, and a list with a null child. Their converted values retained all three distinctions.
- Verified rejection of DOUBLE[], INT32[], a fixed-length INT64 array, and a nested list through `std::invalid_argument`.
- Verified two distinct rows are copied correctly, confirmed that successive `getNext()` calls return the same tuple object, and checked that converted vectors remain correct after the query result and tuple references are released. Also verified that `Value::copy()` preserves the first row after iteration advances.
- The versioned headers confirm the uint32_t child count and index, const Value pointer input to NestedVal, scalar and string `getValue` specializations, and the absence of a vector specialization. The database header confirms `:memory:` support and the buffer pool size field in bytes.
- Null handling, logical versus physical type distinctions, recursive list conversion guidance, owned string copies, and the temporary storage cost of copying are consistent with the documented API and implementation. Processing rows promptly limits application-side accumulation; it does not establish that Kuzu streams query execution without materializing results.
- All external links in the post identify the intended resources. GitHub HTML retrieval failed through the browsing tool, so the versioned source files were checked through GitHub's raw-content endpoint instead.
- GitHub currently lists v0.11.3 as the latest release and marks the upstream repository as archived. The post explicitly targets that release, and the APIs used are available there without deprecation annotations. Compatibility with other revisions or platforms was not tested.

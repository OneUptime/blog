# Validation Summary: Bind Nested List Properties Through the Kuzu C++ API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kuzu 0.11.3 graph database
- C++20 and ownership through `std::unique_ptr`
- Cypher schemas and prepared statements
- Nested LIST types, empty collections, and typed null values

## Sources Consulted
- [Kuzu 0.11.3 Value header](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/common/types/value/value.h): scalar and nested constructors and typed null factory.
- [Kuzu 0.11.3 Value implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/common/types/value/value.cpp): child ownership, empty collections, and null construction.
- [Kuzu 0.11.3 Connection header](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/main/connection.h) and [implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/main/connection.cpp): prepared execution and owned parameter map passed by value.
- [Kuzu 0.11.3 QueryResult header](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/main/query_result.h): const success and error accessors.
- [Kuzu 0.11.3 Database header](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/main/database.h): in-memory database path and buffer pool configuration in bytes.
- [Kuzu data types](https://kuzudb.github.io/docs/cypher/data-types/): variable-length LIST versus fixed-length ARRAY and null semantics.
- [Kuzu C++ client documentation](https://kuzudb.github.io/docs/client-apis/cpp/): C++ client context and linking guidance.
- [Kuzu 0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3): official matching headers and macOS library used for compilation and execution.
- [Official repository metadata](https://api.github.com/repos/kuzudb/kuzu) and [latest release metadata](https://api.github.com/repos/kuzudb/kuzu/releases/latest): repository archive status and latest release tag.

## Issues Found
- The program was described as verifying its stored representation, but it only checks query success and prints the retrieved value. Changed that sentence to say it prints the stored representation for inspection. No code changes were needed.

## Review Notes
- Compiled the exact published C++ example with `clang++ -std=c++20`, using the official Kuzu 0.11.3 macOS release header and dynamic library. Execution succeeded and printed `[[1,2],[],[3]]`.
- A separate temporary C++ harness exercised the same builders and prepared statement with fresh parameter maps. Readback preserved an empty outer list (`[]`) and one empty inner list (`[[]]`). It also successfully stored a typed null row, a typed null integer child, and a typed null entire property. Cypher null predicates confirmed the null row and integer child independently of their ambiguous string rendering.
- The harness confirmed that duplicate primary keys fail at execution and a missing node table fails at preparation. The published schema, parameter names without `$`, result APIs, and 64 MiB in-memory database configuration worked as written.
- Versioned source confirms the nested constructor takes a logical type and owned child values, and `executeWithParams` accepts the owned map by value. Reusing the prepared statement with newly populated maps worked.
- Application limits, matrix-shape validation, and throughput measurement are appropriate application guidance. Nested LIST declarations impose element types, not a rectangular shape. No terminal commands or separate configuration snippets are present in the post.
- All four official documentation links identify the intended resources. The GitHub page fetcher could not retrieve the two header pages, so their exact tagged files were checked through GitHub's official raw-content endpoint instead.
- The official repository is archived, and its latest-release endpoint reports v0.11.3. The tutorial is explicitly scoped to that version; its demonstrated APIs remain valid for it. Archive status is a maintenance caveat, not grounds to remove this working version-specific tutorial.
- Temporary downloads, compilation products, and the supplemental harness were kept outside the repository.

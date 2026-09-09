# Convert Kuzu LIST Results into C++ std::vector Values

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, C++, Cypher, Graph Database, Data Analysis

Description: Read typed Kuzu LIST values into owned C++ vectors while preserving nulls and avoiding reused query tuple lifetimes.

Kuzu returns a Cypher list as a nested `Value`, not as a C++ vector that you can retrieve with `getValue<std::vector<T>>()`. A reliable conversion checks the logical type, walks the child values, and copies each element into application-owned storage.

This example targets the public C++ API shipped with Kuzu 0.11.3. In this release, use `kuzu::common::NestedVal` to access children. Match your headers and library to the same release; older examples may use different helper names.

## Decide how nulls map into C++

These three database values have different meanings:

```cypher
RETURN CAST(NULL AS INT64[]) AS unknown,
       CAST([] AS INT64[]) AS empty,
       [10, NULL, 30] AS partial;
```

A plain `std::vector<int64_t>` represents only the second value and fully populated lists. For a general converter, use an outer `std::optional` for a null list and an optional element type for null children:

```cpp
using NullableIntList =
    std::optional<std::vector<std::optional<int64_t>>>;
```

Do not map a null child to zero unless zero is explicitly your application's missing-value convention. Otherwise, aggregation and numerical processing can quietly treat missing measurements as real observations.

## Implement a typed converter

The following C++20 program is self-contained when compiled against the 0.11.3 distribution's `kuzu.hpp` and library:

```cpp
#include "kuzu.hpp"
#include <cassert>
#include <cstdint>
#include <optional>
#include <stdexcept>
#include <vector>

using namespace kuzu::common;
using NullableIntList =
    std::optional<std::vector<std::optional<int64_t>>>;

NullableIntList toIntList(const Value& value) {
    const auto& type = value.getDataType();
    if (type.getLogicalTypeID() != LogicalTypeID::LIST ||
        ListType::getChildType(type).getLogicalTypeID() !=
            LogicalTypeID::INT64) {
        throw std::invalid_argument("Expected INT64[]");
    }
    if (value.isNull()) {
        return std::nullopt;
    }
    std::vector<std::optional<int64_t>> output;
    auto size = NestedVal::getChildrenSize(&value);
    output.reserve(size);
    for (uint32_t i = 0; i < size; ++i) {
        const auto* child = NestedVal::getChildVal(&value, i);
        if (child->isNull()) {
            output.emplace_back(std::nullopt);
        } else {
            output.emplace_back(child->getValue<int64_t>());
        }
    }
    return output;
}

int main() {
    kuzu::main::SystemConfig config;
    config.bufferPoolSize = 64 * 1024 * 1024;
    kuzu::main::Database db(":memory:", config);
    kuzu::main::Connection conn(&db);
    auto result = conn.query(
        "RETURN [10, NULL, 30] AS values");
    if (!result->isSuccess()) {
        throw std::runtime_error(result->getErrorMessage());
    }
    auto tuple = result->getNext();
    auto values = toIntList(*tuple->getValue(0));
    assert(values.has_value());
    assert(values->size() == 3);
    assert((*values)[0] == 10);
    assert(!(*values)[1].has_value());
    assert((*values)[2] == 30);
}
```

The check uses the logical child type, not the physical storage width. A timestamp and an integer can share implementation details without being interchangeable application values. Likewise, `INT32[]`, `DOUBLE[]`, fixed-length arrays, and nested lists need their own conversion rules.

For a query that can infer ambiguous types, cast the result deliberately to the type your converter accepts. A cast is a query-level data transformation; it can fail or change representation. It should be a visible part of your contract, not a hidden fallback inside a generic conversion helper.

## Copy before advancing the result

The C++ documentation explains that `getNext()` reuses its `FlatTuple` object. A container of returned tuple pointers can therefore appear to contain many copies of the last row. Child `Value` pointers should also be treated as borrowed for the current row. See [C++ result handling](https://kuzudb.github.io/docs/client-apis/cpp/).

Convert during iteration:

```cpp
std::vector<NullableIntList> allLists;
while (result->hasNext()) {
    auto row = result->getNext();
    allLists.push_back(toIntList(*row->getValue(0)));
}
```

This loop is an alternative to the single-row read in `main`. Each vector owns its integers and null markers, so it remains usable after the next row is fetched or the query result is destroyed. For string lists, copy each child's `getValue<std::string>()` into an owned `std::string`; do not retain a pointer into a result buffer.

If an application needs the full dynamic Kuzu value instead, use its `copy()` facility before advancing. That preserves richer type information, but leaves the rest of the application coupled to the Kuzu value API.

## Adapt the contract deliberately

For a non-nullable vector, reject a null list and any null child with a clear error. For numerical libraries that accept a separate validity mask, return the vector and mask together. Both approaches are more explicit than deleting null elements, which changes positional meaning.

For `INT64[][]`, apply the same idea recursively: outer list, nullable inner list, nullable integer. Preserve empty inner lists because they can encode a row with no measurements. Do not flatten nested lists unless that is the requested output format.

Large lists require both Kuzu's result storage and your copied vector to exist temporarily. Reserve capacity as shown, process rows promptly, and avoid collecting the whole result when a streaming consumer can finish each row immediately. This conversion is an ownership boundary, not a zero-copy interface.

## Verify edge cases

Exercise an empty typed list, a typed null list, a list containing nulls, and two query rows with different lists. The two-row case catches reused-tuple mistakes. Also pass a `DOUBLE[]` and confirm the converter rejects it rather than reading its bits as integers.

Build with the same architecture, C++ standard library, and headers used by your Kuzu package. A successful compilation against a different revision does not establish compatibility with the runtime library.

## Conclusion

Use `NestedVal` to traverse a typed list and copy values before advancing `QueryResult`. Explicit null handling and an exact child-type contract turn a borrowed database value into predictable C++ storage.

## Official Documentation

- [C++ result lifetimes](https://kuzudb.github.io/docs/client-apis/cpp/)
- [NestedVal API](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/common/types/value/nested.h)
- [Value API](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/common/types/value/value.h)
- [Logical data types](https://kuzudb.github.io/docs/cypher/data-types/)

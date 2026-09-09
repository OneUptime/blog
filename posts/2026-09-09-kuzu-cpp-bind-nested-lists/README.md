# Bind Nested List Properties Through the Kuzu C++ API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, C++, Cypher, Graph Database, Data Modeling

Description: Construct typed nested Kuzu Value objects for C++ prepared statements, including empty inner lists and explicit parameter ownership.

Binding a nested list requires a type at every level. For a property declared `INT64[][]`, the outer value contains `INT64[]` values, and each inner value contains `INT64` values. Building that structure explicitly avoids ambiguous empty lists and incorrect attempts to bind arbitrary C++ containers as scalar parameters.

This tutorial uses the public Kuzu 0.11.3 C++ API. Its `Value` constructor accepts a logical type and owned child values, while `executeWithParams` accepts a map of owned parameter values. These are the interfaces to use for a controlled nested binding.

## Start with a typed property

The target schema stores a sequence of variable-length rows:

```cypher
CREATE NODE TABLE Sample(
    id INT64 PRIMARY KEY,
    readings INT64[][]
);
```

Kuzu lists are variable-length. The example `[[1, 2], [], [3]]` is valid even though its inner lists have different lengths. If downstream code expects a rectangular matrix, validate that application rule before binding. Declaring nested lists alone does not establish a matrix shape.

Decide whether a null list differs from an empty list in your model. For this first example, the C++ input contains no nulls, but it does preserve empty inner lists.

## Construct nested Value objects

The following C++20 program creates a sample and prints its stored representation for inspection. Compile it with the headers and library from the same Kuzu 0.11.3 release:

```cpp
#include "kuzu.hpp"
#include <cstdint>
#include <iostream>
#include <memory>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <vector>

using kuzu::common::LogicalType;
using kuzu::common::Value;

std::unique_ptr<Value> intList(const std::vector<int64_t>& input) {
    std::vector<std::unique_ptr<Value>> children;
    children.reserve(input.size());
    for (auto number : input) {
        children.push_back(std::make_unique<Value>(number));
    }
    return std::make_unique<Value>(
        LogicalType::LIST(LogicalType::INT64()), std::move(children));
}

std::unique_ptr<Value> nestedIntList(
    const std::vector<std::vector<int64_t>>& input) {
    std::vector<std::unique_ptr<Value>> rows;
    rows.reserve(input.size());
    for (const auto& row : input) {
        rows.push_back(intList(row));
    }
    return std::make_unique<Value>(
        LogicalType::LIST(LogicalType::LIST(LogicalType::INT64())),
        std::move(rows));
}

void requireSuccess(const kuzu::main::QueryResult& result) {
    if (!result.isSuccess()) {
        throw std::runtime_error(result.getErrorMessage());
    }
}

int main() {
    kuzu::main::SystemConfig config;
    config.bufferPoolSize = 64 * 1024 * 1024;
    kuzu::main::Database db(":memory:", config);
    kuzu::main::Connection conn(&db);
    auto ddl = conn.query(
        "CREATE NODE TABLE Sample(id INT64 PRIMARY KEY, readings INT64[][])");
    requireSuccess(*ddl);
    auto statement = conn.prepare(
        "CREATE (:Sample {id: $id, readings: $readings})");
    if (!statement->isSuccess()) {
        throw std::runtime_error(statement->getErrorMessage());
    }
    std::unordered_map<std::string, std::unique_ptr<Value>> params;
    params.emplace("id", std::make_unique<Value>(int64_t{7}));
    params.emplace("readings", nestedIntList({{1, 2}, {}, {3}}));
    auto inserted = conn.executeWithParams(statement.get(), std::move(params));
    requireSuccess(*inserted);
    auto result = conn.query(
        "MATCH (s:Sample {id: 7}) RETURN s.readings");
    requireSuccess(*result);
    std::cout << result->getNext()->getValue(0)->toString() << '\n';
}
```

Parameter names omit the `$` prefix. The Cypher text uses `$readings`; the map key is `readings`. The map is moved into the execution call, so build a new map for another execution. A prepared statement can be reused, but that does not make previously moved parameter ownership available again.

The inner list constructor supplies `LIST(INT64)` even when its `children` vector is empty. The outer constructor likewise supplies `LIST(LIST(INT64))` when there are no rows. There is no need to insert a dummy element to make type inference succeed.

## Add nulls without losing type information

A null inner list is a typed `INT64[]` value. When building the outer `rows` vector, construct one like this:

```cpp
auto nullRow = Value::createNullValue(
    LogicalType::LIST(LogicalType::INT64()));
rows.push_back(std::make_unique<Value>(std::move(nullRow)));
```

This is a fragment inside a builder that owns `rows`. A null integer child instead uses `Value::createNullValue(LogicalType::INT64())`. A null entire property uses the doubly nested type. The [Value header](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/common/types/value/value.h) defines the typed null factory and nested constructor.

Keep the structure consistent: a null row belongs in the outer list, while a null integer belongs inside an inner list. An API that maps every missing value to `[]` cannot distinguish missing data from a known empty collection.

## Separate application checks from database checks

Before allocating values, check limits your application cares about: maximum outer rows, maximum inner length, total element count, and acceptable numeric range. This prevents a malformed batch from consuming unnecessary memory in both the parameter objects and the query engine.

Then check prepare and execution separately. Preparation can fail because the table or property is missing; execution can fail because a primary key already exists or the supplied values violate the type contract. Reporting both as a generic connection failure hides the useful information.

Read the property back and compare its nested shape as well as its numbers. A test that only sums values would treat `[[1, 2], [], [3]]` and `[[1], [2, 3]]` as equivalent even though they encode different records.

For repeated inserts, consider a batch import when constructing thousands of individual value trees becomes expensive. The explicit parameter route is useful for application writes and correctness checks; it does not replace a throughput measurement for your actual ingestion size.

## Conclusion

Represent nested lists as explicitly typed, owned `Value` trees and pass them through `executeWithParams`. Preserve empty and null collections separately, rebuild moved parameter maps, and verify the stored shape after execution.

## Official Documentation

- [C++ connection parameter API](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/main/connection.h)
- [Value constructors and null values](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/common/types/value/value.h)
- [Kuzu data types](https://kuzudb.github.io/docs/cypher/data-types/)
- [C++ client documentation](https://kuzudb.github.io/docs/client-apis/cpp/)

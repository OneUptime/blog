# Validation Summary: How to Use JSONPath Queries in Redis for Nested Data Access

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis
- RedisJSON module
- JSONPath (Goessner-style)
- Python redis-py client

## Sources Consulted
- RedisJSON JSONPath documentation: https://redis.io/docs/latest/develop/data-types/json/path/
- Redis JSON.ARRLEN command reference: https://redis.io/docs/latest/commands/json.arrlen/
- Redis JSON.GET command reference: https://redis.io/docs/latest/commands/json.get/
- Goessner's original JSONPath article: http://goessner.net/articles/JsonPath/

## Issues Found

1. **Incorrect RFC 9535 reference in introduction**: The post claimed RedisJSON supports "RFC 9535 / Goessner-style" JSONPath. RedisJSON uses Goessner-style JSONPath only — the documentation explicitly references Goessner's article and makes no mention of RFC 9535. Changed to "Goessner-style".

2. **`JSON.ARRLEN` misuse with filter expression**: The post used `JSON.ARRLEN store:1 '$.inventory[?(@.in_stock == true)]'` with the comment "Count all in-stock items." `JSON.ARRLEN` returns the length of arrays at matched paths — since the filter matches individual inventory objects (not arrays), it would return `null` for each match, not a count. Replaced with the correct usage `JSON.ARRLEN store:1 $.inventory` which returns the length of the inventory array itself.

3. **Unsupported `in` operator in filter example**: The post used `'$.inventory[?("electronics" in @.tags)]'` but the `in` operator is not listed among RedisJSON's supported JSONPath filter operators (which are: `==`, `!=`, `<`, `<=`, `>`, `>=`, `=~`, `&&`, `||`). Replaced with a filter using the supported `==` operator: `'$.inventory[?(@.name == "Laptop")]'`.

4. **Unsupported operators in the filter operators table**: The post listed `in`, `nin`, `exists`, and `!` as supported filter operators. According to official RedisJSON documentation, the supported filter operators are comparison (`==`, `!=`, `<`, `<=`, `>`, `>=`, `=~`) and logical (`&&`, `||`) with parenthetical grouping. Removed `in`, `nin`, `exists`, and `!` rows and added the `=~` regex match operator which IS supported but was missing from the table.

## Review Notes
- The `=~` regex match operator was missing from the original operators table despite being a supported RedisJSON JSONPath operator. It was added during the fix.
- The Python code examples use `r.json().get()` from redis-py, which is the correct API for RedisJSON operations.
- The mermaid flowchart is a reasonable conceptual illustration of JSONPath evaluation.
- The post's quoting of JSONPath expressions is slightly inconsistent (some commands quote the path, others don't), but both forms work in redis-cli so this is not an error.

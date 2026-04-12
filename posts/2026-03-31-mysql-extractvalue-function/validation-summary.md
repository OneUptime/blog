# Validation Summary: How to Use ExtractValue() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (ExtractValue() XML function)
- XPath 1.0 expressions
- SQL (DDL, DML, and query examples)

## Sources Consulted
- MySQL 8.0 Reference Manual — XML Functions: https://dev.mysql.com/doc/refman/8.0/en/xml-functions.html
- MySQL 8.4 Reference Manual — XML Functions: https://dev.mysql.com/doc/refman/8.4/en/xml-functions.html
- XPath 1.0 Specification (W3C): https://www.w3.org/TR/xpath-10/

## Issues Found

1. **Incorrect unsupported XPath function example (Limitations section):** The post stated that `contains()` may not work with MySQL's XPath support. This is incorrect — MySQL explicitly supports `contains()` and uses the current SQL collation for comparisons with it. The actually unsupported functions include `starts-with()`, `normalize-space()`, `id()`, `lang()`, `local-name()`, `name()`, `namespace-uri()`, `string()`, `substring-after()`, `substring-before()`, and `translate()`. Changed the example to reference `starts-with()` and `normalize-space()` instead.

2. **Wildcard example would return empty string (Using Wildcards and Paths section):** The original wildcard example used the same XML variable (`@xml`) containing `<root><a><b>value1</b></a><a><b>value2</b></a></root>`. The XPath `/root/*` matches the `<a>` elements, but these elements have no direct text content — their text lives inside nested `<b>` children. Since ExtractValue returns only direct CDATA of matched elements, the result would be empty, not the text of the nested children. Fixed by introducing a separate XML variable (`@xml2`) with direct text children (`<x>hello</x><y>world</y>`) to correctly demonstrate wildcard behavior.

## Review Notes
- The attribute extraction examples using `/@attr` syntax (e.g., `/product/@id`) work in practice and are consistent with XPath 1.0 semantics, though the MySQL documentation primarily demonstrates `@` usage in predicates rather than as a final path step. This is a minor documentation gap in MySQL, not an error in the blog post.
- The `TRIM(...) + 0` idiom for numeric conversion is valid but `CAST(... AS DECIMAL)` would be more explicit and robust. This is a style preference, not a correctness issue.
- ExtractValue() is not deprecated in any MySQL version (checked 8.0, 8.4, and 9.x documentation).
- The recommendation to consider JSON for large-scale XML workloads (MySQL 5.7+) is sound advice.

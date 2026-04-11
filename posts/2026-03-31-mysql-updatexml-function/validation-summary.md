# Validation Summary: How to Use UpdateXML() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (UpdateXML() and ExtractValue() XML functions)
- SQL (DDL, DML statements)
- XPath expressions

## Sources Consulted
- MySQL 8.0 Reference Manual — XML Functions: https://dev.mysql.com/doc/refman/8.0/en/xml-functions.html
- MySQL 8.4 Reference Manual — XML Functions: https://dev.mysql.com/doc/refman/8.4/en/xml-functions.html

## Issues Found

1. **Incorrect claim about multiple-match behavior (line 25, Basic Syntax section)**: The post stated the function returns the original string unchanged "if the XPath does not match any node" but omitted the equally important case where the XPath matches *more than one* node. Per the official MySQL documentation, the function also returns the original unchanged when multiple nodes match. **Fixed** to: "If the XPath does not match any node, or if it matches more than one node, the original string is returned unchanged."

2. **Incorrect claim about first-match behavior (line 121, Limitations section)**: The post stated "Only the first matching node is replaced." This is **factually wrong**. Per the MySQL documentation, if the XPath expression matches multiple nodes, *no replacement is performed at all* and the original XML is returned unchanged. The function requires exactly one matching node to perform a replacement. **Fixed** to: "If the XPath matches more than one node, no replacement is performed and the original XML is returned unchanged."

## Review Notes
- The attribute replacement example (`/product/@id` with bare value `'202'`) is not explicitly demonstrated in the official MySQL documentation — all official examples use element node replacement. While this pattern is known to work in practice, the official docs do not cover it. This could be noted as an advanced/underdocumented usage in a future revision.
- Neither `UpdateXML()` nor `ExtractValue()` is deprecated in MySQL 8.0 or 8.4. The MySQL 8.4 docs note these functions remain under active development.
- The characterization of `ExtractValue()` as the "complement" to `UpdateXML()` is the author's editorial framing (not from official docs) but is a reasonable conceptual description.

# Validation Summary: How to Use Named Windows with the WINDOW Clause in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL Window Functions
- WINDOW clause (Named Windows)

## Sources Consulted
- MySQL 8.0 Reference Manual, Section 14.20.4 "Named Windows" — https://dev.mysql.com/doc/refman/8.0/en/window-functions-named-windows.html
- MySQL 8.0 Reference Manual, Section 14.20.3 "Window Function Frame Specification" — https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html

## Issues Found

1. **Incorrect claim that window extensions can "override" properties (line 81)**
   - **What was wrong:** The post stated "A named window can inherit from another window and add or override the `ORDER BY` or frame clause." The word "override" is incorrect — MySQL documentation explicitly states: "An OVER clause can only add properties to a named window, not modify them."
   - **What was changed:** Removed "or override" so the sentence reads "add an `ORDER BY` or frame clause."
   - **Why:** This is a factual error. If a named window already has an ORDER BY, you cannot override it with a different ORDER BY in the OVER clause — MySQL will raise an error.

2. **Incorrect rule about frame clause requiring ORDER BY (line 100)**
   - **What was wrong:** The post stated "A window referenced in `OVER` can add a frame clause only if the named window has no frame clause and does include an `ORDER BY`." The "and does include an ORDER BY" condition is not a MySQL rule.
   - **What was changed:** Simplified to "A window referenced in `OVER` can add a frame clause only if the named window does not already have one."
   - **Why:** The MySQL documentation's rule is simply that you cannot add a property of the same kind that already exists. There is no additional requirement that ORDER BY must be present to add a frame clause. An ORDER BY can also be added in the same OVER clause alongside the frame.

## Review Notes
- All SQL code examples are syntactically correct and use valid MySQL 8.0 syntax.
- The placement of the WINDOW clause (after HAVING, before ORDER BY) is accurately described.
- The distinction between `OVER w` (direct reference, no parentheses) and `OVER (w ORDER BY col)` (extension, with parentheses) is correctly demonstrated.
- The practical examples (employee ranking, sales dashboard) are well-constructed and would execute correctly on MySQL 8.0+.

# Validation Summary: How to Use $integral and $derivative in MongoDB Window Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework (`$setWindowFields`)
- `$integral` window function operator
- `$derivative` window function operator
- Time-series data analysis in MongoDB

## Sources Consulted
- MongoDB official documentation for `$integral`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/integral/
- MongoDB official documentation for `$derivative`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/derivative/
- MongoDB official documentation for `$setWindowFields`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setwindowfields/
- MongoDB server source code (`window_function_expression.h`, `window_function_integral.h`, `window_function_exec_derivative.cpp`) on GitHub for authoritative verification of parsing logic and supported units

## Issues Found

### Issue 1: Incorrect claim about behavior without `unit` parameter
- **Location:** Line 52
- **What was wrong:** The post stated "Without `unit`, the result is in milliseconds." This is incorrect. When `unit` is omitted, the sortBy field must be numeric (not a Date), and the result is the raw numeric integral/derivative value with no time-unit conversion. The source code enforces this with assertions like `"$integral (with no 'unit') expects the sortBy field to be numeric"`.
- **Fix:** Changed to: "Without `unit`, the sort field must be numeric (not a Date), and the result is the raw numeric integral with no time-unit conversion."

### Issue 2: Unsupported time units listed
- **Location:** Lines 177-179 (Supported Time Units section)
- **What was wrong:** The post listed `"month"`, `"quarter"`, and `"year"` as supported time units. These are explicitly rejected by both `$integral` and `$derivative` at parse time with error code 5490710: `"unit must be 'week' or smaller"`. The reason is that months, quarters, and years vary in length, making a fixed millisecond conversion meaningless for calculus operations.
- **Fix:** Removed `"month"`, `"quarter"`, and `"year"` from the supported units list. The correct supported units are: `"millisecond"`, `"second"`, `"minute"`, `"hour"`, `"day"`, `"week"`.

## Review Notes
- Both operators were introduced in MongoDB 5.0. The post does not mention version requirements, which could be helpful for readers on older versions.
- The `$derivative` operator requires explicit window bounds (enforced at parse time), while `$integral` defaults to unbounded. The post correctly uses explicit windows for both, so this is not an issue in practice, but readers should be aware that omitting the window for `$derivative` will cause an error.
- All code examples use correct syntax and would work as described against a properly structured collection.
- The description of `$derivative` as computing `(y2 - y1) / (x2 - x1)` is accurate but technically refers to the first and last documents in the window, not necessarily "adjacent" documents. With the `[-1, 0]` window used in all examples, this distinction doesn't matter.

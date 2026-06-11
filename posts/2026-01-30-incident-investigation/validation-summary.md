# Validation Summary: How to Build Incident Investigation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Incident investigation workflows
- TypeScript
- Python
- NumPy
- Mermaid flowcharts and sequence diagrams
- Observability concepts: logs, metrics, traces, alerts, and change records

## Sources Consulted
- TypeScript Handbook: Classes - https://www.typescriptlang.org/docs/handbook/2/classes.html
- TypeScript Handbook: Utility Types (`Omit`) - https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys
- MDN JavaScript `Date` reference - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
- Python `dataclasses` documentation - https://docs.python.org/3/library/dataclasses.html
- Python `asyncio.gather` documentation - https://docs.python.org/3/library/asyncio-task.html#asyncio.gather
- Python `enum` documentation - https://docs.python.org/3/library/enum.html
- Python expression and slicing documentation - https://docs.python.org/3/reference/expressions.html#slicings
- NumPy `corrcoef` documentation - https://numpy.org/doc/stable/reference/generated/numpy.corrcoef.html
- Mermaid flowchart syntax - https://mermaid.js.org/syntax/flowchart.html
- Mermaid sequence diagram syntax - https://mermaid.js.org/syntax/sequenceDiagram.html

## Issues Found
- The metric correlator reported negative lag values when metric A led metric B, contradicting the `Positive = A leads B` comment and causing `find_leading_indicators()` to select the wrong direction. Updated the lag slicing logic so positive lag compares earlier values from metric A with later values from metric B, and added an explicit `max_lag_steps` calculation to avoid floor-division surprises for non-minute-aligned lag values.
- The trace collector docstring said it collected "error and slow traces", but the implementation only queries `status='ERROR'`. Updated the docstring to say it collects error traces.
- The change correlator comment said rollback availability boosted the score, but the implementation only records it as a factor. Updated the comment to describe mitigation planning instead of scoring.

## Review Notes
TypeScript snippets type-check under TypeScript 5.9.3 with strict settings. Python snippets compile under Python 3.12.3, and the metric lag direction was validated with a two-minute leading-series example using NumPy 2.3.5. The examples use placeholder observability clients (`log_client`, `metrics_client`, `trace_client`, and `change_client`), so they are structurally correct but require real client implementations in production.

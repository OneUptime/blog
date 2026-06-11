# Validation Summary: How to Create Flag User Experience Impact

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Feature flags and A/B experimentation
- TypeScript
- React
- PostgreSQL SQL
- Fetch API
- Mermaid diagrams
- UX analytics metrics, including NPS, CSAT, task completion, time-on-task, and sentiment analysis

## Sources Consulted
- TypeScript Classes Handbook: https://www.typescriptlang.org/docs/handbook/2/classes.html
- React createContext API: https://react.dev/reference/react/createContext
- React useContext API: https://react.dev/reference/react/useContext
- React useEffect API: https://react.dev/reference/react/useEffect
- React useMemo API: https://react.dev/reference/react/useMemo
- React useRef API: https://react.dev/reference/react/useRef
- MDN Fetch API: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- MDN String.prototype.substr deprecation notice: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substr
- PostgreSQL WITH queries documentation: https://www.postgresql.org/docs/current/queries-with.html
- PostgreSQL aggregate functions documentation: https://www.postgresql.org/docs/current/functions-aggregate.html
- PostgreSQL aggregate expression syntax, including FILTER and WITHIN GROUP: https://www.postgresql.org/docs/current/sql-expressions.html
- Bain Net Promoter Score measurement guidance: https://www.netpromotersystem.com/about/measuring-your-net-promoter-score/

## Issues Found
- The NPS tracker comment described a "-10 to 10" input scale. NPS uses a 0-10 response scale, so the comment was corrected.
- The TypeScript ID generators used deprecated `String.prototype.substr()`. Replaced those calls with `slice()` to avoid deprecated JavaScript APIs.
- The task completion tracker compared a completed step to `definition.completionEvent.replace('_', '')`, which made `order_confirmed` become `orderconfirmed` and prevented completion from being detected. Changed the comparison to use the configured completion event directly.
- The time-on-task statistics helper returned the upper middle value for even-length arrays instead of the conventional median. Updated it to average the two middle values.
- PostgreSQL queries used `ROUND(..., scale)` on expressions that could be `double precision`, including values created with `::float` and `percentile_cont`. PostgreSQL's two-argument `ROUND` requires `numeric`, so the expressions were changed to use `numeric` casts.
- The feedback sentiment SQL counted grouped summary rows instead of the underlying feedback events. Updated the outer query to sum the grouped counts and calculate a weighted sentiment average.
- The React integration example recreated tracker instances on every render and inferred `taskKey` from `attemptId.split('_')[0]`, which returns `"task"` for generated IDs such as `task_...`. Updated the example to memoize tracker instances and store the attempt-to-task mapping in a ref.
- The React integration code block contained JSX but was marked as `typescript`. Changed the fence to `tsx`.

## Review Notes
- The TypeScript and TSX snippets were syntax-checked with the TypeScript compiler API after edits.
- The statistical examples are suitable illustrative implementations, but a production A/B testing system should also handle multiple-comparison correction, experiment peeking policies, allocation bias, and edge cases such as zero standard error or extremely small sample sizes.

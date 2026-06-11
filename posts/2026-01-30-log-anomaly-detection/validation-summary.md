# Validation Summary: How to Build Log Anomaly Detection

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- TypeScript
- JavaScript `Date`, `Map`, `Set`, arrays, regular expressions, and `fetch`
- Statistical anomaly detection with Z-scores, percentiles, and baselines
- Log parsing, normalization, fingerprinting, and pattern detection
- OneUptime incident API
- OneUptime OpenTelemetry log ingestion
- Mermaid diagrams

## Sources Consulted
- TypeScript Handbook, Modules: https://www.typescriptlang.org/docs/handbook/2/modules.html
- TypeScript Handbook, Classes: https://www.typescriptlang.org/docs/handbook/2/classes.html
- MDN JavaScript `Map`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
- MDN JavaScript `Date.prototype.getHours()`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getHours
- MDN JavaScript `Date.prototype.getDay()`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getDay
- MDN JavaScript `Date.prototype.getTime()`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTime
- OneUptime API Reference, Incident: https://oneuptime.com/reference/en/incident
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry
- Chandola, Banerjee, and Kumar, "Anomaly Detection: A Survey": https://cucis.ece.northwestern.edu/projects/DMS/publications/AnomalyDetection.pdf

## Issues Found
- The separate TypeScript snippets imported `ParsedLog`, `LogFeatures`, `BaselineStats`, `AnomalyScore`, `PatternAnomaly`, and `Alert` in later files, but the original interfaces were not exported from their defining snippets. Exported the relevant interfaces and added missing imports to the snippets that use them.
- The `FeatureExtractor.addLog` method pruned old logs before checking whether the window was complete. Because `pruneOldLogs` removed entries at or before the cutoff, `isWindowComplete` could never become true in normal ordered input. Changed the method to emit the completed window before pruning.
- The anomaly scorer added the current observation to the baseline before calculating the Z-score, which could dilute or hide the very anomaly being scored. Changed scoring to compare against the existing baseline first, then update the baseline after scoring. The insufficient-history path still records the value and returns a non-anomalous result.
- The frequency-change evidence reported the raw count as an "x more than average" multiplier. Changed the message to calculate and report the actual ratio.
- The seasonal baseline snippet referenced `BaselineCalculator` and `BaselineStats` without importing them. Added the missing import.
- The OneUptime incident integration used a plural `/api/incidents` endpoint, Bearer authorization, and a payload shape that did not match the current OneUptime Incident API reference. Updated it to use `POST /api/incident`, the `ApiKey` header, a top-level `data` object, and incident state, severity, project, title, and declared-at fields. Severity mapping now returns configured OneUptime severity IDs instead of display names.

## Review Notes
The TypeScript examples were checked with the TypeScript 5.7 compiler API using strict settings in an in-memory multi-file compile. The examples are intentionally simplified for a tutorial; production systems should also account for out-of-order logs, distributed baselines, durable history storage, baseline poisoning, high-cardinality labels, timezone policy, API retry/backoff behavior, and incident severity/state ID lookup.

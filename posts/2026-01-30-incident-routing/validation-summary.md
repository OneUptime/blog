# Validation Summary: How to Build Incident Routing

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- TypeScript
- YAML configuration
- Mermaid flowcharts
- JavaScript `Date` and `Intl.DateTimeFormat`
- Incident management routing, fallback, notification, and escalation concepts

## Sources Consulted
- TypeScript Handbook: Narrowing and literal union behavior: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- MDN Web Docs: `Intl.DateTimeFormat`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/
- Mermaid flowchart syntax documentation: https://mermaid.ai/open-source/syntax/flowchart.html
- OneUptime related article link verification: https://oneuptime.com/blog/post/2025-11-28-sre-on-call-rotation-design/view

## Issues Found
- The `Service` interface typed `escalationPolicy` as an `EscalationPolicy` object, but the YAML configuration and unified router use policy ids. Changed it to `string` so the schema matches the examples and `EscalationManager.startEscalation`.
- `RoutingEngine` pushed `this.getFallbackTeam()` into `decision.teams` even though `getTeamById` can return `undefined`. Updated the fallback helper to return `Team | undefined` and only push a team when one is found.
- `RoutingEngine` used `usedFallback`, while later code and metrics use `fallbackUsed`. Standardized the property name to `fallbackUsed`.
- `ServiceCatalog` used `getTeamById` later in the post but did not show that method. Added a `teams` map, `loadTeams(config)` call, and `getTeamById` method to keep the snippet internally consistent.
- `EscalationTarget.type` omitted `channel`, but the escalation YAML uses `type: channel` for executive Slack alerts. Added `channel` to the literal union.
- Two `catch` blocks accessed `error.message` directly. In strict TypeScript, caught errors are `unknown`, so changed them to `error instanceof Error ? error.message : String(error)`.
- The unified fallback router passed `service?.escalationPolicy` into `findAvailableRoute`, but that method expects a fallback chain id, not an escalation policy id. Updated it to choose the defined `critical-fallback` or `standard-fallback` chain based on severity.

## Review Notes
The code snippets are illustrative and still omit surrounding application-specific types and helper methods such as `Alert`, `Incident`, `RoutingDecision`, `loadServices`, notification senders, and schedule resolution. That is acceptable for this guide, but a future runnable version should include complete type definitions and tests for rule ordering, fallback paths, timezone windows, and escalation timers.

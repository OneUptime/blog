# Validation Summary: How to Build Event Windowing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Event stream processing
- Tumbling, sliding, and session windows
- Event time, watermarks, allowed lateness, and late data side outputs
- TypeScript

## Sources Consulted
- Apache Flink documentation: Windows, window lifecycle, tumbling/sliding/session windows, allowed lateness, late side output, and watermark interaction: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/
- Apache Beam JavaDoc: Window transform, FixedWindows, SlidingWindows, Sessions, triggers, and allowed lateness: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/transforms/windowing/Window.html
- Apache Beam model basics: watermarks, windows, and allowed lateness: https://beam.apache.org/documentation/basics/
- TypeScript Handbook: classes, private and protected member visibility: https://www.typescriptlang.org/docs/handbook/classes.html
- GitHub author profile URL: https://github.com/nawazdhandala
- OneUptime website URL: https://oneuptime.com/

## Issues Found
- The TypeScript examples declared an interface named `Event`, which collides with standard DOM/Node event types in common TypeScript projects. Renamed it to `StreamEvent` throughout the code examples.
- `WindowWithLateHandling` extended `TumblingWindow` but accessed `private` members (`windowSizeMs` and `getWindowKey`). TypeScript only permits subclass access to `protected` members, so those members were changed to `protected`.
- The sliding window implementation could emit the same closed windows repeatedly on subsequent `closeWindows` calls. Added `nextWindowStart` tracking so each closed sliding window is emitted once.
- The sliding window implementation started at the window aligned to the oldest event timestamp, which missed earlier overlapping windows that also contain that event. Adjusted the first-window calculation to find the earliest aligned window that can contain the oldest event.
- The session window implementation overwrote an existing session when a later event exceeded the inactivity gap, losing the previous session before it could be emitted. Changed the implementation to keep multiple sessions per key and close them independently.
- The session window implementation claimed to handle merging but did not merge sessions when late events bridged the gap between existing sessions. Added sorting and merge logic so bridge events combine sessions when the configured gap allows it.
- Removed an unused `closedWindows` field from `WindowWithLateHandling`.

## Review Notes
The examples are intentionally educational and in-memory. Production stream processors should add checkpointing, durable state, partitioning/keying strategy, timer management, and more efficient range indexing for high-volume streams. Extracted TypeScript snippets were checked with `npx tsc --target ES2022 --lib ES2022 --strict --skipLibCheck --moduleResolution nodenext --module NodeNext --noEmit`, and focused runtime checks passed for sliding overlap and session merge behavior.

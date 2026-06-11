# Validation Summary: How to Implement Event Timestamps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TypeScript
- JavaScript Date API
- Node.js process.hrtime.bigint()
- Web/Node crypto UUID APIs
- UUID v7 / RFC 9562
- NTP clock synchronization
- Lamport clocks and logical clocks
- Hybrid logical clocks and bounded-uncertainty clocks
- Distributed event ordering

## Sources Consulted
- Node.js process documentation for `process.hrtime.bigint()`: https://nodejs.org/api/process.html#processhrtimebigint
- Node.js crypto documentation for `crypto.randomUUID()` and `crypto.randomUUIDv7()`: https://nodejs.org/api/crypto.html
- MDN `Date.prototype.toISOString()` documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
- MDN JavaScript `Date` documentation for `getTime()` and epoch milliseconds: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
- MDN Web Crypto `randomUUID()` documentation: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
- RFC 9562, UUID version 7 layout: https://www.rfc-editor.org/rfc/rfc9562.html
- NTP.org FAQ on NTP accuracy: https://www.ntp.org/ntpfaq/NTP-s-algo/
- Google Cloud Spanner TrueTime and external consistency documentation: https://cloud.google.com/spanner/docs/true-time-external-consistency
- Leslie Lamport, "Time, Clocks, and the Ordering of Events in a Distributed System": https://lamport.azurewebsites.net/pubs/time-clocks.pdf
- Kulkarni et al., "Logical Physical Clocks and Consistent Snapshots in Globally Distributed Databases": https://cse.buffalo.edu/tech-reports/2014-04.pdf

## Issues Found
- The TypeScript snippet used an interface named `Event`, which can merge with the DOM `Event` interface in common TypeScript projects. Renamed it to `TimestampedEvent` so the snippet is portable.
- The post described `Date#toISOString()` as a human-readable format "with timezone". Clarified that it emits a UTC format, matching the `Z` suffix behavior documented by MDN.
- The NTP accuracy statement said NTP typically keeps clocks within 1-10 milliseconds. Adjusted it to note that controlled networks can achieve a few milliseconds, while public internet accuracy is often tens of milliseconds and can spike.
- The clock-drift example called an earlier receive timestamp a "logical impossibility". Reworded it to say the history appears to violate causality, which is more precise for skewed distributed clocks.
- The hybrid timestamp table associated hybrid clocks directly with "Google Spanner-style strong consistency". Reworded this to distinguish hybrid logical clocks from bounded-uncertainty APIs and avoid implying that hybrid logical clocks alone provide strong consistency.
- The UUID v7 section implied `crypto.randomUUID()` was relevant for v7 generation. Clarified that `crypto.randomUUID()` generates v4 UUIDs, while v7 requires a runtime API such as `crypto.randomUUIDv7()` when available or a UUID library with v7 support.
- The UUID v7 description said it provides "temporal ordering" in one field. Changed this to "coarse temporal ordering" because RFC 9562 UUID v7 embeds a millisecond timestamp, while ordering within the same millisecond depends on the remaining fields and implementation behavior.
- The summary recommended "Hybrid logical clocks" for strong consistency. Updated it to "Bounded-uncertainty clocks plus consensus" to avoid overstating what HLCs provide by themselves.

## Review Notes
The TypeScript snippets were compiled with the repository's installed TypeScript toolchain using strict settings and Node types. No terminal commands or configuration snippets were present in the post.

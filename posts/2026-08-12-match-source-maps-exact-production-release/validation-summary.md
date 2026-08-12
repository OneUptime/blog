# Validation Summary: Match Source Maps to the Exact Production Release

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- JavaScript source maps and the ECMA-426 format
- Browser error monitoring and stack-trace symbolication
- Vite production builds and asset manifests
- webpack source-map modes
- Sentry JavaScript SDK, Sentry CLI, debug IDs, releases, and distributions
- Chrome DevTools source-map diagnostics
- Content-hashed assets, HTTP caching, and CDN deployment
- POSIX-style shell pipelines and SHA-256 artifact manifests

## Sources Consulted
- [ECMA-426 Source Map Format specification](https://tc39.es/ecma426/)
- [Vite build options](https://vite.dev/config/build-options.html)
- [Vite backend integration and manifest documentation](https://vite.dev/guide/backend-integration.html)
- [webpack `devtool` configuration](https://webpack.js.org/configuration/devtool/)
- [Chrome DevTools source-map debugging](https://developer.chrome.com/docs/devtools/javascript/source-maps)
- [Chrome DevTools Developer Resources panel](https://developer.chrome.com/docs/devtools/developer-resources)
- [MDN `SourceMap` HTTP response header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/SourceMap)
- [Sentry JavaScript source-map troubleshooting](https://docs.sentry.io/platforms/javascript/sourcemaps/troubleshooting_js/)
- [Sentry CLI source-map upload guide](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/cli/)
- [Sentry per-event source-map debug API](https://docs.sentry.io/api/events/get-debug-information-related-to-source-maps-for-a-given-event/)
- [Sentry CLI 3.6.2 changelog](https://github.com/getsentry/sentry-cli/blob/3.6.2/CHANGELOG.md)
- [Sentry Relay stack-frame schema](https://getsentry.github.io/relay/relay_event_schema/protocol/struct.Frame.html)
- [Mozilla `source-map` consumer API](https://github.com/mozilla/source-map#sourcemapconsumerprototypeoriginalpositionforgeneratedposition)
- [POSIX `find`](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/find.html), [`sort`](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sort.html), and [`xargs`](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/xargs.html)
- [GNU Findutils `xargs` documentation](https://www.gnu.org/software/findutils/manual/html_node/xargs-options.html)
- [Perl `shasum` documentation](https://perldoc.perl.org/shasum)

## Issues Found
- The post named `sentry-cli sourcemaps explain <event-id>` as a current diagnostic, but Sentry CLI removed that subcommand in version 3.0.0. Replaced it with Sentry's current in-product `Unminify Code` workflow and the per-event source-map debug API.
- The local-lookup step instructed readers to use a zero-based column without explaining that Sentry event-frame columns are one-based. Clarified the coordinate conversion required by Mozilla's `source-map`: keep `lineno` as the one-based line and pass `colno - 1` as the zero-based column.
- The hidden-map paragraph attributed `sourceMappingURL` to the map rather than the generated bundle, required it to be on the final line, and implied that suppressing the comment always prevents automatic discovery. Corrected the subject and location, documented resolution against the generated code's source origin, and accounted for the standard `SourceMap` HTTP response header.
- The checksum pipeline could silently hash empty standard input when no JavaScript artifacts matched because `xargs` may invoke `shasum` with no path arguments. Added `xargs -r` and a non-empty manifest check so an empty artifact set fails validation.

## Review Notes
The Vite and webpack configurations are syntactically valid and use current options. The Sentry `sourcemaps inject` and `sourcemaps upload --release` commands are current; release and distribution metadata are optional for modern debug-ID matching but must match the SDK event values when supplied. The checksum pipeline targets current macOS/GNU userlands rather than strict POSIX because `sort -z`, `xargs -r`, and `shasum` are implementation-specific. All cited documentation URLs resolved to the intended official or authoritative resources.

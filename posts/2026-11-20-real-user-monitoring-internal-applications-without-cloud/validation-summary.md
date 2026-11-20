# Validation summary

Reviewed 20 November 2026. OneUptime endpoint and Browser key behavior were checked against official documentation and source commit `0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e`. OpenTelemetry APIs were checked against the installed pinned package declarations and source.

## Checks performed

- Installed final pinned OpenTelemetry dependency set without peer dependency overrides
- Combined exact initialization and acceptance-marker snippets passed TypeScript 5.9.3 strict noEmit checking with DOM types
- esbuild 0.28.2 created browser ESM bundle; metafile contains no remaining external imports
- Tested propagation regex accepts intended origin and rejects hostname suffix lookalike
- All bash examples pass bash -n
- Mermaid flowchart node and edge references checked structurally
- 1280x720 social image visually inspected; complete title readable

The final example uses SDK 3.1.1, API 1.10.0, exporters and instrumentation 0.301.2, and document-load instrumentation 0.70.1. Full package versions are in validation.json.

## Limitations

- No live browser or OneUptime ingestion test
- CORS, CSP, Browser key rejection, internal CA trust, resource classification and export failure behavior not exercised
- Compilation and bundling do not prove runtime compatibility with a specific application framework
- Mermaid not browser-rendered

## Official sources

- https://oneuptime.com/docs/en/rum/browser-setup
- https://github.com/OneUptime/oneuptime/blob/0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e/packages/App/FeatureSet/Docs/Content/en/rum/browser-setup.md
- https://opentelemetry.io/docs/languages/js/getting-started/browser/
- https://github.com/open-telemetry/opentelemetry-js/tree/ee0bd33cac8bb245a3d83fc2b8ba0b07534b8efd/packages/sdk-trace
- https://github.com/open-telemetry/opentelemetry-js/blob/ee0bd33cac8bb245a3d83fc2b8ba0b07534b8efd/packages/opentelemetry-context-zone/README.md
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src
- https://oneuptime.com/docs/en/rum/troubleshooting
- https://oneuptime.com/docs/en/rum/web-vitals

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

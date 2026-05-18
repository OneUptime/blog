# Validation Summary: How to Set Up Insomnia REST Client on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Insomnia REST Client (desktop app)
- Ubuntu (apt/dpkg, Snap, AppImage)
- REST / HTTP requests
- GraphQL
- WebSockets
- OAuth 2.0, Bearer Token, Basic Auth, API Key authentication
- OpenAPI (Swagger) 2.0/3.0, Postman Collection, HAR import
- Insomnia scripts (Chai-style assertions, `insomnia.test()` / `insomnia.expect()`)
- Insomnia Nunjucks-based template tags (`{% response %}`, `{{ variable }}`)

## Sources Consulted
- Kong/insomnia GitHub releases — verified asset naming and current version (`gh release list --repo Kong/insomnia`, latest stable `12.5.0`, asset `Insomnia.Core-<ver>.deb` / `.AppImage`)
- Insomnia snap package metadata (`snap info insomnia`) — publisher `getinsomnia`, latest/stable 12.5.0
- Kong Developer docs: https://developer.konghq.com/insomnia/scripts/ — current scripts API (`insomnia.response.json()`, `insomnia.test()`, `insomnia.expect()`) and that tests live in the After-response script
- Kong Developer docs: https://developer.konghq.com/insomnia/test/ — note that the legacy "Unit tests" feature is planned for deprecation in favor of scripts
- Kong Developer docs: https://developer.konghq.com/insomnia/keyboard-shortcuts/ — default Windows/Linux key bindings

## Issues Found
1. **Outdated Insomnia version (`9.3.2`)** — Two places used `INSOMNIA_VERSION="9.3.2"` and a hard-coded AppImage URL with `core@9.3.2`. The 9.x series was released around mid-2024; the current stable as of the review date is `12.5.0` (released 2026-04-02). Bumped both occurrences to `12.5.0`, which matches the asset naming pattern `Insomnia.Core-12.5.0.deb` / `.AppImage` confirmed via the release assets list.
2. **Incorrect testing API in "Testing and Response Validation"** — The original snippet used `const response = await insomnia.send(); expect(response.status).to.equal(200); JSON.parse(response.body)`. This reflects an older/inaccurate API: the legacy unit-tests feature is being deprecated, and the supported scripts API uses `insomnia.response.json()` (not `JSON.parse(response.body)`), `insomnia.response.status`, and exposes assertions via `insomnia.test(...)` / `insomnia.expect(...)` (not a bare global `expect`). Rewrote the example to use the current scripts API and clarified it lives in the "After-response" script.
3. **Incorrect keyboard shortcuts** — Four of the six rows were wrong per the official keymap:
   - Quick search: `Ctrl+K` → `Ctrl+P`
   - Switch environment: `Ctrl+E` → `Ctrl+Shift+E`
   - Toggle sidebar: `Ctrl+/` → `Ctrl+\`
   - Manage environments: `Ctrl+Shift+E` → `Ctrl+E`
   `Ctrl+Enter` (Send) and `Ctrl+D` (Duplicate) were already correct and left alone.

## Review Notes
- Insomnia's legacy "Unit tests" feature (the dedicated Tests tab/suite) is documented as planned for deprecation; the rewritten testing section now uses the supported scripts surface, which is forward-compatible.
- The `core@<version>` git-tag-style release naming and the `Insomnia.Core-<version>.deb`/`.AppImage` asset names should remain stable for future versions, so updating only the version variable will continue to work.
- The Snap stable channel currently tracks 12.5.0, matching the GitHub `.deb` release, so `sudo snap install insomnia` is a valid alternative.
- The example WebSocket flow is conceptually correct: in modern Insomnia, WebSocket is technically its own request type (created via the "+" menu rather than picking "WebSocket" from the HTTP method dropdown), but the UI surfaces it adjacent to the method selector, so the described steps still get the user to the right place. Left as-is to avoid stylistic rewrites.
- The template-tag example (`{% response 'body', 'req_login', '$.token' %}`) matches Insomnia's Nunjucks response tag and JSONPath extraction; verified against existing Insomnia tag syntax.

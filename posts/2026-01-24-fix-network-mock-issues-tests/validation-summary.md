# Validation Summary: How to Fix 'Network Mock' Issues in Tests

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- JavaScript
- TypeScript
- Node.js
- Jest
- Nock
- Axios
- Got
- Node.js Fetch API
- Python
- pytest
- responses
- requests
- HTTP mocking

## Sources Consulted
- Nock README: https://github.com/nock/nock/blob/main/README.md
- Nock npm package metadata: https://www.npmjs.com/package/nock
- Node.js Fetch API documentation: https://nodejs.org/api/globals.html#fetch
- Node.js guide for Fetch with Undici: https://nodejs.org/learn/getting-started/fetch
- responses README: https://github.com/getsentry/responses/blob/master/README.rst
- requests documentation: https://requests.readthedocs.io/
- pytest documentation: https://docs.pytest.org/

## Issues Found
- The Python section title mentioned HTTPretty, but the section only showed the responses library. Changed the heading to "Python: Mocking with Responses" so it accurately describes the content.
- Several Python snippets used `pytest`, `json`, `re`, or `JSONDecodeError` without importing them. Added the missing imports so the examples are syntactically complete in context.
- The HTTP client compatibility comments said Axios works out of the box with Nock. Nock's official README documents cases where Axios must be configured to use the Node HTTP adapter, especially under jsdom/Jest setups. Updated the comment to state that Axios works with Nock when it uses the Node HTTP adapter.

## Review Notes
- Current `nock@14.0.15` was checked with Node.js 22 global `fetch` in a minimal smoke test, and it intercepted the request successfully. Older Nock versions had limitations around Node 18+ native fetch because Node's fetch is powered by Undici.
- The examples remain illustrative and depend on application-specific functions such as `fetch_user`, `create_user`, and `fetchWithTimeout`.

# Validation Summary: How to Use Azure Functions with HTTP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Functions (Runtime v4)
- Azure Functions Core Tools v4
- Node.js / JavaScript (v3 programming model with `function.json`)
- HTTP triggers
- JWT authentication with `jsonwebtoken` and `jwks-rsa`
- Azure CLI (`az`)
- Azure Storage (Blob)
- Application Insights
- GitHub Actions (Azure/functions-action, azure/login)
- VS Code Node.js debugging

## Sources Consulted
- Azure Functions HTTP trigger reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook
- Azure Functions Core Tools install guide: https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local
- Azure Functions Node.js developer guide (v3 model): https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
- Azure Functions authorization keys: https://learn.microsoft.com/en-us/azure/azure-functions/security-concepts
- `az functionapp create` reference: https://learn.microsoft.com/en-us/cli/azure/functionapp
- `host.json` reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-host-json
- Azure/functions-action GitHub Action: https://github.com/Azure/functions-action
- jsonwebtoken docs: https://github.com/auth0/node-jsonwebtoken
- jwks-rsa docs: https://github.com/auth0/node-jwks-rsa
- Azure Functions Node.js supported versions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-versions

## Issues Found
No technical issues found. All commands, code examples, and configuration snippets verify correctly against official Azure Functions documentation:

- The Functions Core Tools install commands (brew, npm, apt repo) are valid.
- `func init` / `func new` flags (`--worker-runtime`, `--language`, `--template "HTTP trigger"`) match current CLI behavior.
- The `function.json` bindings schema (`authLevel`, `type: "httpTrigger"`, `direction`, `methods`, `route`) is correct.
- Node.js v3 programming model APIs are correctly used: `context.log`, `context.log.info/warn/error`, `context.res`, `context.bindingData.<route-param>`, `context.invocationId`, `req.query`, `req.body`, `req.headers`, `req.method`, `req.url`.
- `isRaw: true` with `readableStreamBody` is the documented pattern for streaming responses in the v3 model.
- Authorization levels (`anonymous`, `function`, `admin`) and the `x-functions-key` header are correctly documented.
- `az functionapp create` flags including `--consumption-plan-location`, `--runtime node`, `--runtime-version 18`, `--functions-version 4` form a supported combination.
- GitHub Actions versions (`Azure/functions-action@v1`, `azure/login@v1`, `actions/checkout@v4`, `actions/setup-node@v4`) are current.
- `host.json` logging schema (`samplingSettings`, `logLevel`) is correctly structured.
- VS Code launch.json with port 9229 is the correct Node.js inspector port.

## Review Notes
- The post uses the Node.js **v3 programming model** (function.json-based handlers with `module.exports = async function (context, req)`). This model is still fully supported, but Microsoft also offers a newer **v4 programming model** that is code-first (using `app.http(...)` and `@azure/functions`). The post does not mention the v4 model. This is a stylistic/version choice, not an error.
- The JWT validation example uses the older jwks-rsa pattern `key.publicKey || key.rsaPublicKey`. Current versions of `jwks-rsa` (v2+) document `key.getPublicKey()` as the preferred API, though the legacy property access still works. This is not technically wrong but is slightly dated.
- The "Single User Function" example does `const users = require('../users').users;` to share an in-memory `Map`. As written, this would resolve to `undefined` because the `users/index.js` module sets `module.exports` to the async handler, not an object with a `users` property. The author explicitly calls this out ("Shared storage reference - in production, this would be a database connection"), so it is intentional as a simplified illustration of project structure rather than a working pattern. Left as-is.
- Node.js 18 was specified for the deployment example. Node 18 is supported on Functions runtime 4.x; Node 20 is also supported and may be preferred for new projects going forward.
- The Ubuntu install uses the legacy `sources.list.d` + manually downloaded GPG key flow. The current Microsoft-documented approach uses the `packages-microsoft-prod.deb` package, but the manual flow shown here remains functional.

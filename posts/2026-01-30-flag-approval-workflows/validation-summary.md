# Validation Summary: How to Implement Flag Approval Workflows

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Feature flag approval workflows
- TypeScript
- YAML-style policy configuration
- Jira Cloud REST API v3
- Atlassian Document Format
- Audit logging patterns
- Progressive rollout gates

## Sources Consulted
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/intro.html
- TypeScript Object Types: https://www.typescriptlang.org/docs/handbook/2/objects.html
- MDN Web Docs, Crypto.randomUUID(): https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
- MDN Web Docs, Fetch API: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- MDN Web Docs, Response.json(): https://developer.mozilla.org/en-US/docs/Web/API/Response/json
- Node.js Buffer documentation: https://nodejs.org/api/buffer.html
- Atlassian Jira Cloud REST API v3 introduction: https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
- Atlassian Jira Cloud REST API v3 issue comments: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/
- Atlassian Jira Cloud REST API v3 issues: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/
- Atlassian Jira Cloud basic auth for REST APIs: https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/

## Issues Found
- The approval policy used `field: flag.tags`, but `FlagChangeRequest` exposes `tags` at the top level. Changed the policy condition to `field: tags` so the kill-switch rule can actually match.
- The approval engine referenced a `Condition` type without defining it. Added the missing TypeScript interface with the supported operators used by the implementation.
- The workflow manager referenced `NotificationService` without defining or initializing it. Added the expected interface and a constructor dependency so the class is syntactically complete.
- `submitApproval` assumed the current stage state always existed. Added a guard for an uninitialized stage to avoid dereferencing `undefined`.
- The timeout `auto-approve` branch called `submitApproval` with a role that would fail the stage role check. Changed it to record a system approval directly and advance or complete the workflow.
- The Jira integration used `Authorization: Basic ${apiToken}`, which is not valid Jira Cloud basic auth. Jira requires base64 encoding `email:api_token`; added an email field and `getAuthHeader()` helper using `Buffer.from(...).toString('base64')`.
- The Jira integration treated issue fields such as `summary`, `status`, and custom fields as top-level response properties. Jira Cloud issue responses expose these under `fields`, and custom fields use site-specific field IDs such as `customfield_10000`. Updated the mapping and configuration to use field IDs.

## Review Notes
The remaining examples are high-level reference implementations with placeholder services and example URLs such as `*.example.com`. They are technically plausible patterns, but production code would need durable workflow storage, idempotency, authorization checks, timeout persistence beyond process lifetime, CSV escaping, and concrete storage implementations.

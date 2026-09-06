# Validation Summary: How to Monitor a Login Flow in OneUptime When the Site Uses SSO

## Status
validated

## Post Type
Technical guide with JavaScript synthetic-monitor examples.

## Technologies Covered
- OneUptime synthetic monitors, monitor secrets, and probes
- Playwright-compatible browser automation
- JavaScript async/await and regular expressions
- SSO, identity providers, MFA, and credential rotation

## Sources Consulted
- [OneUptime synthetic monitors](https://oneuptime.com/docs/en/monitor/synthetic-monitor)
- [OneUptime monitor secrets](https://oneuptime.com/docs/en/monitor/monitor-secrets)
- [Playwright locators](https://playwright.dev/docs/locators)
- [Playwright Page API](https://playwright.dev/docs/api/class-page)
- [Playwright pages and popups](https://playwright.dev/docs/pages)
- [Playwright authentication](https://playwright.dev/docs/auth)
- [Microsoft identity platform username/password authentication](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-desktop-acquire-token-username-password)
- [Microsoft Graph user updates and passwordProfile](https://learn.microsoft.com/en-us/graph/api/user-update?view=graph-rest-1.0)
- Official OneUptime repository, inspected through the local checkout at commit `65f765b21fe36bb4f7bbb29ac0d75642b12398a5`, whose root package declares version `12.0.33`:
  - [Version declaration](https://github.com/OneUptime/oneuptime/blob/65f765b21fe36bb4f7bbb29ac0d75642b12398a5/package.json)
  - [Probe timeout configuration](https://github.com/OneUptime/oneuptime/blob/65f765b21fe36bb4f7bbb29ac0d75642b12398a5/Probe/Config.ts)
  - [Playwright capability broker](https://github.com/OneUptime/oneuptime/blob/65f765b21fe36bb4f7bbb29ac0d75642b12398a5/Probe/Utils/Monitors/SyntheticRuntime/PlaywrightCapabilityBroker.ts)
  - [Monitor secrets UI](https://github.com/OneUptime/oneuptime/blob/65f765b21fe36bb4f7bbb29ac0d75642b12398a5/App/FeatureSet/Dashboard/src/Pages/Monitor/Settings/MonitorSecrets.tsx)

## Issues Found
1. **Secret updates incorrectly described as unavailable.** The dedicated secrets documentation and the inspected UI support replacing a saved value through **Update Secret Value**. Corrected both storage and rotation instructions. Existing values remain unreadable after saving. The synthetic-monitor documentation still contains conflicting older wording.
2. **Overly broad dashboard URL match.** The original unanchored regular expression could match the application URL inside another URL's query string or accept a different path with the same prefix. Anchored the matcher to the expected HTTPS origin and dashboard path, allowing an optional trailing slash, query string, or fragment.
3. **Non-interactive account terminology conflicted with the example.** The example performs browser form login. Replaced the recommendation with a dedicated account explicitly permitted to complete that browser flow under a scoped policy. Retained the caveat that alternative authentication paths do not establish coverage of every human login branch.
4. **Browser testing described as the only way to establish a working session.** API-based authentication tests can also establish sessions. Narrowed the claim to verifying the browser login journey, consistent with Playwright's UI and API authentication examples.
5. **Failure evidence needed a timing qualification.** A screenshot assigned after the authenticated-content wait cannot exist if that wait or an earlier step fails. Clarified that preservation applies to images already assigned, and that approved earlier pages need explicit capture for earlier-step evidence.
6. **Rotation assumed simultaneous validity of old and new credentials.** Password updates need not provide an overlap period. Made delayed revocation conditional on IdP support and added coordinated updates for password replacement.

## Review Notes
- Confirmed the documented secret placeholder syntax, return-data shape, screenshot side channel, browser-context access, popup wait pattern, and restricted event-listener support.
- Confirmed the eight-page limit and the 60,000 ms default script timeout in the inspected OneUptime source. The operator setting is `PROBE_SYNTHETIC_MONITOR_SCRIPT_TIMEOUT_IN_MS`.
- The version statement is tied to the inspected repository commit declaring 12.0.33; it is not a claim that this is the newest release or that every deployment has identical code.
- The locator and Page methods used are documented and are supported by OneUptime's facade. The popup snippet is a continuation pattern using the username from the main example, not a standalone script.
- The supplied documentation links resolve to the intended official resources. Example application URLs and selectors are placeholders, as the post explicitly states.
- The authenticated marker must represent user-specific content in the actual application. MFA, consent, CAPTCHA, policy exceptions, certificate expiry, and credential lifecycle details remain deployment-specific.
- Reviewed both JavaScript blocks for syntax in an async function context and checked the corrected URL matcher against expected and unintended URLs. No live SSO login was executed because no actual target, tenant, or test credentials were provided. No CLI commands or configuration snippets require execution.

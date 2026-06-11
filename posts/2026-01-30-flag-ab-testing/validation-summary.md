# Validation Summary: How to Implement Flag A/B Testing

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- TypeScript
- Node.js crypto
- PostgreSQL / node-postgres
- Express
- cookie-parser
- Segment Analytics for Node.js
- Amplitude Node.js SDK
- Mixpanel Node.js SDK
- A/B testing statistical analysis

## Sources Consulted
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- node-postgres Pool API: https://node-postgres.com/apis/pool
- node-postgres parameterized queries: https://node-postgres.com/features/queries
- Segment Analytics for Node.js documentation: https://www.twilio.com/docs/segment/connections/sources/catalog/libraries/server/node
- Amplitude Node.js SDK documentation: https://amplitude.com/docs/sdks/analytics/node/node-js-sdk
- Amplitude Node.js SDK migration guide: https://amplitude.com/docs/sdks/analytics/node/node-js-sdk-migration-guide
- Mixpanel Node.js SDK documentation: https://docs.mixpanel.com/docs/tracking-methods/sdks/nodejs
- Express 5.x API reference: https://expressjs.com/en/5x/api/
- Express cookie-parser middleware documentation: https://expressjs.com/en/resources/middleware/cookie-parser/
- NIST Engineering Statistics Handbook, confidence intervals for proportions: https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm
- NIST Engineering Statistics Handbook, sample sizes for proportions: https://www.itl.nist.gov/div898/handbook/prc/section2/prc242.htm

## Issues Found
- The stored assignment interface used `variantId: string`, but the assignment flow stores `null` for users outside the experiment. Changed it to `string | null`.
- The `renderCheckoutButton` example called `trackExposure` without the required `sessionId`. Added `sessionId` to the function signature and call.
- The Amplitude example used an outdated/incorrect default-import style and the old identify signature. Updated it to current named imports and the current `identify(identifyObj, { user_id })` / `track(..., ..., { user_id })` API.
- The two-tailed p-value helper returned invalid values greater than 1 for negative z-scores. Changed it to use both tails with `2 * Math.min(cdf, 1 - cdf)`.
- The sample-size example output was incorrect for the provided formula and inputs. Updated the output from approximately 30,000 to `45312`.
- The complete Express example read cookies and `req.body` without installing middleware. Added `cookieParser()` and `express.json()`.
- The Express TypeScript example assigned `req.userId` and `req.sessionId` without augmenting the Express request type. Added a `declare global` block for those request properties.
- The `canMakeDecision` example used an inline placeholder as a `const` initializer, which is not valid TypeScript. Changed `experimentStartTime` to an explicit function argument.

## Review Notes
The statistical examples are suitable as educational approximations for large-sample two-proportion testing. A production experimentation platform should also account for multiple comparisons, sequential testing/peeking controls, bot and repeat-exposure filtering, and pre-registered stopping rules.

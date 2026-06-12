# Validation Summary: How to Implement Capability-Based Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Capability-based security
- Access control lists
- TypeScript
- Node.js crypto module
- Node.js Buffer base64 decoding
- Express.js middleware

## Sources Consulted
- Node.js Crypto documentation: https://nodejs.org/api/crypto.html
- Node.js Buffer documentation: https://nodejs.org/api/buffer.html
- Express.js middleware guide: https://expressjs.com/en/guide/using-middleware/
- TypeScript declaration merging handbook: https://www.typescriptlang.org/docs/handbook/declaration-merging.html
- Capability Myths Demolished, Miller, Yee, and Shapiro: https://papers.agoric.com/assets/pdf/papers/capability-myths-demolished.pdf
- Cornell CS 513 notes on review and revocation for capabilities: https://www.cs.cornell.edu/courses/cs513/2005fa/L10.html

## Issues Found
- The main HMAC verification example compared signatures with `!==`. Changed it to compare decoded hex buffers with `crypto.timingSafeEqual()` after checking equal length, which matches Node.js crypto guidance for timing-safe comparisons.
- The delegated capability's `parentCapabilityId` was added after signing, so the delegation chain could be tampered with without invalidating the signature. Changed capability signing to cover a structured payload that includes `parentCapabilityId`, and changed delegation to pass the parent ID into `createCapability()`.
- The delegation example verified only `delegatedPermissions[0]` before creating the child capability. Changed it to compute the valid subset first and verify the parent for every delegated permission.
- The code defaulted capability TTLs to 3600 seconds while the checklist recommends minutes, not hours. Changed defaults to 300 seconds.
- The Express TypeScript example assigned `req.capability` without extending the Express `Request` interface. Added declaration merging and guarded the route handler against a missing capability.
- The Express section said failures return a 403 error, but the middleware returns 401 for missing or malformed tokens and 403 for insufficient permission. Updated the text to say 401 or 403.
- The core-properties wording implied revocation is a universal defining requirement of every capability system. Adjusted it to say a practical implementation should provide those properties, which better matches capability literature where revocation is important but operationally nuanced.

## Review Notes
- The core capability service snippet was extracted and type-checked successfully with TypeScript 5.7 and Node.js 22 type definitions.
- The Express snippet was verified against official Express middleware behavior and TypeScript declaration merging documentation, but it was not locally compiled because this blog utility repository does not include Express or Express type packages.

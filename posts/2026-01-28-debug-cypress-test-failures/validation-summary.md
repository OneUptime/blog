# Validation Summary: How to Debug Cypress Test Failures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cypress (E2E testing framework)
- JavaScript / Mocha
- cy.intercept, cy.task, cy.pause, cy.debug, cy.log, cy.screenshot
- Cypress configuration (cypress.config.js)
- GitHub Actions (CI artifact upload)
- Docker (cypress/included image)

## Sources Consulted
- Cypress official configuration reference: https://docs.cypress.io/app/references/configuration
- Cypress CLI reference (cypress run flags including --no-exit): https://docs.cypress.io/app/references/command-line
- Cypress API: cy.intercept, cy.wait, cy.screenshot, cy.task, cy.pause, cy.debug, cy.log (https://docs.cypress.io/api/table-of-contents)
- Cypress Network Requests guide: https://docs.cypress.io/app/guides/network-requests
- Cypress Docker images: https://github.com/cypress-io/cypress-docker-images
- Mocha .only / it.only documentation: https://mochajs.org/

## Issues Found
1. **Duplicate `screenshotOnRunFailure` config key with a misleading comment.** The original `cypress.config.js` snippet under "Screenshots on Failure" had `screenshotOnRunFailure: true` listed twice, the second occurrence annotated with `// Take full-page screenshots instead of viewport only`. This is wrong: Cypress has no global config option that switches automatic failure screenshots to full-page capture (`capture: 'fullPage'` is only available on `cy.screenshot()` calls). The duplicate key was removed and the misleading comment deleted.

## Review Notes
- The `videoCompression: 32` value is valid (Cypress accepts a CRF-style number 0–51 or `false`; 32 is the default when compression is enabled), and the inline comment "Lower = better quality, larger file" matches Cypress's CRF semantics.
- `video` defaults to `false` in Cypress 13+, so explicitly setting `video: true` (as the post does) is necessary to opt in — the post correctly shows the opt-in.
- `cy.debug()`'s conditional behavior (the JS `debugger` only halts execution when DevTools are open) is already noted by the author ("Make sure DevTools is open before the `debug()` command runs.") — no change needed.
- The Docker example uses `cypress/included:latest`; pinning to a specific version tag (e.g., `cypress/included:14.5.4`) is recommended by the Cypress team for reproducible CI runs, but using `:latest` is not incorrect.
- Mermaid diagrams render correctly and accurately describe the flow.

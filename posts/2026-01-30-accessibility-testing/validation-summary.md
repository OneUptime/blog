# Validation Summary: How to Implement Accessibility Testing

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- WCAG accessibility standards
- axe-core and @axe-core/playwright
- jest-axe and React Testing Library
- Cypress with cypress-axe
- Pa11y and pa11y-ci
- GitHub Actions
- GitLab CI
- Husky pre-commit hooks
- ESLint with eslint-plugin-jsx-a11y
- React accessible form and modal patterns
- CSS accessibility media features and focus styles

## Sources Consulted
- W3C WCAG 2.2 specification: https://www.w3.org/TR/WCAG22/
- W3C Understanding SC 4.1.1 Parsing, obsolete and removed in WCAG 2.2: https://www.w3.org/WAI/WCAG22/Understanding/parsing.html
- W3C Understanding SC 1.4.3 Contrast Minimum: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
- Playwright accessibility testing documentation: https://playwright.dev/docs/accessibility-testing
- axe-core npm package metadata and local axe-core 4.12.1 rule list
- @axe-core/playwright documentation: https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright
- @axe-core/cli documentation: https://github.com/dequelabs/axe-core-npm/tree/develop/packages/cli
- Deque axe rule reference: https://dequeuniversity.com/rules/axe/
- cypress-axe documentation: https://github.com/component-driven/cypress-axe
- Cypress accessibility testing guide: https://docs.cypress.io/app/guides/accessibility-testing
- Pa11y documentation: https://github.com/pa11y/pa11y
- pa11y-ci documentation: https://github.com/pa11y/pa11y-ci
- jest-axe documentation: https://github.com/NickColley/jest-axe
- eslint-plugin-jsx-a11y documentation: https://github.com/jsx-eslint/eslint-plugin-jsx-a11y
- Husky documentation: https://typicode.github.io/husky/
- GitHub Actions artifact documentation: https://docs.github.com/en/actions/tutorials/store-and-share-data
- GitLab CI artifacts reports documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- React useEffect documentation: https://react.dev/reference/react/useEffect

## Issues Found
- WCAG Level AA was described as what most laws require. Changed this to say many laws and policies reference Level AA, because legal requirements vary by jurisdiction and policy.
- WCAG 1.1.1 was summarized as all images needing alt text. Updated it to distinguish meaningful images from decorative images, which should use empty alt text.
- WCAG 4.1.1 Parsing was listed as a current key criterion. Removed it because WCAG 2.2 marks 4.1.1 as obsolete and removed.
- The Cypress `cy.checkA11y` example enabled a non-existent axe rule, `focus-management`. Replaced it with the valid `aria-dialog-name` rule.
- The GitLab CI example declared a JUnit report file, `a11y-junit.xml`, that no command in the job generated. Removed the JUnit reports stanza.
- The pre-commit example used the old package.json Husky hook format. Updated it to the current `.husky/pre-commit` file style and clarified that ESLint must already be configured with `eslint-plugin-jsx-a11y`.
- The accessible form attempted to focus the error summary immediately after `setErrors`, before React had rendered the summary. Moved focus into a `useEffect` that runs after the errors render.
- The modal focus restoration logic did not restore focus when the modal closed because the cleanup closure ran with the prior `isOpen` value. Moved setup and cleanup into the `isOpen` effect so focus is restored on close.

## Review Notes
- Automated accessibility tools are correctly described as partial coverage and not a replacement for manual keyboard and assistive technology testing.
- The Playwright, jest-axe, Cypress, Pa11y, and axe CLI package names and core usage patterns were checked against current package metadata and documentation.
- The ESLint hook example now assumes project-level ESLint configuration rather than trying to inline all accessibility rules in package.json.

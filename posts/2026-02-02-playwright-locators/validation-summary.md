# Validation Summary: How to Use Playwright Locators

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Playwright (@playwright/test)
- TypeScript
- ARIA roles and accessible name computation
- CSS / XPath selectors
- Shadow DOM
- iframes (FrameLocator)
- Page Object Model pattern

## Sources Consulted
- Playwright Locators guide — https://playwright.dev/docs/locators
- Playwright API: class Locator — https://playwright.dev/docs/api/class-locator
- Playwright API: class LocatorAssertions — https://playwright.dev/docs/api/class-locatorassertions
- Playwright API: class FrameLocator — https://playwright.dev/docs/api/class-framelocator
- Playwright Other Locators (CSS/XPath/`>>` chaining) — https://playwright.dev/docs/other-locators
- Playwright Test Configuration (testIdAttribute) — https://playwright.dev/docs/api/class-testoptions#test-options-test-id-attribute
- Playwright Debug docs (codegen, inspector, PWDEBUG) — https://playwright.dev/docs/debug, https://playwright.dev/docs/codegen
- W3C ARIA in HTML — https://www.w3.org/TR/html-aria/

## Issues Found
1. **Misleading shadow DOM comment in the Shadow DOM section.** The original comment said `// For CSS selectors, use >> for shadow DOM piercing`. This conflates two separate concepts: shadow DOM piercing is the default behavior for CSS selectors (no special syntax required for open shadow roots), and `>>` is a generic selector-engine chaining operator (it works between any combination of `css=`, `text=`, `xpath=`, etc.). Replaced the comment with two lines that accurately describe each: "CSS selectors pierce open shadow roots automatically" and "The >> operator chains selector engines (here: CSS then CSS)." The code example itself was left unchanged because it is still valid Playwright syntax.

## Review Notes
- All built-in locator examples (`getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`, `getByAltText`, `getByTitle`, `getByTestId`) match the current Playwright API.
- `filter({ visible: true })` is correct — added in Playwright v1.51. Readers on older versions should upgrade.
- `locator.nth(-1)` / `nth(-2)` with negative indices is documented and supported.
- `expect(locator).toHaveAttribute('required')` single-argument form (presence check) is supported.
- `locator.highlight()` is documented as a debugging helper.
- The ARIA role table entry for `combobox` lists `<select>`. This is correct for single-select `<select>` (without `multiple` or `size>1`); multi-select `<select>` elements have implicit role `listbox`. The post's table is a quick reference and the common case is accurate, so no change was made.
- In the Locator Assertions example, `await expect(checkbox).toBeChecked()` is immediately followed by `await expect(checkbox).not.toBeChecked()`. These contradict each other and cannot both pass in a real test — the example is illustrative of the available API surface rather than a runnable assertion pair. Not a technical error, but readers copy-pasting should be aware.
- `xpath=` prefix is shown explicitly; Playwright also auto-detects strings starting with `//` or `..` as XPath, so the prefix is optional. The explicit form is still valid.

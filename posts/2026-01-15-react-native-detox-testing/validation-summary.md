# Validation Summary: How to Write Integration Tests for React Native with Detox

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Detox (gray-box E2E testing framework by Wix)
- React Native
- Jest / jest-circus test runner
- XCUITest (iOS) and Espresso (Android) — underlying native frameworks
- Express (mock server)
- MSW (Mock Service Worker) v2
- React Native Reanimated
- CI/CD: GitHub Actions, Bitrise, CircleCI

## Sources Consulted
- Detox Actions API — https://wix.github.io/Detox/docs/api/actions
- Detox Matchers API — https://wix.github.io/Detox/docs/api/matchers
- Detox Expect API — https://wix.github.io/Detox/docs/api/expect
- Detox Artifacts Configuration — https://wix.github.io/Detox/docs/config/artifacts
- Detox GitHub issues re: boolean visibility checks — https://github.com/wix/Detox/issues/2986, https://github.com/wix/Detox/issues/1214

## Issues Found
1. **Deprecated `tapAtPoint` action.** The "Element Actions" section used `element(by.id('button')).tapAtPoint({ x: 10, y: 10 })`. `tapAtPoint` is deprecated in current Detox; the docs direct users to `tap(point)`. Changed to `element(by.id('button')).tap({ x: 10, y: 10 })` with a clarifying comment.

2. **Non-existent `element().isVisible()` method.** The "Using Console Logs in Tests" debug example called `await element(by.id('home-screen')).isVisible()` and logged the boolean. Detox's `expect()` API is assertion-based and throws rather than returning booleans; there is no `isVisible()` method on an element. Replaced with the real `getAttributes()` API (`const attributes = await element(by.id('home-screen')).getAttributes(); console.log(...)`), which returns a serializable attributes object and preserves the debugging intent.

3. **Misleading `by.label` comment.** The matcher example described `by.label('Submit')` as "Match by partial text (label)". `by.label` matches the accessibility label (iOS) / content description (Android), not partial visible text. Corrected the comment to "Match by accessibility label (iOS) / content description (Android)".

## Review Notes
- Verified that `longPress(2000)` is valid — the docs explicitly show `longPress(1500)` (duration-only call), so no change was needed.
- Verified that `uiHierarchy: 'enabled'` is an accepted string form for the artifacts plugin per the Detox config docs example.
- `scrollTo` directions (`top`/`bottom`/`left`/`right`), `scroll(offset, direction)`, `swipe`, `pinch` (iOS-only), `multiTap`, matchers (`by.id`/`by.text`/`by.type`/`by.traits`/`and`/`withAncestor`/`withDescendant`/`atIndex`), and expectations (`toHaveToggleValue`, `toHaveSliderPosition`, `toHaveLabel`, `toHaveId`, `toHaveValue`, `toBeFocused`) all match the current Detox API.
- Detox CLI flags used (`--configuration`, `--cleanup`, `--headless`, `--loglevel trace`, `--record-logs all`, `--record-videos all`, `--testNamePattern`) are current and valid.
- The `.detoxrc.js` structure (`testRunner.args.$0`, `apps`, `devices`, `configurations`) and the Jest runner integration paths (`detox/runners/jest/globalSetup`, `globalTeardown`, `reporter`, `testEnvironment`) are correct for Detox 20.x.
- Minor (not corrected, would require restructuring): the mock-server section defines a custom `e2e/globalSetup.js`, while the Jest config points `globalSetup` at `detox/runners/jest/globalSetup`. In a real project these must be chained (the custom setup should import and invoke Detox's) rather than replacing it. The two snippets are presented as separate illustrative examples, so each is individually correct, but readers combining them should be aware of this.
- The synchronization explanation ("waits for all timers to fire") is a reasonable simplification; in practice Detox ignores timers longer than a configurable threshold (default ~1.5s) to avoid hanging — acceptable for an introductory explanation.

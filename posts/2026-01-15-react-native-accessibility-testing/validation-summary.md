# Validation Summary: How to Test React Native Apps for Accessibility

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native (accessibility props and `AccessibilityInfo` API)
- TypeScript
- React Native Testing Library (RNTL)
- Jest / `@testing-library/jest-native` custom matchers
- `react-native-a11y` ESLint plugin
- iOS VoiceOver and Xcode Accessibility Inspector
- Android TalkBack and Accessibility Scanner
- WCAG 2.1 (and 2.2) success criteria
- GitHub Actions CI

## Sources Consulted
- React Native Accessibility docs — https://reactnative.dev/docs/accessibility (accessibility props, `accessibilityRole` value list, `importantForAccessibility` values)
- React Native `AccessibilityInfo` docs — https://reactnative.dev/docs/accessibilityinfo (`announceForAccessibility`, `isScreenReaderEnabled`, `addEventListener`/subscription `.remove()`)
- React Native Testing Library docs — https://callstack.github.io/react-native-testing-library/ (queries, `getByRole`/`getByLabelText`/`getByA11yState`)
- jest-native matchers — https://github.com/testing-library/jest-native (`toHaveProp`, `toHaveAccessibilityState`)
- WCAG 2.1 Quick Reference — https://www.w3.org/WAI/WCAG21/quickref/ (contrast ratios 4.5:1 / 3:1, Target Size 2.5.5 level AAA)
- Apple Human Interface Guidelines / Accessibility Inspector documentation
- Android Accessibility developer guide — https://developer.android.com/guide/topics/ui/accessibility

## Issues Found
- **Operator-precedence bug in the audit example (`checkImageAccessibility`)**: the condition `!node.props.accessibilityLabel && !node.props.accessible === false` parses as `(!node.props.accessible) === false` because `!` binds tighter than `===`, which inverts the intended logic and never correctly accounts for images explicitly marked decorative (`accessible={false}`). Changed it to `node.props.accessible !== false`, matching the warning message ("or be marked as decorative") so the warning fires only for non-decorative images lacking a label.

## Review Notes
- The `accessibilityRole` union, `importantForAccessibility` values, and `AccessibilityInfo` usage are all current and correct.
- The contrast examples are numerically accurate: `#999` on `#fff` ≈ 2.85:1 (fails AA), `#595959` on `#fff` ≈ 7:1 (passes AA). The `checkContrastRatio` luminance computation matches the WCAG relative-luminance formula.
- `getByA11yState` and `@testing-library/jest-native` still work but are on a deprecation path: newer RNTL versions favor `getByRole(role, { state })` and ship built-in matchers (RNTL v12.4+), making the separate `jest-native` import optional. Not changed, since the shown code remains functional; worth modernizing in a future revision.
- Checklist item `O1` labels a 44x44pt touch target as WCAG level "AA". WCAG 2.1's Target Size criterion (2.5.5, 44px) is actually level AAA; WCAG 2.2 later added 2.5.8 Target Size (Minimum) at 24px as AA. The 44pt figure aligns with the iOS HIG / Android (48dp) platform conventions the author is blending in, and the later `mobileRelevantCriteria` table correctly lists 2.5.5 as AAA, so this was left as an author judgment call rather than edited.
- GitHub Actions uses `@v3` actions (`checkout`, `setup-node`, `upload-artifact`) and `github-script@v6`; these are older but still functional. Not changed.

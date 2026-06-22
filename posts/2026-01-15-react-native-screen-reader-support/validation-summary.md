# Validation Summary: How to Support Screen Readers (VoiceOver/TalkBack) in React Native

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- React Native (accessibility APIs)
- TypeScript / React (functional components, hooks)
- iOS VoiceOver
- Android TalkBack
- `AccessibilityInfo` API
- React Navigation (`useFocusEffect`)
- `@testing-library/react-native`, Jest

## Sources Consulted
- React Native Accessibility guide — https://reactnative.dev/docs/accessibility
- React Native `ViewAccessibility.d.ts` (authoritative TypeScript type definitions for `AccessibilityRole`, `AccessibilityState`, and accessibility props) — https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Components/View/ViewAccessibility.d.ts
- React Native AccessibilityInfo API — https://reactnative.dev/docs/accessibilityinfo

## Issues Found
Five technical/API errors were found and fixed:

1. **Fabricated `accessibilityOrder` prop** (Reading Order Optimization section). The example used `<Text accessibilityOrder={2}>` / `accessibilityOrder={1}` to reorder reading. No such prop exists in React Native (only the experimental `experimental_accessibilityOrder`, which takes an array of `nativeID`s, not a numeric index). Rewrote the "solution" to teach the correct approach: the accessibility tree follows component/source order, so elements are placed in source in reading order while flexbox (e.g. `row-reverse`) controls only the visual layout.

2. **Invalid `accessibilityState` key `invalid`** (FormField component). `accessibilityState` only accepts `disabled`, `selected`, `checked`, `busy`, and `expanded` — there is no `invalid` key. Removed the unsupported `accessibilityState={{ invalid: !!error }}`. The error state is still conveyed because it is already included in the `accessibilityLabel` and surfaced via the `accessibilityRole="alert"` / `accessibilityLiveRegion="polite"` error text below the field.

3. **Invalid `accessibilityRole="dialog"`** (AccessibleModal). `dialog` is not a valid `accessibilityRole` value, and the `role` prop in React Native does not accept `dialog` either. Removed the prop; the modal already correctly uses `accessibilityViewIsModal={true}`, which is the React Native mechanism for marking a modal container.

4. **Invalid `accessibilityRole="form"`** (AccessibilityFeedbackForm). `form` is not a valid `accessibilityRole` value, and the `role` prop does not accept `form` either. Removed the prop while keeping `accessible={true}`.

5. **Invalid `accessibilityRole="listitem"`** (AccessibilityChecklist). `listitem` is not a valid `accessibilityRole` value. Changed it to the ARIA-style `role="listitem"`, which React Native does support. (The parent's `accessibilityRole="list"` is valid and was left unchanged.)

## Review Notes
- All other accessibility APIs used in the post were verified as valid and current: `accessibilityViewIsModal`, `accessibilityIgnoresInvertColors`, `accessibilityLanguage`, `importantForAccessibility` (`yes`/`no`/`no-hide-descendants`), `accessibilityLiveRegion` (`polite`/`assertive`), `accessibilityElementsHidden`, `accessibilityLabelledBy`, `accessibilityActions` with the standard `magicTap`/`escape` actions, `AccessibilityInfo.announceForAccessibility`, `AccessibilityInfo.setAccessibilityFocus` with `findNodeHandle`, the `addEventListener('screenReaderChanged', ...)` subscription with `.remove()` cleanup (correct for RN 0.65+), and roles such as `button`, `combobox`, `header`, `image`, `alert`, `progressbar`, `switch`, `checkbox`, and `list`.
- Minor, non-blocking observation (left as-is): the iOS Simulator VoiceOver "enabling" snippet (`Hardware > Siri > Enable "Hey Siri"`) is loosely worded — VoiceOver is generally tested on a physical device, and the triple-click Accessibility Shortcut note is the accurate part. This is prose guidance in a comment rather than a code/API error.
- Stylistic note (not changed): several container `View`s set `accessible={true}` while also wrapping interactive children. On real devices this collapses children into a single accessibility element; for genuinely interactive groups this is usually undesirable. The post's own examples vary on this, but it is a design nuance rather than an API error.
- The WHO figure ("over 2.2 billion people globally have visual impairments") is consistent with WHO's published estimate of at least 2.2 billion people with a near or distance vision impairment.

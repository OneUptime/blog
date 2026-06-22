# Validation Summary: How to Build Keyboard-Navigable Components in React

## Status
validated

## Post Type
Tutorial / Guide (hands-on, code-heavy)

## Technologies Covered
- React (function components, hooks: `useState`, `useRef`, `useEffect`, `useCallback`)
- JSX
- WAI-ARIA (roles, states, properties: `role`, `aria-expanded`, `aria-selected`, `aria-activedescendant`, `aria-haspopup`, `aria-modal`, etc.)
- Keyboard navigation patterns (tab order, `tabindex`, roving tabindex, focus trapping, type-ahead, skip links)
- React Testing Library + `@testing-library/user-event` for automated keyboard-interaction tests

## Sources Consulted
- WAI-ARIA Authoring Practices Guide (APG) — keyboard interaction patterns for button, listbox, menu/menu button, tabs, dialog (modal), toolbar, and the roving-tabindex vs. aria-activedescendant approaches: https://www.w3.org/WAI/ARIA/apg/patterns/
- MDN — `tabindex` global attribute (natively focusable elements, `0` / `-1` / positive values): https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex
- MDN — `HTMLElement.focus()`, `Element.scrollIntoView()`, `document.activeElement`: https://developer.mozilla.org/en-US/docs/Web/API/
- React docs — Hooks reference (`useRef`, `useEffect`, `useCallback`, `useState`) and refs / manipulating the DOM: https://react.dev/reference/react
- React docs — JSX rules (curly braces required to embed JS expressions/string literals in children): https://react.dev/learn/javascript-in-jsx-with-curly-braces
- Testing Library — `userEvent` (`setup`, `tab`, `keyboard`) and queries: https://testing-library.com/docs/user-event/intro

## Issues Found
1. **Listbox checkmark rendered as a literal escape string.** In the type-ahead `Listbox`, the selected-item indicator was written as `✓` directly as JSX text content. JSX children are treated literally and do **not** process JavaScript escape sequences, so this would render the visible string `✓` rather than a ✓. Fixed by wrapping it in a JS expression: `{'✓'}` (consistent with how the dropdown's `▲`/`▼` glyphs are already written inside `{}`).
2. **`focusedIndex` initialization logic bug in `Listbox`.** The initial state used `options.findIndex((opt) => opt.value === value) || 0`. `Array.prototype.findIndex` returns `-1` when no match is found, and `-1` is truthy, so `-1 || 0` evaluates to `-1` — defeating the intended fallback to `0` and leaving `focusedIndex` at `-1` (causing `options[-1]` → `undefined` on Enter). Replaced with `Math.max(0, options.findIndex((opt) => opt.value === value))`, which correctly yields `0` when there is no match.
3. **Missing `useState` import in the focus-trap/Modal example.** The snippet imported `{ useRef, useEffect, useCallback }` but the example `App()` calls `useState(false)`, which would throw a ReferenceError as written. Added `useState` to the import.

## Review Notes
- The ARIA keyboard-support reference tables (per-role required/optional keys), the natively-focusable-elements list, the roving-tabindex explanation, focus vs. selection distinction, and the focus-trap implementation all align with the WAI-ARIA APG and MDN. No changes needed there.
- Design nuance (not corrected, as it is a valid alternative rather than an error): the "Dropdown Menu" example implements the **listbox** pattern (`role="listbox"`/`role="option"`, `aria-haspopup="listbox"`) rather than the **menu button** pattern (`role="menu"`/`role="menuitem"`). Both are legitimate APG patterns; the component is internally consistent (roles, ARIA, and tests all use listbox), so it works as written. Authors building an actions menu specifically may prefer the `menu` roles.
- The other `App()` usage wrappers (Toolbar, TabPanel, DropdownMenu, Listbox) each import the hooks they use; only the Modal example was missing one.
- Minor stylistic observations left as-is (not technical errors): `useFocusManager` imports `useMemo` without using it; some `useEffect`/`useCallback` dependency arrays would trigger `react-hooks/exhaustive-deps` lint warnings (e.g. the focus-trap effect referencing `getFocusableElements`). These do not affect runtime correctness of the illustrated patterns.

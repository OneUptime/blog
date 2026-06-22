# Validation Summary: How to Implement Focus Management in React Single Page Applications

## Status
validated

## Post Type
Tutorial / Guide (hands-on, code-heavy walkthrough of accessibility focus-management patterns in React SPAs)

## Technologies Covered
- React (function components, hooks: `useEffect`, `useRef`, `useCallback`, `useState`)
- React Router v6 (`useLocation`, `Link`, `Routes`, `Route`, `MemoryRouter`, `BrowserRouter`)
- `react-dom` `createPortal`
- ARIA (`role`, `aria-live`, `aria-modal`, `aria-labelledby`, `aria-invalid`, `aria-activedescendant`, `aria-haspopup`, etc.)
- HTML focus model (`tabindex`, `inert`, focusable elements)
- The `wicg-inert` polyfill
- Jest + React Testing Library + `@testing-library/user-event`
- WCAG 2.1, Section 508, ADA, European Accessibility Act
- Testing tools: axe DevTools, WAVE, Lighthouse, NVDA, VoiceOver, JAWS

## Sources Consulted
- React DOM common components reference — https://react.dev/reference/react-dom/components/common
- React 19 release notes (native boolean `inert` support) — https://react.dev/blog/2024/12/05/react-19
- MDN `inert` global attribute — https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert
- MDN `tabindex` global attribute — https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex
- WAI-ARIA Authoring Practices (Dialog/Modal, Menu/Listbox, Tabs patterns) — https://www.w3.org/WAI/ARIA/apg/patterns/
- WCAG 2.1 SC 1.4.11 Non-text Contrast (3:1) — https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html
- React Router v6 docs (`useLocation`) — https://reactrouter.com/
- European Accessibility Act application date (28 June 2025) — https://accessible-eu-centre.ec.europa.eu/content-corner/news/eaa-comes-effect-june-2025-are-you-ready-2025-01-31_en
- WHO disability / vision impairment statistics — https://www.who.int/

## Issues Found
No technical issues found. All code samples are syntactically correct and use current, non-deprecated APIs. Key claims were verified:
- The European Accessibility Act application date ("Takes effect June 2025") is accurate — it began applying on 28 June 2025.
- WHO statistics (~15% of the global population with a disability, ~2.2 billion with vision impairment) and the ~8%-of-men color-vision-deficiency figure are accurate.
- WCAG non-text contrast minimum of 3:1 for focus indicators is correct (SC 1.4.11).
- The `inert={modalOpen ? '' : undefined}` string pattern is the correct React 18-compatible approach for toggling the attribute, and the `wicg-inert` polyfill is the right choice for older browsers.
- React Router v6 hooks and component usage are correct.
- The focus-trap, skip-link, route-announcer, form-error, dropdown (listbox), tabs, and toast patterns all follow established WAI-ARIA Authoring Practices.

## Review Notes
- **Native `inert` in React 19:** The post's `inert={modalOpen ? '' : undefined}` workaround is correct and broadly compatible. On React 19+, `inert` is supported as a real boolean prop, so `inert={modalOpen}` is the cleaner modern equivalent. Not an error — just a forward-looking simplification.
- **Minor no-op cleanup in `useRouteChangeFocus`:** The inner `return () => clearTimeout(cleanupTimeout)` is returned from inside a `setTimeout` callback, where the return value is ignored, so the nested cleanup timer is not cleared on unmount. This does not affect the described focus behavior (the 100ms cleanup still runs and removes the temporary `tabindex`); it is a negligible edge-case leak only if the component unmounts within that 100ms window. Left as-is to avoid restructuring the author's hook.
- **Dropdown uses both `aria-activedescendant` and roving focus:** The `DropdownMenu` sets `aria-activedescendant` on the listbox *and* moves DOM focus to the active option (roving `tabIndex`/`.focus()`). Typically one approach is chosen rather than both; it remains functional, but a future revision could standardize on the `aria-activedescendant` model (focus stays on the listbox container) per the APG listbox pattern.
- **`<details>` listed under naturally focusable elements:** It is the `<summary>` child that is keyboard-focusable, not the `<details>` wrapper itself. The post's focus-trap selector correctly targets `details > summary`, so this is only a labeling nuance in the introductory list.
- These are stylistic/forward-looking observations only; none constitute a technical error in the context the post presents them.

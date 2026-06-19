# Validation Summary: How to Handle React Portal Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- React DOM `createPortal`
- TypeScript
- JavaScript DOM APIs
- CSS positioning and stacking
- WAI-ARIA modal dialog accessibility
- Tooltip and dropdown UI components
- Server-side rendering considerations

## Sources Consulted
- React `createPortal` API documentation: https://react.dev/reference/react-dom/createPortal
- WAI-ARIA Authoring Practices Guide, Dialog Modal Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- MDN ARIA `aria-modal` attribute reference: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-modal
- TypeScript Utility Types documentation for `ReturnType`: https://www.typescriptlang.org/docs/handbook/utility-types.html
- GitHub author profile URL: https://github.com/nawazdhandala
- OneUptime URL: https://oneuptime.com

## Issues Found
- The tooltip example typed the timeout ref as `NodeJS.Timeout`, which can fail in browser-only TypeScript projects that do not include Node type declarations. Changed it to `ReturnType<typeof setTimeout> | null` and cleared the ref after cancellation.
- The modal example reset `document.body.style.overflow` to an empty string on cleanup, which could erase a pre-existing inline overflow value. Changed the effect to save and restore the previous value.
- The SSR-safe portal example said it only removed a container if the component created it, but the code did not track whether the container was created by the component. Added a `createdContainer` flag and used it in the cleanup condition.

## Review Notes
The core React portal explanations are accurate: `createPortal` changes physical DOM placement while preserving React tree context, and React events from portals propagate through the React tree. The modal accessibility guidance is directionally correct, but a production modal should also ensure background content is inert and should be tested with assistive technologies.

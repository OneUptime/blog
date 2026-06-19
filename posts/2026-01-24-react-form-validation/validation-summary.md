# Validation Summary: How to Handle Form Validation in React

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- TypeScript
- JavaScript
- React Hook Form
- Zod
- @hookform/resolvers
- HTML form validation and accessibility attributes
- Mermaid diagrams

## Sources Consulted
- React input documentation: https://react.dev/reference/react-dom/components/input
- React Hook Form useForm documentation: https://react-hook-form.com/docs/useform
- React Hook Form register documentation: https://react-hook-form.com/docs/useform/register
- React Hook Form setError documentation: https://react-hook-form.com/docs/useform/seterror
- React Hook Form resolvers README: https://github.com/react-hook-form/resolvers
- Zod API documentation: https://zod.dev/api
- Zod error customization documentation: https://zod.dev/error-customization
- Zod v4 migration guide: https://zod.dev/v4/changelog
- W3C WAI ARIA21 technique for aria-invalid: https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA21
- MDN aria-invalid reference: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid

## Issues Found
- The basic React example typed the blur handler as `ChangeEvent<HTMLInputElement>`. Updated it to `FocusEvent<HTMLInputElement>` and imported `FocusEvent`, matching React's blur event semantics.
- The Zod schema used `invalid_type_error`, which was dropped in Zod 4. Replaced it with the current `error` parameter.
- The Zod schema used deprecated string-format method chains for email and URL validation. Updated email validation to pipe into `z.email(...)` and URL validation to use `z.url(...)`.
- The Zod validation messages used older positional string arguments. Updated them to the current `{ error: '...' }` form for consistency with Zod 4 documentation.
- The async validation hook used `NodeJS.Timeout`, which depends on Node ambient types and can fail in browser-focused React projects. Replaced it with `ReturnType<typeof setTimeout>`.

## Review Notes
The examples now align with current React, React Hook Form, @hookform/resolvers, and Zod 4 APIs. I also compiled representative snippets with current npm packages and TypeScript strict mode to confirm the corrected Zod and React Hook Form code type-checks.

# Validation Summary: How to Fix 'Controlled vs Uncontrolled' Input Warnings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- React DOM form inputs
- React Hooks
- TypeScript
- HTML form controls

## Sources Consulted
- React `<input>` documentation: https://react.dev/reference/react-dom/components/input
- React `useRef` documentation: https://react.dev/reference/react/useRef
- React legacy uncontrolled components documentation: https://legacy.reactjs.org/docs/uncontrolled-components.html
- MDN `<input type="file">` documentation: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file

## Issues Found
- The root-cause explanation said React determines controlled state based on whether the `value` prop is defined. This is accurate for text inputs, but React uses `checked` for controlled checkboxes and radio buttons. Updated the sentence to include both cases.
- The reusable `useForm` hook typed `handleBlur` as `ChangeEvent`, but React blur handlers receive `FocusEvent`. Updated the import, return interface, and handler parameter type to use `FocusEvent`.
- The reusable `useForm` hook cleared errors by setting a key to `undefined`, while `isValid` used `Object.keys(errors).length === 0`. That could leave an undefined error key and keep the form invalid. Updated the clearing logic to delete the field error key.

## Review Notes
The examples align with current React guidance that controlled text inputs should receive a string value throughout their lifetime, checkboxes should use a boolean `checked` value, uncontrolled inputs should use `defaultValue` for initial values, and file inputs are uncontrolled in React. Some snippets are illustrative and omit imports or use placeholder `onChange={...}` expressions, which is acceptable for the surrounding explanatory context.

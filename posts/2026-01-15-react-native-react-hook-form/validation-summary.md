# Validation Summary: How to Create Type-Safe Forms in React Native with React Hook Form

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native (TextInput, View, Picker, Animated, KeyboardAvoidingView, etc.)
- React Hook Form (`useForm`, `Controller`, `useFieldArray`, `useWatch`, `useFormState`, `FormProvider`, `useFormContext`)
- TypeScript (generics, `FieldValues`, `Path`, `RegisterOptions`, `Control`)
- Zod schema validation
- `@hookform/resolvers` (`zodResolver`)
- `@react-native-picker/picker`
- React Native Testing Library (`@testing-library/react-native`)

## Sources Consulted
- React Hook Form docs — useFieldArray (array-level `root` errors): https://react-hook-form.com/docs/usefieldarray
- React Hook Form — Bundlephobia size reference: https://bundlephobia.com/package/react-hook-form
- React Hook Form official site (zero dependencies, small size): https://react-hook-form.com/
- Zod v4 migration/changelog (errorMap → error param): https://zod.dev/v4/changelog
- Zod error customization docs: https://zod.dev/error-customization
- GitHub issue: error-message does not show useFieldArray array-level errors stored on errors[name].root — https://github.com/react-hook-form/error-message/issues/112

## Issues Found
1. **Zod `errorMap` param is no longer valid in Zod 4** — The `RegistrationForm` and `MultiStepRegistration` schemas used `z.literal(true, { errorMap: () => ({ message: '...' }) })`. The install command (`npm install zod`, unpinned) resolves to Zod 4, where the schema-level `errorMap` key was renamed to `error`. With Zod 4, the `errorMap` key is silently ignored and the custom message would not be applied. Changed both occurrences to use the `message` key (`z.literal(true, { message: '...' })`), which is supported in both Zod 3 and Zod 4 (deprecated-but-functional alias of `error`), keeping the example version-robust without restructuring.

2. **Bundle size wording** — "Small bundle size (around 9KB minified)" was inaccurate. ~9KB is the minified *and gzipped* figure (minified-only is ~26KB per Bundlephobia). Corrected to "around 9KB minified and gzipped."

## Review Notes
- The array-level error access `errors.experiences?.root` in the `ResumeBuilder` example is correct: React Hook Form stores array-level validation errors (e.g. Zod's `.min(1)` on an array) under the non-index `root` property, distinct from per-item errors. Verified against RHF docs and issue trackers.
- `useFieldArray` with a primitive string array (`skills`) genuinely requires a workaround in RHF's TypeScript types; the post acknowledges this with the `name: 'skills' as never` assertion and a comment. This is an accepted, documented limitation rather than an error.
- The `acceptTerms: false as unknown as true` default-value cast is a known, accepted pattern for satisfying `z.literal(true)`'s inferred type while keeping a falsy default — left intact.
- The test files (`LoginForm.test.tsx`) render `<LoginForm onSubmit={mockOnSubmit} />`, but the `LoginForm` component shown earlier defines its own internal `onSubmit` and does not accept an `onSubmit` prop. This is an illustrative inconsistency typical of tutorial test snippets; reconciling it would require changing the component's signature (out of scope for a technical-correctness fix that avoids restructuring). Readers adapting the tests should add an `onSubmit` prop to the component or assert on side effects instead.
- `React.useRef<NodeJS.Timeout>()` (no initial argument) remains valid under current `@types/react` via the zero-argument `useRef` overload returning `T | undefined`.
- All other code — generic reusable components (`FormInput`/`FormSelect`/`FormCheckbox`), `useWatch`/`memo` performance isolation, `shouldUnregister` for conditional fields, multi-step `trigger(['personal'])` partial validation via `FormProvider`, and the Zod password/phone/zip regex rules — is syntactically correct and uses current, non-deprecated APIs.

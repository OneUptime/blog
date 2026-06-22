# Validation Summary: How to Fix 'Hooks Can Only Be Called Inside' Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- React
- React Hooks
- TypeScript
- JavaScript
- ESLint
- npm
- Yarn

## Sources Consulted
- React Rules of Hooks: https://react.dev/reference/rules/rules-of-hooks
- React invalid hook call warning: https://react.dev/warnings/invalid-hook-call-warning
- React eslint-plugin-react-hooks reference: https://react.dev/reference/eslint-plugin-react-hooks
- React rules-of-hooks lint reference: https://react.dev/reference/eslint-plugin-react-hooks/lints/rules-of-hooks
- React exhaustive-deps lint reference: https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps
- React Server Components reference: https://react.dev/reference/rsc/server-components
- React cache reference, async rendering note: https://react.dev/reference/react/cache
- Next.js no async Client Component error reference: https://nextjs.org/docs/messages/no-async-client-component
- npm package.json overrides documentation: https://docs.npmjs.com/cli/v8/configuring-npm/package-json/#overrides
- npm dedupe documentation: https://docs.npmjs.com/cli/v8/commands/npm-dedupe/
- Yarn selective dependency resolutions: https://classic.yarnpkg.com/lang/en/docs/selective-version-resolutions/
- Yarn package.json resolutions documentation: https://classic.yarnpkg.com/lang/en/docs/package-json/#toc-resolutions

## Issues Found
- The duplicate React section stated that multiple React versions always make hooks fail. React's official invalid hook call guidance is specifically about mismatching React copies between the app and renderer, so this was changed to say hooks can fail when the app loads more than one copy of React.
- The package.json example combined npm overrides and Yarn resolutions in a single `json` block with comments and two top-level objects, which is not valid JSON. The examples were split into two valid package.json snippets with labels outside the code blocks.
- The async component section said async function components are not supported. React Server Components can be async, while Client Components cannot. The wording was changed to "Async Client Components" and the inline comments were updated accordingly.
- The quick reference said a regular function with hooks can be fixed by renaming it to start with `use`. React custom hooks must both start with `use` and be called only from a component or another hook, so the table entry was corrected.
- Several TypeScript examples used `useState(null)` and then accessed properties such as `user?.name` or `data?.name`. In strict TypeScript this leaves the state typed as `null`, so those examples now use explicit `User | null` state types.

## Review Notes
The React Hooks rules, invalid hook call causes, ESLint plugin names, npm commands, npm overrides, and Yarn resolutions are otherwise consistent with official documentation. The examples intentionally omit surrounding imports and domain type declarations such as `User` and `Item`.

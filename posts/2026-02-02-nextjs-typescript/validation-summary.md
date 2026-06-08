# Validation Summary: How to Use Next.js with TypeScript

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js (App Router, Next.js 13+ / 15+)
- TypeScript
- React (Server Components, Client Components, Class Components / Error Boundaries)
- React Testing Library + Jest + `@testing-library/user-event`
- Zod (environment variable validation)
- `next/font/google` (Inter font)
- `next/navigation` (`notFound`)
- `next/server` (`NextRequest`, `NextResponse`)
- `create-next-app` CLI

## Sources Consulted
- Next.js documentation — App Router, TypeScript setup, async `params`/`searchParams` (Next.js 15): https://nextjs.org/docs
- Next.js `create-next-app` CLI reference: https://nextjs.org/docs/app/api-reference/cli/create-next-app
- Next.js Font Optimization (`next/font/google`): https://nextjs.org/docs/app/api-reference/components/font
- Next.js Route Handlers (`NextRequest`, `NextResponse`): https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next.js `error.tsx` / `notFound()` conventions: https://nextjs.org/docs/app/api-reference/file-conventions/error
- TypeScript handbook — `moduleResolution: "bundler"`, strict options: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html
- React docs — Error Boundaries (`getDerivedStateFromError`, `componentDidCatch`): https://react.dev/reference/react/Component
- Zod documentation — `z.string().url()`, `z.coerce.number()`, `safeParse`: https://zod.dev/

## Issues Found
1. **`useFetch` `onSuccess` generic was decoupled from the outer hook generic.** The `UseFetchOptions` interface declared `onSuccess?: <T>(data: T) => void`, where the inner `<T>` shadowed the outer `useFetch<T>` type parameter, effectively making the callback `(data: any) => void` from the caller's perspective. Fixed by making `UseFetchOptions<T>` itself generic and passing `UseFetchOptions<T>` into `useFetch<T>`, so `onSuccess` receives the same `T` as the fetched data.

## Review Notes
- The post correctly uses the Next.js 15 async `params`/`searchParams` API (`Promise<{ ... }>` then `await`). Readers on Next.js 13/14 would need to drop the `Promise<...>` wrapper and the `await`, but the post explicitly targets Next.js 13+ with the modern conventions.
- `create-next-app --typescript` is valid; in current versions of `create-next-app`, TypeScript is the default and the flag is no longer required, but passing it is still accepted and explicit.
- The recommended `tsconfig.json` differs slightly from the boilerplate `create-next-app` generates (it omits `allowJs`, `skipLibCheck`, `esModuleInterop`). These omissions are deliberate hardening choices, not errors, but readers cloning the snippet into a fresh project may want to keep `skipLibCheck: true` to avoid noisy `node_modules` type errors.
- Using `@types/*` as a tsconfig path alias overlaps with TypeScript's reserved `@types` directory for DefinitelyTyped packages in `node_modules`. It works as written, but it can cause confusing resolution behavior if a user ever tries to import directly from a DefinitelyTyped package via the `@types/...` specifier. Consider renaming to `@app-types/*` in a future revision.
- `JSX.Element` return type annotations rely on the global `JSX` namespace. With React 19, the recommended namespace is `React.JSX`, though the global alias still works with current `@types/react`. Not blocking today, but a future deprecation to watch.
- The error-boundary code block mixes two files (`ErrorBoundary.tsx` and `error.tsx`) into a single fenced block, delimited only by a comment. The content is correct; the formatting is a minor readability quirk.

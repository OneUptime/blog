# Validation Summary: How to Fix 'CSS/SCSS' Import Errors in Next.js

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Next.js
- CSS
- CSS Modules
- Sass / SCSS
- PostCSS
- Tailwind CSS
- JavaScript / JSX

## Sources Consulted
- Next.js CSS documentation: https://nextjs.org/docs/app/getting-started/css
- Next.js Sass documentation: https://nextjs.org/docs/app/guides/sass
- Next.js PostCSS documentation: https://nextjs.org/docs/pages/guides/post-css
- Next.js invalid PostCSS configuration error documentation: https://nextjs.org/docs/messages/postcss-shape
- Next.js global CSS error documentation: https://nextjs.org/docs/messages/css-global
- Tailwind CSS Next.js installation guide: https://tailwindcss.com/docs/installation/framework-guides/nextjs
- Sass @import deprecation documentation: https://sass-lang.com/documentation/breaking-changes/import/

## Issues Found
- The post treated global CSS imports from components as universally invalid. Updated the architecture diagram and App Router explanation to note that global CSS can be imported in layouts, pages, or components inside the app directory, while root-layout imports are still recommended for truly global styles.
- The Sass installation commands installed `sass` as a production dependency. Updated npm, yarn, and pnpm commands to use dev dependencies, matching current Next.js documentation.
- The Sass configuration used `prependData`, which is outdated for current Next.js examples. Replaced it with `sassOptions.additionalData`.
- Sass examples used deprecated `@import` injection. Replaced those examples with `@use ... as *`.
- Tailwind examples used the older `tailwindcss` PostCSS plugin and `@tailwind` directives. Updated them to the current `@tailwindcss/postcss` plugin and `@import "tailwindcss"` setup.
- The debug script incorrectly flagged App Router global CSS imports and did not check SCSS module imports. Updated it to only flag non-module CSS/SCSS imports outside `pages/_app` in the Pages Router.
- The complete SCSS example referenced variables that were not defined and used deprecated `map-get`. Added the missing variables, imported `sass:map`, and replaced `map-get` with `map.get`.
- The summary still referred to `prependData`, old Sass install commands, and Tailwind content paths. Updated those bullets to match the corrected guidance.

## Review Notes
The guide is technically valid after the corrections. Tailwind CSS v3 projects still use `tailwind.config.js`, content paths, and `@tailwind` directives, but the post now reflects the current Tailwind CSS setup for new Next.js projects.

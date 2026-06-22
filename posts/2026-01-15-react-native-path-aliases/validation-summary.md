# Validation Summary: How to Set Up Absolute Imports and Path Aliases in React Native

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native
- TypeScript
- Babel
- Metro
- Jest
- React Native Testing Library
- ESLint
- Monorepo / Yarn workspaces configuration

## Sources Consulted
- React Native TypeScript documentation: https://reactnative.dev/docs/typescript
- React Native Metro documentation: https://reactnative.dev/docs/metro
- Metro configuration documentation: https://metrobundler.dev/docs/configuration/
- Metro module resolution documentation: https://metrobundler.dev/docs/resolution/
- TypeScript TSConfig paths documentation: https://www.typescriptlang.org/tsconfig/#paths
- babel-plugin-module-resolver documentation: https://github.com/tleunen/babel-plugin-module-resolver/blob/master/DOCS.md
- Jest configuration documentation: https://jestjs.io/docs/configuration
- ts-jest paths mapping documentation: https://kulshekhar.github.io/ts-jest/docs/getting-started/paths-mapping
- eslint-plugin-import documentation: https://github.com/import-js/eslint-plugin-import
- React Native Testing Library Jest matcher migration guide: https://oss.callstack.com/react-native-testing-library/12.x/docs/migration/jest-matchers

## Issues Found
- The TypeScript examples extended `@react-native/typescript-config/tsconfig.json` or omitted the React Native base config in the complete example. Updated both examples to extend `@react-native/typescript-config`, matching current React Native documentation.
- The explanation implied TypeScript path aliases only needed runtime support in a general way. Clarified that TypeScript `paths` does not rewrite emitted import paths, so another tool must provide runtime or bundler resolution.
- The first Babel `extensions` list omitted `.ios.js` and `.android.js` even though the later platform-specific example included them. Added both extensions for consistency with React Native platform file resolution.
- The Metro alias example used `extraNodeModules` for aliases such as `@components/ui/Button`. Metro resolves `extraNodeModules` by package name, and scoped-looking imports are split as package names such as `@components/ui`. Replaced the example with a `resolveRequest` implementation for alias prefixes.
- The monorepo Metro example repeated the same `extraNodeModules` issue for `@shared/*`. Replaced it with a `resolveRequest` mapping for `@shared`.
- The Jest example used deprecated `@testing-library/jest-native/extend-expect`. Updated it to `@testing-library/react-native/extend-expect`, which is the migration path for React Native Testing Library built-in matchers.
- The alias naming section claimed the `@` prefix clearly distinguishes aliases from npm packages. Adjusted the wording because `@` also denotes npm scoped packages.
- The migration script only matched `../` imports and could accidentally rewrite paths such as `src/components-extra`. Updated the regex to include `./` imports, normalized Windows path separators, and added a path-boundary check.
- Additional resource links included an older Metro URL and an archived React Native TypeScript template. Updated them to current Metro and React Native TypeScript documentation.

## Review Notes
The guide is broadly accurate after these fixes. Teams should still align examples with their exact React Native, Expo, Jest, and ESLint versions, especially in monorepos where package manager layout and Metro defaults can vary.

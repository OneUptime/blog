# Validation Summary: How to Fix 'Template Compilation' Errors in Vue

## Status
validated

## Post Type
Tutorial / Debugging guide

## Technologies Covered
- Vue.js 2 and Vue.js 3
- Vue Single-File Components
- Vue template syntax and directives
- Vue component registration
- Vue component props, emits, and v-model
- Vite and webpack Vue build configuration
- eslint-plugin-vue
- VS Code Vue / Volar validation

## Sources Consulted
- Vue official docs: Template Syntax - https://vuejs.org/guide/essentials/template-syntax
- Vue official docs: Conditional Rendering - https://vuejs.org/guide/essentials/conditional
- Vue official docs: List Rendering - https://vuejs.org/guide/essentials/list
- Vue official docs: Component v-model - https://vuejs.org/guide/components/v-model
- Vue official docs: Component Events - https://vuejs.org/guide/components/events.html
- Vue official docs: Fallthrough Attributes - https://vuejs.org/guide/components/attrs
- Vue official docs: Vue and Web Components - https://vuejs.org/guide/extras/web-components
- Vue official docs: Application API - https://vuejs.org/api/application
- Vue official docs: Options Rendering / runtime compiler - https://vuejs.org/api/options-rendering
- Vue official docs: Tooling / in-browser template compilation - https://vuejs.org/guide/scaling-up/tooling
- Vue 3 Migration Guide: v-if vs. v-for precedence - https://v3-migration.vuejs.org/breaking-changes/v-if-v-for
- Vue 3 Migration Guide: v-model - https://v3-migration.vuejs.org/breaking-changes/v-model
- eslint-plugin-vue rules - https://eslint.vuejs.org/rules/
- eslint-plugin-vue no-use-v-if-with-v-for - https://eslint.vuejs.org/rules/no-use-v-if-with-v-for
- eslint-plugin-vue no-reserved-props - https://eslint.vuejs.org/rules/no-reserved-props
- Vue - Official VS Code extension marketplace entry - https://marketplace.visualstudio.com/items?itemName=Vue.volar

## Issues Found
- The interpolation example described assignment as a template compilation error. JavaScript assignment is an expression, so this was replaced with a statement-style expression using a semicolon, which is invalid in Vue template expressions.
- The custom elements example used `app.config.compilerOptions.isCustomElement` in `main.js`, which does not fix precompiled SFC templates in common Vite build setups. It was changed to the official Vite `@vitejs/plugin-vue` `template.compilerOptions.isCustomElement` configuration.
- The Vue 3 `v-if` / `v-for` explanation said Vue "checks condition before iteration." This was clarified to state that `v-if` is evaluated before the `v-for` scope exists, matching Vue 3 precedence behavior.
- The Vue 2 root element section was titled "Missing Root Element" even though the error is multiple root elements. The heading was corrected.
- The Vue 3 runtime/full build names in the diagram used older Vue 2-style filenames. They were updated to `vue.runtime.esm-bundler.js` and `vue.esm-bundler.js`.
- The runtime compiler examples contained duplicate imports and duplicate `const app` declarations in one JavaScript block. The snippet was adjusted so the examples are syntactically valid together.
- The event handler example named the click event parameter `item`, which was misleading. It was renamed to `event`.
- The ESLint config used older Vue 3 preset names and omitted `vue/no-reserved-props` even though the post discusses reserved prop names. The preset was updated to `plugin:vue/recommended`, and the rule was added.
- The VS Code extension snippet used old `volar.validation.*` settings. It was changed to recommend the current Vue - Official extension identifier, `Vue.volar`.
- The summary claimed template compilation errors are caught during build time. This was narrowed to build-time detection for SFC/build-tool workflows and runtime detection for runtime template strings.

## Review Notes
- The Vue 3.4+ `defineModel()` macro is now the recommended way to implement component `v-model`, but the emit and computed getter/setter patterns shown in the article remain valid and are not deprecated.

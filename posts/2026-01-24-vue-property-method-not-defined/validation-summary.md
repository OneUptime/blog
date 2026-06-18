# Validation Summary: How to Fix 'Property or Method Not Defined' in Vue

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Vue 2 and Vue 3
- JavaScript
- Vue Options API
- Vue Composition API
- Vue Single-File Components
- `<script setup>`
- TypeScript tooling for Vue

## Sources Consulted
- Vue official docs: Template Syntax - https://vuejs.org/guide/essentials/template-syntax.html
- Vue official docs: Options: State - https://vuejs.org/api/options-state.html
- Vue official docs: Composition API `setup()` - https://vuejs.org/api/composition-api-setup.html
- Vue official docs: `<script setup>` - https://vuejs.org/api/sfc-script-setup
- Vue official docs: SFC Syntax Specification - https://vuejs.org/api/sfc-spec
- Vue official docs: TypeScript with Composition API - https://vuejs.org/guide/typescript/composition-api

## Issues Found
- The post described the undefined template binding problem as something Vue "throws" while compiling. Vue's official documentation describes templates being compiled to render functions, and this missing binding is surfaced as a development warning during render. Updated the wording to say Vue renders the template and logs a development warning.
- One Vue code example contained two normal `<script>` blocks in a single SFC code fence. Vue's SFC syntax allows at most one normal `<script>` block, excluding `<script setup>`. Split the "wrong" and "fix" examples into separate code fences so each snippet is valid as an SFC-style example.

## Review Notes
The remaining examples align with current Vue 3 documentation: Options API state should be returned from `data()`, methods should avoid arrow functions when using `this`, `setup()` bindings must be returned to expose them to templates, `<script setup>` exposes top-level bindings automatically, and destructured props from `setup(props)` lose reactivity unless converted with `toRefs()` or `toRef()`. Vue 3.5 introduced reactive destructuring for `defineProps()` in `<script setup>`, but the post's `setup(props)` example remains correct.

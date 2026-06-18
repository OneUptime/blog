# Validation Summary: How to Fix 'Ref vs Reactive' Confusion in Vue 3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Vue 3
- Composition API
- Vue reactivity APIs: ref, reactive, toRef, toRefs, computed
- Vue Single File Components
- JavaScript
- TypeScript

## Sources Consulted
- Vue.js Reactivity Fundamentals: https://vuejs.org/guide/essentials/reactivity-fundamentals.html
- Vue.js Reactivity API: Core: https://vuejs.org/api/reactivity-core
- Vue.js Template Refs: https://vuejs.org/guide/essentials/template-refs
- Vue.js TypeScript with Composition API: https://vuejs.org/guide/typescript/composition-api
- Vue.js Composables Guide: https://vuejs.org/guide/reusability/composables

## Issues Found
- The post said template refs "MUST use ref". This is outdated for current Vue 3 because Vue 3.5 introduced `useTemplateRef()` as the documented Composition API helper for template refs. Updated the wording to say template refs use `ref` before Vue 3.5, or `useTemplateRef` in Vue 3.5+.
- The initial `reactive()` comparison used `const state = reactive(...)` and then commented that reassigning `state` would lose reactivity. With `const`, reassignment would first be a JavaScript error. Updated the comment to explain that replacing the object loses the same reactivity connection if the variable were declared with `let`.
- The summary said "Never destructure reactive". Vue's documented limitation is specifically about losing reactive bindings when destructuring reactive state into local variables, especially primitive properties. Updated the wording to "Avoid destructuring reactive state directly" and point readers to `toRefs` when reactive bindings are needed.

## Review Notes
The remaining examples align with Vue's documented behavior: `ref()` accepts any value type and deeply converts object values, `reactive()` works with object types and cannot preserve the same reactivity connection across whole-object replacement, refs are unwrapped in deep reactive object properties, refs are not unwrapped as reactive array or collection elements, and composables commonly return plain objects containing refs so destructuring preserves reactivity.

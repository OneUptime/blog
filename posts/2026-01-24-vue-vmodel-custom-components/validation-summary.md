# Validation Summary: How to Fix 'v-model' Issues with Custom Components

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Vue 3
- Vue `v-model`
- Vue custom components
- Vue `<script setup>`
- TypeScript
- Vue `defineModel`

## Sources Consulted
- Vue.js Guide: Component v-model: https://vuejs.org/guide/components/v-model
- Vue.js Guide: Form Input Bindings: https://vuejs.org/guide/essentials/forms
- Vue 3 Migration Guide: v-model: https://v3-migration.vuejs.org/breaking-changes/v-model

## Issues Found
- The custom modifiers example used `<CustomInput v-model.trim.capitalize="text" />` but the component only handled custom capitalization/case modifiers. Added `trim?: boolean` to `modelModifiers` and applied `value.trim()` before the other transformations so the example matches Vue's component modifier behavior.
- The custom select example allowed `string | number` option values but emitted `HTMLSelectElement.value`, which is always a string. Changed the handler to look up the selected item in `options` and emit its original `string | number` value, and updated the emit type accordingly.
- The best-practices list said to always use computed properties for internal `v-model` with native inputs, but the post also correctly shows `defineModel` as the Vue 3.4+ option. Updated the wording to recommend computed properties or `defineModel`.

## Review Notes
The remaining examples align with Vue 3's documented `modelValue` / `update:modelValue` contract, named `v-model` arguments, modifier props, checkbox array behavior, and the Vue 3.4+ `defineModel` macro. The async validation example is a valid pattern, though production components may also need race-condition handling when validators resolve out of order.

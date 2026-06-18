# Validation Summary: How to Fix 'Watch' Not Triggering in Vue 3

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Vue 3
- Composition API
- Reactivity API
- `watch`
- `watchEffect`
- Single-File Components with `<script setup>`

## Sources Consulted
- Vue.js Watchers guide: https://vuejs.org/guide/essentials/watchers
- Vue.js Reactivity Fundamentals: https://vuejs.org/guide/essentials/reactivity-fundamentals.html
- Vue.js Reactivity in Depth: https://vuejs.org/guide/extras/reactivity-in-depth
- Vue.js `<script setup>` API: https://vuejs.org/api/sfc-script-setup

## Issues Found
- The "Object Property Added After Setup" section incorrectly claimed that Vue 3 cannot detect property additions on reactive objects and imported `set` from `vue`. That behavior applies to Vue 2, not Vue 3. I updated the section to explain Vue 3's proxy behavior: mutating the original raw object bypasses reactivity, while adding the property through the reactive proxy triggers the watcher. I also removed the invalid `set` import.
- The clone-based old-value comparison example imported `toRaw` but did not use it. I removed the unused import so the example stays clean and accurate.

## Review Notes
- The post's watcher source examples, deep watcher explanation, eager watcher usage, post-flush DOM timing guidance, and async watcher cleanup guidance match the current Vue 3 documentation.
- Deep watchers can be expensive on large objects; the official Vue documentation recommends using them only when necessary.

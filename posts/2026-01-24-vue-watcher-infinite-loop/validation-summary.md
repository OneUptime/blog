# Validation Summary: How to Fix 'Infinite Loop' in Vue Watchers

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Vue 3 Composition API
- Vue watchers: `watch`, `watchEffect`, deep watchers, immediate watchers, flush timing, watcher debugging
- Vue computed properties, including writable computed refs
- VueUse `useDebounceFn`
- JavaScript reactive state patterns

## Sources Consulted
- Vue official Watchers guide: https://vuejs.org/guide/essentials/watchers
- Vue official Reactivity API: Core reference: https://vuejs.org/api/reactivity-core
- Vue official Reactivity in Depth guide: https://vuejs.org/guide/extras/reactivity-in-depth
- Vue official Computed Properties guide: https://vuejs.org/guide/essentials/computed.html
- VueUse official `useDebounceFn` documentation: https://vueuse.org/shared/useDebounceFn/

## Issues Found
- The infinite-loop warning text was imprecise. Updated the flow diagram to refer to Vue's maximum recursive update warning instead of a generic "Infinite Loop" warning.
- The deep-watch section stated that mutating watched objects always causes loops. Updated the wording to "can cause loops" because deep mutation triggers the watcher, but whether it recurses depends on the handler logic.
- The "Use Immutable Updates" heading did not match the example, which tracks related state separately rather than performing an immutable update. Renamed the heading to match the code.
- The circular watcher example used Celsius/Fahrenheit conversions that can stop when Vue observes the same resulting value. Replaced it with a pair of mutually updating refs that actually keep producing new values.
- The writable computed and flag examples were updated to match the corrected circular dependency example. The flag example now uses `flush: 'sync'`, because a synchronous flag is unreliable with Vue's default batched watcher timing.
- The immediate watcher example did not necessarily loop because it only assigned data when the current value was falsy. Updated it so the immediate watcher keeps assigning fresh values to its own source.
- The watcher debugging example described `onTrack` / `onTrigger` as a DevTools label. Updated the comment because these are development-only watcher debugging callbacks for dependency tracking and triggering.
- The one-time watcher example used `watchEffect` and called `stop()` from inside the effect. Since `watchEffect` runs immediately, that pattern can fail if the condition is already true during initial execution. Replaced it with Vue's `watch(..., { once: true })` pattern.
- The flush timing example incorrectly said `flush: 'post'` is the default. Corrected the comment; Vue's default watcher timing is pre-update for the owner component DOM, while `flush: 'post'` must be specified for post-DOM-update callbacks.

## Review Notes
Vue's `once` watcher option requires Vue 3.4 or later. The post does not specify a Vue version, so this is acceptable for current Vue 3 guidance, but a future version-specific revision could mention the Vue 3.4 requirement explicitly.

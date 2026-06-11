# Validation Summary: How to Build Event-Driven Architecture in Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- EventEmitter / events module
- JavaScript
- TypeScript
- Event-driven architecture
- Observer pattern
- Async event handling

## Sources Consulted
- Node.js Events API documentation: https://nodejs.org/api/events.html
- Node.js Event Loop guide: https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick
- TypeScript Modules documentation: https://www.typescriptlang.org/docs/handbook/2/modules.html
- TypeScript keyof operator documentation: https://www.typescriptlang.org/docs/handbook/2/keyof-types.html

## Issues Found
- The TypeScript example declared `EventMap` in `types.ts` but used it in `typedEventBus.ts` without exporting or importing it. Updated the example to `export interface EventMap` and added `import type { EventMap } from './types';` so the split-file example type-checks as written.
- The notification service registered `this.sendPasswordResetEmail.bind(this)` and `this.sendShippingNotification.bind(this)` but did not define those methods. Added matching async methods so constructing the service does not throw a `TypeError`.

## Review Notes
- Node.js `EventEmitter` listeners are called synchronously in registration order by default, and `setImmediate()` or `process.nextTick()` are valid ways for listeners to defer work asynchronously.
- The default max listener warning threshold is 10 per event. Raising it with `setMaxListeners()` is technically correct, but production code should still investigate unexpected listener growth.
- `EventEmitter` has special behavior for unhandled `'error'` events. Async listener rejections need explicit handling, `captureRejections`, or a wrapper such as the `safeHandler` pattern shown in the post.

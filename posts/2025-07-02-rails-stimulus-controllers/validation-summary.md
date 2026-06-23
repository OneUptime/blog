# Validation Summary: How to Use Stimulus Controllers in Rails

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Stimulus (`@hotwired/stimulus`)
- Hotwire (Stimulus + Turbo)
- Ruby on Rails 7+ (importmaps, esbuild/webpack)
- JavaScript (ES modules, classes)
- ERB views / `form_with` helper
- `@hotwired/stimulus-loading` (`eagerLoadControllersFrom`)

## Sources Consulted
- Stimulus Handbook & Reference — https://stimulus.hotwired.dev/ (controllers, lifecycle, targets, actions, values, outlets, `dispatch`)
- Stimulus Reference: Actions — https://stimulus.hotwired.dev/reference/actions (descriptor syntax, `@window`/`@document`, keyboard filters like `keydown.enter`, `keydown.ctrl+s`)
- Stimulus Reference: Values — https://stimulus.hotwired.dev/reference/values (types Array/Boolean/Number/Object/String, `[name]ValueChanged` callbacks)
- Stimulus Reference: Outlets — https://stimulus.hotwired.dev/reference/outlets (`static outlets`, `[name]OutletConnected`, `has[Name]Outlet`)
- stimulus-rails gem — https://github.com/hotwired/stimulus-rails (`./bin/rails stimulus:install` task)
- jsbundling-rails — https://github.com/rails/jsbundling-rails (`javascript:install:esbuild`)
- Turbo Reference — https://turbo.hotwired.dev/ (`Turbo.renderStreamMessage`, `text/vnd.turbo-stream.html` content type)
- Default Rails-generated `app/javascript/application.js` (`application.debug = false`)

## Issues Found
- **`process.env.NODE_ENV` in the importmaps `application.js` example (FIXED).** The post explicitly frames the snippet as the Rails 7+ importmaps default, but importmaps have no build/bundling step, so `process` is not defined in the browser. `application.debug = process.env.NODE_ENV === "development"` throws `Uncaught ReferenceError: process is not defined`, which aborts the entire `application.js` module and prevents Stimulus from ever starting. Changed it to `application.debug = false` (matching the Rails-generated default) and added a short comment explaining why a literal boolean is used instead of reading `process.env` under importmaps.

## Review Notes
- **`showSuccess(message)` / `showError(message)` in `modal_controller.js`:** These are wired via Stimulus actions (`form:success->modal#showSuccess`), so the parameter they receive is the `CustomEvent`, not a plain string — the actual payload would be at `event.detail`. This is a minor pedagogical inconsistency in illustrative cross-controller example code, not a syntax/breaking error, so it was left as-is. A more correct version would read `event.detail` (e.g. `showSuccess(event) { this.notificationOutlet.show(event.detail.message, "success") }`).
- **"Small footprint (under 10KB)" claim:** Stimulus's minified + gzipped size is in the ~9–10KB range, so the claim is reasonable, though it is version-dependent and not an exact figure published by the project.
- All other APIs verified as current and correct: controller lifecycle (`initialize`/`connect`/`disconnect`), targets (`xTarget`/`xTargets`/`hasXTarget`), action descriptors including `@window`/`@document` and keyboard filters, value types and `[name]ValueChanged(value, previousValue)` callbacks, outlets and their connected/disconnected callbacks, `this.dispatch` (which prefixes the event name with the controller identifier, matching the `form:success` listener), and the Turbo integration (`Turbo.renderStreamMessage` + `text/vnd.turbo-stream.html`).

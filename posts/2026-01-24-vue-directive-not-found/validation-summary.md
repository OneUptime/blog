# Validation Summary: How to Fix 'Directive Not Found' Errors in Vue

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Vue 3
- Vue custom directives
- Vue Single-File Components and `<script setup>`
- TypeScript
- DOM event listeners and cleanup

## Sources Consulted
- Vue official documentation: Custom Directives - https://vuejs.org/guide/reusability/custom-directives
- Vue official documentation: `<script setup>` custom directives - https://vuejs.org/api/sfc-script-setup.html#using-custom-directives
- Vue official documentation: Template Syntax, Dynamic Arguments - https://vuejs.org/guide/essentials/template-syntax.html#dynamic-arguments
- Vue official documentation: Typing Global Custom Directives - https://vuejs.org/guide/typescript/composition-api.html#typing-global-custom-directives

## Issues Found
- The post described `v-[directiveName]="value"` as a dynamic directive name. Vue supports dynamic directive arguments, not dynamic directive names. I changed the section to use `v-highlight:[argumentName]="value"` and added a note that `v-[directiveName]="value"` is not valid syntax for choosing a directive dynamically.
- The debugging utility imported `App` from `vue` but did not use it. I removed the unused import so the TypeScript example remains clean under common compiler settings such as `noUnusedLocals`.

## Review Notes
The directive registration examples, `<script setup>` `vNameOfDirective` naming pattern, global `app.directive()` usage, directive lifecycle hooks, and TypeScript `Directive` typing are consistent with the current Vue 3 documentation.

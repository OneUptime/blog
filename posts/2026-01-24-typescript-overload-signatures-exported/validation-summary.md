# Validation Summary: How to Fix 'Overload Signatures Must All Be Exported'

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- TypeScript
- Function overloads
- ES module exports
- Class method visibility modifiers
- Interface method overloads

## Sources Consulted
- TypeScript Handbook: More on Functions - Function Overloads and Implementation Signatures: https://www.typescriptlang.org/docs/handbook/2/functions.html
- TypeScript Handbook: Classes - Member Visibility and Method Syntax: https://www.typescriptlang.org/docs/handbook/2/classes.html
- TypeScript Handbook: Type Compatibility - Functions with Overloads: https://www.typescriptlang.org/docs/handbook/type-compatibility.html
- TypeScript compiler diagnostics, including TS2383 and TS2385, from the official Microsoft TypeScript repository: https://github.com/microsoft/TypeScript/blob/main/src/compiler/diagnosticMessages.json
- Local compiler verification with TypeScript 5.9.3 via `npx tsc --noEmit --strict --skipLibCheck --types --target es2022 --lib es2022,dom`

## Issues Found
- The generic `parse<T extends string | number | boolean>` example allowed callers to choose a type argument that did not match the `type` parameter, so it was not type-safe as an alternative to overloads. Updated it to use a `ParseType` generic tied to the `type` argument and a conditional `ParsedValue<T>` return type, allowing TypeScript to infer the correct return type from the selected parse kind.
- The intentionally invalid class overload example used a `// ...` function body for a non-void return type. Updated the body to return a value so the example demonstrates the intended TS2385 mixed-visibility error cleanly.

## Review Notes
The main claim is correct: overloaded function declarations must use consistent export status, and TypeScript reports TS2383 when exported and non-exported overload declarations are mixed. The class-method visibility discussion is also correct: overload signatures must consistently be public, private, or protected, and TypeScript reports TS2385 when they are mixed. The implementation signature remains separate from the externally visible overload signatures, as described in the TypeScript Handbook.

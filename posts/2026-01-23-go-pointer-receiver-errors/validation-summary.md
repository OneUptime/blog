# Validation Summary: How to Fix 'Cannot use X as type' Pointer Receiver Errors in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go methods and method sets
- Pointer receivers and value receivers
- Interface implementation
- Embedded struct fields
- Slices of interface values

## Sources Consulted
- Go Language Specification: Method sets, interface types, implementing interfaces, and promoted methods for embedded fields - https://go.dev/ref/spec
- Effective Go: Pointers vs. values for receiver methods - https://go.dev/doc/effective_go
- Go Wiki: InterfaceSlice - https://go.dev/wiki/InterfaceSlice

## Issues Found
- The interface satisfaction summary used one type `T` to show both `func (t T) M()` and `func (t *T) M()` in the same code block. Go does not permit declaring two methods with the same name for the same base type, even if one receiver is a value and the other is a pointer. I changed the example to use separate `ValueT` and `PointerT` types while preserving the same receiver-method-set lesson.
- The embedding section said the outer type needs to embed a pointer when embedding a type with pointer receiver methods. That was too broad: if `ServiceBroken` embeds `Logger`, `ServiceBroken` as a value does not implement `Loggable`, but `*ServiceBroken` does because promoted pointer-receiver methods are included in the method set of the pointer to the outer struct. I clarified the wording and example to say embedding `*Logger` is needed when the outer value type itself should implement the interface.

## Review Notes
- The rest of the pointer receiver and interface behavior is consistent with the Go specification and Effective Go.
- I could not run `go test` or compile local snippets because the `go` toolchain is not installed in this environment; verification was done against official Go documentation and static review.

# How to Properly Implement Interfaces in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Interfaces, Duck Typing, Polymorphism, Design Patterns

Description: Learn how Go's implicit interface implementation works, common pitfalls, and best practices for designing clean, effective interfaces in your code.

---

Go's interface system is one of its most elegant features. Unlike other languages, Go uses implicit implementation - there's no `implements` keyword. If your type has the right methods, it implements the interface. This guide covers how to use this powerful feature correctly.

---

## Interface Basics

Interfaces define behavior, not data:

```go
package main

import "fmt"

// Interface definition - only method signatures
type Speaker interface {
    Speak() string
}

// Dog implements Speaker implicitly
type Dog struct {
    Name string
}

func (d Dog) Speak() string {
    return "Woof!"
}

// Cat also implements Speaker
type Cat struct {
    Name string
}

func (c Cat) Speak() string {
    return "Meow!"
}

func makeSound(s Speaker) {
    fmt.Println(s.Speak())
}

func main() {
    dog := Dog{Name: "Buddy"}
    cat := Cat{Name: "Whiskers"}
    
    makeSound(dog) // Woof!
    makeSound(cat) // Meow!
}
```

---

## Verifying Interface Implementation

Use compile-time checks to ensure your type implements an interface:

```go
// Compile-time check that *MyType implements MyInterface
var _ MyInterface = (*MyType)(nil)

// Or for value receivers
var _ MyInterface = MyType{}
```

```go
package main

type Writer interface {
    Write([]byte) (int, error)
}

type MyWriter struct{}

func (w *MyWriter) Write(data []byte) (int, error) {
    return len(data), nil
}

// Compile-time verification
var _ Writer = (*MyWriter)(nil)

// This would cause compile error if Write method is wrong:
// cannot use (*MyWriter)(nil) (type *MyWriter) as type Writer in assignment:
// *MyWriter does not implement Writer (wrong type for Write method)
```

---

## Value vs Pointer Receivers

This is critical for interface implementation:

```go
package main

type Modifier interface {
    Modify()
}

type Data struct {
    Value int
}

// Pointer receiver - only *Data implements Modifier
func (d *Data) Modify() {
    d.Value = 100
}

func main() {
    var m Modifier
    
    d := Data{Value: 1}
    
    // m = d    // ERROR: Data does not implement Modifier
    m = &d      // OK: *Data implements Modifier
    
    m.Modify()
}
```

### Rules:

| Method Receiver | T implements? | *T implements? |
|-----------------|---------------|----------------|
| Value `(t T)` | Yes | Yes |
| Pointer `(t *T)` | No | Yes |

---

## Empty Interface (any)

The empty interface accepts any value:

```go
package main

import "fmt"

func printAnything(v any) {  // 'any' is alias for interface{}
    fmt.Printf("Type: %T, Value: %v\n", v, v)
}

func main() {
    printAnything(42)
    printAnything("hello")
    printAnything([]int{1, 2, 3})
    printAnything(struct{ Name string }{"Alice"})
}
```

---

## Interface Composition

Build complex interfaces from simple ones:

```go
package main

import "io"

// Small, focused interfaces
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type Closer interface {
    Close() error
}

// Composed interfaces
type ReadWriter interface {
    Reader
    Writer
}

type ReadWriteCloser interface {
    Reader
    Writer
    Closer
}

// Implementation
type File struct {
    name string
}

func (f *File) Read(p []byte) (int, error)  { return 0, nil }
func (f *File) Write(p []byte) (int, error) { return len(p), nil }
func (f *File) Close() error                { return nil }

// *File implements all composed interfaces
var _ io.Reader = (*File)(nil)
var _ io.Writer = (*File)(nil)
var _ io.Closer = (*File)(nil)
var _ io.ReadWriter = (*File)(nil)
var _ io.ReadWriteCloser = (*File)(nil)
```

---

## Accept Interfaces, Return Structs

This is a key Go design principle:

```go
package main

import "io"

// GOOD: Accept interface - flexible
func ProcessData(r io.Reader) error {
    // Can accept any Reader: files, network, buffers, etc.
    data := make([]byte, 1024)
    _, err := r.Read(data)
    return err
}

// GOOD: Return concrete type - clear, testable
func NewBuffer() *Buffer {
    return &Buffer{data: make([]byte, 0)}
}

type Buffer struct {
    data []byte
}

func (b *Buffer) Read(p []byte) (int, error) {
    n := copy(p, b.data)
    return n, nil
}
```

Why this pattern?

- **Accept interfaces**: Maximum flexibility for callers
- **Return structs**: Callers get full type info, easier to test

---

## Interface Best Practices

### Keep Interfaces Small

```go
// BAD: Too many methods - hard to implement
type DataStore interface {
    Create(data interface{}) error
    Read(id string) (interface{}, error)
    Update(id string, data interface{}) error
    Delete(id string) error
    List() ([]interface{}, error)
    Search(query string) ([]interface{}, error)
    Backup() error
    Restore() error
}

// GOOD: Single-purpose interfaces
type Creator interface {
    Create(data interface{}) error
}

type Reader interface {
    Read(id string) (interface{}, error)
}

type Updater interface {
    Update(id string, data interface{}) error
}

type Deleter interface {
    Delete(id string) error
}

// Compose when needed
type CRUD interface {
    Creator
    Reader
    Updater
    Deleter
}
```

### Define Interfaces Near Usage

```go
// In consumer package, not provider package
package handler

// Define the interface where it's used
type UserStore interface {
    GetUser(id string) (*User, error)
}

type Handler struct {
    store UserStore
}

func NewHandler(store UserStore) *Handler {
    return &Handler{store: store}
}
```

### Name Interfaces by Behavior

```go
// GOOD: Describes behavior with -er suffix
type Reader interface { Read([]byte) (int, error) }
type Writer interface { Write([]byte) (int, error) }
type Stringer interface { String() string }
type Handler interface { Handle(Request) Response }

// BAD: Describes implementation
type FileManager interface { ... }
type DataProcessor interface { ... }
```

---

## Type Assertions and Switches

Extract concrete types from interfaces:

```go
package main

import "fmt"

type Animal interface {
    Speak() string
}

type Dog struct{ Name string }
func (d Dog) Speak() string { return "Woof!" }
func (d Dog) Fetch() string { return "Fetching..." }

type Cat struct{ Name string }
func (c Cat) Speak() string { return "Meow!" }

func handleAnimal(a Animal) {
    // Type assertion with ok check
    if dog, ok := a.(Dog); ok {
        fmt.Println("It's a dog named", dog.Name)
        fmt.Println(dog.Fetch())
        return
    }
    
    // Type switch for multiple types
    switch v := a.(type) {
    case Dog:
        fmt.Println("Dog:", v.Name)
    case Cat:
        fmt.Println("Cat:", v.Name)
    default:
        fmt.Println("Unknown animal")
    }
}

func main() {
    handleAnimal(Dog{Name: "Buddy"})
    handleAnimal(Cat{Name: "Whiskers"})
}
```

---

## Testing with Interfaces

Interfaces make testing easy:

```go
// production.go
type EmailSender interface {
    Send(to, subject, body string) error
}

type UserService struct {
    emailer EmailSender
}

func (s *UserService) Register(email string) error {
    // ... create user ...
    return s.emailer.Send(email, "Welcome!", "Thanks for signing up")
}
```

```go
// production_test.go
type MockEmailer struct {
    SendCalled bool
    LastTo     string
}

func (m *MockEmailer) Send(to, subject, body string) error {
    m.SendCalled = true
    m.LastTo = to
    return nil
}

func TestUserService_Register(t *testing.T) {
    mock := &MockEmailer{}
    service := &UserService{emailer: mock}
    
    err := service.Register("test@example.com")
    
    if err != nil {
        t.Errorf("unexpected error: %v", err)
    }
    if !mock.SendCalled {
        t.Error("expected email to be sent")
    }
    if mock.LastTo != "test@example.com" {
        t.Errorf("wrong recipient: %s", mock.LastTo)
    }
}
```

---

## Common Interface Patterns

### Functional Options with Interfaces

```go
type Option interface {
    apply(*Server)
}

type optionFunc func(*Server)

func (f optionFunc) apply(s *Server) { f(s) }

func WithPort(port int) Option {
    return optionFunc(func(s *Server) {
        s.port = port
    })
}

func NewServer(opts ...Option) *Server {
    s := &Server{port: 8080}
    for _, opt := range opts {
        opt.apply(s)
    }
    return s
}
```

### Strategy Pattern

```go
type PaymentStrategy interface {
    Pay(amount float64) error
}

type CreditCardPayment struct{}
func (c CreditCardPayment) Pay(amount float64) error { return nil }

type PayPalPayment struct{}
func (p PayPalPayment) Pay(amount float64) error { return nil }

type Order struct {
    payment PaymentStrategy
}

func (o *Order) Checkout(amount float64) error {
    return o.payment.Pay(amount)
}
```

---

## Summary

Interface implementation rules:

| Aspect | Rule |
|--------|------|
| Implementation | Implicit (no `implements` keyword) |
| Value receiver | Both T and *T implement |
| Pointer receiver | Only *T implements |
| Verification | `var _ Interface = (*Type)(nil)` |

**Best Practices:**

1. Keep interfaces small (1-3 methods)
2. Define interfaces at point of use
3. Accept interfaces, return structs
4. Name with -er suffix (Reader, Writer)
5. Use composition over large interfaces
6. Verify implementation at compile time

---

*Building Go services with clean interfaces? [OneUptime](https://oneuptime.com) provides comprehensive monitoring to help you track and debug your applications in production.*

# How to Use text/template and html/template in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Templates, HTML, text/template, html/template, Web Development

Description: Master Go's powerful template engines for generating text, HTML, emails, and configuration files with dynamic data, custom functions, and template composition.

---

Go's template packages are versatile tools for generating any text-based output. Whether you're building web pages, emails, or configuration files, templates keep your code clean and your output consistent.

---

## text/template vs html/template

| Package | Use Case | Auto-Escaping |
|---------|----------|---------------|
| `text/template` | Plain text, config files, emails | No |
| `html/template` | HTML pages, web output | Yes (XSS protection) |

Both packages have identical APIs. Use `html/template` for web output to prevent XSS attacks.

---

## Basic Template Syntax

```go
package main

import (
    "os"
    "text/template"
)

func main() {
    // Simple template with variable substitution
    tmpl := template.Must(template.New("hello").Parse(
        "Hello, {{.Name}}! You have {{.Count}} messages.\n",
    ))
    
    data := struct {
        Name  string
        Count int
    }{
        Name:  "Alice",
        Count: 5,
    }
    
    tmpl.Execute(os.Stdout, data)
    // Output: Hello, Alice! You have 5 messages.
}
```

---

## Template Actions

### Variables and Fields

```go
package main

import (
    "os"
    "text/template"
)

type User struct {
    Name    string
    Email   string
    Address struct {
        City    string
        Country string
    }
}

func main() {
    tmpl := template.Must(template.New("user").Parse(`
User: {{.Name}}
Email: {{.Email}}
Location: {{.Address.City}}, {{.Address.Country}}
`))
    
    user := User{
        Name:  "Bob",
        Email: "bob@example.com",
    }
    user.Address.City = "New York"
    user.Address.Country = "USA"
    
    tmpl.Execute(os.Stdout, user)
}
```

### Conditionals

```go
package main

import (
    "os"
    "text/template"
)

func main() {
    tmpl := template.Must(template.New("conditional").Parse(`
{{if .IsAdmin}}
Welcome, Administrator!
{{else if .IsModerator}}
Welcome, Moderator!
{{else}}
Welcome, User!
{{end}}

{{if and .IsActive .HasVerifiedEmail}}
Account is fully verified.
{{end}}

{{if or .IsPremium .IsTrialUser}}
Premium features enabled.
{{end}}

{{if not .IsBanned}}
Access granted.
{{end}}
`))
    
    data := map[string]bool{
        "IsAdmin":          false,
        "IsModerator":      true,
        "IsActive":         true,
        "HasVerifiedEmail": true,
        "IsPremium":        false,
        "IsTrialUser":      true,
        "IsBanned":         false,
    }
    
    tmpl.Execute(os.Stdout, data)
}
```

### Loops with range

```go
package main

import (
    "os"
    "text/template"
)

type Item struct {
    Name  string
    Price float64
}

func main() {
    tmpl := template.Must(template.New("list").Parse(`
Shopping List:
{{range .Items}}
- {{.Name}}: ${{printf "%.2f" .Price}}
{{end}}

{{range $index, $item := .Items}}
{{$index}}. {{$item.Name}}
{{end}}

{{range .EmptyList}}
This won't print
{{else}}
List is empty!
{{end}}
`))
    
    data := struct {
        Items     []Item
        EmptyList []string
    }{
        Items: []Item{
            {Name: "Apple", Price: 1.50},
            {Name: "Bread", Price: 2.99},
            {Name: "Milk", Price: 3.49},
        },
        EmptyList: nil,
    }
    
    tmpl.Execute(os.Stdout, data)
}
```

### With for Context Change

```go
package main

import (
    "os"
    "text/template"
)

func main() {
    tmpl := template.Must(template.New("with").Parse(`
{{with .User}}
Name: {{.Name}}
Email: {{.Email}}
{{end}}

{{with .MissingField}}
This won't print
{{else}}
Field is empty or missing
{{end}}
`))
    
    data := map[string]interface{}{
        "User": map[string]string{
            "Name":  "Alice",
            "Email": "alice@example.com",
        },
    }
    
    tmpl.Execute(os.Stdout, data)
}
```

---

## Built-in Functions

```go
package main

import (
    "os"
    "text/template"
)

func main() {
    tmpl := template.Must(template.New("funcs").Parse(`
Length of items: {{len .Items}}
First item: {{index .Items 0}}
Is slice: {{printf "%T" .Items}}
Formatted: {{printf "%.2f" .Price}}

{{/* This is a comment */}}

Comparison:
{{if eq .Status "active"}}Active{{end}}
{{if ne .Status "deleted"}}Not deleted{{end}}
{{if lt .Count 10}}Less than 10{{end}}
{{if le .Count 5}}5 or less{{end}}
{{if gt .Count 0}}Greater than 0{{end}}
{{if ge .Count 1}}1 or more{{end}}
`))
    
    data := map[string]interface{}{
        "Items":  []string{"a", "b", "c"},
        "Price":  19.99,
        "Status": "active",
        "Count":  5,
    }
    
    tmpl.Execute(os.Stdout, data)
}
```

---

## Custom Functions

```go
package main

import (
    "os"
    "strings"
    "text/template"
    "time"
)

func main() {
    // Define custom functions
    funcMap := template.FuncMap{
        "upper": strings.ToUpper,
        "lower": strings.ToLower,
        "title": strings.Title,
        "formatDate": func(t time.Time) string {
            return t.Format("Jan 02, 2006")
        },
        "add": func(a, b int) int {
            return a + b
        },
        "multiply": func(a, b float64) float64 {
            return a * b
        },
        "default": func(defaultVal, val interface{}) interface{} {
            if val == nil || val == "" {
                return defaultVal
            }
            return val
        },
    }
    
    tmpl := template.Must(template.New("custom").Funcs(funcMap).Parse(`
Name: {{.Name | upper}}
Lowercase: {{.Name | lower}}
Date: {{.CreatedAt | formatDate}}
Sum: {{add 5 3}}
Product: {{multiply 2.5 4.0}}
Default: {{default "N/A" .MissingField}}
Chained: {{.Name | lower | title}}
`))
    
    data := map[string]interface{}{
        "Name":      "alice smith",
        "CreatedAt": time.Now(),
    }
    
    tmpl.Execute(os.Stdout, data)
}
```

---

## Template Composition

### Define and Template

```go
package main

import (
    "os"
    "text/template"
)

func main() {
    // Main template with nested templates
    const mainTemplate = `
{{define "header"}}
=============================
{{.Title}}
=============================
{{end}}

{{define "footer"}}
-----------------------------
Generated at: {{.Timestamp}}
{{end}}

{{define "content"}}
{{template "header" .}}

Welcome, {{.User}}!

Here are your items:
{{range .Items}}
* {{.}}
{{end}}

{{template "footer" .}}
{{end}}

{{template "content" .}}
`
    
    tmpl := template.Must(template.New("main").Parse(mainTemplate))
    
    data := map[string]interface{}{
        "Title":     "Dashboard",
        "User":      "Alice",
        "Items":     []string{"Task 1", "Task 2", "Task 3"},
        "Timestamp": "2024-01-15 10:30:00",
    }
    
    tmpl.Execute(os.Stdout, data)
}
```

### Loading Templates from Files

```go
package main

import (
    "html/template"
    "os"
)

func main() {
    // Load all templates from directory
    tmpl := template.Must(template.ParseGlob("templates/*.html"))
    
    // Or load specific files
    tmpl2 := template.Must(template.ParseFiles(
        "templates/base.html",
        "templates/header.html",
        "templates/footer.html",
    ))
    
    // Execute specific template
    data := map[string]string{"Title": "Home"}
    tmpl.ExecuteTemplate(os.Stdout, "base.html", data)
    _ = tmpl2
}
```

---

## HTML Templates with Auto-Escaping

```go
package main

import (
    "html/template"
    "os"
)

func main() {
    // html/template auto-escapes dangerous content
    tmpl := template.Must(template.New("page").Parse(`
<!DOCTYPE html>
<html>
<head>
    <title>{{.Title}}</title>
</head>
<body>
    <h1>{{.Title}}</h1>
    <p>Message: {{.Message}}</p>
    <a href="{{.URL}}">Link</a>
</body>
</html>
`))
    
    data := map[string]interface{}{
        "Title":   "User Input",
        "Message": "<script>alert('xss')</script>",
        "URL":     "javascript:alert('xss')",
    }
    
    tmpl.Execute(os.Stdout, data)
    // The script tags and javascript: URL are escaped
}
```

### Marking Content as Safe

```go
package main

import (
    "html/template"
    "os"
)

func main() {
    tmpl := template.Must(template.New("safe").Parse(`
Safe HTML: {{.SafeHTML}}
Safe JS: <script>{{.SafeJS}}</script>
Safe CSS: <style>{{.SafeCSS}}</style>
Safe URL: <a href="{{.SafeURL}}">Link</a>
`))
    
    data := map[string]interface{}{
        "SafeHTML": template.HTML("<strong>Bold text</strong>"),
        "SafeJS":   template.JS("console.log('hello')"),
        "SafeCSS":  template.CSS("color: red"),
        "SafeURL":  template.URL("https://example.com"),
    }
    
    tmpl.Execute(os.Stdout, data)
}
```

---

## Complete Web Example

```go
package main

import (
    "html/template"
    "net/http"
)

// Page represents a web page
type Page struct {
    Title   string
    User    *User
    Content interface{}
}

// User represents a logged-in user
type User struct {
    Name  string
    Email string
}

// Templates
const templates = `
{{define "base"}}
<!DOCTYPE html>
<html>
<head>
    <title>{{.Title}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        nav { background: #333; padding: 10px; }
        nav a { color: white; margin-right: 15px; text-decoration: none; }
        .content { margin-top: 20px; }
    </style>
</head>
<body>
    {{template "nav" .}}
    <div class="content">
        {{template "content" .}}
    </div>
    {{template "footer" .}}
</body>
</html>
{{end}}

{{define "nav"}}
<nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    {{if .User}}
    <span style="float:right; color: #aaa;">Hello, {{.User.Name}}</span>
    {{end}}
</nav>
{{end}}

{{define "footer"}}
<footer style="margin-top: 40px; color: #666; border-top: 1px solid #ddd; padding-top: 10px;">
    &copy; 2024 My App
</footer>
{{end}}

{{define "home"}}
{{template "base" .}}
{{end}}

{{define "content"}}
<h1>Welcome!</h1>
{{with .Content}}
<p>{{.}}</p>
{{end}}
{{end}}
`

var tmpl *template.Template

func init() {
    tmpl = template.Must(template.New("").Parse(templates))
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
    page := Page{
        Title: "Home",
        User:  &User{Name: "Alice", Email: "alice@example.com"},
        Content: "Welcome to our website!",
    }
    
    tmpl.ExecuteTemplate(w, "home", page)
}

func main() {
    http.HandleFunc("/", homeHandler)
    http.ListenAndServe(":8080", nil)
}
```

---

## Template Best Practices

### Error Handling

```go
package main

import (
    "bytes"
    "html/template"
    "log"
    "net/http"
)

// Execute template to buffer first to catch errors
func renderTemplate(w http.ResponseWriter, tmpl *template.Template, name string, data interface{}) {
    var buf bytes.Buffer
    
    if err := tmpl.ExecuteTemplate(&buf, name, data); err != nil {
        log.Printf("Template error: %v", err)
        http.Error(w, "Internal Server Error", http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "text/html; charset=utf-8")
    buf.WriteTo(w)
}
```

### Template Caching

```go
package main

import (
    "html/template"
    "sync"
)

type TemplateCache struct {
    templates map[string]*template.Template
    mu        sync.RWMutex
    funcMap   template.FuncMap
}

func NewTemplateCache() *TemplateCache {
    return &TemplateCache{
        templates: make(map[string]*template.Template),
        funcMap:   template.FuncMap{},
    }
}

func (tc *TemplateCache) Get(name string) (*template.Template, bool) {
    tc.mu.RLock()
    defer tc.mu.RUnlock()
    tmpl, ok := tc.templates[name]
    return tmpl, ok
}

func (tc *TemplateCache) Load(name string, files ...string) error {
    tc.mu.Lock()
    defer tc.mu.Unlock()
    
    tmpl, err := template.New(name).Funcs(tc.funcMap).ParseFiles(files...)
    if err != nil {
        return err
    }
    
    tc.templates[name] = tmpl
    return nil
}
```

---

## Summary

Template syntax reference:

| Syntax | Purpose |
|--------|---------|
| `{{.Field}}` | Access field |
| `{{.Method}}` | Call method |
| `{{if .Cond}}...{{end}}` | Conditional |
| `{{range .List}}...{{end}}` | Loop |
| `{{with .Field}}...{{end}}` | Change context |
| `{{template "name" .}}` | Include template |
| `{{define "name"}}...{{end}}` | Define template |
| `{{- ... -}}` | Trim whitespace |

**Key Points:**

1. Use `html/template` for web output (auto-escaping)
2. Use `text/template` for config files, emails
3. Create custom functions with `FuncMap`
4. Use `template.Must()` for compile-time validation
5. Execute to a buffer first for error handling

---

*Building Go web applications? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your templates and web services with real-time alerting.*
